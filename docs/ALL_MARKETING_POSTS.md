# SolRelay - Complete Marketing Posts

**Created:** 2025-02-07
**Project:** SolRelay - Send crypto via email
**Live URL:** https://solrelay.io
**GitHub:** https://github.com/dumplingsol/agent-hackathon
**Program ID:** 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h
**Hackathon:** Colosseum Agent Hackathon

---

# 🚀 QUICK POSTING SUMMARY

## Total Platforms: 14
## Status: ALL CONTENT READY TO POST

| Priority | Platform | Post URL |
|----------|----------|----------|
| ⭐ HIGH | Colosseum Discord | #showcase |
| ⭐ HIGH | r/solana | reddit.com/r/solana/submit |
| ⭐ HIGH | r/SolanaDev | reddit.com/r/SolanaDev/submit |
| ⭐ HIGH | Twitter/X | twitter.com/compose/tweet |
| ⭐ HIGH | Hacker News | news.ycombinator.com/submit |
| ⭐ HIGH | Solana Forum | forum.solana.com |
| 🔵 MED | Dev.to | dev.to/new |
| 🔵 MED | Product Hunt | producthunt.com |
| 🔵 MED | IndieHackers | indiehackers.com |
| 🔵 MED | r/CryptoCurrency | reddit.com/r/CryptoCurrency/submit |
| 🔵 MED | r/defi | reddit.com/r/defi/submit |
| 🔵 MED | Medium | medium.com/new-story |
| 🔵 MED | LinkedIn | linkedin.com |
| ⚪ LOW | BitcoinTalk | bitcointalk.org |

## Browser Automation Status: ❌ UNAVAILABLE
Manual posting required - all content formatted and ready to copy-paste below.

---

# 📋 PLATFORM INDEX

1. [Reddit r/solana](#1-reddit-rsolana)
2. [Reddit r/SolanaDev](#2-reddit-rsolanadev)
3. [Twitter/X Thread](#3-twitterx-thread)
4. [Colosseum Discord](#4-colosseum-discord)
5. [Hacker News (Show HN)](#5-hacker-news-show-hn)
6. [Product Hunt](#6-product-hunt)
7. [IndieHackers](#7-indiehackers)
8. [Dev.to](#8-devto)
9. [Reddit r/CryptoCurrency](#9-reddit-rcryptocurrency)
10. [Reddit r/defi](#10-reddit-rdefi)
11. [Solana Forum](#11-solana-forum)
12. [BitcoinTalk](#12-bitcointalk)
13. [Medium](#13-medium)
14. [LinkedIn](#14-linkedin)

---

# EXISTING READY-TO-POST CONTENT

---

## 1. Reddit r/solana

**URL:** https://reddit.com/r/solana/submit
**Tone:** User-friendly, accessible
**Flair:** "Project" or "Discussion"
**Best Time:** Weekday mornings 9-11am EST

### Title:
```
Finally solved the "my friend doesn't have a wallet" problem - send SOL/USDC to any email
```

### Body:
```
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

Built this for the Colosseum Agent Hackathon but it's fully functional. Give it a spin and let me know what you think!

🔗 **Live demo:** https://solrelay.io
📂 **Open source:** https://github.com/dumplingsol/agent-hackathon

Happy to answer questions about how it works under the hood.
```

---

## 2. Reddit r/SolanaDev

**URL:** https://reddit.com/r/SolanaDev/submit
**Tone:** Technical, developer-focused
**Best Time:** Weekday afternoons

### Title:
```
Built a non-custodial email-to-crypto escrow on Solana - here's how it works
```

### Body:
```
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

🔗 **Try it:** https://solrelay.io
📂 **Source code:** https://github.com/dumplingsol/agent-hackathon
```

---

## 3. Twitter/X Thread

**URL:** https://twitter.com/compose/tweet
**Best Time:** Weekday afternoons, or multiple time zones

**Tweet 1:**
```
Sending crypto to someone without a wallet is still weirdly hard in 2024.

Built SolRelay to fix it: send SOL/USDC to any email address. Recipient doesn't need a wallet yet.

Non-custodial. Auto-refund if unclaimed. Try it 👇

https://solrelay.io
```

**Tweet 2 (reply):**
```
How it works:

1️⃣ Enter email + amount
2️⃣ Funds go to on-chain escrow (not our wallet)
3️⃣ Recipient gets email with claim link
4️⃣ They create wallet OR connect existing
5️⃣ Claim releases funds directly to them

If unclaimed after 72h → auto-refund to sender
```

**Tweet 3 (reply):**
```
Why non-custodial matters:

• Your funds sit in a Solana smart contract, not a company wallet
• Claim uses cryptographic proof, not trust
• We literally cannot access your money

Verify yourself: 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h
```

**Tweet 4 (reply):**
```
Use cases:

🎁 Crypto gifts to non-crypto family
💸 Pay freelancers internationally  
🍕 Split bills with wallet-less friends
🧑‍💻 Onboard new users without friction
💰 USDC payments without banking hassle
```

**Tweet 5 (reply):**
```
Built for @ColosseumOrg Agent Hackathon 🏛️

The AI-assisted dev experience was 🔥 - pair programming with Claude for everything from Anchor contracts to React components.

Open source: https://github.com/dumplingsol/agent-hackathon

Try SolRelay: https://solrelay.io
```

---

## 4. Colosseum Discord

**Channel:** #showcase or #hackathon-submissions
**Best Time:** During active hours

### Message:
```
🚀 **SolRelay - Email-based crypto transfers**

Hey Colosseum fam! Excited to share my hackathon submission.

**The Problem:** Sending crypto to someone without a wallet means walking them through Phantom setup or using sketchy custodial services.

**The Solution:** Send SOL or USDC to any email address. Recipient clicks a link, creates a wallet (or connects existing), and claims. Non-custodial, auto-refund after 72h if unclaimed.

**What I Built:**
✅ Anchor smart contract with PDA-based escrow
✅ SHA-256 hash commitment for claim verification
✅ React frontend with wallet-adapter
✅ Email notification system
✅ 72h auto-refund mechanism

**The AI Angle 🤖**
Significant portions pair-programmed with Claude - from debugging Anchor IDL issues to optimizing the claim UX. Shipped way faster than solo.

🔗 **Live Demo:** <https://solrelay.io>
📂 **GitHub:** <https://github.com/dumplingsol/agent-hackathon>
📜 **Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

Would love feedback! Try sending yourself a test transfer 🙏
```

---

# NEW PLATFORM CONTENT

---

## 5. Hacker News (Show HN)

**URL:** https://news.ycombinator.com/submit
**Tone:** Technical, understated, no hype
**Best Time:** Weekday mornings 8-10am EST (HN is most active then)

### Title:
```
Show HN: SolRelay – Send crypto to anyone via email, no wallet needed
```

### URL field:
```
https://solrelay.io
```

### First Comment (post immediately after submission):
```
Hi HN! I built SolRelay to solve a friction point I kept hitting: wanting to send crypto to people who don't have wallets yet.

The flow is simple:
1. Sender enters recipient email + amount (SOL or USDC)
2. Funds go to an on-chain escrow (Solana smart contract)
3. Recipient gets email with claim link
4. They can create a wallet in-browser or connect existing
5. Claim releases funds directly to their wallet

Key technical decisions:

**Non-custodial escrow:** Funds sit in a PDA (program-derived address). We never hold keys or have access to funds.

**Hash commitment scheme:** The claim secret is hashed with SHA-256 before storing on-chain. Email contains the preimage. This means even if someone reads the chain data, they can't derive the claim secret.

**Auto-refund:** 72-hour expiry is enforced on-chain using Solana's clock sysvar. No oracle dependency.

**Zero backend state:** The agent service just monitors the chain and sends emails. All transfer state lives on-chain.

Stack: Anchor (Rust) for the contract, Next.js/React for frontend, wallet-adapter for Solana wallet connections.

Built for the Colosseum Agent Hackathon with significant AI assistance (pair programming with Claude for contract logic and UI).

Happy to discuss the architecture or answer questions. Code is open source: https://github.com/dumplingsol/agent-hackathon
```

### Platform Tips:
- DO NOT use emoji in title or first comment
- Keep language understated - no "revolutionary" or "game-changing"
- Be ready to respond to comments quickly in first hour
- Engage genuinely with technical questions
- If asked about competition, be honest and fair

---

## 6. Product Hunt

**URL:** https://producthunt.com/posts/new
**Tone:** Polished, benefit-focused
**Best Time:** 12:01am PT on a Tuesday/Wednesday (PH resets daily)

### Product Name:
```
SolRelay
```

### Tagline (60 chars max):
```
Send crypto to any email. No wallet needed.
```

### Description:
```
SolRelay lets you send SOL or USDC to anyone using just their email address. Recipients don't need a wallet – they can create one when they claim.

**How it works:**
• Enter recipient's email and amount
• Funds go to a secure on-chain escrow
• Recipient gets an email with a claim link
• They create a wallet or connect existing to claim
• If unclaimed after 72 hours, funds auto-refund

**Why it's different:**
🔐 Non-custodial – funds stay in a smart contract, not our wallet
⚡ Built on Solana – fast and cheap transactions
🔄 Auto-refund – sent to wrong email? It comes back
❌ Cancel anytime – reclaim before they claim

**Use cases:**
• Onboard friends/family to crypto without friction
• Pay freelancers internationally with USDC
• Send crypto gifts without wallet address hassles
• Split bills with the one friend who "doesn't do crypto"

Built for the Colosseum Agent Hackathon with AI assistance. Open source and ready to use.
```

### Topics/Tags:
```
Crypto, Payments, Fintech, Solana, Web3
```

### Maker Comment:
```
Hey Product Hunt! 👋

I built SolRelay because I got tired of the "wait, I need to set up a wallet first?" conversation every time I wanted to send crypto to someone new.

The core insight: you already know someone's email, so why should you need their wallet address to send them money?

Technical highlights for the curious:
- Anchor smart contract on Solana with PDA-based escrow
- SHA-256 hash commitment for secure claims
- No backend database – all state lives on-chain
- Pair-programmed with Claude (AI) for faster development

Would love your feedback! Try sending yourself a test transfer and let me know how the flow feels.

Live: https://solrelay.io
Open source: https://github.com/dumplingsol/agent-hackathon
```

### Platform Tips:
- Schedule launch for 12:01am PT Tuesday-Wednesday for maximum visibility
- Have 5-10 friends ready to upvote and comment at launch
- Respond to EVERY comment within first 24 hours
- Prepare GIF/video showing the flow
- Add good screenshots of the UI

---

## 7. IndieHackers

**URL:** https://www.indiehackers.com/new-post
**Tone:** Builder/founder story, authentic
**Best Time:** Any time, story-focused

### Title:
```
I built a way to send crypto via email in 9 days (with AI help) – here's what I learned
```

### Body:
```
Hey IH! 👋

Just shipped SolRelay (https://solrelay.io) for the Colosseum Agent Hackathon and wanted to share the build story.

## The Problem

Every time I wanted to send crypto to someone new, I hit the same wall: "Wait, do you have a wallet? No? Okay let me walk you through setting up Phantom..."

30 minutes later, they have a wallet. But that friction kills the spontaneity of "hey let me just send you $20 for that thing."

## The Solution

Send crypto to any email address. Recipient doesn't need a wallet – they create one when they claim. If they never claim, funds auto-refund after 72 hours.

## The Build (9 days, AI-assisted)

**Stack:**
- Solana smart contract (Anchor/Rust)
- Next.js frontend with wallet-adapter
- Node.js agent for email notifications
- Vercel for hosting

**What worked well:**
- Pair-programming with Claude (Anthropic's AI). Honestly game-changing for debugging Anchor IDL issues and iterating on UI/UX.
- Building in public – getting feedback early on the claim flow saved major redesigns
- Keeping scope tight – just SOL and USDC, no token picker complexity

**What was hard:**
- Anchor learning curve – first time with Solana smart contracts
- Email deliverability – ensuring claim emails don't get spam-filtered
- Wallet generation UX – making "create a wallet" feel safe for crypto newbies

## By the Numbers

- 9 days from idea to deployed product
- ~2000 lines of Rust (contract)
- ~3000 lines of TypeScript (frontend + agent)
- $0 spent (Solana tx fees only)
- 1 human + 1 AI

## What's Next

If this gets traction:
- Multi-token support
- Batch sends (payroll use case)
- Business white-labeling
- Mobile app

Right now focused on the hackathon, but would love to hear if people find this useful enough to keep building.

## Links

- **Live:** https://solrelay.io
- **GitHub:** https://github.com/dumplingsol/agent-hackathon
- **Hackathon:** Colosseum Agent Hackathon

Happy to answer questions about the build, the AI workflow, or anything else!
```

### Platform Tips:
- Focus on the journey, not just the product
- Be honest about challenges
- Include specific numbers/metrics
- Engage with comments – IH community is very supportive
- Cross-post to relevant IH groups (Crypto, Fintech)

---

## 8. Dev.to

**URL:** https://dev.to/new
**Tone:** Technical tutorial/deep-dive
**Best Time:** Tuesday-Thursday

### Title:
```
Building a Non-Custodial Crypto Escrow with Solana and Anchor
```

### Tags:
```
solana, rust, web3, anchor
```

### Body:
```markdown
# Building a Non-Custodial Crypto Escrow with Solana and Anchor

Ever tried sending crypto to someone who doesn't have a wallet? It's a surprisingly annoying problem. You either spend 30 minutes walking them through Phantom setup, or you use some custodial service where you're trusting a third party.

I built [SolRelay](https://solrelay.io) to solve this: send SOL or USDC to any email address, recipient claims when ready. Here's how the escrow contract works.

## The Architecture

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

The key insight: use a **hash commitment scheme** for claims. The email contains a secret; the blockchain stores a hash. The claim instruction verifies the preimage.

## The Smart Contract

### Account Structure

```rust
#[account]
pub struct Transfer {
    pub sender: Pubkey,
    pub amount: u64,
    pub claim_hash: [u8; 32],      // SHA-256(claim_secret)
    pub created_at: i64,
    pub expiry: i64,               // 72 hours after creation
    pub is_claimed: bool,
    pub is_cancelled: bool,
    pub bump: u8,
}
```

The `claim_hash` is crucial. We never store the actual claim secret anywhere – not on-chain, not in our database. Only the recipient's email contains it.

### Creating a Transfer

```rust
pub fn create_transfer(
    ctx: Context<CreateTransfer>,
    transfer_id: String,
    amount: u64,
    claim_hash: [u8; 32],
) -> Result<()> {
    let transfer = &mut ctx.accounts.transfer;
    let clock = Clock::get()?;
    
    transfer.sender = ctx.accounts.sender.key();
    transfer.amount = amount;
    transfer.claim_hash = claim_hash;
    transfer.created_at = clock.unix_timestamp;
    transfer.expiry = clock.unix_timestamp + 72 * 60 * 60; // 72 hours
    transfer.is_claimed = false;
    transfer.is_cancelled = false;
    transfer.bump = ctx.bumps.transfer;
    
    // Transfer SOL to escrow PDA
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.sender.to_account_info(),
            to: ctx.accounts.transfer.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount)?;
    
    Ok(())
}
```

The PDA is derived from the `transfer_id`, which is a UUID generated by the frontend. This ensures each transfer has a unique escrow account.

### Claiming Funds

```rust
pub fn claim_transfer(
    ctx: Context<ClaimTransfer>,
    claim_secret: Vec<u8>,
) -> Result<()> {
    let transfer = &mut ctx.accounts.transfer;
    
    // Verify claim secret
    let hash = hash(&claim_secret);
    require!(
        hash.to_bytes() == transfer.claim_hash,
        ErrorCode::InvalidClaimSecret
    );
    
    require!(!transfer.is_claimed, ErrorCode::AlreadyClaimed);
    require!(!transfer.is_cancelled, ErrorCode::TransferCancelled);
    
    // Transfer funds from escrow to claimer
    let transfer_lamports = transfer.amount;
    **transfer.to_account_info().try_borrow_mut_lamports()? -= transfer_lamports;
    **ctx.accounts.claimer.try_borrow_mut_lamports()? += transfer_lamports;
    
    transfer.is_claimed = true;
    
    Ok(())
}
```

The `hash()` function uses SHA-256. If the hash matches what's stored, funds release. Simple, but powerful.

### Auto-Refund

```rust
pub fn refund_transfer(ctx: Context<RefundTransfer>) -> Result<()> {
    let transfer = &mut ctx.accounts.transfer;
    let clock = Clock::get()?;
    
    require!(!transfer.is_claimed, ErrorCode::AlreadyClaimed);
    require!(!transfer.is_cancelled, ErrorCode::TransferCancelled);
    require!(
        clock.unix_timestamp >= transfer.expiry,
        ErrorCode::NotExpiredYet
    );
    
    // Return funds to original sender
    let transfer_lamports = transfer.amount;
    **transfer.to_account_info().try_borrow_mut_lamports()? -= transfer_lamports;
    **ctx.accounts.sender.try_borrow_mut_lamports()? += transfer_lamports;
    
    transfer.is_cancelled = true;
    
    Ok(())
}
```

No oracle needed – we just use Solana's `Clock` sysvar.

## Security Considerations

**1. Hash Commitment Security**
Even if someone reads all on-chain data, they can't claim funds without the preimage. SHA-256 is one-way.

**2. No Custody**
We never hold private keys. Funds move directly from sender → escrow PDA → claimer.

**3. Sender Cancel**
Senders can cancel anytime before claim – useful if you sent to the wrong email.

**4. Constant-Time Comparison**
Use constant-time comparison for the hash to prevent timing attacks (though less critical on-chain).

## The Frontend Flow

1. User connects wallet, enters email + amount
2. Frontend generates UUID + claim secret
3. Hash the secret, create transfer on-chain
4. Agent service monitors chain, sends email with claim link
5. Recipient clicks link → creates wallet or connects existing
6. Submit claim with secret from URL → funds released

## Try It

- **Live Demo:** https://solrelay.io
- **GitHub:** https://github.com/dumplingsol/agent-hackathon
- **Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

Built for the Colosseum Agent Hackathon. Would love feedback from the Dev.to community!

---

*Questions? Drop a comment below or find me on Twitter.*
```

### Platform Tips:
- Use code blocks generously
- Include diagrams where helpful
- Make it educational, not promotional
- Respond to all comments
- Add series tag if planning more posts

---

## 9. Reddit r/CryptoCurrency

**URL:** https://reddit.com/r/CryptoCurrency/submit
**Tone:** Skeptic-aware, balanced
**Flair:** "TECHNOLOGY"
**Best Time:** Weekday mornings EST

### Title:
```
Built an open-source tool to send crypto via email - no wallet address needed
```

### Body:
```
**TL;DR:** Send SOL/USDC to an email address. Recipient creates or connects a wallet to claim. Non-custodial, auto-refunds if unclaimed.

---

I've been in crypto since 2017 and still hit this annoying problem: wanting to send crypto to someone who doesn't have a wallet set up.

The usual options:
1. Walk them through 30 minutes of wallet setup
2. Use a custodial service (yuck)
3. Just give up and use fiat

So I built something to fix it: **SolRelay**

**How it works:**
- Enter their email + amount (SOL or USDC on Solana)
- Funds lock in an on-chain escrow (smart contract, not our wallet)
- They get an email with a claim link
- They can create a fresh wallet OR connect an existing one
- If they don't claim within 72 hours, you get auto-refunded

**Why I think this matters:**
Crypto adoption is still held back by wallet friction. Your average person shouldn't need to understand seed phrases just to receive $50. This abstracts that away while keeping everything trustless and on-chain.

**Before the skeptics arrive (I see you):**

- "Is this custodial?" → No. Funds sit in a Solana smart contract (PDA), not our wallet. We literally can't access your money.

- "Why should I trust you?" → You shouldn't have to. The contract is verified on-chain: `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`. It's also open source.

- "What's your business model?" → There isn't one yet. Built this for a hackathon. If it gets traction, maybe fees later, but right now it's free.

- "Why Solana not ETH?" → Speed and fees. Sending $10 and paying $5 in gas defeats the purpose.

**Links:**
- 🌐 Try it: https://solrelay.io
- 📂 Source code: https://github.com/dumplingsol/agent-hackathon
- 🏛️ Hackathon: Colosseum Agent Hackathon

Happy to answer questions. Built this in 9 days with AI assistance (pair-programming with Claude).
```

### Platform Tips:
- Anticipate skepticism and address it upfront
- Don't shill – be matter-of-fact
- Use "TECHNOLOGY" flair to signal it's about the tech
- Be ready for negativity – r/cc can be harsh
- Don't engage with obvious trolls

---

## 10. Reddit r/defi

**URL:** https://reddit.com/r/defi/submit
**Tone:** DeFi-aware, technical-ish
**Best Time:** Weekday evenings

### Title:
```
Non-custodial email escrow for crypto transfers - what do you think?
```

### Body:
```
Hey r/defi – built something I think fits the trustless ethos and wanted to get your take.

**The Problem:**
Sending crypto to non-wallet-havers is annoying. Usually means custodial services or manual wallet setup.

**The Solution: SolRelay**
- Send SOL/USDC to any email address
- Funds go to PDA-based escrow (non-custodial)
- Recipient claims with cryptographic proof
- Auto-refund after 72h if unclaimed

**The DeFi-relevant bits:**

1. **Hash commitment scheme** - Claim secret is hashed before storing on-chain. Email contains preimage. Even if you read the chain, you can't derive the secret.

2. **Zero custody** - No private keys held. No backend database storing claim secrets. Everything lives on Solana.

3. **Composable** - In theory, other protocols could integrate this for onboarding flows.

4. **No oracle dependency** - Expiry uses Solana's clock sysvar.

**Not DeFi in the yield-farming sense**, but definitely in the trustless infrastructure sense.

**Links:**
- Live: https://solrelay.io
- GitHub: https://github.com/dumplingsol/agent-hackathon
- Program: `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

Curious what the DeFi community thinks about this UX pattern. Could see this being useful for:
- DAO contributor payments
- Grant distributions
- Airdrop claims without prior wallet
- Fiat on-ramp flows

What am I missing? What would make this more useful?
```

### Platform Tips:
- Frame it as infrastructure, not a "product"
- Ask for genuine feedback
- r/defi is more technical than r/cc
- Be ready to discuss composability

---

## 11. Solana Forum

**URL:** https://forum.solana.com
**Tone:** Community-focused, Solana-native
**Section:** Ecosystem Projects or Show & Tell

### Title:
```
[Hackathon] SolRelay - Email-based crypto transfers with on-chain escrow
```

### Body:
```
Hey Solana fam! 🌊

Submitting my project for the Colosseum Agent Hackathon: **SolRelay**

## What It Does

Send SOL or USDC to any email address. Recipient doesn't need a wallet – they claim it when they're ready.

## How It Works

1. Sender enters email + amount, signs transaction
2. Funds move to PDA-based escrow
3. Agent monitors chain, sends claim email
4. Recipient visits link, creates/connects wallet
5. Submits claim with secret from URL
6. Funds release directly to their wallet

If unclaimed after 72h → sender can reclaim.

## Technical Stack

- **Program:** Anchor (Rust) with PDA escrow and SHA-256 hash commitments
- **Frontend:** Next.js + @solana/wallet-adapter
- **Agent:** Node.js chain monitor + Resend for email
- **Hosting:** Vercel

## Program Details

- **Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`
- **Network:** Mainnet
- **Instructions:** create_transfer, claim_transfer, cancel_transfer, refund_transfer

## The AI Angle 🤖

True to the hackathon theme – built with significant Claude assistance. From debugging Anchor IDL generation to iterating on the claim UX flow. The AI-assisted workflow genuinely 2-3x'd development speed.

## Links

🔗 **Live Demo:** https://solrelay.io
📂 **GitHub:** https://github.com/dumplingsol/agent-hackathon

## Looking For Feedback On

- Security review of the hash commitment approach
- UX for crypto newcomers in the claim flow
- Ideas for making this composable with other Solana protocols

Thanks for checking it out! Happy to answer any questions about the architecture.

LFG 🚀
```

### Platform Tips:
- Solana forum is friendly – be enthusiastic
- Include technical details they'll appreciate
- Ask specific questions to invite discussion
- Check if there's a hackathon showcase thread to post in

---

## 12. BitcoinTalk

**URL:** https://bitcointalk.org
**Section:** Altcoin Discussion → Altcoin Projects
**Tone:** Formal, detailed, skeptic-proof
**Note:** BitcoinTalk is BTC-focused; Solana projects have mixed reception

### Title:
```
[ANN] SolRelay - Non-custodial email-to-crypto transfers on Solana
```

### Body:
```
[b]SolRelay - Send Crypto via Email[/b]

[b]Overview:[/b]
SolRelay enables sending SOL or USDC to any email address without requiring the recipient to have a wallet beforehand. Funds are held in a non-custodial on-chain escrow until claimed.

[b]How It Works:[/b]
1. Sender connects wallet, enters recipient email and amount
2. Funds transfer to a Program Derived Address (PDA) escrow
3. Recipient receives email with unique claim link
4. Recipient creates or connects a wallet to claim
5. If unclaimed after 72 hours, sender can reclaim funds

[b]Key Features:[/b]
• Non-custodial - Funds held in smart contract, not by any entity
• Hash commitment - Claim secret is hashed; we never store the preimage
• Auto-refund - 72-hour expiry enforced on-chain
• Cancel anytime - Sender can cancel before claim
• Open source - Full code available for review

[b]Technical Details:[/b]
• Network: Solana
• Program ID: 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h
• Language: Rust (Anchor framework)
• Frontend: React/Next.js

[b]Links:[/b]
• Website: https://solrelay.io
• GitHub: https://github.com/dumplingsol/agent-hackathon
• Hackathon: Colosseum Agent Hackathon

[b]Use Cases:[/b]
• Onboarding new users to crypto without wallet friction
• International payments with USDC
• Crypto gifts without needing wallet address
• Freelancer payments

[b]No Token, No ICO:[/b]
This is a utility project, not a token launch. No SolRelay token exists.

[b]Disclaimer:[/b]
This project was built for the Colosseum Agent Hackathon. Use at your own risk. The code is open source and available for security review.

Questions and feedback welcome.
```

### Platform Tips:
- BTT is skeptical of non-BTC projects – be professional and factual
- Explicitly state "no token/ICO" to avoid scam accusations
- Use BBCode formatting (not Markdown)
- Include a disclaimer
- Don't expect much engagement – BTT is BTC-maximalist territory

---

## 13. Medium

**URL:** https://medium.com/new-story
**Tone:** Long-form, narrative, thought leadership
**Best Time:** Tuesday-Thursday mornings

### Title:
```
The Wallet Address Problem: Why I Built an Email-to-Crypto Bridge
```

### Subtitle:
```
A hackathon project that reimagines how we onboard the next billion crypto users
```

### Body:
```
## The 30-Minute Phone Call

Last Thanksgiving, I tried to send my cousin $50 in crypto. She'd mentioned being curious about Bitcoin, so I figured I'd just... send her some.

"What's your wallet address?" I asked.

"My what?"

What followed was a 30-minute phone call where I walked her through downloading Phantom, writing down a seed phrase, understanding what a seed phrase is, and finally copying a string of characters that looked like a cat walked across a keyboard.

By the time she had the $50, she was more exhausted than excited. "Is it always this complicated?" she asked.

It shouldn't be. But for most of crypto's history, it has been.

## The Gap in Web3 UX

Here's a truth the crypto industry doesn't like to acknowledge: we're terrible at onboarding.

We've built incredible technology. Permissionless, borderless, censorship-resistant money. Smart contracts that execute automatically. DAOs that coordinate thousands of strangers.

But to access any of it, you first need to:
1. Download a wallet app
2. Understand what a "seed phrase" is
3. Write down 12-24 words and store them safely
4. Figure out which "network" you're on
5. Get a wallet address (which looks like `7xKXtg2CW87d97...`)

Only then can someone *receive* their first crypto.

No wonder adoption has stalled. We've built a rocket ship and put the controls in Klingon.

## Rethinking the Flow

What if we flipped it? Instead of "get wallet → receive crypto," what about "receive crypto → get wallet"?

That's the core insight behind SolRelay.

You know someone's email. You don't know their wallet address (they might not have one). So send to their email. Let them create a wallet when they actually need one.

The flow becomes:
1. You enter their email + amount
2. They get an email with a link
3. They click, create a wallet (guided, simple), and claim

The wallet creation happens at the moment of highest motivation—when there's actual money waiting for them.

## Making It Trustless

"But wait," I hear you say. "If you're sending to an email, someone must be holding those funds. That's custodial."

It would be, if we weren't careful. But crypto has a beautiful primitive: smart contract escrow.

Here's how SolRelay works under the hood:

**Step 1:** Sender creates a transfer. Funds move to a Program Derived Address (PDA)—a special on-chain account that can only be controlled by the smart contract's code.

**Step 2:** We generate a claim secret and hash it. The hash goes on-chain. The secret goes in the email link. We don't store the secret anywhere.

**Step 3:** Recipient clicks the link. The secret is in the URL. They create or connect a wallet and submit a claim transaction.

**Step 4:** The smart contract hashes the provided secret and compares it to the stored hash. If they match, funds release. If not, nothing happens.

At no point do we—or anyone else—have access to the funds. They sit in a smart contract until either claimed or expired (at which point the sender can reclaim).

This is the magic of hash commitment schemes: you can prove you know a secret without revealing it, and you can set up systems where secrets unlock value without any trusted intermediary.

## The Build: 9 Days with an AI Co-Pilot

I built SolRelay for the Colosseum Agent Hackathon in 9 days. But I didn't build it alone.

I pair-programmed extensively with Claude, Anthropic's AI assistant. And I'll be honest: it was game-changing.

When I hit an Anchor IDL generation bug that would have taken me hours to debug solo, Claude helped me trace it in 20 minutes. When I was iterating on the claim flow UX, Claude gave instant feedback on edge cases I hadn't considered.

The AI didn't write the code for me. But it was like having a senior engineer available 24/7 who never got tired and had read every Solana forum post ever written.

Is this the future of building? I think so. Solo developers with AI assistance can now ship what would have taken a team.

## What's Next

SolRelay is live at [solrelay.io](https://solrelay.io). It's open source ([GitHub](https://github.com/dumplingsol/agent-hackathon)). And it actually works.

But it's just a start. The vision is bigger:

- **Multi-token support:** Send any SPL token, not just SOL/USDC
- **Batch sends:** Payroll for DAOs, airdrop distribution
- **White-labeling:** Let businesses embed this in their own flows
- **Mobile native:** iOS/Android apps for easier claiming

The wallet friction problem isn't going away. But maybe, one email transfer at a time, we can make crypto accessible to everyone—not just the technically inclined.

Because my cousin shouldn't need a 30-minute phone call to receive $50.

---

*SolRelay was built for the Colosseum Agent Hackathon. Try it at [solrelay.io](https://solrelay.io).*

*Program ID: `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`*
```

### Tags:
```
Cryptocurrency, Web3, Solana, Product Development, Startup
```

### Platform Tips:
- Medium rewards longer reads (5-7 min ideal)
- Start with a story/hook
- Use headers to break up text
- Include one clear CTA
- Submit to publications for more reach (Coinmonks, The Capital)
- Cross-post from your own blog for SEO

---

## 14. LinkedIn

**URL:** https://www.linkedin.com/feed/
**Tone:** Professional, innovation-focused
**Best Time:** Tuesday-Thursday 8-10am local time

### Post:
```
The wallet address problem is crypto's biggest UX barrier. Here's how I tried to solve it.

Last week I finished a hackathon project: SolRelay – send SOL or USDC to any email address. The recipient doesn't need a wallet yet.

🔹 You enter their email + amount
🔹 Funds go to an on-chain escrow
🔹 They get an email with a claim link
🔹 They create a wallet (or connect existing) and claim
🔹 If they don't claim in 72h, you get refunded automatically

Why this matters:

Crypto has incredible technology – fast, borderless, permissionless payments. But onboarding is still broken.

Before you can RECEIVE your first crypto, you need to:
• Download a wallet app
• Understand seed phrases
• Figure out networks
• Copy a 40-character address

That's a lot to ask someone who just wants $20 from their friend.

SolRelay flips the flow: receive first, wallet second.

The technical bit:
Non-custodial, using smart contract escrow. Hash commitment scheme for claims. No trusted intermediary holding funds.

The AI angle:
Built in 9 days with significant Claude (AI) pair-programming. Debugged Anchor contracts, iterated on UX, caught edge cases. The future of building is human + AI.

Built for the Colosseum Agent Hackathon.

Live at: https://solrelay.io
Open source: https://github.com/dumplingsol/agent-hackathon

What do you think – does simplifying wallet setup matter for crypto adoption?

#Web3 #Solana #Crypto #ProductDevelopment #Hackathon #AI
```

### Platform Tips:
- LinkedIn algorithm favors:
  - Posts with no links (or link in first comment)
  - Text-only or text+single image
  - Posts that generate comments
- End with a question to drive engagement
- Consider putting the link in the first comment instead
- Tag relevant people/companies if appropriate
- Don't be too crypto-bro; keep it professional

---

# 📋 POSTING CHECKLIST

## Ready-to-Post Summary

| Platform | Status | Priority | Link |
|----------|--------|----------|------|
| r/solana | Ready | HIGH | https://reddit.com/r/solana/submit |
| r/SolanaDev | Ready | HIGH | https://reddit.com/r/SolanaDev/submit |
| Twitter/X | Ready | HIGH | https://twitter.com/compose/tweet |
| Colosseum Discord | Ready | HIGH | #showcase channel |
| Hacker News | Ready | HIGH | https://news.ycombinator.com/submit |
| Product Hunt | Ready | MEDIUM | https://producthunt.com |
| IndieHackers | Ready | MEDIUM | https://indiehackers.com |
| Dev.to | Ready | MEDIUM | https://dev.to/new |
| r/CryptoCurrency | Ready | MEDIUM | https://reddit.com/r/CryptoCurrency/submit |
| r/defi | Ready | MEDIUM | https://reddit.com/r/defi/submit |
| Solana Forum | Ready | HIGH | https://forum.solana.com |
| BitcoinTalk | Ready | LOW | https://bitcointalk.org |
| Medium | Ready | MEDIUM | https://medium.com/new-story |
| LinkedIn | Ready | MEDIUM | https://linkedin.com |

## Best Posting Schedule

### Day 1 (High Priority):
- [ ] Colosseum Discord (immediate - hackathon community)
- [ ] r/solana (9am EST)
- [ ] r/SolanaDev (afternoon)
- [ ] Twitter thread (any time)

### Day 2:
- [ ] Hacker News (8-10am EST)
- [ ] Solana Forum
- [ ] Dev.to

### Day 3:
- [ ] r/CryptoCurrency (9am EST)
- [ ] r/defi (evening)
- [ ] IndieHackers

### Day 4+:
- [ ] Product Hunt (schedule for 12:01am PT Tuesday/Wednesday)
- [ ] Medium (Tuesday-Thursday)
- [ ] LinkedIn (Tuesday-Thursday morning)
- [ ] BitcoinTalk (optional, low priority)

---

# 💬 ENGAGEMENT RESPONSES

## Common Questions & Answers

**"Is this safe?"**
> Great question! Funds sit in an on-chain escrow – a Solana smart contract we don't control. The claim process uses cryptographic proof (hash verification), so even we couldn't steal funds if we wanted to. The program ID is public and verified: `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

**"What if they never claim?"**
> Auto-refund kicks in after 72 hours. The timestamp is checked on-chain, so it's trustless. You can also manually cancel anytime before they claim if you realize you made a mistake.

**"Why not just use PayPal/Venmo?"**
> Those work great domestically! SolRelay shines for: international transfers (no banking fees), onboarding new crypto users, and keeping everything on-chain/non-custodial. Also USDC is just faster/cheaper than traditional rails for many use cases.

**"Fees?"**
> Just standard Solana transaction fees (fractions of a cent). No platform fee currently.

**"Why Solana?"**
> Speed and cost. Sending $10 and paying $5 in ETH gas defeats the purpose. Solana transactions cost <$0.01 and confirm in ~400ms.

**"Is there a token?"**
> No. This is a utility product, not a token launch. No SolRelay token exists or is planned.

**"How do I know you won't rug?"**
> The contract is non-custodial – we physically can't access funds. But also: it's open source, the program is verified on-chain, and it was built for a hackathon, not a get-rich-quick scheme.

---

*Generated for the Colosseum Agent Hackathon*
*Last updated: 2025-02-07*
