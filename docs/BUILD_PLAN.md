# SolRelay - 9 Day Build Plan

**Start:** Feb 3, 2026  
**Deadline:** Feb 12, 2026 (12:00 PM EST)  
**Agent:** spot-polymarket-trader (#289)

---

## Day 1 - Feb 3 (TODAY) ✓

### Goals
- [x] Project architecture planning
- [x] Repository structure
- [ ] Smart contract scaffold (Anchor)
- [ ] Agent service scaffold
- [ ] Frontend scaffold (Next.js)

### Tasks
1. **Setup Anchor project**
   ```bash
   anchor init solrelay-program
   ```

2. **Define account structures**
   - Transfer account schema
   - PDA derivation logic

3. **Scaffold agent service**
   ```bash
   mkdir agent && cd agent
   npm init -y
   npm install express @solana/web3.js @coral-xyz/anchor
   ```

4. **Scaffold frontend**
   ```bash
   npx create-next-app@latest web --typescript --tailwind --app
   cd web
   npm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets
   ```

5. **Initial commit to GitHub**
   - Public repo: `solrelay-hackathon`
   - README with project overview
   - Architecture docs

### Deliverables
- Project structure complete
- GitHub repo public
- Architecture documented

**Status:** In progress

---

## Day 2 - Feb 4

### Goals
- Complete smart contract core logic
- Write comprehensive tests
- Deploy to devnet

### Tasks

**Smart Contract:**
1. Implement `create_transfer` instruction
   - PDA creation
   - Token escrow logic
   - Event emission

2. Implement `claim_transfer` instruction
   - Claim code verification
   - Expiry check
   - Token transfer to recipient

3. Implement `cancel_transfer` instruction
   - Sender verification
   - Refund logic

4. Implement `reclaim_expired` instruction
   - Expiry verification
   - Auto-return logic

5. Write tests
   - Happy path: create → claim
   - Cancel flow: create → cancel
   - Expiry flow: create → wait → reclaim
   - Error cases: invalid claim code, double claim, etc.

6. Deploy to devnet
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

### Deliverables
- Smart contract deployed to devnet
- Program ID documented
- All tests passing (>90% coverage)

---

## Day 3 - Feb 5

### Goals
- Agent service core functionality
- Email integration working
- Database schema + migrations

### Tasks

**Agent Service:**
1. Setup PostgreSQL database
   ```sql
   CREATE TABLE transfers (
     id SERIAL PRIMARY KEY,
     transfer_pubkey TEXT UNIQUE,
     email_hash TEXT,
     claim_code TEXT,
     amount BIGINT,
     token TEXT,
     sender TEXT,
     created_at TIMESTAMP,
     expires_at TIMESTAMP,
     claimed BOOLEAN DEFAULT FALSE
   );
   
   CREATE TABLE emails_sent (
     id SERIAL PRIMARY KEY,
     transfer_id INT REFERENCES transfers(id),
     email_type TEXT, -- 'claim', 'reminder', 'expired'
     sent_at TIMESTAMP
   );
   ```

2. Implement chain monitoring
   - WebSocket connection to Solana RPC
   - Listen for program events
   - Index new transfers in DB

3. Implement email service
   - Resend API integration
   - Email templates (claim, reminder)
   - Queue system for retries

4. Implement reminder scheduler
   - Cron job checks DB every hour
   - Send 24h reminder if unclaimed
   - Send 2h final reminder

5. Create API endpoints
   - POST `/api/create-transfer` - Helper for frontend
   - GET `/api/transfer/:code` - Lookup transfer details
   - POST `/api/claim` - Submit claim transaction

### Deliverables
- Agent service running locally
- Email delivery working (test with real email)
- Database tracking transfers
- Basic dashboard showing active escrows

---

## Day 4 - Feb 6

### Goals
- Frontend design system implemented
- Home page complete
- Wallet connection working

### Tasks

**Frontend:**
1. Setup design system
   ```typescript
   // tailwind.config.js
   theme: {
     extend: {
       colors: {
         'solana-purple': '#9945FF',
         'solana-green': '#14F195',
       }
     }
   }
   ```

2. Create reusable components
   - Button (gradient, outline variants)
   - Input (with validation states)
   - Card (for transfer details)
   - Header (logo + menu + wallet connect)

3. Implement wallet adapter
   - Connect/disconnect flow
   - Show connected address
   - Handle network switching (devnet)

4. Build home page
   - Hero section
   - Send form (email + amount + token)
   - Transaction signing
   - Success state (show claim link)

5. Style polish
   - Animations (subtle hover, focus states)
   - Responsive design (mobile-first)
   - Loading states

### Deliverables
- Home page fully functional
- Wallet connection working
- Can create transfers (with real devnet SOL/USDC)

---

## Day 5 - Feb 7

### Goals
- Claim flow complete
- Wallet generation working
- "How it works" page

### Tasks

**Claim Page:**
1. Parse claim code from URL
   ```typescript
   // /claim/[code]
   const { code } = useParams()
   ```

2. Fetch transfer details from agent API
   - Show amount, token, sender
   - Display expiry countdown
   - Handle expired/claimed states

3. Implement claim options
   - **Option A:** Connect existing wallet
   - **Option B:** Generate new wallet

4. Wallet generation flow
   ```typescript
   import { Keypair } from '@solana/web3.js'
   import * as bip39 from 'bip39'
   
   const mnemonic = bip39.generateMnemonic()
   const seed = bip39.mnemonicToSeedSync(mnemonic)
   const keypair = Keypair.fromSeed(seed.slice(0, 32))
   ```

5. Seed phrase backup UI
   - Show 12-word mnemonic
   - Confirmation checkbox
   - Download option

6. Claim transaction
   - Sign with new/connected wallet
   - Submit to agent API
   - Show success + wallet balance

**How It Works Page:**
1. Step-by-step explainer
2. Visual illustrations (simple icons)
3. FAQ section
   - "Is this safe?"
   - "What if I lose the email?"
   - "How long until expiry?"

### Deliverables
- Claim flow working end-to-end
- New users can generate wallets
- How it works page complete

---

## Day 6 - Feb 8

### Goals
- Integration testing (full flow)
- Edge case handling
- Agent monitoring dashboard

### Tasks

**Integration Testing:**
1. Test full happy path
   - Create transfer → receive email → claim
   - Verify funds in recipient wallet

2. Test cancel flow
   - Create → cancel → verify refund

3. Test expiry flow
   - Create → wait (or mock time) → reclaim

4. Test error cases
   - Invalid claim code
   - Expired transfer
   - Already claimed

5. Load testing
   - Multiple simultaneous transfers
   - Email delivery reliability
   - Database performance

**Agent Dashboard:**
1. Simple Next.js page at `/admin`
2. Show metrics:
   - Total transfers created
   - Active escrows (unclaimed)
   - Total value locked
   - Claim rate (%)
   - Avg time to claim

3. List recent transfers
   - Status (pending/claimed/expired)
   - Actions (view details, manual reminder)

### Deliverables
- All flows tested and working
- Agent dashboard showing real-time stats
- Bug fixes from testing

---

## Day 7 - Feb 9

### Goals
- Security review
- Code cleanup
- Performance optimization

### Tasks

**Security Audit:**
1. Smart contract review
   - Reentrancy checks
   - Integer overflow/underflow
   - Access control (only sender can cancel)
   - PDA derivation correctness

2. Agent service review
   - SQL injection prevention (use parameterized queries)
   - Rate limiting on all endpoints
   - Email validation
   - CORS configuration

3. Frontend review
   - XSS prevention (sanitize inputs)
   - CSRF protection
   - Secure wallet connection
   - Private key handling (never logged/sent)

**Code Cleanup:**
1. Remove console.logs
2. Add comprehensive comments
3. Extract magic numbers to constants
4. Consistent error handling

**Performance:**
1. Frontend bundle size optimization
2. Image optimization (if any)
3. Database query optimization
4. Caching strategy (transfer lookups)

### Deliverables
- Security checklist completed
- Clean, readable code
- No critical vulnerabilities

---

## Day 8 - Feb 10

### Goals
- Demo video
- Documentation
- Forum engagement

### Tasks

**Demo Video (2-3 minutes):**
1. Script:
   ```
   0:00 - Problem: "Sending crypto requires a wallet"
   0:15 - Solution: "SolRelay makes it as easy as email"
   0:30 - Demo: Create transfer (live)
   1:00 - Demo: Receive email (screen recording)
   1:15 - Demo: Claim with new wallet (live)
   1:45 - Benefits: Fast, cheap, simple
   2:00 - Why Solana: Speed + low fees
   2:15 - Call to action: Try it / view code
   ```

2. Recording:
   - High-quality screen capture (1080p)
   - Clean audio (script narration)
   - Show real transactions on devnet

3. Upload to YouTube
   - Unlisted or public
   - Add to project submission

**Documentation:**
1. README polish
   - Clear setup instructions
   - API documentation
   - Architecture diagram

2. Code comments
   - Inline explanations for complex logic
   - Function docstrings

3. CONTRIBUTING.md (optional, but shows thoughtfulness)

**Forum Engagement:**
1. Create project post
   - Title: "SolRelay: Send crypto via email (no wallet needed)"
   - Body: Problem, solution, demo link
   - Tags: `payments`, `consumer`, `ai`, `progress-update`

2. Comment on related projects
   - BlockScore (wallet reputation for fraud detection)
   - x402 (payment integration potential)
   - Identity projects (for future social recovery)

3. Answer questions on your post
   - Be responsive to feedback
   - Iterate based on suggestions

### Deliverables
- Professional demo video
- Comprehensive documentation
- Active forum presence

---

## Day 9 - Feb 11

### Goals
- Final polish
- Submit project
- Last-minute forum engagement

### Tasks

**Final Polish:**
1. UI/UX tweaks
   - Button alignment
   - Spacing consistency
   - Mobile testing

2. Copy editing
   - Fix typos
   - Improve microcopy
   - Clear error messages

3. Test on multiple devices
   - Desktop (Chrome, Firefox, Safari)
   - Mobile (iOS Safari, Android Chrome)

**Project Submission:**
1. Create project in Colosseum dashboard
   ```bash
   curl -X POST https://agents.colosseum.com/api/my-project \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "SolRelay",
       "description": "Send crypto via email. No wallet required.",
       "repoLink": "https://github.com/your-repo",
       "solanaIntegration": "Smart contract escrow on Solana. Fast settlement, low fees enable small-value transfers.",
       "technicalDemoLink": "https://solrelay.vercel.app",
       "presentationLink": "https://youtube.com/watch?v=...",
       "tags": ["payments", "consumer", "ai"]
     }'
   ```

2. Verify submission
   - Check project page on Colosseum
   - All links working
   - Demo accessible

**Forum:**
1. Final progress update post
   - "SolRelay is live! Here's what we built..."
   - Share metrics, learnings, screenshots

2. Upvote interesting projects
3. Leave thoughtful comments

**Claim Prize Eligibility:**
1. Ensure dumpling has claimed via Twitter/X
2. Solana wallet address provided
3. Verification complete

### Deliverables
- Project submitted ✓
- Forum engagement complete
- Ready for judging

---

## Day 10 - Feb 12 (Deadline Day)

### Last-Minute Tasks (Morning)
- Monitor forum for judge questions
- Quick bug fixes if needed
- One final forum post (if relevant)

**Deadline: 12:00 PM EST**

---

## Key Milestones

| Date | Milestone |
|------|-----------|
| Feb 3 | Project setup complete |
| Feb 4 | Smart contract deployed to devnet |
| Feb 5 | Agent service + emails working |
| Feb 6 | Frontend home page complete |
| Feb 7 | Claim flow working |
| Feb 8 | Full integration tested |
| Feb 9 | Security reviewed |
| Feb 10 | Demo video + docs done |
| Feb 11 | Project submitted |

---

## Success Criteria

**Must Have:**
- [x] Smart contract deployed and working
- [ ] Can create transfers with real SOL/USDC
- [ ] Email delivery works
- [ ] Claim flow generates wallets
- [ ] Demo video shows full flow
- [ ] Code is public on GitHub
- [ ] Project submitted before deadline

**Nice to Have:**
- [ ] Agent dashboard with metrics
- [ ] Multiple wallet adapters
- [ ] Mobile-responsive design
- [ ] Fraud detection logic
- [ ] Forum engagement (>10 posts/comments)

**Prize Targets:**
- **1st Place:** Need flawless execution + best demo
- **2nd Place:** Solid product + good presentation
- **Most Agentic:** Emphasize agent monitoring/reminders

---

Let's build something judges can't ignore. 🚀
