# Reddit Posts - Ready to Post

**Account needed:** Create a Reddit account for posting these

---

## POST 1: r/solana (HIGH PRIORITY)

**URL:** https://reddit.com/r/solana/submit

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

**Flair:** Select "Project" or "Discussion"
**Best time:** Weekday mornings 9-11am EST

---

## POST 2: r/SolanaDev (HIGH PRIORITY)

**URL:** https://reddit.com/r/SolanaDev/submit

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

**Best time:** Weekday afternoons

---

## POST 3: r/CryptoCurrency (MEDIUM PRIORITY)

**URL:** https://reddit.com/r/CryptoCurrency/submit

**Title:**
```
Built a way to send crypto via email (no wallet needed for recipient)
```

**Body:**
```
**Disclaimer:** I built this, so take with appropriate salt. But genuinely think it solves a real problem.

One of the biggest crypto adoption barriers is wallet setup. You want to send someone crypto, but they don't have a wallet yet. So you either:
- Spend 30 min walking them through Phantom/MetaMask setup
- Give up and use traditional payment
- Use a custodial service (defeats the crypto purpose)

Built SolRelay to fix this - send SOL or USDC to any email address. Recipient doesn't need a wallet when you send it.

**How it works:**
1. Sender enters email + amount → funds lock in on-chain escrow (Solana smart contract)
2. Recipient gets email with claim link
3. They can create a new wallet OR connect existing one
4. Contract releases funds directly to their wallet

**The important part:** This isn't custodial. Funds sit in a Solana smart contract with PDA-based escrow. The claim secret is in the email link, never stored on-chain or any server. We literally cannot access your funds.

**Auto-refund:** If unclaimed after 72 hours, sender gets funds back automatically (on-chain timestamp, no oracle needed).

**Real use cases this enables:**
- Onboarding family into crypto without the friction
- Paying international freelancers in USDC
- Crypto gifts that don't require wallet setup first
- Splitting bills with non-crypto friends

Yes, there are similar projects (Solana Mobile, xBulle, etc.) but most are either custodial or require both parties to have wallets. This is non-custodial + works with just an email.

Built for the Colosseum Agent Hackathon. Fully functional on Solana devnet.

**Try it:** https://solrelay.io  
**Source:** https://github.com/dumplingsol/agent-hackathon  
**Program ID:** 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h

Happy to answer technical questions or hear criticism - genuinely interested in feedback.
```

**Best time:** Weekday evenings or weekends (more casual discussion)

---

## POST 4: r/defi (MEDIUM PRIORITY)

**URL:** https://reddit.com/r/defi/submit

**Title:**
```
Email-based escrow for Solana - non-custodial crypto payments to non-wallet users
```

**Body:**
```
Built an email-based payment escrow on Solana that might be useful for DeFi payment rails.

**The problem:** Many DeFi use cases involve paying people who don't have wallets yet - freelancers, gig workers, recipients in emerging markets. Current solutions are either custodial (defeats DeFi purpose) or require wallet setup friction.

**The architecture:**

**Escrow mechanism:**
- Sender creates transfer → funds lock in PDA-derived escrow account
- SHA-256 hash commitment stored on-chain (never the secret itself)
- Recipient gets email with claim secret
- Contract verifies hash before releasing funds
- 72-hour auto-refund via on-chain timestamp

**Why this is useful for DeFi:**

1. **Payment rails without onboarding friction** - Pay anyone with just their email
2. **Non-custodial** - No third party can access funds
3. **Programmable** - Could extend to conditional payments, streaming, etc.
4. **USDC-compatible** - Enables stablecoin payments to non-crypto users
5. **Composable** - Could integrate with other DeFi protocols

**Potential use cases:**
- Payroll for remote workers (USDC payments)
- Bounty platforms (pay contributors via email)
- Tipping/donations (no wallet required)
- Invoice payments (B2B in stablecoins)
- Affiliate payments (automated via smart contract)

**Technical details:**
- Solana Anchor program
- PDA-based escrow accounts
- SHA-256 hash commitment scheme
- Wallet-adapter frontend integration

**Program ID:** 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h

Currently on devnet, considering mainnet deployment if there's interest. Would love feedback on potential DeFi integrations or protocol-level use cases.

**Try it:** https://solrelay.io  
**Source:** https://github.com/dumplingsol/agent-hackathon

Built for the Colosseum Agent Hackathon.
```

**Best time:** Weekday mornings

---

## POSTING CHECKLIST

Once Reddit account is created:

- [ ] Post to r/solana (user-focused)
- [ ] Post to r/SolanaDev (technical)
- [ ] Post to r/CryptoCurrency (balanced, skeptic-aware)
- [ ] Post to r/defi (DeFi infrastructure angle)

**Recommended order:**
1. r/solana first (most receptive audience)
2. r/SolanaDev same day (technical crowd)
3. r/CryptoCurrency next day (bigger, more critical)
4. r/defi after that (niche but relevant)

**After posting:**
- Monitor comments for first hour
- Respond to questions promptly
- Be authentic, not defensive
- Update this file with post URLs

---

**Reddit account credentials (when ready):**
```
Username: _____________
Password: _____________
```

Save these securely after creating the account.
