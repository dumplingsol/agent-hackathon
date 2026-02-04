use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("11111111111111111111111111111111"); // Will be replaced after deployment

#[program]
pub mod solmail {
    use super::*;

    /// Create a new transfer escrow
    pub fn create_transfer(
        ctx: Context<CreateTransfer>,
        email_hash: [u8; 32],
        claim_code_hash: [u8; 32],
        amount: u64,
        expiry_hours: i64,
    ) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        transfer.sender = ctx.accounts.sender.key();
        transfer.email_hash = email_hash;
        transfer.claim_code_hash = claim_code_hash;
        transfer.amount = amount;
        transfer.token_mint = ctx.accounts.token_mint.key();
        transfer.escrow_token_account = ctx.accounts.escrow_token_account.key();
        transfer.created_at = clock.unix_timestamp;
        transfer.expiry = clock.unix_timestamp + (expiry_hours * 3600);
        transfer.claimed = false;
        transfer.bump = ctx.bumps.transfer;

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
            amount,
            expiry: transfer.expiry,
        });

        Ok(())
    }

    /// Claim a transfer with the correct claim code
    pub fn claim_transfer(
        ctx: Context<ClaimTransfer>,
        claim_code: String,
    ) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        // Verify claim code
        let claim_code_hash = anchor_lang::solana_program::hash::hash(claim_code.as_bytes()).to_bytes();
        require!(
            claim_code_hash == transfer.claim_code_hash,
            ErrorCode::InvalidClaimCode
        );

        // Verify not expired
        require!(
            clock.unix_timestamp < transfer.expiry,
            ErrorCode::TransferExpired
        );

        // Verify not already claimed
        require!(
            !transfer.claimed,
            ErrorCode::AlreadyClaimed
        );

        // Transfer tokens from escrow to recipient
        let seeds = &[
            b"transfer",
            transfer.sender.as_ref(),
            transfer.email_hash.as_ref(),
            &[transfer.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: transfer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, transfer.amount)?;

        transfer.claimed = true;

        emit!(TransferClaimed {
            transfer: transfer.key(),
            recipient: ctx.accounts.recipient.key(),
            amount: transfer.amount,
        });

        Ok(())
    }

    /// Cancel a transfer (sender only)
    pub fn cancel_transfer(ctx: Context<CancelTransfer>) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;

        // Verify not already claimed
        require!(
            !transfer.claimed,
            ErrorCode::AlreadyClaimed
        );

        // Verify sender is the one who created it
        require!(
            ctx.accounts.sender.key() == transfer.sender,
            ErrorCode::Unauthorized
        );

        // Transfer tokens back to sender
        let seeds = &[
            b"transfer",
            transfer.sender.as_ref(),
            transfer.email_hash.as_ref(),
            &[transfer.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.sender_token_account.to_account_info(),
            authority: transfer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, transfer.amount)?;

        emit!(TransferCancelled {
            transfer: transfer.key(),
            sender: transfer.sender,
            amount: transfer.amount,
        });

        Ok(())
    }

    /// Reclaim expired transfer (anyone can call)
    pub fn reclaim_expired(ctx: Context<ReclaimExpired>) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        // Verify expired
        require!(
            clock.unix_timestamp >= transfer.expiry,
            ErrorCode::NotExpired
        );

        // Verify not already claimed
        require!(
            !transfer.claimed,
            ErrorCode::AlreadyClaimed
        );

        // Transfer tokens back to original sender
        let seeds = &[
            b"transfer",
            transfer.sender.as_ref(),
            transfer.email_hash.as_ref(),
            &[transfer.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.sender_token_account.to_account_info(),
            authority: transfer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, transfer.amount)?;

        emit!(TransferReclaimed {
            transfer: transfer.key(),
            sender: transfer.sender,
            amount: transfer.amount,
        });

        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
#[instruction(email_hash: [u8; 32])]
pub struct CreateTransfer<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + Transfer::LEN,
        seeds = [b"transfer", sender.key().as_ref(), email_hash.as_ref()],
        bump
    )]
    pub transfer: Account<'info, Transfer>,

    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// CHECK: Token mint
    pub token_mint: AccountInfo<'info>,

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
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump
    )]
    pub transfer: Account<'info, Transfer>,

    #[account(mut)]
    pub recipient: Signer<'info>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelTransfer<'info> {
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump
    )]
    pub transfer: Account<'info, Transfer>,

    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ReclaimExpired<'info> {
    #[account(
        mut,
        seeds = [b"transfer", transfer.sender.as_ref(), transfer.email_hash.as_ref()],
        bump = transfer.bump
    )]
    pub transfer: Account<'info, Transfer>,

    /// CHECK: Original sender (validated in transfer account)
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// Transfer Account

#[account]
pub struct Transfer {
    pub sender: Pubkey,
    pub email_hash: [u8; 32],
    pub claim_code_hash: [u8; 32],
    pub amount: u64,
    pub token_mint: Pubkey,
    pub escrow_token_account: Pubkey,
    pub created_at: i64,
    pub expiry: i64,
    pub claimed: bool,
    pub bump: u8,
}

impl Transfer {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 32 + 32 + 8 + 8 + 1 + 1;
}

// Events

#[event]
pub struct TransferCreated {
    pub transfer: Pubkey,
    pub sender: Pubkey,
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

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid claim code")]
    InvalidClaimCode,
    #[msg("Transfer has expired")]
    TransferExpired,
    #[msg("Transfer has already been claimed")]
    AlreadyClaimed,
    #[msg("Transfer has not expired yet")]
    NotExpired,
    #[msg("Unauthorized")]
    Unauthorized,
}
