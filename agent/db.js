/**
 * SolRelay Database Client
 * 
 * Supabase wrapper for all database operations.
 * Replaces the in-memory Map() with persistent storage.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (full access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// Transfer Operations
// ============================================================================

const transfers = {
  /**
   * Create a new transfer
   */
  async create(data) {
    const { data: transfer, error } = await supabase
      .from('transfers')
      .insert({
        email: data.email,
        email_hash: data.emailHash,
        claim_code: data.claimCode,
        claim_code_hash: data.claimCodeHash,
        amount: data.amount,
        token: data.token,
        sender_pubkey: data.senderPubkey,
        expires_at: data.expiresAt,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return transfer;
  },

  /**
   * Get transfer by claim code
   */
  async getByClaimCode(claimCode) {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('claim_code', claimCode)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found"
    return data;
  },

  /**
   * Get transfer by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Update transfer
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('transfers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update transfer by claim code
   */
  async updateByClaimCode(claimCode, updates) {
    const { data, error } = await supabase
      .from('transfers')
      .update(updates)
      .eq('claim_code', claimCode)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Confirm transfer (after on-chain confirmation)
   */
  async confirm(claimCode, signature, transferPubkey) {
    return this.updateByClaimCode(claimCode, {
      status: 'confirmed',
      signature,
      transfer_pubkey: transferPubkey,
      confirmed_at: new Date().toISOString(),
    });
  },

  /**
   * Mark transfer as claimed
   */
  async markClaimed(claimCode, signature, recipientPubkey) {
    return this.updateByClaimCode(claimCode, {
      status: 'claimed',
      claim_signature: signature,
      recipient_pubkey: recipientPubkey,
      claimed_at: new Date().toISOString(),
    });
  },

  /**
   * Mark transfer as reclaimed (funds returned to sender)
   */
  async markReclaimed(id, signature) {
    return this.update(id, {
      status: 'reclaimed',
      reclaim_signature: signature,
      reclaimed_at: new Date().toISOString(),
    });
  },

  /**
   * Increment reminder count
   */
  async incrementReminders(id) {
    const { data, error } = await supabase.rpc('increment_reminders', { transfer_id: id });
    
    // If function doesn't exist, do it manually
    if (error) {
      const transfer = await this.getById(id);
      return this.update(id, {
        reminders_sent: (transfer.reminders_sent || 0) + 1,
        last_reminder_at: new Date().toISOString(),
      });
    }
    return data;
  },

  /**
   * Get transfers needing first reminder (24h+, no reminders yet)
   */
  async getNeedingReminder24h(limit = 50) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('status', 'pending')
      .eq('reminders_sent', 0)
      .lt('created_at', twentyFourHoursAgo)
      .gt('created_at', fortyEightHoursAgo)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get transfers needing second reminder (48h+, 1 reminder sent)
   */
  async getNeedingReminder48h(limit = 50) {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const seventyHoursAgo = new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('status', 'pending')
      .eq('reminders_sent', 1)
      .lt('created_at', fortyEightHoursAgo)
      .gt('created_at', seventyHoursAgo)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get transfers expiring soon (within 2 hours)
   */
  async getExpiringSoon(limit = 50) {
    const now = new Date().toISOString();
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('status', 'pending')
      .lt('reminders_sent', 3)  // Haven't sent final notice yet
      .gt('expires_at', now)
      .lt('expires_at', twoHoursFromNow)
      .order('expires_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get expired transfers needing reclaim
   */
  async getExpiredForReclaim(limit = 50) {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .is('reclaimed_at', null)
      .or('reclaim_attempts.is.null,reclaim_attempts.lt.3')
      .order('expires_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Increment reclaim attempt counter
   */
  async incrementReclaimAttempts(id) {
    const transfer = await this.getById(id);
    return this.update(id, {
      reclaim_attempts: (transfer.reclaim_attempts || 0) + 1,
      last_reclaim_attempt_at: new Date().toISOString(),
    });
  },

  /**
   * Get stats for analytics
   */
  async getStats(startDate, endDate) {
    const { data, error } = await supabase
      .from('transfers')
      .select('status, amount, token, created_at, claimed_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;
    return data || [];
  },
};

// ============================================================================
// Mission Operations
// ============================================================================

const missions = {
  /**
   * Create a new mission
   */
  async create(data) {
    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        type: data.type,
        source: data.source || 'trigger',
        status: data.autoApprove ? 'approved' : 'pending',
        priority: data.priority || 5,
        scheduled_for: data.scheduledFor || new Date().toISOString(),
        input_data: data.inputData || {},
        transfer_id: data.transferId,
        parent_mission_id: data.parentMissionId,
        approved_at: data.autoApprove ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return mission;
  },

  /**
   * Get pending missions (ready to execute)
   */
  async getPending(limit = 20) {
    const { data, error } = await supabase
      .from('missions')
      .select('*, transfers(*)')
      .in('status', ['pending', 'approved'])
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)  // Less than max attempts
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Claim mission for execution (prevent race conditions)
   */
  async claim(id) {
    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        attempts: supabase.raw('attempts + 1'),
      })
      .eq('id', id)
      .in('status', ['pending', 'approved'])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark mission as succeeded
   */
  async succeed(id, outputData = {}) {
    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'succeeded',
        completed_at: new Date().toISOString(),
        output_data: outputData,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark mission as failed
   */
  async fail(id, errorMessage) {
    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: errorMessage,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Block mission (cap gate rejection)
   */
  async block(id, reason) {
    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'blocked',
        blocked_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reschedule mission for later
   */
  async reschedule(id, scheduledFor) {
    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'pending',
        scheduled_for: scheduledFor,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get count of pending missions by type (for cap gates)
   */
  async getPendingCountByType(type) {
    const { count, error } = await supabase
      .from('missions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type)
      .in('status', ['pending', 'approved', 'running']);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get count of missions executed today by type
   */
  async getTodayCountByType(type) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('missions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type)
      .eq('status', 'succeeded')
      .gte('completed_at', startOfDay.toISOString());

    if (error) throw error;
    return count || 0;
  },

  /**
   * Recover stale missions (stuck in "running" state)
   */
  async recoverStale(staleMinutes = 30) {
    const staleTime = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'failed',
        error: `Stale: no progress for ${staleMinutes} minutes`,
        completed_at: new Date().toISOString(),
      })
      .eq('status', 'running')
      .lt('started_at', staleTime)
      .select();

    if (error) throw error;
    return data || [];
  },
};

// ============================================================================
// Event Operations
// ============================================================================

const events = {
  /**
   * Emit an event
   */
  async emit(eventType, data = {}, links = {}) {
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        event_type: eventType,
        source: data.source || 'system',
        data,
        transfer_id: links.transferId,
        mission_id: links.missionId,
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log(`📣 Event: ${eventType}`, data);
    return event;
  },

  /**
   * Get unprocessed events
   */
  async getUnprocessed(limit = 100) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark event as processed
   */
  async markProcessed(id) {
    const { error } = await supabase
      .from('events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================================================
// Email Queue Operations
// ============================================================================

const emailQueue = {
  /**
   * Queue an email for sending
   */
  async queue(data) {
    const { data: email, error } = await supabase
      .from('email_queue')
      .insert({
        to_email: data.toEmail,
        subject: data.subject,
        html_body: data.htmlBody,
        text_body: data.textBody,
        email_type: data.emailType || 'notification',
        scheduled_for: data.scheduledFor || new Date().toISOString(),
        transfer_id: data.transferId,
        mission_id: data.missionId,
      })
      .select()
      .single();

    if (error) throw error;
    return email;
  },

  /**
   * Get pending emails
   */
  async getPending(limit = 20) {
    const { data, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark email as sending
   */
  async markSending(id) {
    const { data, error } = await supabase
      .from('email_queue')
      .update({
        status: 'sending',
        attempts: supabase.raw('attempts + 1'),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark email as sent
   */
  async markSent(id, resendId) {
    const { data, error } = await supabase
      .from('email_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_id: resendId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark email as failed
   */
  async markFailed(id, errorMessage) {
    const { data, error } = await supabase
      .from('email_queue')
      .update({
        status: 'failed',
        error: errorMessage,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get count of emails sent today
   */
  async getTodayCount() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', startOfDay.toISOString());

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get count of emails sent in last hour
   */
  async getLastHourCount() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', oneHourAgo);

    if (error) throw error;
    return count || 0;
  },
};

// ============================================================================
// Blocked Entities Operations
// ============================================================================

const blocked = {
  /**
   * Check if entity is blocked
   */
  async isBlocked(entityType, entityValue) {
    const { data, error } = await supabase
      .from('blocked_entities')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_value', entityValue.toLowerCase())
      .or('blocked_until.is.null,blocked_until.gt.' + new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  /**
   * Block an entity
   */
  async block(entityType, entityValue, reason, blockedBy = 'system', blockedUntil = null) {
    const { data, error } = await supabase
      .from('blocked_entities')
      .upsert({
        entity_type: entityType,
        entity_value: entityValue.toLowerCase(),
        reason,
        blocked_by: blockedBy,
        blocked_until: blockedUntil,
        blocked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Unblock an entity
   */
  async unblock(entityType, entityValue) {
    const { error } = await supabase
      .from('blocked_entities')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_value', entityValue.toLowerCase());

    if (error) throw error;
  },
};

// ============================================================================
// Trigger Rules Operations
// ============================================================================

const triggerRules = {
  /**
   * Get all enabled trigger rules
   */
  async getEnabled() {
    const { data, error } = await supabase
      .from('trigger_rules')
      .select('*')
      .eq('enabled', true);

    if (error) throw error;
    return data || [];
  },

  /**
   * Update last fired timestamp
   */
  async updateLastFired(id) {
    const { error } = await supabase
      .from('trigger_rules')
      .update({
        last_fired_at: new Date().toISOString(),
        fire_count: supabase.raw('fire_count + 1'),
      })
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================================================
// Policies Operations
// ============================================================================

const policies = {
  /**
   * Get policy value
   */
  async get(key) {
    const { data, error } = await supabase
      .from('policies')
      .select('value')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.value;
  },

  /**
   * Set policy value
   */
  async set(key, value) {
    const { error } = await supabase
      .from('policies')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  },
};

// ============================================================================
// Agent State Operations
// ============================================================================

const agentState = {
  /**
   * Get state value
   */
  async get(key) {
    const { data, error } = await supabase
      .from('agent_state')
      .select('value')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.value;
  },

  /**
   * Set state value
   */
  async set(key, value) {
    const { error } = await supabase
      .from('agent_state')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  },
};

// ============================================================================
// Export
// ============================================================================

module.exports = {
  supabase,
  transfers,
  missions,
  events,
  emailQueue,
  blocked,
  triggerRules,
  policies,
  agentState,
};
