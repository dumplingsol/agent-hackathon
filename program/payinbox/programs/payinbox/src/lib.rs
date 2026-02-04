use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, Transfer};

// TODO: Replace with actual deployed program ID
declare_id!("EGWdk3hNnHse2xZw8AZy1HwDJiGkSnscMitrbs4Ax5V4");

/// Maximum expiry time (7 days in seconds)
const MAX_EXPIRY_SECONDS: i64 = 7 * 24 * 3600;
/// Minimum expiry time (1 hour in seconds)
const MIN_EXPIRY_SECONDS: i64 = 3600;
/// Maximum claim code length to prevent DoS
const MAX_CLAIM_CODE_LEN: usize = 256;

#[program]
pub mod solmail {
    use super::*;

    /// Create a new transfer escrow
    /// 
    /// # Arguments
    /// * `email_hash` - SHA256 hash of recipient email (salted)
    /// * `claim_code_hash` - SHA256 hash of claim code
    /// * `amount` - Amount of tokens to transfer
    /// * `expiry_hours` - Hours until transfer expires (1-168)
    pub fn create_transfer(
        ctx: Context<CreateTransfer>,
        email_hash: [u8; 32],
        claim_code_hash: [u8; 32],
        amount: u64,
        expiry_hours: i64,
    ) -> Result<()> {
        // Validate amount
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        // Validate expiry (1 hour to 7 days)
        let expiry_seconds = expiry_hours.checked_mul(3600)
            .ok_or(ErrorCode::InvalidExpiry)?;
        require!(
            expiry_seconds >= MIN_EXPIRY_SECONDS && expiry_seconds <= MAX_EXPIRY_SECONDS,
            ErrorCode::InvalidExpiry
        );

        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        // Initialize transfer state
        transfer.sender = ctx.accounts.sender.key();
        transfer.email_hash = email_hash;
        transfer.claim_code_hash = claim_code_hash;
        transfer.amount = amount;
        transfer.token_mint = ctx.accounts.token_mint.key();
        transfer.escrow_token_account = ctx.accounts.escrow_token_account.key();
        transfer.created_at = clock.unix_timestamp;
        transfer.expiry = clock.unix_timestamp.checked_add(expiry_seconds)
            .ok_or(ErrorCode::Overflow)?;
        transfer.claimed = false;
        transfer.refunded = false;
        transfer.bump = ctx.bumps.transfer;
        transfer.escrow_bump = ctx.bumps.escrow_token_account;

        // Transfer tokens from sender to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        emit!(TransferCreated {
            transfer: transfer.key(),
            sender: transfer.sender,
            token_mint: transfer.token_mint,
            amount,
            expiry: transfer.expiry,
        });

        Ok(())
    }

    /// Claim a transfer with the correct claim code
    /// 
    /// # Arguments
    /// * `claim_code` - The secret claim code (plaintext)
    pub fn claim_transfer(
        ctx: Context<ClaimTransfer>,
        claim_code: String,
    ) -> Result<()> {
        // Validate claim code length to prevent DoS
        require!(
            claim_code.len() <= MAX_CLAIM_CODE_LEN,
            ErrorCode::ClaimCodeTooLong
        );

        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        // Verify claim code using constant-time comparison
        let claim_code_hash = anchor_lang::solana_program::hash::hash(claim_code.as_bytes()).to_bytes();
        require!(
            constant_time_eq(&claim_code_hash, &transfer.claim_code_hash),
            ErrorCode::InvalidClaimCode
        );

        // Verify not expired
        require!(
            clock.unix_timestamp < transfer.expiry,
            ErrorCode::TransferExpired
        );

        // Verify not already claimed or refunded
        require!(!transfer.claimed, ErrorCode::AlreadyClaimed);
        require!(!transfer.refunded, ErrorCode::AlreadyRefunded);

        let amount = transfer.amount;
        let sender_key = transfer.sender;
        let email_hash = transfer.email_hash;
        let escrow_bump = transfer.escrow_bump;

        // Transfer tokens from escrow to recipient
        let transfer_seeds = &[
            b"transfer",
            sender_key.as_ref(),
            email_hash.as_ref(),
            &[transfer.bump],
        ];
        let transfer_signer = &[&transfer_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.transfer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, transfer_signer);
        token::transfer(cpi_ctx, amount)?;

        // Close escrow account and recover rent to sender
        let close_accounts = CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.sender.to_account_info(),
            authority: ctx.accounts.transfer.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_accounts,
            transfer_signer,
        );
        token::close_account(close_ctx)?;

        transfer.claimed = true;

        emit!(TransferClaimed {
            transfer: ctx.accounts.transfer.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
        });

        Ok(())
    }

    /// Cancel a transfer (sender only, before expiry)
    pub fn cancel_transfer(ctx: Context<CancelTransfer>) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;

        // Verify not already claimed or refunded
        require!(!transfer.claimed, ErrorCode::AlreadyClaimed);
        require!(!transfer.refunded, ErrorCode::AlreadyRefunded);

        // Verify sender is the original creator
        require!(
            ctx.accounts.sender.key() == transfer.sender,
            ErrorCode::Unauthorized
        );

        let amount = transfer.amount;
        let sender_key = transfer.sender;
        let email_hash = transfer.email_hash;

        // Transfer tokens back to sender
        let seeds = &[
            b"transfer",
            sender_key.as_ref(),
            email_hash.as_ref(),
            &[transfer.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.sender_token_account.to_account_info(),
            authority: ctx.accounts.transfer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Close escrow account and recover rent
        let close_accounts = CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.sender.to_account_info(),
            authority: ctx.accounts.transfer.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_accounts,
            signer,
        );
        token::close_account(close_ctx)?;

        transfer.refunded = true;

        emit!(TransferCancelled {
            transfer: ctx.accounts.transfer.key(),
            sender: transfer.sender,
            amount,
        });

        Ok(())
    }

    /// Reclaim expired transfer (returns funds to original sender)
    /// Anyone can call this to help clean up expired transfers
    pub fn reclaim_expired(ctx: Context<ReclaimExpired>) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        // Verify transfer has expired
        require!(
            clock.unix_timestamp >= transfer.expiry,
            ErrorCode::NotExpired
        );

        // Verify not already claimed or refunded
        require!(!transfer.claimed, ErrorCode::AlreadyClaimed);
        require!(!transfer.refunded, ErrorCode::AlreadyRefunded);

        let amount = transfer.amount;
        let sender_key = transfer.sender;
        let email_hash = transfer.email_hash;

        // Transfer tokens back to original sender
        let seeds = &[
            b"transfer",
            sender_key.as_ref(),
            email_hash.as_ref(),
            &[transfer.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.sender_token_account.to_account_info(),
            authority: ctx.accounts.transfer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Close escrow account and recover rent to original sender
        let close_accounts = CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.original_sender.to_account_info(),
            authority: ctx.accounts.transfer.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_accounts,
            signer,
        );
        token::close_account(close_ctx)?;

        transfer.refunded = true;

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

/// Constant-time comparison to prevent timing attacks
fn constant_time_eq(a: &[u8; 32], b: &[u8; 32]) -> bool {
    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

// ============================================================================
// Account Structures
// ============================================================================

#[derive(Accounts)]
#[instruction(email_hash: [u8; 32], claim_code_hash: [u8; 32], amount: u64)]
pub struct CreateTransfer<'info> {
    /// The transfer escrow account (PDA)
    #[account(
        init,
        payer = sender,
        space = 8 + TransferAccount::LEN,
        seeds = [b"transfer", sender.key().as_ref(), email_hash.as_ref()],
        bump
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// The sender creating the transfer
    #[account(mut)]
    pub sender: Signer<'info>,

    /// Sender's token account (must own the tokens being sent)
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key() @ ErrorCode::InvalidTokenAccount,
        constraint = sender_token_account.mint == token_mint.key() @ ErrorCode::InvalidTokenMint,
        constraint = sender_token_account.amount >= amount @ ErrorCode::InsufficientFunds
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// The token mint being transferred
    /// CHECK: Validated via sender_token_account constraint
    pub token_mint: AccountInfo<'info>,

    /// Escrow token account (PDA-controlled)
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

#[derive(Accounts)]
pub struct ClaimTransfer<'info> {
    /// The transfer escrow account
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump,
        constraint = !transfer.claimed @ ErrorCode::AlreadyClaimed,
        constraint = !transfer.refunded @ ErrorCode::AlreadyRefunded
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// The recipient claiming the transfer
    #[account(mut)]
    pub recipient: Signer<'info>,

    /// Recipient's token account (must match the transfer's token mint)
    #[account(
        mut,
        constraint = recipient_token_account.owner == recipient.key() @ ErrorCode::InvalidTokenAccount,
        constraint = recipient_token_account.mint == transfer.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Escrow token account (must match transfer record)
    #[account(
        mut,
        constraint = escrow_token_account.key() == transfer.escrow_token_account @ ErrorCode::InvalidEscrowAccount,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump = transfer.escrow_bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Original sender (receives rent from closed escrow)
    /// CHECK: Validated against transfer.sender
    #[account(
        mut,
        constraint = sender.key() == transfer.sender @ ErrorCode::InvalidSender
    )]
    pub sender: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelTransfer<'info> {
    /// The transfer escrow account
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump,
        constraint = !transfer.claimed @ ErrorCode::AlreadyClaimed,
        constraint = !transfer.refunded @ ErrorCode::AlreadyRefunded
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// The original sender (only they can cancel)
    #[account(
        mut,
        constraint = sender.key() == transfer.sender @ ErrorCode::Unauthorized
    )]
    pub sender: Signer<'info>,

    /// Sender's token account (must match the transfer's token mint)
    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key() @ ErrorCode::InvalidTokenAccount,
        constraint = sender_token_account.mint == transfer.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// Escrow token account (must match transfer record)
    #[account(
        mut,
        constraint = escrow_token_account.key() == transfer.escrow_token_account @ ErrorCode::InvalidEscrowAccount,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump = transfer.escrow_bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ReclaimExpired<'info> {
    /// The transfer escrow account
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump,
        constraint = !transfer.claimed @ ErrorCode::AlreadyClaimed,
        constraint = !transfer.refunded @ ErrorCode::AlreadyRefunded
    )]
    pub transfer: Account<'info, TransferAccount>,

    /// Original sender's token account (receives the refund)
    #[account(
        mut,
        constraint = sender_token_account.owner == transfer.sender @ ErrorCode::InvalidTokenAccount,
        constraint = sender_token_account.mint == transfer.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// Escrow token account (must match transfer record)
    #[account(
        mut,
        constraint = escrow_token_account.key() == transfer.escrow_token_account @ ErrorCode::InvalidEscrowAccount,
        seeds = [b"escrow", transfer.key().as_ref()],
        bump = transfer.escrow_bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Original sender (receives rent from closed accounts)
    /// CHECK: Validated against transfer.sender
    #[account(
        mut,
        constraint = original_sender.key() == transfer.sender @ ErrorCode::InvalidSender
    )]
    pub original_sender: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// Transfer Account State
// ============================================================================

#[account]
pub struct TransferAccount {
    /// The sender who created the transfer
    pub sender: Pubkey,
    /// SHA256 hash of the recipient's email (salted)
    pub email_hash: [u8; 32],
    /// SHA256 hash of the claim code
    pub claim_code_hash: [u8; 32],
    /// Amount of tokens in escrow
    pub amount: u64,
    /// Token mint address
    pub token_mint: Pubkey,
    /// Escrow token account address
    pub escrow_token_account: Pubkey,
    /// Timestamp when transfer was created
    pub created_at: i64,
    /// Timestamp when transfer expires
    pub expiry: i64,
    /// Whether the transfer has been claimed
    pub claimed: bool,
    /// Whether the transfer has been refunded (cancelled or reclaimed)
    pub refunded: bool,
    /// PDA bump for transfer account
    pub bump: u8,
    /// PDA bump for escrow account
    pub escrow_bump: u8,
}

impl TransferAccount {
    /// Size of TransferAccount in bytes
    /// 32 + 32 + 32 + 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 1 = 188
    pub const LEN: usize = 32 + 32 + 32 + 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 1;
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct TransferCreated {
    pub transfer: Pubkey,
    pub sender: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub expiry: i64,
}

#[event]
pub struct TransferClaimed {
    pub transfer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TransferCancelled {
    pub transfer: Pubkey,
    pub sender: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TransferReclaimed {
    pub transfer: Pubkey,
    pub sender: Pubkey,
    pub amount: u64,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid claim code")]
    InvalidClaimCode,
    #[msg("Claim code exceeds maximum length")]
    ClaimCodeTooLong,
    #[msg("Transfer has expired")]
    TransferExpired,
    #[msg("Transfer has already been claimed")]
    AlreadyClaimed,
    #[msg("Transfer has already been refunded")]
    AlreadyRefunded,
    #[msg("Transfer has not expired yet")]
    NotExpired,
    #[msg("Unauthorized: only the sender can perform this action")]
    Unauthorized,
    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,
    #[msg("Invalid expiry: must be between 1 and 168 hours")]
    InvalidExpiry,
    #[msg("Invalid token account ownership")]
    InvalidTokenAccount,
    #[msg("Token mint mismatch")]
    InvalidTokenMint,
    #[msg("Insufficient funds in token account")]
    InsufficientFunds,
    #[msg("Invalid escrow account")]
    InvalidEscrowAccount,
    #[msg("Invalid sender account")]
    InvalidSender,
    #[msg("Arithmetic overflow")]
    Overflow,
}
