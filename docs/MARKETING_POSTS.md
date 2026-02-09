# SolRelay Marketing Posts

## Target Communities

### Reddit
- **r/solana** - Main Solana community (~350k members)
- **r/SolanaDev** - Developer-focused Solana discussion
- **r/CryptoCurrency** - General crypto community (7M+ members)
- **r/defi** - DeFi enthusiasts

### Discord
- **Solana Tech Discord** - Official Solana developer community
- **Colosseum Discord** - Hackathon community
- **Superteam Discord** - Solana ecosystem builders

### Other
- **Solana Stack Exchange** - Technical Q&A
- **Twitter/X** - #Solana community
- **Hacker News** - Tech-focused audience (Show HN)

---

## Post 1: Technical Deep-Dive (r/SolanaDev, Solana Stack Exchange)

### Title: Built a non-custodial email-to-crypto escrow on Solana - here's how it works

---

Hey everyone! Just wrapped up a project for the Colosseum Agent Hackathon and wanted to share the technical details since I think the architecture might be interesting to other devs.

**The problem:** Sending crypto to someone without a wallet is painful. You either have to walk them through wallet setup first, or use a custodial service where you're trusting a third party with funds.

**The solution:** SolRelay - non-custodial email escrow using PDAs and SHA-256 commitment schemes.

### How it works under the hood:

1. **Sender creates transfer** - Funds get locked in a PDA derived from a unique transfer ID. The escrow account stores a SHA-256 hash of a claim secret, never the secret itself.

2. **Email contains claim link** - Recipient gets a link with the claim secret embedded. This secret is never stored on-chain or on any server.

3. **Recipient claims** - They can either:
   - Create a fresh wallet through the UI
   - Connect an existing wallet
   - The contract verifies `sha256(provided_secret) == stored_hash` before releasing funds

4. **Auto-refund mechanism** - If unclaimed after 72 hours, sender can reclaim. Timestamp checked on-chain, no oracle needed.

### Security considerations:

- **Zero custody** - We never hold private keys or claim secrets
- **Hash commitment** - Even if someone compromises the escrow account data, they can't derive the claim secret
- **PDA-based escrow** - Funds can only move via the program's defined instructions
- **Sender cancel** - Can cancel anytime before claim (nice UX, also good security if email was sent to wrong address)

**Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

The frontend is a React app with wallet-adapter integration. Dark mode with Solana brand colors because we're not animals.

Would love technical feedback! Particularly interested in thoughts on:
- The hash commitment approach vs alternatives
- Any edge cases in the refund timing logic
- Gas optimization ideas

**Try it:** <https://solrelay.io>

---

## Post 2: User-Focused (r/solana, r/CryptoCurrency)

### Title: Finally solved the "my friend doesn't have a wallet" problem - send SOL/USDC to any email

---

You know that moment when you want to split dinner in crypto, or pay a freelancer, or send a gift... and then you find out they don't have a wallet?

Usually that means either:
- 30-minute "let me walk you through setting up Phantom" call
- Giving up and using Venmo like a peasant
- Using some sketchy custodial thing

Just shipped something that fixes this: **SolRelay**

**How it works:**
1. You enter their email address + amount (SOL or USDC)
2. They get an email with a claim link
3. They click, create a wallet (or connect existing one), boom - crypto received

That's it. No wallet address needed upfront.

**The nice bits:**
- **Not custodial** - Funds sit in an on-chain escrow (Solana smart contract), not some company's wallet
- **Auto-refund** - If they don't claim within 72h, you get your money back automatically
- **Cancel anytime** - Sent to wrong email? Just cancel before they claim
- **Works on mobile** - Because it's 2024

**Use cases I've found helpful:**
- Onboarding crypto-curious friends/family without the wallet setup friction
- Paying freelancers internationally (especially USDC)
- Birthday/holiday crypto gifts
- Splitting bills with the one friend who "doesn't do crypto yet"

Built this for the Colosseum hackathon but it's fully functional. Give it a spin and let me know what you think!

**Try it:** <https://solrelay.io>

Happy to answer questions about how it works under the hood.

---

## Post 3: Community/Hackathon (Colosseum Discord, Superteam, Twitter)

### Title: [Hackathon Submission] SolRelay - Email-based crypto transfers, built with AI assistance 🤖

---

Hey Colosseum fam! 👋

Excited to share what I've been building: **SolRelay** - send SOL or USDC to anyone using just their email address.

### The Vision
Crypto adoption is still held back by wallet friction. My mom shouldn't need to understand seed phrases just to receive $50 from me. SolRelay abstracts that away while keeping everything non-custodial and on-chain.

### What I Built
- ✅ On-chain escrow smart contract (Anchor/Rust)
- ✅ React frontend with wallet-adapter
- ✅ Email notification system
- ✅ Claim flow that works for crypto newbies AND existing wallet users
- ✅ 72h auto-refund mechanism
- ✅ Transfer history & cancellation
- ✅ Dark mode with proper Solana branding 💜

### The AI Agent Angle 🤖
True to the hackathon theme - significant portions of this were pair-programmed with Claude. From debugging Anchor IDL issues to crafting the email templates to optimizing the claim UX flow. It's genuinely impressive how much faster you can ship when you've got an AI that understands Solana's quirks.

Some highlights:
- Contract architecture decisions made through AI discussion
- UI/UX iterations with instant feedback
- Bug hunting that would've taken hours manually

### Links
- 🌐 **Live Demo:** <https://solrelay.io>
- 📜 **Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

### What's Next
- Multi-token support beyond SOL/USDC
- Batch sends (payroll use case)
- Mobile app
- Custom claim page branding for businesses

Would love feedback from the community! Try sending yourself a test transfer and let me know how the flow feels.

LFG 🚀

---

## Post 4: Twitter/X Thread

---

**Tweet 1:**
Sending crypto to someone without a wallet is still weirdly hard in 2024.

Built @SolRelay to fix it: send SOL/USDC to any email address. Recipient doesn't need a wallet yet.

Non-custodial. Auto-refund if unclaimed. Try it 👇

solrelay.io

**Tweet 2:**
How it works:

1️⃣ Enter email + amount
2️⃣ Funds go to on-chain escrow (not our wallet)
3️⃣ Recipient gets email with claim link
4️⃣ They create wallet OR connect existing
5️⃣ Claim releases funds directly to them

If unclaimed after 72h → auto-refund to sender

**Tweet 3:**
Why non-custodial matters:

- Your funds sit in a Solana smart contract, not a company wallet
- Claim uses cryptographic proof, not trust
- We literally cannot access your money
- Verify yourself: 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h

**Tweet 4:**
Use cases:

🎁 Crypto gifts to non-crypto family
💸 Pay freelancers internationally
🍕 Split bills with wallet-less friends
🧑‍💻 Onboard new users without friction
💰 USDC payments without banking hassle

**Tweet 5:**
Built for @ColosseumOrg Agent Hackathon

The AI-assisted dev experience was 🔥 - pair programming with Claude for everything from Anchor contracts to React components.

More builders should try this workflow. Ship faster, learn faster.

Try SolRelay: solrelay.io

---

## Posting Guidelines

### Do's:
- ✅ Post in relevant threads/channels, not just new posts
- ✅ Engage with comments genuinely
- ✅ Answer technical questions in detail
- ✅ Share in "What are you building?" threads
- ✅ Cross-post hackathon submission to official channels

### Don'ts:
- ❌ Spam multiple subreddits simultaneously
- ❌ Use overly promotional language
- ❌ Ignore criticism - address it thoughtfully
- ❌ Post in off-topic channels
- ❌ Create fake engagement

### Timing:
- Reddit: Weekday mornings (US time zones)
- Twitter: Multiple time zones, thread format
- Discord: During active hours, check channel activity first

---

## Engagement Responses Template

**"Is this safe?"**
> Great question! Funds sit in an on-chain escrow - a Solana smart contract we don't control. The claim process uses cryptographic proof (hash verification), so even we couldn't steal funds if we wanted to. The program ID is public: `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h` - feel free to verify on-chain!

**"What if they never claim?"**
> Auto-refund kicks in after 72 hours. The timestamp is checked on-chain, so it's trustless. You can also manually cancel anytime before they claim if you realize you made a mistake.

**"Why not just use PayPal/Venmo?"**
> Those work great domestically! SolRelay shines for: international transfers (no banking fees), onboarding new crypto users, and keeping everything on-chain/non-custodial. Also USDC is just faster/cheaper than traditional rails for many use cases.

**"Fees?"**
> Just standard Solana transaction fees (fractions of a cent). No platform fee currently.
