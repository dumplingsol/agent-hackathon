# 🚀 Deployment Checklist

## Pre-Deployment

### Environment Setup
- [x] Rust installed (v1.93.0)
- [x] Solana CLI installed (v1.18.26)
- [ ] Anchor Framework installed (in progress)
- [x] Node.js installed (v22.22.0)
- [x] Git configured

### Configuration Files
- [x] `agent/.env` - Agent service config
- [ ] `web/.env.local` - Frontend config (create from .example)
- [x] Solana keypair generated

### API Keys & Services
- [x] Resend API key configured
- [x] GitHub repo created
- [x] Vercel account set up

---

## Smart Contract Deployment

### Step 1: Initialize Anchor Project
```bash
cd ~/clawd/solmail/program
anchor init solmail --javascript
```

### Step 2: Copy Contract Code
```bash
# Copy lib.rs into programs/solmail/src/lib.rs
cp ~/clawd/solmail/program/lib.rs programs/solmail/src/lib.rs
```

### Step 3: Update Anchor.toml
```toml
[programs.devnet]
solmail = "YOUR_PROGRAM_ID_HERE"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

### Step 4: Build
```bash
anchor build
```

**Expected output:**
- Compiled successfully
- Binary at `target/deploy/solmail.so`
- Program ID displayed

### Step 5: Deploy
```bash
# Make sure you have SOL
solana balance
# If low: solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

**Save the Program ID!**

### Step 6: Verify Deployment
```bash
solana program show <PROGRAM_ID>
```

---

## Agent Service Deployment

### Step 1: Update Configuration
```bash
cd ~/clawd/solmail/agent
nano .env

# Update these:
PROGRAM_ID=<deployed_program_id>
SOLANA_RPC=https://api.devnet.solana.com
```

### Step 2: Test Locally
```bash
npm start

# Test endpoints:
curl http://localhost:3001/health
```

### Step 3: Deploy to Production (Optional)
**Options:**
- Railway
- Render
- Fly.io
- Heroku

**For hackathon:** Running locally is fine!

---

## Frontend Deployment

### Step 1: Update Environment
```bash
cd ~/clawd/solmail/web
cp .env.local.example .env.local
nano .env.local

# Update:
NEXT_PUBLIC_PROGRAM_ID=<deployed_program_id>
NEXT_PUBLIC_AGENT_URL=http://localhost:3001
```

### Step 2: Test Locally
```bash
npm run dev
# Visit http://localhost:3000
```

### Step 3: Vercel Deployment
Already deployed! Just need to:
1. Add environment variables in Vercel dashboard
2. Redeploy

**Environment variables in Vercel:**
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_AGENT_URL`
- `NEXT_PUBLIC_SOLANA_NETWORK=devnet`

---

## Testing Checklist

### Smart Contract Tests
- [ ] Can create transfer
- [ ] Can claim transfer with valid code
- [ ] Cannot claim with invalid code
- [ ] Cannot claim after expiry
- [ ] Can cancel before claim
- [ ] Can reclaim after expiry

### Frontend Tests
- [ ] Wallet connects (Phantom, Solflare)
- [ ] Send form validation works
- [ ] Transaction signing works
- [ ] Success state shows claim link
- [ ] Mobile responsive

### Agent Service Tests
- [ ] Email sends successfully
- [ ] Transfer lookup works
- [ ] Claim verification works
- [ ] Reminders send (manual test)

### Integration Tests
- [ ] **End-to-end flow:**
  1. Connect wallet
  2. Enter email + amount
  3. Sign transaction
  4. Receive email
  5. Click claim link
  6. Generate/connect wallet
  7. Claim funds
  8. Verify balance

---

## Post-Deployment

### Monitoring
- [ ] Check agent logs
- [ ] Monitor transaction confirmations
- [ ] Track email delivery rate
- [ ] Watch for errors

### Documentation Updates
- [ ] Update README with live URLs
- [ ] Add screenshots
- [ ] Record demo video
- [ ] Write forum post

### Hackathon Submission
- [ ] GitHub repo public
- [ ] README complete
- [ ] Demo video uploaded
- [ ] Vercel deployed
- [ ] Forum post published
- [ ] Project submitted to Colosseum

---

## Troubleshooting

### Common Issues

**"Insufficient funds for rent"**
```bash
solana airdrop 2
```

**"Transaction simulation failed"**
- Check Program ID is correct
- Verify wallet has SOL for fees
- Check account derivation

**"Email not sending"**
- Verify Resend API key
- Check email format validation
- Review rate limits

**"Claim link not working"**
- Verify claim code in URL
- Check agent service is running
- Review transfer status in logs

---

## Security Checklist

- [ ] Private keys never logged
- [ ] API keys in environment variables
- [ ] No secrets in git
- [ ] Email validation enabled
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Smart contract audited

---

**Current Status:**
- Smart Contract: Ready to build
- Agent Service: Running locally
- Frontend: Deployed on Vercel
- Anchor: Installing...

**Next:** Build and deploy smart contract!
