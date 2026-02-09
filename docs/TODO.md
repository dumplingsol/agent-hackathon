# TODO - Priority Order

## 🔥 CRITICAL (Do Tomorrow - Day 2)

### 1. Install Solana Development Tools
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 2. Build Smart Contract
```bash
cd program
anchor init solmail --javascript
# Copy lib.rs content
anchor build
anchor test
```

### 3. Deploy to Devnet
```bash
# Configure Solana for devnet
solana config set --url devnet

# Airdrop some SOL for deployment
solana airdrop 2

# Deploy
anchor deploy
# Save the Program ID!
```

### 4. Update Agent Service
- Replace `PROGRAM_ID` in `agent/.env` with deployed program ID
- Update `agent/index.js` to use deployed program
- Test API endpoints locally

### 5. Start Frontend Integration
- Install wallet adapter dependencies (if not done)
- Create wallet provider wrapper
- Test wallet connection

---

## ⚡ HIGH PRIORITY (Day 3-4)

### Frontend Wallet Integration
- [ ] Setup `@solana/wallet-adapter-react` provider
- [ ] Connect wallet button functionality
- [ ] Show connected wallet address
- [ ] Sign transaction flow

### Send Flow Integration
- [ ] Connect SendForm to agent API
- [ ] Generate email hash + claim code
- [ ] Build transaction with program
- [ ] Sign and send transaction
- [ ] Show success with claim link

### Claim Flow Integration
- [ ] Fetch transfer details from agent API
- [ ] Wallet generation (client-side BIP39)
- [ ] Show seed phrase backup UI
- [ ] Claim transaction signing
- [ ] Success confirmation

### Agent Service
- [ ] Chain monitoring (WebSocket subscriptions)
- [ ] Parse `TransferCreated` events
- [ ] Send claim emails via Resend
- [ ] Reminder system (24h, 2h before expiry)

---

## 📝 MEDIUM PRIORITY (Day 5-6)

### Testing
- [ ] End-to-end flow test (create → email → claim)
- [ ] Cancel transfer test
- [ ] Expiry test
- [ ] Error handling (invalid claim code, expired, etc.)

### Polish
- [ ] Loading states everywhere
- [ ] Error messages
- [ ] Mobile responsive
- [ ] Copy to clipboard for claim links
- [ ] Transaction confirmation toasts

### Security
- [ ] Smart contract audit
- [ ] SQL injection prevention (agent)
- [ ] Rate limiting on API
- [ ] Email validation
- [ ] CORS configuration

---

## 🎨 NICE TO HAVE (Day 7-8)

### Features
- [ ] Multiple token support (more SPL tokens)
- [ ] Cancel button on frontend
- [ ] Transfer history page
- [ ] Email preview before sending

### Agent Dashboard
- [ ] Show active escrows
- [ ] Total value locked
- [ ] Claim rate %
- [ ] Recent transfers list

### Documentation
- [ ] Setup guide
- [ ] API documentation
- [ ] Smart contract docs
- [ ] Security best practices

---

## 🎬 FINAL PUSH (Day 9)

### Demo Video
- [ ] Script (2-3 min)
- [ ] Screen recording
- [ ] Narration
- [ ] Upload to YouTube

### Submission
- [ ] GitHub repo polish (README, screenshots)
- [ ] Deploy frontend to Vercel
- [ ] Create Colosseum project entry
- [ ] Submit with all links

### Forum Engagement
- [ ] Create project post
- [ ] Comment on related projects
- [ ] Upvote interesting projects
- [ ] Answer questions on our post

---

## 🚫 BLOCKED / WAITING

- [ ] **Resend API key** - Need to sign up for email service
- [ ] **PostgreSQL setup** - For agent service (can use SQLite for now)
- [ ] **Domain name** - For email sending (can use default)
- [ ] **Vercel deployment** - Need account + deploy

---

## ⚠️ RISKS TO MONITOR

1. **Smart contract deployment fails** → Debug Anchor setup
2. **Email delivery issues** → Test Resend integration early
3. **Wallet adapter bugs** → Use official examples
4. **Transaction errors** → Add comprehensive error handling
5. **Time running out** → Cut scope if needed (focus on MVP)

---

## 📊 Daily Check-ins

**End of each day, ask:**
- ✅ Can we create a transfer?
- ✅ Does the smart contract work on devnet?
- ✅ Can we send an email?
- ✅ Can someone claim?
- ✅ Is the UI polished?
- ✅ Is it demo-ready?

**If NO to any critical question → prioritize fixing it next day**

---

## 🎯 MVP Definition

**Minimum to submit:**
1. ✅ Smart contract deployed and tested
2. ✅ Frontend can create transfers
3. ✅ Email with claim link sent
4. ✅ Recipient can claim
5. ✅ Demo video showing full flow
6. ✅ GitHub repo is public

**Everything else is bonus.**

---

**Updated:** End of Day 1 (Feb 3, 2026)  
**Next update:** End of Day 2 (Feb 4, 2026)
