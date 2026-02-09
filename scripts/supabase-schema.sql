-- ============================================================================
-- SolRelay Autonomous System - Supabase Schema
-- Created: 2026-02-08
-- Purpose: Replace in-memory Map() with persistent, autonomous-capable storage
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table 1: transfers - All email-to-SOL transfers (replaces in-memory Map)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core transfer data
  email VARCHAR(255) NOT NULL,
  email_hash BYTEA NOT NULL,
  claim_code VARCHAR(64) NOT NULL UNIQUE,  -- The secret claim code
  claim_code_hash BYTEA NOT NULL,
  amount DECIMAL(20, 9) NOT NULL,
  token VARCHAR(10) NOT NULL DEFAULT 'SOL',
  
  -- Sender info
  sender_pubkey VARCHAR(50) NOT NULL,
  
  -- On-chain data
  transfer_pubkey VARCHAR(50),
  signature VARCHAR(100),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, claimed, cancelled, expired, reclaimed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  
  -- Claim tracking
  claim_signature VARCHAR(100),
  recipient_pubkey VARCHAR(50),
  
  -- Reminder tracking
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- Reclaim tracking
  reclaim_attempts INTEGER DEFAULT 0,
  last_reclaim_attempt_at TIMESTAMPTZ,
  reclaimed_at TIMESTAMPTZ,
  reclaim_signature VARCHAR(100),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for transfers
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_expires ON transfers(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_transfers_reminders ON transfers(last_reminder_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_transfers_email ON transfers(email);
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers(sender_pubkey);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at);

-- ============================================================================
-- Table 2: missions - Autonomous tasks (reminders, auto-reclaim, abuse detection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Mission type and source
  type VARCHAR(50) NOT NULL,  -- send_reminder, auto_reclaim, block_sender, etc.
  source VARCHAR(20) NOT NULL DEFAULT 'trigger',  -- trigger, api, reaction, manual
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, running, succeeded, failed, blocked
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Execution data
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Cap gate tracking
  blocked_reason TEXT,
  
  -- Links
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  parent_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL
);

-- Indexes for missions
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_missions_scheduled ON missions(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_missions_transfer ON missions(transfer_id);

-- ============================================================================
-- Table 3: events - System events that trigger re-actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event identification
  event_type VARCHAR(50) NOT NULL,  -- transfer_created, transfer_claimed, reminder_sent, etc.
  source VARCHAR(50) NOT NULL DEFAULT 'system',  -- api, trigger, mission, webhook
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Event data
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Links (optional)
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  
  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_unprocessed ON events(processed) WHERE processed = false;

-- ============================================================================
-- Table 4: trigger_rules - Conditions that auto-create missions
-- ============================================================================
CREATE TABLE IF NOT EXISTS trigger_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Rule identification
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Condition (what to check)
  condition_type VARCHAR(50) NOT NULL,  -- transfer_age, claim_rate, abuse_pattern, etc.
  condition_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Action (what mission to create)
  mission_type VARCHAR(50) NOT NULL,
  mission_params JSONB DEFAULT '{}'::jsonb,
  
  -- Control
  enabled BOOLEAN DEFAULT true,
  auto_approve BOOLEAN DEFAULT true,
  cooldown_seconds INTEGER DEFAULT 3600,
  
  -- Tracking
  last_fired_at TIMESTAMPTZ,
  fire_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Table 5: email_queue - Outbound emails (reminder emails, notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email content
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  
  -- Email metadata
  email_type VARCHAR(50) NOT NULL DEFAULT 'notification',  -- claim, reminder, urgent, final, reclaim
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sending, sent, failed
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  
  -- Error tracking
  error TEXT,
  resend_id VARCHAR(100),  -- Resend message ID
  
  -- Links
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL
);

-- Indexes for email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_transfer ON email_queue(transfer_id);

-- ============================================================================
-- Table 6: analytics_daily - Daily stats for performance tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  date DATE PRIMARY KEY,
  
  -- Transfer stats
  transfers_created INTEGER DEFAULT 0,
  transfers_confirmed INTEGER DEFAULT 0,
  transfers_claimed INTEGER DEFAULT 0,
  transfers_expired INTEGER DEFAULT 0,
  transfers_reclaimed INTEGER DEFAULT 0,
  transfers_cancelled INTEGER DEFAULT 0,
  
  -- Volume
  total_volume_sol DECIMAL(20, 9) DEFAULT 0,
  total_volume_usdc DECIMAL(20, 9) DEFAULT 0,
  
  -- Timing
  avg_claim_time_hours DECIMAL(10, 2),
  
  -- Email stats
  emails_sent INTEGER DEFAULT 0,
  reminders_sent INTEGER DEFAULT 0,
  reminder_claim_rate DECIMAL(5, 2),  -- % of reminded transfers that got claimed
  
  -- User stats
  unique_senders INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0,
  
  -- Abuse stats
  abuse_detected INTEGER DEFAULT 0,
  entities_blocked INTEGER DEFAULT 0,
  
  -- Mission stats
  missions_created INTEGER DEFAULT 0,
  missions_succeeded INTEGER DEFAULT 0,
  missions_failed INTEGER DEFAULT 0,
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Table 7: blocked_entities - Spam/abuse prevention
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocked_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Entity identification
  entity_type VARCHAR(20) NOT NULL,  -- email, wallet, domain, ip
  entity_value VARCHAR(255) NOT NULL,
  
  -- Block info
  reason TEXT NOT NULL,
  blocked_by VARCHAR(50) NOT NULL DEFAULT 'system',  -- system, manual, abuse_detector
  
  -- Duration
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,  -- NULL = permanent
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(entity_type, entity_value)
);

-- Indexes for blocked_entities
CREATE INDEX IF NOT EXISTS idx_blocked_entities_type ON blocked_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_value ON blocked_entities(entity_value);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_active ON blocked_entities(blocked_until) 
  WHERE blocked_until IS NULL OR blocked_until > NOW();

-- ============================================================================
-- Table 8: agent_state - Autonomous agent runtime state
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_state (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Table 9: policies - Configurable system behavior
-- ============================================================================
CREATE TABLE IF NOT EXISTS policies (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Default Trigger Rules
-- ============================================================================
INSERT INTO trigger_rules (name, description, condition_type, condition_params, mission_type, mission_params, cooldown_seconds, auto_approve) VALUES
  (
    'reminder_24h',
    'Send reminder after 24 hours unclaimed',
    'transfer_age',
    '{"min_hours": 24, "max_hours": 48, "status": "pending", "max_reminders": 0}'::jsonb,
    'send_reminder',
    '{"reminder_type": "first", "template": "reminder_24h"}'::jsonb,
    14400,  -- 4 hour cooldown
    true
  ),
  (
    'reminder_48h',
    'Send urgent reminder after 48 hours unclaimed',
    'transfer_age',
    '{"min_hours": 48, "max_hours": 70, "status": "pending", "max_reminders": 1}'::jsonb,
    'send_reminder',
    '{"reminder_type": "urgent", "template": "reminder_48h"}'::jsonb,
    14400,
    true
  ),
  (
    'reminder_expiry',
    'Send final notice 2 hours before expiry',
    'transfer_expiry_soon',
    '{"hours_until_expiry": 2, "status": "pending"}'::jsonb,
    'send_reminder',
    '{"reminder_type": "final", "template": "reminder_expiry"}'::jsonb,
    0,  -- No cooldown - one-shot
    true
  ),
  (
    'auto_reclaim_expired',
    'Automatically reclaim expired transfers',
    'transfer_expired',
    '{"status": "pending", "grace_hours": 0}'::jsonb,
    'auto_reclaim',
    '{}'::jsonb,
    60,  -- 1 minute cooldown (rate limit)
    true
  ),
  (
    'abuse_high_volume_sender',
    'Detect high-volume senders (potential abuse)',
    'abuse_pattern',
    '{"type": "sender_volume", "threshold": 10, "window_hours": 1}'::jsonb,
    'investigate_abuse',
    '{}'::jsonb,
    3600,
    false  -- Needs approval
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Default Policies
-- ============================================================================
INSERT INTO policies (key, value, description) VALUES
  (
    'email_limits',
    '{"max_per_transfer": 3, "max_per_hour": 100, "max_per_day": 1000, "cooldown_minutes": 240}'::jsonb,
    'Email sending limits to prevent spam'
  ),
  (
    'auto_approve_rules',
    '{"allowed_types": ["send_reminder", "auto_reclaim", "update_analytics"], "blocked_types": ["block_sender", "change_fees"]}'::jsonb,
    'Which mission types can be auto-approved'
  ),
  (
    'reclaim_settings',
    '{"enabled": true, "max_per_minute": 10, "max_gas_lamports": 10000, "retry_delay_minutes": 5}'::jsonb,
    'Auto-reclaim configuration'
  ),
  (
    'reminder_templates',
    '{
      "reminder_24h": {"subject": "Reminder: You have {{amount}} {{token}} waiting!", "urgency": "normal"},
      "reminder_48h": {"subject": "Don''t miss out: {{amount}} {{token}} expires soon!", "urgency": "high"},
      "reminder_expiry": {"subject": "⚠️ LAST CHANCE: {{amount}} {{token}} expires in 2 hours!", "urgency": "critical"}
    }'::jsonb,
    'Email reminder templates'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update analytics daily
CREATE OR REPLACE FUNCTION update_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_daily (date, 
    transfers_created, transfers_confirmed, transfers_claimed, 
    transfers_expired, transfers_reclaimed, transfers_cancelled,
    total_volume_sol, total_volume_usdc,
    unique_senders, unique_recipients,
    emails_sent, reminders_sent,
    missions_created, missions_succeeded, missions_failed)
  SELECT 
    target_date,
    COUNT(*) FILTER (WHERE DATE(created_at) = target_date),
    COUNT(*) FILTER (WHERE DATE(confirmed_at) = target_date),
    COUNT(*) FILTER (WHERE DATE(claimed_at) = target_date),
    COUNT(*) FILTER (WHERE status = 'expired' AND DATE(created_at) = target_date),
    COUNT(*) FILTER (WHERE DATE(reclaimed_at) = target_date),
    COUNT(*) FILTER (WHERE status = 'cancelled' AND DATE(created_at) = target_date),
    COALESCE(SUM(amount) FILTER (WHERE token = 'SOL' AND DATE(created_at) = target_date), 0),
    COALESCE(SUM(amount) FILTER (WHERE token = 'USDC' AND DATE(created_at) = target_date), 0),
    COUNT(DISTINCT sender_pubkey) FILTER (WHERE DATE(created_at) = target_date),
    COUNT(DISTINCT recipient_pubkey) FILTER (WHERE DATE(claimed_at) = target_date),
    (SELECT COUNT(*) FROM email_queue WHERE DATE(sent_at) = target_date AND status = 'sent'),
    (SELECT COUNT(*) FROM email_queue WHERE DATE(sent_at) = target_date AND email_type LIKE 'reminder%'),
    (SELECT COUNT(*) FROM missions WHERE DATE(created_at) = target_date),
    (SELECT COUNT(*) FROM missions WHERE DATE(completed_at) = target_date AND status = 'succeeded'),
    (SELECT COUNT(*) FROM missions WHERE DATE(completed_at) = target_date AND status = 'failed')
  FROM transfers
  ON CONFLICT (date) DO UPDATE SET
    transfers_created = EXCLUDED.transfers_created,
    transfers_confirmed = EXCLUDED.transfers_confirmed,
    transfers_claimed = EXCLUDED.transfers_claimed,
    transfers_expired = EXCLUDED.transfers_expired,
    transfers_reclaimed = EXCLUDED.transfers_reclaimed,
    transfers_cancelled = EXCLUDED.transfers_cancelled,
    total_volume_sol = EXCLUDED.total_volume_sol,
    total_volume_usdc = EXCLUDED.total_volume_usdc,
    unique_senders = EXCLUDED.unique_senders,
    unique_recipients = EXCLUDED.unique_recipients,
    emails_sent = EXCLUDED.emails_sent,
    reminders_sent = EXCLUDED.reminders_sent,
    missions_created = EXCLUDED.missions_created,
    missions_succeeded = EXCLUDED.missions_succeeded,
    missions_failed = EXCLUDED.missions_failed,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for common queries
-- ============================================================================

-- Unclaimed transfers needing reminders
CREATE OR REPLACE VIEW pending_reminders AS
SELECT 
  t.*,
  EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 AS hours_since_created,
  EXTRACT(EPOCH FROM (t.expires_at - NOW())) / 3600 AS hours_until_expiry
FROM transfers t
WHERE t.status = 'pending'
  AND t.claimed_at IS NULL
  AND (t.last_reminder_at IS NULL OR t.last_reminder_at < NOW() - INTERVAL '4 hours')
ORDER BY t.created_at ASC;

-- Expired transfers needing reclaim
CREATE OR REPLACE VIEW pending_reclaims AS
SELECT 
  t.*,
  EXTRACT(EPOCH FROM (NOW() - t.expires_at)) / 3600 AS hours_since_expired
FROM transfers t
WHERE t.status = 'pending'
  AND t.expires_at < NOW()
  AND t.reclaimed_at IS NULL
ORDER BY t.expires_at ASC;

-- Pending missions queue
CREATE OR REPLACE VIEW mission_queue AS
SELECT 
  m.*,
  t.email AS transfer_email,
  t.amount AS transfer_amount,
  t.token AS transfer_token
FROM missions m
LEFT JOIN transfers t ON m.transfer_id = t.id
WHERE m.status IN ('pending', 'approved')
  AND m.scheduled_for <= NOW()
  AND m.attempts < m.max_attempts
ORDER BY m.priority ASC, m.scheduled_for ASC;

-- ============================================================================
-- Row Level Security (optional but recommended)
-- ============================================================================

-- Enable RLS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON transfers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON missions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON events FOR ALL USING (true);
CREATE POLICY "Service role full access" ON email_queue FOR ALL USING (true);

-- ============================================================================
-- Done!
-- ============================================================================

-- Summary:
-- Created 9 tables: transfers, missions, events, trigger_rules, email_queue, 
--                   analytics_daily, blocked_entities, agent_state, policies
-- Created 5 default trigger rules for autonomous operations
-- Created 4 default policies for system configuration
-- Created 1 helper function for analytics
-- Created 3 views for common queries
