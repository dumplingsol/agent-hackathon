#!/usr/bin/env node
/**
 * SolRelay Autonomous Agent
 * 
 * The closed-loop executor that runs SolRelay automatically.
 * 
 * Architecture:
 * 1. Poll for triggers every 30 seconds
 * 2. Evaluate trigger conditions against transfers
 * 3. Create missions (with cap gate checks)
 * 4. Execute missions (send reminders, reclaim funds)
 * 5. Emit events for tracking/reactions
 * 6. Self-heal stuck operations
 * 
 * Run as a separate process alongside the API server.
 */

require('dotenv').config();
const { Resend } = require('resend');
const { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const db = require('./db');

// ============================================================================
// Configuration
// ============================================================================

const config = {
  // Loop timing
  pollIntervalMs: parseInt(process.env.AGENT_POLL_INTERVAL_MS) || 30_000,  // 30 seconds
  
  // Email settings
  resendApiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'PayInbox <noreply@payinbox.xyz>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Solana settings
  solanaRpc: process.env.SOLANA_RPC || 'https://api.devnet.solana.com',
  programId: process.env.PROGRAM_ID || '14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h',
  
  // Cap gates
  maxRemindersPerDay: parseInt(process.env.MAX_REMINDERS_PER_DAY) || 100,
  maxRemindersPerHour: parseInt(process.env.MAX_REMINDERS_PER_HOUR) || 30,
  maxReclaimsPerMinute: parseInt(process.env.MAX_RECLAIMS_PER_MINUTE) || 5,
  
  // Reclaim settings (disabled by default for safety)
  reclaimEnabled: process.env.RECLAIM_ENABLED === 'true',
  
  // Self-healing
  staleMinutes: parseInt(process.env.STALE_MINUTES) || 30,
  
  // Mode
  dryRun: process.env.DRY_RUN === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// ============================================================================
// Initialize Services
// ============================================================================

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
const connection = new Connection(config.solanaRpc, 'confirmed');

// Agent state
let isRunning = false;
let loopCount = 0;
let lastLoopAt = null;
let stats = {
  remindersToday: 0,
  reclaimsToday: 0,
  errorsToday: 0,
};

// ============================================================================
// Email Templates
// ============================================================================

function generateReminderEmail(transfer, reminderType) {
  const claimUrl = `${config.frontendUrl}/claim/${transfer.claim_code}`;
  
  const templates = {
    first: {
      subject: `Reminder: You have ${transfer.amount} ${transfer.token} waiting!`,
      urgency: 'normal',
      heading: 'Don\'t forget your crypto!',
      message: 'Someone sent you crypto, but you haven\'t claimed it yet. Click below to claim it to your wallet.',
      buttonText: `Claim ${transfer.amount} ${transfer.token}`,
      color: '#9945FF',
    },
    urgent: {
      subject: `⏰ Urgent: ${transfer.amount} ${transfer.token} expires soon!`,
      urgency: 'high',
      heading: 'Time is running out!',
      message: 'Your crypto transfer will expire soon. Don\'t miss out!',
      buttonText: `Claim Now`,
      color: '#FF6B35',
    },
    final: {
      subject: `⚠️ FINAL NOTICE: ${transfer.amount} ${transfer.token} expires in 2 hours!`,
      urgency: 'critical',
      heading: 'LAST CHANCE!',
      message: 'This is your final reminder. Your transfer expires in just 2 hours. After that, the funds will be returned to the sender.',
      buttonText: `Claim Before It\'s Too Late`,
      color: '#E63946',
    },
  };

  const t = templates[reminderType] || templates.first;
  const expiresAt = new Date(transfer.expires_at);
  const hoursLeft = Math.max(0, Math.round((expiresAt - Date.now()) / (1000 * 60 * 60)));

  return {
    subject: t.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, ${t.color}, #14F195); border-radius: 12px; margin: 0 auto 16px;"></div>
            <h1 style="color: #1a1a2e; margin: 0; font-size: 24px;">${t.heading}</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, ${t.color}, #14F195); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; color: white;">${transfer.amount} ${transfer.token}</span>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            ${t.message}
          </p>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, ${t.color}, #14F195); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              ${t.buttonText}
            </a>
          </div>
          
          <p style="color: #E63946; font-size: 14px; text-align: center; margin-bottom: 8px; font-weight: 600;">
            ⏰ Expires in approximately ${hoursLeft} hours
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            If you've already claimed this or don't want to receive reminders, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
  };
}

// ============================================================================
// Cap Gates
// ============================================================================

async function checkCapGates(missionType, context = {}) {
  const gates = {
    send_reminder: async () => {
      // Check daily limit
      const todayCount = await db.missions.getTodayCountByType('send_reminder');
      if (todayCount >= config.maxRemindersPerDay) {
        return { ok: false, reason: `Daily reminder limit reached (${config.maxRemindersPerDay})` };
      }
      
      // Check hourly limit
      const hourlyEmails = await db.emailQueue.getLastHourCount();
      if (hourlyEmails >= config.maxRemindersPerHour) {
        return { ok: false, reason: `Hourly email limit reached (${config.maxRemindersPerHour})` };
      }
      
      // Check per-transfer limit
      if (context.transfer && context.transfer.reminders_sent >= 3) {
        return { ok: false, reason: 'Max reminders per transfer reached (3)' };
      }
      
      // Check if email is blocked
      if (context.transfer) {
        const isBlocked = await db.blocked.isBlocked('email', context.transfer.email);
        if (isBlocked) {
          return { ok: false, reason: 'Recipient email is blocked' };
        }
      }
      
      return { ok: true };
    },
    
    auto_reclaim: async () => {
      if (!config.reclaimEnabled) {
        return { ok: false, reason: 'Auto-reclaim is disabled' };
      }
      
      // Check rate limit (reclaims in last minute)
      const pendingReclaims = await db.missions.getPendingCountByType('auto_reclaim');
      if (pendingReclaims >= config.maxReclaimsPerMinute) {
        return { ok: false, reason: `Rate limit: ${config.maxReclaimsPerMinute} reclaims/minute` };
      }
      
      return { ok: true };
    },
    
    investigate_abuse: async () => {
      // Abuse investigations always need approval
      return { ok: true, needsApproval: true };
    },
  };

  const checker = gates[missionType];
  if (!checker) {
    return { ok: true };  // Unknown types pass by default
  }

  return await checker();
}

// ============================================================================
// Mission Executors
// ============================================================================

const executors = {
  /**
   * Send reminder email for unclaimed transfer
   */
  async send_reminder(mission) {
    const transfer = await db.transfers.getById(mission.transfer_id);
    if (!transfer) {
      throw new Error(`Transfer not found: ${mission.transfer_id}`);
    }

    // Double-check transfer is still pending
    if (transfer.status !== 'pending' && transfer.status !== 'confirmed') {
      return { skipped: true, reason: `Transfer status is ${transfer.status}` };
    }

    // Already claimed?
    if (transfer.claimed_at) {
      return { skipped: true, reason: 'Transfer already claimed' };
    }

    const reminderType = mission.input_data?.reminder_type || 'first';
    const emailContent = generateReminderEmail(transfer, reminderType);

    if (config.dryRun) {
      console.log(`[DRY RUN] Would send ${reminderType} reminder to ${transfer.email}`);
      return { dryRun: true, email: transfer.email, reminderType };
    }

    // Queue email for sending
    const queuedEmail = await db.emailQueue.queue({
      toEmail: transfer.email,
      subject: emailContent.subject,
      htmlBody: emailContent.html,
      emailType: `reminder_${reminderType}`,
      transferId: transfer.id,
      missionId: mission.id,
    });

    // Update transfer reminder count
    await db.transfers.update(transfer.id, {
      reminders_sent: (transfer.reminders_sent || 0) + 1,
      last_reminder_at: new Date().toISOString(),
    });

    // Emit event
    await db.events.emit('reminder_scheduled', {
      reminderType,
      transferId: transfer.id,
      email: transfer.email.replace(/(.{2}).*(@.*)/, '$1***$2'),  // Mask email
    }, { transferId: transfer.id, missionId: mission.id });

    return { 
      success: true, 
      emailId: queuedEmail.id,
      reminderType,
    };
  },

  /**
   * Auto-reclaim expired transfer funds
   */
  async auto_reclaim(mission) {
    const transfer = await db.transfers.getById(mission.transfer_id);
    if (!transfer) {
      throw new Error(`Transfer not found: ${mission.transfer_id}`);
    }

    // Verify still expired and unclaimed
    if (transfer.claimed_at || transfer.reclaimed_at) {
      return { skipped: true, reason: 'Transfer already claimed or reclaimed' };
    }

    const expiresAt = new Date(transfer.expires_at);
    if (expiresAt > new Date()) {
      return { skipped: true, reason: 'Transfer not yet expired' };
    }

    if (config.dryRun) {
      console.log(`[DRY RUN] Would reclaim ${transfer.amount} ${transfer.token} to ${transfer.sender_pubkey}`);
      return { dryRun: true, amount: transfer.amount, sender: transfer.sender_pubkey };
    }

    // Track attempt
    await db.transfers.incrementReclaimAttempts(transfer.id);

    // In production, we would:
    // 1. Build reclaim transaction using program IDL
    // 2. Sign with backend keypair
    // 3. Submit to Solana
    // For now, mark as reclaimed (manual intervention needed for actual funds)
    
    console.log(`⚠️ RECLAIM NEEDED: Transfer ${transfer.id}`);
    console.log(`   Amount: ${transfer.amount} ${transfer.token}`);
    console.log(`   Sender: ${transfer.sender_pubkey}`);
    console.log(`   Transfer PDA: ${transfer.transfer_pubkey}`);

    // Mark transfer as needing manual reclaim
    await db.transfers.update(transfer.id, {
      status: 'expired',
      metadata: {
        ...transfer.metadata,
        reclaim_needed: true,
        reclaim_logged_at: new Date().toISOString(),
      },
    });

    // Emit event
    await db.events.emit('reclaim_needed', {
      transferId: transfer.id,
      amount: transfer.amount,
      token: transfer.token,
      sender: transfer.sender_pubkey,
    }, { transferId: transfer.id, missionId: mission.id });

    return { 
      success: true, 
      status: 'logged_for_manual_reclaim',
      note: 'Full auto-reclaim requires backend keypair setup',
    };
  },

  /**
   * Investigate potential abuse
   */
  async investigate_abuse(mission) {
    // For now, just log for manual review
    console.log(`🔍 ABUSE INVESTIGATION NEEDED`);
    console.log(`   Type: ${mission.input_data?.pattern_type}`);
    console.log(`   Entity: ${mission.input_data?.entity}`);
    console.log(`   Details:`, mission.input_data);

    await db.events.emit('abuse_investigation_logged', {
      ...mission.input_data,
    }, { missionId: mission.id });

    return { 
      success: true, 
      status: 'logged_for_review',
    };
  },
};

// ============================================================================
// Trigger Evaluators
// ============================================================================

async function evaluateTriggers() {
  const triggered = [];

  // Trigger 1: 24h reminders
  const needing24h = await db.transfers.getNeedingReminder24h(20);
  for (const transfer of needing24h) {
    const capCheck = await checkCapGates('send_reminder', { transfer });
    if (capCheck.ok) {
      triggered.push({
        type: 'send_reminder',
        transferId: transfer.id,
        inputData: { reminder_type: 'first' },
        autoApprove: true,
        source: 'trigger_24h',
      });
    }
  }

  // Trigger 2: 48h urgent reminders
  const needing48h = await db.transfers.getNeedingReminder48h(20);
  for (const transfer of needing48h) {
    const capCheck = await checkCapGates('send_reminder', { transfer });
    if (capCheck.ok) {
      triggered.push({
        type: 'send_reminder',
        transferId: transfer.id,
        inputData: { reminder_type: 'urgent' },
        autoApprove: true,
        source: 'trigger_48h',
      });
    }
  }

  // Trigger 3: Final notice (2h before expiry)
  const expiringSoon = await db.transfers.getExpiringSoon(20);
  for (const transfer of expiringSoon) {
    if (transfer.reminders_sent < 3) {  // Haven't sent final yet
      const capCheck = await checkCapGates('send_reminder', { transfer });
      if (capCheck.ok) {
        triggered.push({
          type: 'send_reminder',
          transferId: transfer.id,
          inputData: { reminder_type: 'final' },
          autoApprove: true,
          source: 'trigger_expiry',
        });
      }
    }
  }

  // Trigger 4: Auto-reclaim expired
  const expired = await db.transfers.getExpiredForReclaim(10);
  for (const transfer of expired) {
    const capCheck = await checkCapGates('auto_reclaim', { transfer });
    if (capCheck.ok) {
      triggered.push({
        type: 'auto_reclaim',
        transferId: transfer.id,
        inputData: {},
        autoApprove: true,
        source: 'trigger_expired',
      });
    }
  }

  return triggered;
}

// ============================================================================
// Email Processor
// ============================================================================

async function processEmailQueue() {
  const pendingEmails = await db.emailQueue.getPending(10);
  
  for (const email of pendingEmails) {
    try {
      await db.emailQueue.markSending(email.id);

      if (!resend) {
        // Dev mode - just log
        console.log(`📧 [DEV] Email to ${email.to_email}: ${email.subject}`);
        await db.emailQueue.markSent(email.id, 'dev-mode');
        continue;
      }

      const result = await resend.emails.send({
        from: config.fromEmail,
        to: email.to_email,
        subject: email.subject,
        html: email.html_body,
      });

      await db.emailQueue.markSent(email.id, result.id);
      console.log(`✅ Email sent to ${email.to_email} (${result.id})`);

      // Emit event
      await db.events.emit('email_sent', {
        emailId: email.id,
        type: email.email_type,
        to: email.to_email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      }, { transferId: email.transfer_id });

    } catch (error) {
      console.error(`❌ Email failed: ${email.to_email}`, error.message);
      await db.emailQueue.markFailed(email.id, error.message);
      stats.errorsToday++;
    }
  }
}

// ============================================================================
// Main Loop
// ============================================================================

async function runLoop() {
  if (isRunning) {
    console.warn('⚠️ Previous loop still running, skipping...');
    return;
  }

  isRunning = true;
  loopCount++;
  lastLoopAt = new Date();

  try {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔄 Loop #${loopCount} at ${lastLoopAt.toISOString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Step 1: Evaluate triggers and create missions
    console.log('\n📋 Evaluating triggers...');
    const triggered = await evaluateTriggers();
    console.log(`   Found ${triggered.length} triggers to process`);

    for (const trigger of triggered) {
      try {
        const mission = await db.missions.create(trigger);
        console.log(`   ✓ Created mission: ${mission.type} (${mission.id.slice(0, 8)})`);
      } catch (error) {
        console.error(`   ✗ Failed to create mission:`, error.message);
      }
    }

    // Step 2: Execute pending missions
    console.log('\n🚀 Executing missions...');
    const pendingMissions = await db.missions.getPending(10);
    console.log(`   ${pendingMissions.length} missions in queue`);

    for (const mission of pendingMissions) {
      const executor = executors[mission.type];
      if (!executor) {
        console.log(`   ⚠️ No executor for mission type: ${mission.type}`);
        await db.missions.fail(mission.id, `No executor for type: ${mission.type}`);
        continue;
      }

      try {
        // Claim mission (atomic, prevents race conditions)
        const claimed = await db.missions.claim(mission.id);
        if (!claimed) {
          console.log(`   ⚠️ Mission ${mission.id} already claimed`);
          continue;
        }

        console.log(`   ▶ Executing: ${mission.type} (${mission.id.slice(0, 8)})`);
        const result = await executor(mission);
        
        if (result.skipped) {
          console.log(`   ⏭ Skipped: ${result.reason}`);
          await db.missions.succeed(mission.id, { skipped: true, reason: result.reason });
        } else {
          console.log(`   ✓ Success:`, result);
          await db.missions.succeed(mission.id, result);
          
          if (mission.type === 'send_reminder') stats.remindersToday++;
          if (mission.type === 'auto_reclaim') stats.reclaimsToday++;
        }
      } catch (error) {
        console.error(`   ✗ Failed:`, error.message);
        await db.missions.fail(mission.id, error.message);
        stats.errorsToday++;
      }
    }

    // Step 3: Process email queue
    console.log('\n📧 Processing email queue...');
    await processEmailQueue();

    // Step 4: Self-healing - recover stale missions
    console.log('\n🔧 Self-healing check...');
    const recovered = await db.missions.recoverStale(config.staleMinutes);
    if (recovered.length > 0) {
      console.log(`   Recovered ${recovered.length} stale missions`);
    }

    // Step 5: Update agent state
    await db.agentState.set('last_loop', {
      loopCount,
      timestamp: lastLoopAt.toISOString(),
      stats,
    });

    console.log('\n✅ Loop complete');
    console.log(`   Stats: ${stats.remindersToday} reminders, ${stats.reclaimsToday} reclaims, ${stats.errorsToday} errors today`);

  } catch (error) {
    console.error('\n❌ Loop error:', error);
    stats.errorsToday++;
  } finally {
    isRunning = false;
  }
}

// ============================================================================
// Health Check HTTP Server
// ============================================================================

function startHealthServer() {
  const http = require('http');
  const port = parseInt(process.env.AGENT_HEALTH_PORT) || 3002;

  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const health = {
        status: 'ok',
        agent: 'autonomous',
        loopCount,
        lastLoopAt: lastLoopAt?.toISOString(),
        isRunning,
        stats,
        config: {
          pollIntervalMs: config.pollIntervalMs,
          dryRun: config.dryRun,
          reclaimEnabled: config.reclaimEnabled,
          emailEnabled: !!resend,
        },
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } else if (req.url === '/stats' && req.method === 'GET') {
      try {
        // Get more detailed stats from database
        const pendingMissions = await db.missions.getPending(100);
        const todayReminders = await db.missions.getTodayCountByType('send_reminder');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          loopCount,
          lastLoopAt: lastLoopAt?.toISOString(),
          stats,
          queue: {
            pendingMissions: pendingMissions.length,
          },
          today: {
            reminders: todayReminders,
          },
        }, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    console.log(`🏥 Health server running on port ${port}`);
  });
}

// ============================================================================
// Startup
// ============================================================================

async function start() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         SolRelay Autonomous Agent Starting                 ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Mode:          ${(config.dryRun ? 'DRY RUN' : 'LIVE').padEnd(42)} ║`);
  console.log(`║  Environment:   ${config.nodeEnv.padEnd(42)} ║`);
  console.log(`║  Poll Interval: ${(config.pollIntervalMs / 1000 + ' seconds').padEnd(42)} ║`);
  console.log(`║  Email:         ${(resend ? 'Enabled' : 'Disabled').padEnd(42)} ║`);
  console.log(`║  Reclaim:       ${(config.reclaimEnabled ? 'Enabled' : 'Disabled').padEnd(42)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Test database connection
  console.log('🔌 Testing database connection...');
  try {
    await db.agentState.set('startup', {
      timestamp: new Date().toISOString(),
      pid: process.pid,
    });
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Start health server
  startHealthServer();

  // Run first loop immediately
  console.log('🚀 Running initial loop...');
  await runLoop();

  // Schedule recurring loops
  console.log(`\n⏱ Scheduling loops every ${config.pollIntervalMs / 1000} seconds...`);
  setInterval(runLoop, config.pollIntervalMs);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Received SIGTERM, shutting down...');
    process.exit(0);
  });
}

// ============================================================================
// Run
// ============================================================================

start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
