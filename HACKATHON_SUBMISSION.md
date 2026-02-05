# Colosseum Agent Hackathon Submission - SolRelay

## 🚀 Live Demo
**URL:** https://solrelay.io  
**Program ID (Devnet):** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

## 📖 Project Overview

**SolRelay** - Send crypto to anyone using just their email address. No wallet required for recipients.

### The Problem
- Traditional crypto transfers require both parties to have wallets
- Onboarding non-crypto users is friction-heavy
- No easy way to send crypto as a gift or payment to someone without a wallet

### Our Solution
- **Email-based escrow system** - Send SOL/USDC to any email address
- **On-chain security** - Funds locked in Solana smart contract, not custodial
- **Seamless claiming** - Recipients get email with claim link, can create wallet on the spot
- **Auto-refund** - Unclaimed transfers return to sender after 72 hours

## ✨ Key Features

### Core Functionality
- ✅ **Send crypto via email** - SOL or USDC to any email address
- ✅ **On-chain escrow** - Anchor smart contract with PDA-controlled accounts
- ✅ **Email notifications** - Automated claim links via Resend
- ✅ **One-click claiming** - Recipients create wallet or connect existing one
- ✅ **Transfer history** - View all sent transfers with real-time status
- ✅ **Cancel transfers** - Reclaim funds from pending transfers
- ✅ **Auto-expiry** - Unclaimed funds return after 72 hours

### Security Features
- 🔐 **Constant-time claim code verification** - Prevents timing attacks
- 🔐 **PDA-based escrow** - Program controls funds, not users
- 🔐 **Input validation** - Amount, expiry, and account ownership checks
- 🔐 **Keccak256 hashing** - Matches Solana's on-chain hashing
- 🔐 **Rate limiting** - Prevents spam and DoS attacks

### Technical Highlights
- ⚡ **Wrapped SOL support** - Auto-wraps native SOL for SPL token transfers
- ⚡ **Dark mode** - Full theme support
- ⚡ **Real-time updates** - Auto-refresh transfer status every 30s
- ⚡ **Mobile responsive** - Works on all devices
- ⚡ **Solana Explorer integration** - Direct links to transactions

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│   Agent Service │────▶│  Solana Program │
│   (Vercel)      │     │   (Railway)     │     │   (Devnet)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Email Service  │
                        │   (Resend)      │
                        └─────────────────┘
```

### Tech Stack
- **Frontend:** Next.js 15, React 19, Tailwind CSS, Wallet Adapter
- **Backend:** Node.js/Express, Resend API
- **Blockchain:** Solana (Anchor framework), Rust
- **Deployment:** Vercel (frontend), Railway (agent), Devnet (program)

## 📦 What's Deployed

### 1. Solana Smart Contract (Anchor/Rust)
- **Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`
- **Location:** `program/payinbox/programs/payinbox/src/lib.rs`
- **Instructions:**
  - `create_transfer` - Lock tokens in escrow
  - `claim_transfer` - Recipient claims with code
  - `cancel_transfer` - Sender cancels and reclaims
  - `reclaim_expired` - Anyone triggers expired refund

### 2. Agent Service (Node.js)
- **URL:** `https://agent-hackathon-production.up.railway.app`
- **Location:** `agent/index.js`
- **Endpoints:**
  - POST `/api/create-transfer` - Generate hashes & send email
  - POST `/api/confirm-transfer` - Confirm on-chain transaction
  - GET `/api/transfer/:code` - Get transfer details
  - POST `/api/claim` - Submit claim transaction
  - GET `/api/claim-hash/:code` - Get claim data
  - GET `/health` - Service health check

### 3. Web Frontend (Next.js)
- **URL:** `https://solrelay.io`
- **Location:** `web/`
- **Pages:**
  - `/` - Send transfer form + transfer history
  - `/claim/[code]` - Claim page for recipients

## 🎯 How to Test

### As Sender:
1. Visit https://solrelay.io
2. Connect your Solana wallet (Phantom/Solflare on devnet)
3. Enter recipient email and amount (0.1 SOL works great)
4. Click "Send Transfer" and approve transaction
5. See your transfer in "Your Transfers" panel below
6. Recipient gets email with claim link

### As Recipient:
1. Check email for claim link
2. Click link → opens claim page
3. Connect wallet or generate new one
4. Click "Claim" and approve transaction
5. Tokens arrive in your wallet!

### Test Cancellation:
1. Send a transfer
2. In "Your Transfers" → "In Progress" section
3. Click "Cancel" on any pending transfer
4. Funds return to your wallet immediately

## 📊 Demo Flow

**Live Video:** [Add screencast link if you have one]

**Screenshots:**
1. Send form - Clean UI with amount, email, token selection
2. Transfer history - Active + completed transfers
3. Email notification - Professional claim email
4. Claim page - Simple one-click claiming
5. Transaction success - Solana Explorer links

## 🔗 Important Links

- **Live App:** https://solrelay.io
- **GitHub Repo:** https://github.com/dumplingsol/agent-hackathon
- **Solana Explorer:** https://explorer.solana.com/address/14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h?cluster=devnet

## 💡 Future Roadmap

- [ ] Mainnet deployment
- [ ] Support for more SPL tokens
- [ ] Batch transfers (send to multiple emails at once)
- [ ] Telegram/Discord bot integration
- [ ] QR code claiming for in-person payments
- [ ] Recurring transfers (subscriptions)
- [ ] Mobile app (React Native)

## 👥 Team

Built by Claude with direction from dumpling.sol during the Colosseum Agent Hackathon (Feb 2026).

## 📄 License

MIT License - See LICENSE file

---

**Built with ❤️ for the Colosseum Agent Hackathon**
