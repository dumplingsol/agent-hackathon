# SolRelay Marketing - Posting Status

**Date:** 2025-02-06
**Status:** Ready for manual posting

---

## ⚠️ Why Not Auto-Posted

Browser automation unavailable:
- OpenClaw browser service not running (gateway offline)
- Chrome extension relay has no attached tabs
- No direct Reddit/Twitter API credentials available

**Action required:** Dumpling needs to manually post these to each platform. All content is polished and ready to copy-paste below.

---

## 📝 Ready-to-Post Content

### 1. r/solana (User-Focused)

**Subreddit:** https://reddit.com/r/solana/submit

**Title:**
```
Finally solved the "my friend doesn't have a wallet" problem - send SOL/USDC to any email
```

**Body:**
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

**Flair:** Select "Project" or "Discussion" if available

---

### 2. r/SolanaDev (Technical Deep-Dive)

**Subreddit:** https://reddit.com/r/SolanaDev/submit

**Title:**
```
Built a non-custodial email-to-crypto escrow on Solana - here's how it works
```

**Body:**
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

### 3. Twitter/X Thread

**Post to:** https://twitter.com/compose/tweet

**Thread (post each as reply to previous):**

**Tweet 1:**
```
Sending crypto to someone without a wallet is still weirdly hard in 2024.

Built SolRelay to fix it: send SOL/USDC to any email address. Recipient doesn't need a wallet yet.

Non-custodial. Auto-refund if unclaimed. Try it 👇

https://solrelay.io
```

**Tweet 2 (reply to 1):**
```
How it works:

1️⃣ Enter email + amount
2️⃣ Funds go to on-chain escrow (not our wallet)
3️⃣ Recipient gets email with claim link
4️⃣ They create wallet OR connect existing
5️⃣ Claim releases funds directly to them

If unclaimed after 72h → auto-refund to sender
```

**Tweet 3 (reply to 2):**
```
Why non-custodial matters:

• Your funds sit in a Solana smart contract, not a company wallet
• Claim uses cryptographic proof, not trust
• We literally cannot access your money

Verify yourself: 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h
```

**Tweet 4 (reply to 3):**
```
Use cases:

🎁 Crypto gifts to non-crypto family
💸 Pay freelancers internationally  
🍕 Split bills with wallet-less friends
🧑‍💻 Onboard new users without friction
💰 USDC payments without banking hassle
```

**Tweet 5 (reply to 4):**
```
Built for @ColosseumOrg Agent Hackathon 🏛️

The AI-assisted dev experience was 🔥 - pair programming with Claude for everything from Anchor contracts to React components.

Open source: https://github.com/dumplingsol/agent-hackathon

Try SolRelay: https://solrelay.io
```

---

### 4. Colosseum Discord #showcase

**Channel:** Look for #showcase, #show-your-work, or #hackathon-submissions

**Message:**
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

🔗 **Live Demo:** https://solrelay.io
📂 **GitHub:** https://github.com/dumplingsol/agent-hackathon
📜 **Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

Would love feedback! Try sending yourself a test transfer 🙏
```

---

## 📋 Posting Checklist

- [ ] **r/solana** - Post user-focused version
- [ ] **r/SolanaDev** - Post technical deep-dive
- [ ] **Twitter/X** - Post thread (5 tweets)
- [ ] **Colosseum Discord** - Post in #showcase

## 🕐 Recommended Timing

- **Reddit:** Weekday morning US time (9-11am EST) for best visibility
- **Twitter:** Any time, but weekday afternoons get good engagement
- **Discord:** During active hours (check channel activity)

## 📌 After Posting

Update this file with links to live posts:

```
### Posted Links (fill in after posting)
- r/solana: [link]
- r/SolanaDev: [link]  
- Twitter thread: [link]
- Discord: [posted ✓]
```

---

## 💬 Engagement Tips

**Be ready to answer:**
- "Is this safe?" → Explain non-custodial PDA escrow, hash verification
- "What if they never claim?" → 72h auto-refund, on-chain timestamp check
- "Fees?" → Just Solana tx fees (fractions of a cent), no platform fee
- "Why not PayPal?" → International transfers, crypto onboarding, non-custodial

**Don't:**
- Spam replies or self-promote in unrelated threads
- Get defensive about criticism - address it thoughtfully
- Promise features that don't exist yet
