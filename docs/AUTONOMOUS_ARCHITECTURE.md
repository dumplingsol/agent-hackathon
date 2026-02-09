# SolRelay Autonomous Architecture

> Making SolRelay run itself: from hackathon MVP to self-operating platform

**Created:** 2026-02-08  
**Status:** Design Document  
**Based on:** VoxYZ Agent World architecture patterns (OpenClaw + Vercel + Supabase)

---

## Executive Summary

SolRelay is currently a hackathon MVP with a critical architectural gap: **no persistent storage** (using in-memory `Map()`) and **zero autonomous capabilities**. Every operation requires manual intervention.

This document designs a closed-loop autonomous system that:
1. **Monitors** transfer lifecycle automatically
2. **Acts** on conditions without human intervention  
3. **Self-heals** from failures and stuck states
4. **Learns** from patterns to optimize operations

The goal isn't "more features" — it's **genuinely unattended operation**.

### Key Insight from VoxYZ

The VoxYZ article nails the problem: *"Between 'agents can produce output' and 'agents can run things end-to-end,' there's a full execute → feedback → re-trigger loop missing."*

SolRelay has the same gap. We can process transfers, but nothing:
- Notices unclaimed transfers and sends reminders
- Detects abuse patterns and blocks them
- Analyzes claim rates and optimizes messaging
- Recovers from stuck operations

---

## Current Architecture (Gap Analysis)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│   Agent Service │────▶│  Solana Program │
│   (Vercel)      │     │   (Railway)     │     │   (Anchor/Rust) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Email Service  │
                        │   (Resend)      │
                        └─────────────────┘
                        
         ⚠️ NO DATABASE - Just Map() in memory
         ⚠️ NO CRON/BACKGROUND JOBS
         ⚠️ NO MONITORING/TRIGGERS
         ⚠️ NO ANALYTICS
```

### Critical Gaps

| Gap | Impact | Risk Level |
|-----|--------|------------|
| **In-memory storage** | All transfer data lost on restart | 🔴 Critical |
| **No reminder system** | Unclaimed transfers = lost money | 🔴 Critical |
| **No abuse detection** | Spam/fraud goes unnoticed | 🟡 High |
| **No auto-reclaim** | Expired transfers need manual cleanup | 🟡 High |
| **No analytics** | Can't measure or improve | 🟡 High |
| **No monitoring** | Blind to failures | 🟡 High |

---

## Target Architecture

### Three-Layer Model (VoxYZ Pattern)

```
┌──────────────────────────────────────────────────────────────────┐
│                    LAYER 1: THINK + EXECUTE                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Reminder  │  │   Abuse    │  │  Analytics │  │  Marketing │  │
│  │   Worker   │  │  Detector  │  │   Worker   │  │   Worker   │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                    (OpenClaw Agents / Cron Jobs)                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    LAYER 2: CONTROL PLANE                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Trigger   │  │   Policy   │  │  Cap Gate  │  │   Self-    │  │
│  │ Evaluator  │  │  Enforcer  │  │  Checker   │  │   Healer   │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                    (Heartbeat Route / Cron Jobs)                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    LAYER 3: STATE (SUPABASE)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Transfers  │  │  Missions  │  │   Events   │  │  Policies  │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                    (Single Source of Truth)                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Loop Design

### The Closed Loop

```
Condition Detected (Trigger)
         │
         ▼
Create Proposal (what to do)
         │
         ▼
Check Cap Gates (should we?)
         │
    ┌────┴────┐
    │ Blocked │──▶ Log reason, skip
    └─────────┘
         │
         ▼ Pass
Auto-Approve Check (is this safe?)
         │
    ┌────┴────┐
    │  No     │──▶ Queue for human review
    └─────────┘
         │
         ▼ Yes
Create Mission + Steps
         │
         ▼
Worker Claims & Executes
         │
         ▼
Emit Event (log what happened)
         │
         ▼
Event Triggers New Reactions
         │
         └──────▶ Back to top
```

### SolRelay-Specific Loop

```
Transfer Created (Event)
    │
    ▼
Scheduled Triggers Check:
├── 24h unclaimed? → Create "send_reminder" proposal
├── 48h unclaimed? → Create "send_urgent_reminder" proposal  
├── 2h before expiry? → Create "send_final_notice" proposal
├── Expired? → Create "auto_reclaim" proposal
└── Abuse pattern? → Create "block_sender" proposal (needs approval)
    │
    ▼
Cap Gate Checks:
├── Daily email quota reached? → Block, log reason
├── Sender already blocked? → Skip
└── Already reminded today? → Skip
    │
    ▼
Auto-Approve Rules:
├── send_reminder: ✅ auto-approve
├── send_urgent_reminder: ✅ auto-approve
├── send_final_notice: ✅ auto-approve
├── auto_reclaim: ✅ auto-approve
├── block_sender: ❌ needs approval
└── tweet_milestone: ✅ auto-approve (within limits)
    │
    ▼
Execute & Emit Event
    │
    ▼
Event Triggers Reactions:
├── reminder_sent → Track in analytics
├── transfer_claimed → Update stats, maybe tweet
└── sender_blocked → Notify admin
```

---

## Autonomous Operations

### Priority Matrix

| Priority | Operation | Auto-Execute | Cap Gates | Impact |
|----------|-----------|--------------|-----------|--------|
| 🔴 P0 | **24h reminder emails** | ✅ Yes | 3/day/transfer | Recover ~30% unclaimed |
| 🔴 P0 | **48h urgent reminders** | ✅ Yes | 1/transfer | Final chance |
| 🔴 P0 | **2h expiry notice** | ✅ Yes | 1/transfer | Last resort |
| 🔴 P0 | **Auto-reclaim expired** | ✅ Yes | Rate-limited | Cleanup |
| 🟡 P1 | **Abuse pattern detection** | ❌ No | N/A | Security |
| 🟡 P1 | **Gas price monitoring** | ✅ Yes | N/A | Cost optimization |
| 🟡 P1 | **Daily analytics report** | ✅ Yes | 1/day | Insights |
| 🟡 P1 | **Self-healing stuck tasks** | ✅ Yes | N/A | Reliability |
| 🟢 P2 | **Tweet milestones** | ✅ Yes | 3/day | Marketing |
| 🟢 P2 | **Weekly performance report** | ✅ Yes | 1/week | Insights |
| 🟢 P2 | **Claim rate optimization** | ❌ No | N/A | Experiments |
| 🟢 P2 | **Auto-support responses** | ❌ No | N/A | Customer service |

### Operation Details

#### P0: Reminder System
```
Trigger: transfer.status = 'pending' AND transfer.created_at < NOW() - 24h
         AND transfer.reminders_sent < 3
         
Action: 
  1. Create "send_reminder" mission
  2. Compose personalized email
  3. Send via Resend
  4. Update transfer.reminders_sent
  5. Emit "reminder_sent" event
  
Cap Gates:
  - Max 3 reminders per transfer
  - Max 100 emails/hour total
  - Don't remind if already claimed
  
Auto-Approve: Yes (low risk, high value)
```

#### P0: Auto-Reclaim Expired
```
Trigger: transfer.expires_at < NOW() AND transfer.status = 'pending'

Action:
  1. Create "auto_reclaim" mission
  2. Build reclaim transaction
  3. Submit to Solana (using backend keypair)
  4. Update transfer.status = 'expired'
  5. Emit "transfer_expired" event
  
Cap Gates:
  - Rate limit: 10/minute (avoid RPC rate limits)
  - Skip if gas price > threshold
  
Auto-Approve: Yes
```

#### P1: Abuse Detection
```
Trigger: 
  - Same sender creates 10+ transfers in 1 hour
  - Same email receives 5+ claims in 24h
  - Known burner email domain
  
Action:
  1. Create "investigate_abuse" proposal
  2. Flag for human review
  3. Optionally auto-block (configurable threshold)
  
Auto-Approve: No - needs human confirmation
```

#### P2: Marketing Automation
```
Trigger:
  - Total transfers reaches milestone (100, 1000, etc.)
  - Weekly summary ready
  - Interesting user story detected
  
Action:
  1. Create "tweet_milestone" mission
  2. Generate tweet copy
  3. Post via Twitter API
  4. Emit "tweet_posted" event
  
Cap Gates:
  - Max 3 tweets/day
  - No duplicate milestones
  - Cooldown: 4 hours between tweets
  
Auto-Approve: Yes (within limits)
```

---

## Trigger System

### Trigger Types

| Trigger | Condition | Cooldown | Proposal Type |
|---------|-----------|----------|---------------|
| `reminder_24h` | Unclaimed for 24h | 4h | send_reminder |
| `reminder_48h` | Unclaimed for 48h | 4h | send_urgent_reminder |
| `reminder_expiry` | 2h before expiry | - | send_final_notice |
| `expired` | Past expiry time | - | auto_reclaim |
| `claim_rate_low` | <30% claim rate (7d) | 24h | analyze_messaging |
| `high_volume` | >100 transfers/hour | 1h | scale_alert |
| `abuse_suspected` | Pattern match | 1h | investigate_abuse |
| `milestone` | Round number reached | 4h | tweet_milestone |
| `gas_high` | Gas > threshold | 30m | pause_reclaims |

### Trigger Evaluation (Heartbeat)

```typescript
// Run every 5 minutes
async function evaluateTriggers() {
  const triggers = await getTriggerRules();
  
  for (const trigger of triggers) {
    // Check cooldown
    if (trigger.last_fired_at > Date.now() - trigger.cooldown_ms) {
      continue;
    }
    
    // Evaluate condition
    const result = await evaluateCondition(trigger);
    
    if (result.fired) {
      await createProposalAndMaybeAutoApprove({
        type: trigger.proposal_type,
        source: 'trigger',
        metadata: result.data,
      });
      
      // Update cooldown
      await updateTriggerLastFired(trigger.id);
    }
  }
}
```

---

## Reaction Matrix

When events happen, other operations may react:

```json
{
  "patterns": [
    {
      "event": "transfer_created",
      "action": "schedule_reminders",
      "delay": "24h",
      "probability": 1.0
    },
    {
      "event": "transfer_claimed",
      "action": "update_analytics",
      "delay": "0",
      "probability": 1.0
    },
    {
      "event": "transfer_claimed",
      "action": "maybe_tweet",
      "delay": "1h",
      "probability": 0.1,
      "condition": "is_milestone"
    },
    {
      "event": "reminder_sent",
      "action": "track_reminder_effectiveness",
      "delay": "24h",
      "probability": 1.0
    },
    {
      "event": "claim_failed",
      "action": "diagnose_failure",
      "delay": "0",
      "probability": 1.0
    }
  ]
}
```

---

## Cap Gates

Prevent queue buildup with entry-point rejection:

```typescript
const CAP_GATES = {
  send_reminder: async (proposal) => {
    const count = await getReminderCountToday(proposal.transfer_id);
    if (count >= 3) {
      return { ok: false, reason: 'Max reminders reached for this transfer' };
    }
    
    const hourlyEmails = await getEmailCountLastHour();
    if (hourlyEmails >= 100) {
      return { ok: false, reason: 'Hourly email quota reached' };
    }
    
    return { ok: true };
  },
  
  tweet_milestone: async (proposal) => {
    const tweetsToday = await getTweetsToday();
    if (tweetsToday >= 3) {
      return { ok: false, reason: 'Daily tweet limit reached' };
    }
    return { ok: true };
  },
  
  auto_reclaim: async (proposal) => {
    const gasPrice = await getCurrentGasPrice();
    if (gasPrice > THRESHOLD) {
      return { ok: false, reason: 'Gas price too high' };
    }
    return { ok: true };
  },
};
```

---

## Self-Healing

Recover from stuck operations:

```typescript
// Run every 5 minutes via heartbeat
async function recoverStaleOperations() {
  const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
  
  // Find stuck missions
  const staleMissions = await db
    .from('missions')
    .select()
    .eq('status', 'running')
    .lt('updated_at', new Date(Date.now() - STALE_THRESHOLD_MS));
  
  for (const mission of staleMissions) {
    await db.from('missions').update({
      status: 'failed',
      error: 'Stale: no progress for 30 minutes',
    }).eq('id', mission.id);
    
    // Emit failure event (may trigger diagnosis)
    await emitEvent('mission_failed', { 
      mission_id: mission.id,
      reason: 'stale',
    });
  }
  
  // Find stuck email sends
  const staleEmails = await db
    .from('email_queue')
    .select()
    .eq('status', 'sending')
    .lt('started_at', new Date(Date.now() - 5 * 60 * 1000));
  
  for (const email of staleEmails) {
    // Retry or mark failed
    await retryOrFailEmail(email);
  }
}
```

---

## Database Schema Additions

### New Tables

```sql
-- Persistent transfer storage (replace in-memory Map)
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  email_hash BYTEA NOT NULL,
  claim_code_hash BYTEA NOT NULL,
  amount DECIMAL(20, 9) NOT NULL,
  token VARCHAR(10) NOT NULL,
  sender_pubkey VARCHAR(50) NOT NULL,
  transfer_pubkey VARCHAR(50),
  
  status VARCHAR(20) DEFAULT 'pending',  -- pending, claimed, cancelled, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  
  -- Reminder tracking
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- Claim tracking
  claim_signature VARCHAR(100),
  recipient_pubkey VARCHAR(50),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Mission/operation tracking (VoxYZ pattern)
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,  -- send_reminder, auto_reclaim, etc.
  source VARCHAR(20) NOT NULL,  -- trigger, api, reaction
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, running, succeeded, failed
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  input_data JSONB NOT NULL,
  output_data JSONB,
  error TEXT,
  
  -- Link to transfer if applicable
  transfer_id UUID REFERENCES transfers(id)
);

-- Mission steps (for multi-step operations)
CREATE TABLE mission_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'queued',
  
  reserved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  output_data JSONB
);

-- Event stream (all actions logged)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  source VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL,
  
  -- Optional links
  transfer_id UUID REFERENCES transfers(id),
  mission_id UUID REFERENCES missions(id)
);

-- Trigger rules (configurable)
CREATE TABLE trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_params JSONB NOT NULL,
  proposal_type VARCHAR(50) NOT NULL,
  cooldown_seconds INTEGER DEFAULT 3600,
  enabled BOOLEAN DEFAULT true,
  last_fired_at TIMESTAMPTZ
);

-- Policies (configurable behavior)
CREATE TABLE policies (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email queue (for reliable delivery)
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sending, sent, failed
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  
  transfer_id UUID REFERENCES transfers(id)
);

-- Analytics (daily aggregates)
CREATE TABLE analytics_daily (
  date DATE PRIMARY KEY,
  transfers_created INTEGER DEFAULT 0,
  transfers_claimed INTEGER DEFAULT 0,
  transfers_expired INTEGER DEFAULT 0,
  transfers_cancelled INTEGER DEFAULT 0,
  total_volume_sol DECIMAL(20, 9) DEFAULT 0,
  total_volume_usdc DECIMAL(20, 9) DEFAULT 0,
  avg_claim_time_hours DECIMAL(10, 2),
  reminders_sent INTEGER DEFAULT 0,
  reminder_claim_rate DECIMAL(5, 2),
  unique_senders INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0
);

-- Blocked entities (abuse prevention)
CREATE TABLE blocked_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,  -- email, wallet, ip
  entity_value VARCHAR(255) NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,  -- NULL = permanent
  blocked_by VARCHAR(50)  -- system or human
);
```

### Index Recommendations

```sql
-- Critical queries
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_expires ON transfers(expires_at) WHERE status = 'pending';
CREATE INDEX idx_transfers_reminders ON transfers(last_reminder_at) WHERE status = 'pending';
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_email_queue_status ON email_queue(status);
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Time: 20-30 hours**

- [ ] **Supabase setup** (2h)
  - Create project
  - Set up tables
  - Configure RLS policies
  
- [ ] **Migrate from in-memory to Supabase** (8h)
  - Replace `Map()` with Supabase queries
  - Test all existing endpoints
  - Deploy and verify
  
- [ ] **Event emission** (4h)
  - Log all actions to events table
  - Add event types enum
  
- [ ] **Basic heartbeat** (4h)
  - Set up cron job (every 5 minutes)
  - Add health checks
  - Monitor uptime

**Deliverable:** Persistent storage, no more data loss on restart.

### Phase 2: Reminder System (Week 2)
**Time: 15-20 hours**

- [ ] **Trigger infrastructure** (6h)
  - Trigger rules table
  - Trigger evaluator
  - Cap gate framework
  
- [ ] **24h reminder trigger** (4h)
  - Condition: pending + 24h old
  - Email template
  - Cap: 3/transfer
  
- [ ] **48h and expiry reminders** (3h)
  - Similar implementation
  - Different urgency levels
  
- [ ] **Email queue** (4h)
  - Reliable delivery
  - Retry logic
  - Rate limiting

**Deliverable:** Automatic reminder emails, ~30% more claims.

### Phase 3: Auto-Reclaim & Self-Healing (Week 3)
**Time: 15-20 hours**

- [ ] **Auto-reclaim system** (8h)
  - Backend keypair for signing
  - Transaction builder
  - Gas price monitoring
  
- [ ] **Self-healing** (4h)
  - Stale mission recovery
  - Email retry logic
  - Error reporting
  
- [ ] **Analytics foundation** (4h)
  - Daily aggregates
  - Basic dashboard queries

**Deliverable:** Self-maintaining system, expired funds auto-returned.

### Phase 4: Intelligence Layer (Week 4)
**Time: 15-20 hours**

- [ ] **Abuse detection** (6h)
  - Pattern matching
  - Rate limit monitoring
  - Block list management
  
- [ ] **Claim rate optimization** (4h)
  - A/B testing infrastructure
  - Email template variants
  
- [ ] **Marketing automation** (4h)
  - Twitter integration
  - Milestone detection
  - Auto-tweets

**Deliverable:** Smart operations, abuse prevention, marketing.

### Phase 5: Full Autonomy (Week 5+)
**Time: Ongoing**

- [ ] **Support ticket triage**
- [ ] **Advanced analytics**
- [ ] **Multi-chain monitoring**
- [ ] **Dynamic fee adjustment**

---

## Comparison: Current vs Autonomous

| Aspect | Current | Autonomous |
|--------|---------|------------|
| **Data persistence** | In-memory (lost on restart) | Supabase (permanent) |
| **Unclaimed transfers** | User has to remember | Automatic reminders |
| **Expired transfers** | Stuck until claimed | Auto-reclaim to sender |
| **Abuse prevention** | None | Pattern detection + blocking |
| **Analytics** | None | Real-time dashboard |
| **Marketing** | Manual | Auto-tweets milestones |
| **Failure recovery** | Manual investigation | Self-healing |
| **Uptime** | Hope for the best | Monitored + alerts |
| **Human intervention** | Constant | Exception-only |

---

## Risks and Mitigations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Race conditions** (VoxYZ Pitfall #1) | Medium | High | Single executor pattern - agent service only |
| **Incomplete flows** (VoxYZ Pitfall #2) | High | High | Central `createProposalAndMaybeAutoApprove` function |
| **Queue buildup** (VoxYZ Pitfall #3) | High | Medium | Cap gates at proposal entry |
| **Email deliverability** | Medium | High | Use Resend, monitor bounces, respect limits |
| **RPC rate limits** | Medium | Medium | Batch operations, use dedicated RPC |
| **Database costs** | Low | Low | Supabase free tier generous, optimize queries |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Over-automation** | Medium | Medium | Start with high auto-approve threshold |
| **Spam accusations** | Low | High | Strict email caps, easy unsubscribe |
| **False abuse detection** | Medium | Medium | Require human approval for blocks |
| **Runaway spending** | Low | High | Budget caps on all external services |

### Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Backend keypair compromise** | Low | Critical | HSM or secure enclave, minimal balance |
| **Database exposure** | Low | High | RLS policies, encrypted at rest |
| **API abuse** | Medium | Medium | Rate limiting, authentication |

---

## Minimal Viable Autonomous SolRelay

If you only have 1 week, implement this:

### MVP Checklist

1. **✅ Supabase database** (2h)
   - `transfers` table
   - `events` table
   - Migrate from Map()

2. **✅ Basic heartbeat** (2h)
   - Cron every 5 min
   - Health check
   - Log activity

3. **✅ 24h reminder trigger** (4h)
   - Find unclaimed transfers
   - Send reminder email
   - Track reminders_sent

4. **✅ Expiry trigger** (2h)
   - Find expired transfers
   - Mark as expired
   - (Skip auto-reclaim initially)

**Total: ~10 hours for genuinely autonomous basic operation**

This alone would:
- Never lose data
- Automatically remind users
- Track everything that happens
- Run unattended

---

## Conclusion

SolRelay is one database table and a cron job away from being genuinely autonomous. The VoxYZ article's core insight is correct: the gap between "can do things" and "runs itself" is the closed loop.

**Key takeaways:**

1. **Start with persistence** — You can't be autonomous if you forget everything on restart

2. **One proposal service** — All actions flow through one function with cap gates

3. **Triggers create proposals** — Conditions → proposals → auto-approve → execute → events → triggers

4. **Self-healing is essential** — Things will get stuck. Plan for recovery.

5. **Start simple** — 24h reminders alone could increase claim rates by 30%

The goal isn't to build an AI company. The goal is to **never have to manually check on SolRelay again**.

---

## Appendix: Configuration Examples

### Policy: Auto-Approve Rules
```json
{
  "enabled": true,
  "allowed_types": [
    "send_reminder",
    "send_urgent_reminder", 
    "send_final_notice",
    "auto_reclaim",
    "update_analytics",
    "tweet_milestone"
  ],
  "blocked_types": [
    "block_sender",
    "change_fees",
    "modify_templates"
  ]
}
```

### Policy: Email Limits
```json
{
  "max_per_transfer": 3,
  "max_per_hour": 100,
  "max_per_day": 1000,
  "cooldown_minutes": 240
}
```

### Policy: Gas Price Threshold
```json
{
  "max_lamports_per_signature": 10000,
  "pause_reclaims_above": 5000,
  "resume_reclaims_below": 3000
}
```

### Trigger: 24h Reminder
```json
{
  "name": "reminder_24h",
  "condition_type": "transfer_age",
  "condition_params": {
    "min_age_hours": 24,
    "max_age_hours": 48,
    "status": "pending",
    "max_reminders": 1
  },
  "proposal_type": "send_reminder",
  "cooldown_seconds": 14400,
  "enabled": true
}
```
