# PayInbox - Send Crypto via Email

Send SOL or USDC to anyone using just their email address. No wallet required for recipients.

Built for the Colosseum Agent Hackathon. Powered by Solana.

## 🎯 What It Does

1. **Sender** connects wallet and enters recipient's email + amount
2. Funds are locked in an **on-chain escrow** (Solana smart contract)
3. **Recipient gets an email** with a unique claim link
4. Recipient can **create a new wallet** or connect existing one to claim

If unclaimed after 72 hours, funds automatically return to sender.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│   Agent Service │────▶│  Solana Program │
│   (Frontend)    │     │   (Node.js)     │     │   (Anchor/Rust) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Email Service  │
                        │   (Resend)      │
                        └─────────────────┘
```

## 📁 Project Structure

```
solmail/
├── program/             # Solana on-chain program
│   └── payinbox/        # Anchor workspace
│       └── programs/
│           └── payinbox/
│               └── src/
│                   └── lib.rs    # Smart contract
├── agent/               # Backend agent service
│   ├── index.js         # Express server
│   └── .env.example     # Environment template
├── web/                 # Next.js frontend
│   ├── app/             # App router pages
│   ├── components/      # React components
│   └── lib/             # Utilities
└── deploy.sh            # Deployment script
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust & Cargo
- Solana CLI
- Anchor CLI

### 1. Clone and Install

```bash
cd solmail

# Install agent dependencies
cd agent && npm install

# Install web dependencies
cd ../web && npm install
```

### 2. Configure Environment

```bash
# Agent service
cp agent/.env.example agent/.env
# Edit agent/.env with your values

# Web frontend
cp web/.env.local.example web/.env.local
# Edit web/.env.local with your values
```

**Important:** Generate a secure `SERVER_SALT`:
```bash
openssl rand -hex 32
```

### 3. Start Development

```bash
# Terminal 1: Agent service
cd agent && npm run dev

# Terminal 2: Web frontend
cd web && npm run dev
```

### 4. Deploy Smart Contract (Optional)

```bash
# Ensure you have SOL on devnet
solana airdrop 2

# Build and deploy
./deploy.sh
```

## 🔐 Security Features

### Smart Contract
- **Constant-time claim code verification** - Prevents timing attacks
- **PDA-based escrow accounts** - Funds controlled by program, not users
- **Input validation** - Amount, expiry, and account ownership checks
- **Auto-close escrow accounts** - Recovers rent on claim/cancel/reclaim

### Agent Service
- **Rate limiting** - Prevents spam and DoS
- **Email validation** - RFC 5321 compliant
- **Secure hashing** - Keccak256 for claim codes (matches on-chain), SHA-256 for email privacy
- **Claim codes via email only** - Never exposed to frontend in production

### Frontend
- **Client-side wallet generation** - Keys never leave the browser
- **Form validation** - Prevents invalid submissions
- **Secure RPC calls** - CORS protected

## 📝 API Endpoints

### Agent Service (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/api/create-transfer` | Create transfer (returns hashes) |
| POST | `/api/confirm-transfer` | Confirm on-chain transaction |
| GET | `/api/transfer/:code` | Get transfer details |
| POST | `/api/claim` | Submit claim transaction |
| GET | `/api/claim-hash/:code` | Get claim data for transaction |

## 🔧 Smart Contract Instructions

| Instruction | Description |
|-------------|-------------|
| `create_transfer` | Lock tokens in escrow with email/claim hashes |
| `claim_transfer` | Claim tokens with correct claim code |
| `cancel_transfer` | Sender cancels and reclaims (before expiry) |
| `reclaim_expired` | Anyone can trigger refund of expired transfers |

## 🌐 Deployment

### Current Deployment (Devnet)

**Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

### Frontend (Vercel)

1. Push your code to GitHub
2. Connect the repo to Vercel
3. Set the root directory to `web`
4. Add environment variables:
   - `NEXT_PUBLIC_PROGRAM_ID=14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`
   - `NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com`
   - `NEXT_PUBLIC_FRONTEND_URL=https://your-app.vercel.app`
   - `NEXT_PUBLIC_AGENT_URL=https://your-agent.railway.app` (or your agent URL)
5. Deploy!

```bash
cd web
vercel deploy
```

### Agent (Railway/Render/Fly.io)

1. Create a new project on your preferred platform
2. Set environment variables from `.env.example`
3. **Important:** Generate a secure `SERVER_SALT`:
   ```bash
   openssl rand -hex 32
   ```
4. Set up a Resend account for email delivery
5. Deploy!

### Smart Contract (Solana Devnet)
```bash
./deploy.sh
```

### Local Development

```bash
# Terminal 1: Start agent
cd agent && npm run dev

# Terminal 2: Start web
cd web && npm run dev

# Open http://localhost:3000
```

## ⚙️ Environment Variables

### Agent (.env)
| Variable | Description |
|----------|-------------|
| `SOLANA_RPC` | Solana RPC endpoint |
| `PROGRAM_ID` | Deployed program address |
| `RESEND_API_KEY` | Email service API key |
| `SERVER_SALT` | Secure random string (32+ chars) |
| `FRONTEND_URL` | Frontend URL for claim links |
| `PORT` | Server port (default: 3001) |

### Web (.env.local)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PROGRAM_ID` | Deployed program address |
| `NEXT_PUBLIC_SOLANA_RPC` | Solana RPC endpoint |
| `NEXT_PUBLIC_FRONTEND_URL` | Frontend URL |
| `NEXT_PUBLIC_AGENT_URL` | Agent service URL |

## 🧪 Testing

```bash
# Run agent tests
cd agent && npm test

# Run contract tests
cd program/payinbox && anchor test
```

## 📜 License

MIT License - See [LICENSE](LICENSE)

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---

Built with ❤️ for the Colosseum Agent Hackathon
