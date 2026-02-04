# SolMail Architecture

## System Overview

```
┌─────────────┐
│   Sender    │ Enters email + amount, signs tx
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│     Solana Smart Contract           │
│  ┌─────────────────────────────┐   │
│  │  Escrow Account             │   │
│  │  - sender: Pubkey           │   │
│  │  - email_hash: [u8; 32]     │   │
│  │  - amount: u64              │   │
│  │  - claim_code_hash: [u8;32] │   │
│  │  - token: Pubkey (SOL/USDC) │   │
│  │  - expiry: i64              │   │
│  │  - claimed: bool            │   │
│  └─────────────────────────────┘   │
└─────────────┬───────────────────────┘
              │
              ▼
       ┌──────────────┐
       │ Agent Service│ Monitors chain + sends emails
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │  Recipient   │ Gets email with claim link
       └──────┬───────┘
              │
              ▼
       Claims via frontend
```

---

## Smart Contract (Anchor Program)

### Account Structure

```rust
#[account]
pub struct Transfer {
    pub sender: Pubkey,
    pub email_hash: [u8; 32],        // SHA256(email + salt)
    pub amount: u64,
    pub claim_code_hash: [u8; 32],   // SHA256(claim_code)
    pub token_mint: Pubkey,          // SOL or USDC mint
    pub escrow_token_account: Pubkey,
    pub created_at: i64,
    pub expiry: i64,                 // Unix timestamp
    pub claimed: bool,
    pub bump: u8,
}
```

### Instructions

#### 1. `create_transfer`
**Inputs:**
- `sender: Signer` - Pays and creates escrow
- `email_hash: [u8; 32]` - SHA256(email + server_salt)
- `claim_code_hash: [u8; 32]` - SHA256(claim_code)
- `amount: u64` - Amount to send
- `token_mint: Pubkey` - SOL wrapper or USDC mint
- `expiry_hours: u64` - Time until expiry (default 72h)

**Logic:**
1. Create PDA escrow account
2. Transfer tokens from sender to escrow
3. Emit `TransferCreated` event (picked up by agent)

#### 2. `claim_transfer`
**Inputs:**
- `recipient: Signer` - Claims funds
- `transfer: Account<Transfer>` - Escrow to claim
- `claim_code: String` - Unhashed claim code

**Logic:**
1. Verify `SHA256(claim_code) == transfer.claim_code_hash`
2. Verify not expired: `Clock::get()?.unix_timestamp < transfer.expiry`
3. Verify not already claimed: `!transfer.claimed`
4. Transfer tokens from escrow to recipient
5. Mark `claimed = true`
6. Close escrow account

#### 3. `cancel_transfer`
**Inputs:**
- `sender: Signer` - Original sender
- `transfer: Account<Transfer>` - Escrow to cancel

**Logic:**
1. Verify `sender == transfer.sender`
2. Verify not claimed: `!transfer.claimed`
3. Transfer tokens back to sender
4. Close escrow account

#### 4. `reclaim_expired`
**Inputs:**
- `transfer: Account<Transfer>` - Expired escrow

**Logic:**
1. Verify expired: `Clock::get()?.unix_timestamp >= transfer.expiry`
2. Verify not claimed: `!transfer.claimed`
3. Transfer tokens back to sender
4. Close escrow account
5. **Anyone can call** (no auth needed - helps clean up chain state)

---

## Agent Service (Node.js)

### Responsibilities

1. **Monitor Chain**
   - Listen for `TransferCreated` events
   - Index active escrows
   - Track claim/cancel events

2. **Send Emails**
   - On transfer created: Send claim email to recipient
   - 24h before expiry: Send reminder
   - 2h before expiry: Send final reminder

3. **Wallet Generation**
   - Generate Solana keypair for new users
   - Encrypt private key with user-provided password
   - Store in secure DB (or return to user for custody)

4. **Fraud Detection**
   - Track claims per email
   - Flag suspicious patterns (same email claiming many times)
   - Rate limiting on claim attempts

### Tech Stack
- **Framework:** Express.js
- **Email:** Resend (https://resend.com) - modern, dev-friendly
- **Database:** PostgreSQL (track emails, claims, metrics)
- **Solana:** @solana/web3.js + Anchor client
- **Encryption:** bcrypt for passwords, AES-256 for private keys

### API Endpoints

```typescript
POST /api/create-transfer
  Body: { email: string, amount: number, token: 'SOL' | 'USDC' }
  Returns: { emailHash, claimCode, txSignature }

POST /api/claim
  Body: { claimCode: string, recipientWallet: string }
  Returns: { txSignature, amount }

POST /api/generate-wallet
  Body: { email: string, password: string }
  Returns: { publicKey: string, encryptedPrivateKey: string }

GET /api/transfer/:claimCode
  Returns: { amount, token, sender, expiresAt, claimed }

POST /api/cancel
  Body: { transferPubkey: string }
  Returns: { txSignature }
```

---

## Frontend (Next.js + TailwindCSS)

### Design System

**Colors (Solana Brand):**
```css
--solana-purple: #9945FF
--solana-green: #14F195
--gradient: linear-gradient(135deg, #9945FF 0%, #14F195 100%)
--text-dark: #000000
--text-gray: #6B7280
--bg-light: #FFFFFF
--bg-subtle: #F9FAFB
```

**Typography:**
- Font: Inter (system fallback: -apple-system, SF Pro)
- Headings: 600 weight
- Body: 400 weight
- Monospace: JetBrains Mono (for wallet addresses)

**Components (Stripe-inspired):**
- Rounded corners: 12px
- Shadows: subtle, elevation-based
- Buttons: High contrast, clear hover states
- Inputs: Clean borders, focus rings (Solana purple)

### Pages

#### 1. Home (`/`)
**Header:**
```
┌────────────────────────────────────────────┐
│ [Logo] SolMail        How it works | [Connect Wallet] │
└────────────────────────────────────────────┘
```

**Hero Section:**
```
        Send crypto as easy as email
        
        No wallet required. Just an email address.
        
        ┌─────────────────────────────────┐
        │ Recipient email                 │
        │ ___________________________     │
        │                                 │
        │ Amount          Token           │
        │ _______         [USDC ▼]        │
        │                                 │
        │         [Send via Email]        │
        └─────────────────────────────────┘
```

**Features Section:**
- ✓ No wallet needed to receive
- ✓ Secure smart contract escrow
- ✓ Automatic refund if unclaimed

#### 2. How It Works (`/how`)
**Step-by-step explainer:**

```
┌─────────────────────────────────────────┐
│  1. Enter email & amount                │
│     Sign transaction in your wallet     │
│                                         │
│  2. Recipient gets email                │
│     "You've received crypto!"           │
│                                         │
│  3. They claim instantly                │
│     Generate wallet or connect existing │
│                                         │
│  4. Funds appear in wallet              │
│     Ready to use anywhere               │
└─────────────────────────────────────────┘
```

#### 3. Claim (`/claim/[code]`)
**Claim flow:**

```
        You've received 25 USDC!
        
        From: 0x1234...5678
        
        ┌─────────────────────────────────┐
        │ □ Connect existing wallet       │
        │                                 │
        │ □ Generate new wallet           │
        │   (we'll help you get started)  │
        │                                 │
        │         [Claim Funds]           │
        └─────────────────────────────────┘
```

If generating new wallet:
```
        New Wallet Created! ✓
        
        Your address: 0x9876...4321
        
        ⚠️ Save your recovery phrase:
        
        [word1] [word2] [word3] ... [word12]
        
        [ ] I've saved this somewhere safe
        
        [Continue to Claim]
```

### Wallet Integration

**Adapters (using @solana/wallet-adapter):**
- Phantom
- Solflare
- Backpack
- Glow
- Brave Wallet

**Connect Button:**
- Gradient background (Solana colors)
- Shows connected address when active
- Disconnect option in dropdown

---

## Security Model

### On-Chain Security

1. **Email Privacy**
   - Never store raw email on-chain
   - Use `SHA256(email + server_salt)`
   - Server salt is secret, prevents rainbow tables

2. **Claim Code Protection**
   - 32-byte random secret generated server-side
   - Only hash stored on-chain
   - Sent once via email (never logged/stored permanently)
   - One-time use (consumed on claim)

3. **Sender Protection**
   - Only sender can cancel (ownership check)
   - Expiry ensures no permanently locked funds
   - Anyone can trigger reclaim after expiry (cleanup incentive)

4. **Reentrancy Protection**
   - Mark `claimed = true` before transfer
   - Use Anchor's CPI security patterns

### Off-Chain Security

1. **Email System**
   - Use DKIM/SPF to prevent spoofing
   - Rate limit email sends (prevent spam)
   - Validate email format before hashing

2. **API Security**
   - Rate limiting on all endpoints
   - CAPTCHA on claim/generate-wallet
   - CORS restrictions

3. **Wallet Generation**
   - Client-side key generation (BIP39)
   - Optional server-encrypted backup
   - User must acknowledge seed phrase responsibility

4. **Database**
   - Encrypted at rest
   - No private keys stored (only encrypted with user password)
   - Regular backups

---

## Monitoring & Observability

### Metrics (Agent Dashboard)

```typescript
{
  totalTransfers: number,
  activeEscrows: number,
  totalValueLocked: { SOL: number, USDC: number },
  claimedToday: number,
  expiredToday: number,
  avgClaimTime: number, // hours
  topEmails: [{ domain: string, count: number }]
}
```

### Alerts

- Escrow approaching expiry (unclaimed)
- High failure rate on claims
- Email delivery failures
- Suspicious claim patterns

---

## Deployment

### Smart Contract
- **Network:** Solana Devnet (for hackathon demo)
- **Upgrade Authority:** Multi-sig or DAO (production)
- **Deploy via:** Anchor CLI

### Agent Service
- **Host:** Railway/Render/Fly.io (simple deployment)
- **DB:** Managed PostgreSQL
- **Email:** Resend (generous free tier)

### Frontend
- **Host:** Vercel (Next.js native)
- **Domain:** solmail.xyz or similar
- **CDN:** Cloudflare (optional)

---

## Future Enhancements (Post-Hackathon)

1. **Multi-token Support** - Any SPL token
2. **Batch Sends** - CSV upload for payroll/airdrops
3. **Scheduled Sends** - Birthday gifts, payroll dates
4. **SMS Alternative** - Phone numbers for regions without email
5. **Social Recovery** - Multi-email wallet recovery
6. **Payment Requests** - Reverse flow (request payment via email)
7. **Mainnet Launch** - Real money, real impact

---

This architecture balances **simplicity** (achievable in 9 days) with **completeness** (judges see real product potential).
