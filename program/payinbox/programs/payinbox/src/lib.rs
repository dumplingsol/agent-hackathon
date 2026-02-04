//! # PayInbox (Solmail) - Email-to-Crypto Transfer Protocol
//!
//! A Solana program that enables sending SPL tokens to anyone via email,
//! even if they don't have a wallet yet. Funds are held in escrow until
//! claimed with a secret code sent to the recipient's email.
//!
//! ## Security Model
//! - Funds held in PDA-controlled escrow accounts
//! - Claim codes are Keccak256 hashed (never stored plaintext)
//! - Constant-time comparison prevents timing attacks
//! - Expiry mechanism prevents indefinite fund locking
//!
//! ## Architecture
//! ```text
//! Sender -> create_transfer() -> [Escrow PDA] -> claim_transfer() -> Recipient
//!                                     |
//!                        cancel/reclaim_expired() -> Sender (refund)
//! ```

use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, Transfer};
use solana_keccak_hasher as keccak;

declare_id!("14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h");

// ============================================================================
// Constants
// ============================================================================

/// Maximum expiry time: 7 days in seconds (604,800)
const MAX_EXPIRY_SECONDS: i64 = 7 * 24 * 3600;

/// Minimum expiry time: 1 hour in seconds (3,600)
const MIN_EXPIRY_SECONDS: i64 = 3600;

/// Maximum claim code length to prevent memory/compute DoS
const MAX_CLAIM_CODE_LEN: usize = 256;

/// Minimum amount to transfer (prevents dust attacks)
const MIN_TRANSFER_AMOUNT: u64 = 1;

// ============================================================================
// Program Instructions
// ============================================================================

#[program]
pub mod solmail {
    use super::*;

    /// Create a new token transfer escrow.
    ///
    /// Locks the specified amount of tokens in a PDA-controlled escrow account.
    /// The recipient can claim using the secret claim code sent to their email.
    ///
    /// # Arguments
    /// * `email_hash` - SHA256(salt + email) to identify the recipient
    /// * `claim_code_hash` - SHA256(claim_code) for verification
    /// * `amount` - Number of token base units to transfer
    /// * `expiry_hours` - Hours until transfer expires (1-168)
    ///
    /// # Errors
    /// * `InvalidAmount` - Amount is zero
    /// * `InvalidExpiry` - Expiry not in valid range (1-168 hours)
    /// * `InsufficientFunds` - Sender doesn't have enough tokens
    pub fn create_transfer(
        ctx: Context<CreateTransfer>,
        email_hash: [u8; 32],
        claim_code_hash: [u8; 32],
        amount: u64,
        expiry_hours: i64,
    ) -> Result<()> {
        // === Input Validation ===
        require!(amount >= MIN_TRANSFER_AMOUNT, ErrorCode::InvalidAmount);

        // Safe multiplication with overflow check
        let expiry_seconds = expiry_hours
            .checked_mul(3600)
            .ok_or(ErrorCode::InvalidExpiry)?;
        
        require!(
            expiry_seconds >= MIN_EXPIRY_SECONDS && expiry_seconds <= MAX_EXPIRY_SECONDS,
            ErrorCode::InvalidExpiry
        );

        // === Initialize Transfer State ===
        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        transfer.sender = ctx.accounts.sender.key();
        transfer.email_hash = email_hash;
        transfer.claim_code_hash = claim_code_hash;
        transfer.amount = amount;
        transfer.token_mint = ctx.accounts.token_mint.key();
        transfer.escrow_token_account = ctx.accounts.escrow_token_account.key();
        transfer.created_at = clock.unix_timestamp;
        transfer.expiry = clock
            .unix_timestamp
            .checked_add(expiry_seconds)
            .ok_or(ErrorCode::Overflow)?;
        transfer.status = TransferStatus::Active;
        transfer.bump = ctx.bumps.transfer;
        transfer.escrow_bump = ctx.bumps.escrow_token_account;

        // === Execute Token Transfer ===
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        // === Emit Event ===
        emit!(TransferCreated {
            transfer: transfer.key(),
            sender: transfer.sender,
            token_mint: transfer.token_mint,
            amount,
            expiry: transfer.expiry,
        });

        Ok(())
    }

    /// Claim a transfer using the secret claim code.
    ///
    /// Verifies the claim code against the stored hash and transfers
    /// the escrowed tokens to the recipient's token account.
    ///
    /// # Arguments
    /// * `claim_code` - The plaintext secret claim code
    ///
    /// # Security
    /// - Uses constant-time comparison to prevent timing attacks
    /// - Claim code is hashed immediately, never stored in plaintext
    ///
    /// # Errors
    /// * `ClaimCodeTooLong` - Code exceeds 256 bytes
    /// * `InvalidClaimCode` - Hash doesn't match
    /// * `TransferExpired` - Past expiry timestamp
    /// * `AlreadyClaimed` / `AlreadyRefunded` - Invalid state
    pub fn claim_transfer(ctx: Context<ClaimTransfer>, claim_code: String) -> Result<()> {
        // === Input Validation ===
        require!(
            claim_code.len() <= MAX_CLAIM_CODE_LEN,
            ErrorCode::ClaimCodeTooLong
        );

        let transfer = &ctx.accounts.transfer;
        let clock = Clock::get()?;

        // === Verify Claim Code (constant-time) ===
        let claim_code_hash = keccak::hash(claim_code.as_bytes()).to_bytes();
        require!(
            constant_time_eq(&claim_code_hash, &transfer.claim_code_hash),
            ErrorCode::InvalidClaimCode
        );

        // === State Checks ===
        require!(
            clock.unix_timestamp < transfer.expiry,
            ErrorCode::TransferExpired
        );
        require!(
            transfer.status == TransferStatus::Active,
            ErrorCode::InvalidTransferState
        );

        // === Cache Values Before Mutation ===
        let amount = transfer.amount;
        let sender_key = transfer.sender;
        let email_hash = transfer.email_hash;
        let bump = transfer.bump;

        // === Execute Token Transfer from Escrow ===
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"transfer",
            sender_key.as_ref(),
            email_hash.as_ref(),
            &[bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.transfer.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // === Close Escrow Account (rent recovery to sender) ===
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.sender.to_account_info(),
                authority: ctx.accounts.transfer.to_account_info(),
            },
            signer_seeds,
        );
        token::close_account(close_ctx)?;

        // === Update State ===
        ctx.accounts.transfer.status = TransferStatus::Claimed;

        // === Emit Event ===
        emit!(TransferClaimed {
            transfer: ctx.accounts.transfer.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
        });

        Ok(())
    }

    /// Cancel an active transfer (sender only).
    ///
    /// Returns escrowed tokens to the sender. Can be called at any time
    /// before the transfer is claimed, even if not expired.
    ///
    /// # Authorization
    /// Only the original sender can cancel.
    ///
    /// # Errors
    /// * `Unauthorized` - Caller is not the sender
    /// * `AlreadyClaimed` / `AlreadyRefunded` - Invalid state
    pub fn cancel_transfer(ctx: Context<CancelTransfer>) -> Result<()> {
        let transfer = &ctx.accounts.transfer;

        // === State Checks ===
        require!(
            transfer.status == TransferStatus::Active,
            ErrorCode::InvalidTransferState
        );

        // === Cache Values ===
        let amount = transfer.amount;
        let sender_key = transfer.sender;
        let email_hash = transfer.email_hash;
        let bump = transfer.bump;

        // === Return Tokens to Sender ===
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"transfer",
            sender_key.as_ref(),
            email_hash.as_ref(),
            &[bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.sender_token_account.to_account_info(),
                authority: ctx.accounts.transfer.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // === Close Escrow Account ===
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.sender.to_account_info(),
                authority: ctx.accounts.transfer.to_account_info(),
            },
            signer_seeds,
        );
        token::close_account(close_ctx)?;

        // === Update State ===
        ctx.accounts.transfer.status = TransferStatus::Cancelled;

        // === Emit Event ===
        emit!(TransferCancelled {
            transfer: ctx.accounts.transfer.key(),
            sender: sender_key,
            amount,
        });

        Ok(())
    }

    /// Reclaim an expired transfer.
    ///
    /// Anyone can call this to help clean up expired transfers and return
    /// funds to the original sender. This enables permissionless cleanup
    /// which improves network efficiency.
    ///
    /// # Notes
    /// - Funds always return to the original sender
    /// - Rent is recovered to the original sender
    /// - Caller receives no reward (altruistic cleanup)
    ///
    /// # Errors
    /// * `NotExpired` - Transfer hasn't expired yet
    /// * `AlreadyClaimed` / `AlreadyRefunded` - Invalid state
    pub fn reclaim_expired(ctx: Context<ReclaimExpired>) -> Result<()> {
        let transfer = &ctx.accounts.transfer;
        let clock = Clock::get()?;

        // === Verify Expired ===
        require!(
            clock.unix_timestamp >= transfer.expiry,
            ErrorCode::NotExpired
        );

        // === State Checks ===
        require!(
            transfer.status == TransferStatus::Active,
            ErrorCode::InvalidTransferState
        );

        // === Cache Values ===
        let amount = transfer.amount;
        let sender_key = transfer.sender;
        let email_hash = transfer.email_hash;
        let bump = transfer.bump;

        // === Return Tokens to Original Sender ===
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"transfer",
            sender_key.as_ref(),
            email_hash.as_ref(),
            &[bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.sender_token_account.to_account_info(),
                authority: ctx.accounts.transfer.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // === Close Escrow Account ===
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.original_sender.to_account_info(),
                authority: ctx.accounts.transfer.to_account_info(),
            },
            signer_seeds,
        );
        token::close_account(close_ctx)?;

        // === Update State ===
        ctx.accounts.transfer.status = TransferStatus::Expired;

        // === Emit Event ===
        emit!(TransferReclaimed {
            transfer: ctx.accounts.transfer.key(),
            sender: sender_key,
            amount,
        });

        Ok(())
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Constant-time byte comparison to prevent timing attacks.
///
/// This function compares two 32-byte arrays in constant time,
/// regardless of where they differ. This prevents attackers from
/// using timing analysis to guess claim codes byte-by-byte.
///
/// # Implementation Notes
/// - Uses XOR and OR to accumulate differences
/// - The `#[inline(never)]` prevents compiler optimizations that
///   could introduce timing variations
/// - The volatile read ensures the comparison isn't optimized away
#[inline(never)]
fn constant_time_eq(a: &[u8; 32], b: &[u8; 32]) -> bool {
    let mut result = 0u8;
    for i in 0..32 {
        // XOR detects differences, OR accumulates them
        result |= a[i] ^ b[i];
    }
    // Use volatile to prevent optimization
    // Any difference results in non-zero result
    unsafe { std::ptr::read_volatile(&result) == 0 }
}

// ============================================================================
// Account Contexts
// ============================================================================

/// Context for creating a new transfer escrow.
#[derive(Accounts)]
#[instruction(email_hash: [u8; 32], claim_code_hash: [u8; 32], amount: u64)]
pub struct CreateTransfer<'info> {
    /// The transfer escrow state account (PDA).
    /// Seeds: ["transfer", sender, email_hash]
    #[account(
        init,
        payer = sender,
        space = 8 + TransferAccount::LEN,
        seeds = [b"transfer", sender.key().as_ref(), email_hash.as_ref()],
        bump
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// The sender creating and funding the transfer.
    #[account(mut)]
    pub sender: Signer<'info>,

    /// Sender's token account holding the tokens to transfer.
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key() @ ErrorCode::InvalidTokenAccount,
        constraint = sender_token_account.mint == token_mint.key() @ ErrorCode::InvalidTokenMint,
        constraint = sender_token_account.amount >= amount @ ErrorCode::InsufficientFunds
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// The SPL token mint being transferred.
    /// CHECK: Validated via sender_token_account constraint
    pub token_mint: AccountInfo<'info>,

    /// Escrow token account (PDA-controlled).
    /// Seeds: ["escrow", transfer_pda]
    #[account(
        init,
        payer = sender,
        token::mint = token_mint,
        token::authority = transfer,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Context for claiming a transfer with the secret code.
#[derive(Accounts)]
pub struct ClaimTransfer<'info> {
    /// The transfer escrow state account.
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump,
        constraint = transfer.status == TransferStatus::Active @ ErrorCode::InvalidTransferState
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// The recipient claiming the transfer (must sign).
    #[account(mut)]
    pub recipient: Signer<'info>,

    /// Recipient's token account (must match transfer's token mint).
    #[account(
        mut,
        constraint = recipient_token_account.owner == recipient.key() @ ErrorCode::InvalidTokenAccount,
        constraint = recipient_token_account.mint == transfer.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Escrow token account holding the escrowed tokens.
    #[account(
        mut,
        constraint = escrow_token_account.key() == transfer.escrow_token_account @ ErrorCode::InvalidEscrowAccount,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump = transfer.escrow_bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Original sender (receives rent from closed escrow).
    /// CHECK: Validated against transfer.sender
    #[account(
        mut,
        constraint = sender.key() == transfer.sender @ ErrorCode::InvalidSender
    )]
    pub sender: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

/// Context for cancelling an active transfer (sender only).
#[derive(Accounts)]
pub struct CancelTransfer<'info> {
    /// The transfer escrow state account.
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump,
        constraint = transfer.status == TransferStatus::Active @ ErrorCode::InvalidTransferState
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// The original sender (must sign, only they can cancel).
    #[account(
        mut,
        constraint = sender.key() == transfer.sender @ ErrorCode::Unauthorized
    )]
    pub sender: Signer<'info>,

    /// Sender's token account to receive refund.
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key() @ ErrorCode::InvalidTokenAccount,
        constraint = sender_token_account.mint == transfer.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// Escrow token account to close.
    #[account(
        mut,
        constraint = escrow_token_account.key() == transfer.escrow_token_account @ ErrorCode::InvalidEscrowAccount,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump = transfer.escrow_bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// Context for reclaiming an expired transfer.
#[derive(Accounts)]
pub struct ReclaimExpired<'info> {
    /// The transfer escrow state account.
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump,
        constraint = transfer.status == TransferStatus::Active @ ErrorCode::InvalidTransferState
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// Original sender's token account (receives the refund).
    #[account(
        mut,
        constraint = sender_token_account.owner == transfer.sender @ ErrorCode::InvalidTokenAccount,
        constraint = sender_token_account.mint == transfer.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// Escrow token account to close.
    #[account(
        mut,
        constraint = escrow_token_account.key() == transfer.escrow_token_account @ ErrorCode::InvalidEscrowAccount,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump = transfer.escrow_bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Original sender (receives rent from closed accounts).
    /// CHECK: Validated against transfer.sender
    #[account(
        mut,
        constraint = original_sender.key() == transfer.sender @ ErrorCode::InvalidSender
    )]
    pub original_sender: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// Account State
// ============================================================================

/// Transfer status enum - more gas efficient than multiple booleans
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TransferStatus {
    /// Transfer is active and can be claimed
    Active = 0,
    /// Transfer has been successfully claimed
    Claimed = 1,
    /// Transfer was cancelled by sender
    Cancelled = 2,
    /// Transfer expired and was reclaimed
    Expired = 3,
}

impl Default for TransferStatus {
    fn default() -> Self {
        TransferStatus::Active
    }
}

/// State account for a pending token transfer.
///
/// This account stores all metadata about an escrow transfer,
/// including the claim code hash for verification and the
/// expiry timestamp.
#[account]
pub struct TransferAccount {
    /// The sender who created and funded this transfer
    pub sender: Pubkey,
    /// SHA256 hash of (salt + recipient_email)
    pub email_hash: [u8; 32],
    /// SHA256 hash of the claim code
    pub claim_code_hash: [u8; 32],
    /// Amount of tokens held in escrow
    pub amount: u64,
    /// SPL token mint address
    pub token_mint: Pubkey,
    /// Address of the escrow token account
    pub escrow_token_account: Pubkey,
    /// Unix timestamp when transfer was created
    pub created_at: i64,
    /// Unix timestamp when transfer expires
    pub expiry: i64,
    /// Current status of the transfer
    pub status: TransferStatus,
    /// PDA bump seed for this transfer account
    pub bump: u8,
    /// PDA bump seed for the escrow token account
    pub escrow_bump: u8,
}

impl TransferAccount {
    /// Account size in bytes:
    /// - sender: 32
    /// - email_hash: 32
    /// - claim_code_hash: 32
    /// - amount: 8
    /// - token_mint: 32
    /// - escrow_token_account: 32
    /// - created_at: 8
    /// - expiry: 8
    /// - status: 1 (enum stored as u8)
    /// - bump: 1
    /// - escrow_bump: 1
    /// Total: 187 bytes
    pub const LEN: usize = 32 + 32 + 32 + 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1;
}

// ============================================================================
// Events
// ============================================================================

/// Emitted when a new transfer escrow is created.
#[event]
pub struct TransferCreated {
    /// The transfer PDA address
    pub transfer: Pubkey,
    /// The sender who created this transfer
    pub sender: Pubkey,
    /// The token mint being transferred
    pub token_mint: Pubkey,
    /// Amount of tokens escrowed
    pub amount: u64,
    /// Unix timestamp when this transfer expires
    pub expiry: i64,
}

/// Emitted when a transfer is successfully claimed.
#[event]
pub struct TransferClaimed {
    /// The transfer PDA address
    pub transfer: Pubkey,
    /// The recipient who claimed the transfer
    pub recipient: Pubkey,
    /// Amount of tokens received
    pub amount: u64,
}

/// Emitted when a transfer is cancelled by the sender.
#[event]
pub struct TransferCancelled {
    /// The transfer PDA address
    pub transfer: Pubkey,
    /// The sender who cancelled
    pub sender: Pubkey,
    /// Amount of tokens refunded
    pub amount: u64,
}

/// Emitted when an expired transfer is reclaimed.
#[event]
pub struct TransferReclaimed {
    /// The transfer PDA address
    pub transfer: Pubkey,
    /// The original sender who received the refund
    pub sender: Pubkey,
    /// Amount of tokens refunded
    pub amount: u64,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid claim code")]
    InvalidClaimCode,

    #[msg("Claim code exceeds maximum length of 256 bytes")]
    ClaimCodeTooLong,

    #[msg("Transfer has expired and can no longer be claimed")]
    TransferExpired,

    #[msg("Transfer has already been claimed")]
    AlreadyClaimed,

    #[msg("Transfer has already been refunded")]
    AlreadyRefunded,

    #[msg("Transfer has not expired yet")]
    NotExpired,

    #[msg("Unauthorized: only the original sender can perform this action")]
    Unauthorized,

    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,

    #[msg("Invalid expiry: must be between 1 and 168 hours (7 days)")]
    InvalidExpiry,

    #[msg("Invalid token account: ownership mismatch")]
    InvalidTokenAccount,

    #[msg("Token mint mismatch: expected different token type")]
    InvalidTokenMint,

    #[msg("Insufficient funds in source token account")]
    InsufficientFunds,

    #[msg("Invalid escrow account: address mismatch")]
    InvalidEscrowAccount,

    #[msg("Invalid sender account: address mismatch")]
    InvalidSender,

    #[msg("Arithmetic overflow in calculation")]
    Overflow,

    #[msg("Invalid transfer state for this operation")]
    InvalidTransferState,
}
