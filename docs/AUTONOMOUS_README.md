# SolRelay Autonomous System

> A fully autonomous email-to-SOL transfer system that runs itself.

## Overview

SolRelay now includes an autonomous agent that handles:
- 📧 **Automatic reminder emails** (24h, 48h, 2h before expiry)
- 💸 **Auto-reclaim expired transfers** (returns funds to sender)
- 🛡️ **Abuse detection** (blocks spam/fraud patterns)
- 📊 **Analytics tracking** (daily performance stats)
- 🔧 **Self-healing** (recovers stuck operations)

**Zero human intervention required for normal operations.**

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      SolRelay Stack                             │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────────────────────┐   │
│  │   API Server    │     │     Autonomous Agent             │   │
│  │  (Port 3001)    │     │     (Port 3002 - health)        │   │
│  │                 │     │                                   │   │
│  │  - Create       │     │  - Poll triggers (30s)          │   │
│  │  - Confirm      │     │  - Execute missions             │   │
│  │  - Claim        │     │  - Send reminders               │   │
│  │  - Admin        │     │  - Reclaim expired              │   │
│  └────────┬────────┘     └──────────────┬──────────────────┘   │
│           │                              │                       │
│           └──────────────┬───────────────┘                       │
│                          ▼                                       │
│           ┌─────────────────────────────┐                       │
│           │        Supabase             │                       │
│           │                             │                       │
│           │  transfers  │  missions     │                       │
│           │  events     │  email_queue  │                       │
│           │  policies   │  analytics    │                       │
│           └─────────────────────────────┘                       │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Setup Database

```bash
# Go to Supabase SQL Editor
# https://drwcenrslcllekubgsbw.supabase.co/project/drwcenrslcllekubgsbw/sql

# Paste and run: supabase-schema.sql
```

### 2. Install Dependencies

```bash
cd agent
npm install
```

### 3. Configure Environment

Edit `agent/.env`:
```env
# Required
SUPABASE_URL=https://drwcenrslcllekubgsbw.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Optional
DRY_RUN=true           # Set to false for production
RECLAIM_ENABLED=false  # Set to true when ready
```

### 4. Start Services

**Development (separate terminals):**
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Autonomous Agent
npm run dev:agent
```

**Production (PM2):**
```bash
# Start both services
pm2 start ecosystem.config.js

# Monitor
pm2 logs solrelay

# Status
pm2 status
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `transfers` | All email-to-SOL transfers |
| `missions` | Autonomous tasks queue |
| `events` | System event log |
| `trigger_rules` | Configurable automation triggers |
| `email_queue` | Outbound email queue |
| `analytics_daily` | Daily performance stats |
| `blocked_entities` | Spam/abuse blocklist |
| `agent_state` | Agent runtime state |
| `policies` | System configuration |

## Autonomous Operations

### Trigger Rules (Default)

| Trigger | Condition | Action | Auto-Approve |
|---------|-----------|--------|--------------|
| `reminder_24h` | Unclaimed 24-48h | Send first reminder | ✅ |
| `reminder_48h` | Unclaimed 48-70h | Send urgent reminder | ✅ |
| `reminder_expiry` | 2h before expiry | Send final notice | ✅ |
| `auto_reclaim_expired` | Past expiry | Reclaim to sender | ✅ |
| `abuse_high_volume` | 10+ transfers/hour | Investigate | ❌ |

### Cap Gates (Prevents Spam)

- Max 100 reminder emails/day
- Max 30 emails/hour
- Max 3 reminders per transfer
- Max 5 reclaims/minute

### Self-Healing

- Stale missions (stuck >30min) auto-recovered
- Failed emails retried 3 times
- Failed reclaims retried with backoff

## API Endpoints

### Public
- `POST /api/create-transfer` - Create new transfer
- `POST /api/confirm-transfer` - Confirm on-chain
- `GET /api/transfer/:claimCode` - Get transfer details
- `POST /api/claim` - Claim transfer
- `GET /health` - Service health check

### Admin
- `GET /admin/missions` - View pending missions
- `GET /admin/agent-status` - Agent status
- `GET /admin/analytics` - Performance stats

### Agent Health
- `GET :3002/health` - Agent health check
- `GET :3002/stats` - Detailed stats

## Configuration

### Policies (in Supabase)

```json
// email_limits
{
  "max_per_transfer": 3,
  "max_per_hour": 100,
  "max_per_day": 1000,
  "cooldown_minutes": 240
}

// reclaim_settings
{
  "enabled": true,
  "max_per_minute": 10,
  "max_gas_lamports": 10000,
  "retry_delay_minutes": 5
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_POLL_INTERVAL_MS` | 30000 | Loop interval (ms) |
| `AGENT_HEALTH_PORT` | 3002 | Health server port |
| `DRY_RUN` | true | Simulate actions |
| `RECLAIM_ENABLED` | false | Enable auto-reclaim |
| `MAX_REMINDERS_PER_DAY` | 100 | Daily email cap |

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Agent health  
curl http://localhost:3002/health
```

### Logs

```bash
# PM2 logs
pm2 logs solrelay-api
pm2 logs solrelay-agent

# Or tail files
tail -f agent/logs/api-out.log
tail -f agent/logs/agent-out.log
```

### Metrics

Check `analytics_daily` table for:
- transfers_created
- transfers_claimed
- claim_rate
- reminders_sent
- errors

## Going Live

### Checklist

1. ✅ Schema deployed to Supabase
2. ✅ API server running and healthy
3. ✅ Agent running and healthy
4. ⬜ Set `DRY_RUN=false` 
5. ⬜ Test reminder emails work
6. ⬜ Set `RECLAIM_ENABLED=true`
7. ⬜ Monitor for 24h
8. ⬜ Check analytics

### Safety

- Start with `DRY_RUN=true` to verify logic
- Check logs for any issues
- Keep `RECLAIM_ENABLED=false` until confident
- Monitor cap gate hits (may need adjustment)

## Troubleshooting

### Agent not starting?
```bash
# Check database connection
node setup-database.js --check
```

### Emails not sending?
- Check `DRY_RUN` is false
- Verify `RESEND_API_KEY` is set
- Check `email_queue` table for errors

### Missions stuck?
- Agent auto-heals after 30min
- Or manually update status in Supabase

### High error rate?
- Check logs for specific errors
- Verify Solana RPC is responding
- Check Resend API limits

## Files

```
solmail/
├── supabase-schema.sql       # Database schema
├── AUTONOMOUS_ARCHITECTURE.md # Design document
├── AUTONOMOUS_README.md      # This file
└── agent/
    ├── index-supabase.js     # API server (Supabase)
    ├── autonomous-agent.js   # Autonomous loop
    ├── db.js                 # Database client
    ├── ecosystem.config.js   # PM2 config
    ├── setup-database.js     # Setup script
    └── .env                  # Configuration
```

---

Built for the future of autonomous crypto operations. 🚀
