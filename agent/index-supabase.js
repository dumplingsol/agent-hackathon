/**
 * PayInbox Agent Service (Supabase Edition)
 * 
 * Handles:
 * - Transfer creation (hashing, claim code generation)
 * - Email notifications via Resend
 * - Chain monitoring for events
 * - Claim verification
 * 
 * Now with Supabase for persistent storage!
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { keccak256 } = require('js-sha3');
const rateLimit = require('express-rate-limit');
const { Connection, PublicKey } = require('@solana/web3.js');
const { Resend } = require('resend');
const db = require('./db');

// ============================================================================
// Configuration & Validation
// ============================================================================

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  solanaRpc: process.env.SOLANA_RPC || 'https://api.devnet.solana.com',
  programId: process.env.PROGRAM_ID || '14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h',
  resendApiKey: process.env.RESEND_API_KEY,
  serverSalt: process.env.SERVER_SALT,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  fromEmail: process.env.FROM_EMAIL || 'PayInbox <noreply@payinbox.xyz>',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate critical configuration
function validateConfig() {
  const errors = [];
  
  if (!config.serverSalt || config.serverSalt === 'your-random-salt-here-change-me') {
    errors.push('SERVER_SALT must be set to a secure random value');
  }
  
  if (config.serverSalt && config.serverSalt.length < 32) {
    errors.push('SERVER_SALT should be at least 32 characters');
  }
  
  if (config.nodeEnv === 'production' && !config.resendApiKey) {
    errors.push('RESEND_API_KEY is required in production');
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    if (config.nodeEnv === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Running in development mode with missing config');
    }
  }
}

validateConfig();

// ============================================================================
// Initialize Services
// ============================================================================

const app = express();
const connection = new Connection(config.solanaRpc, 'confirmed');
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

// ============================================================================
// Middleware
// ============================================================================

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  config.frontendUrl,
  config.frontendUrl.replace('https://', 'https://www.'),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      return callback(null, true);
    }
    console.warn(`CORS rejected origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rate limiting
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', standardLimiter);

// ============================================================================
// Validation Helpers
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_TOKENS = ['SOL', 'USDC'];

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function validateAmount(amount, token) {
  if (typeof amount !== 'number' || isNaN(amount)) return false;
  if (amount <= 0) return false;
  if (amount > 1_000_000) return false;
  return true;
}

function validateToken(token) {
  return SUPPORTED_TOKENS.includes(token);
}

function validateClaimCode(code) {
  if (!code || typeof code !== 'string') return false;
  if (code.length !== 64) return false;
  return /^[a-f0-9]+$/.test(code);
}

// ============================================================================
// Crypto Helpers
// ============================================================================

function generateClaimCode() {
  return crypto.randomBytes(32).toString('hex');
}

function hashClaimCode(claimCode) {
  const hash = keccak256(claimCode);
  return Buffer.from(hash, 'hex');
}

function hashEmail(email) {
  const normalized = email.toLowerCase().trim();
  return crypto.createHash('sha256')
    .update(normalized + config.serverSalt)
    .digest();
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.agentState.get('health_check');
    
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      programId: config.programId,
      rpc: config.solanaRpc,
      emailEnabled: !!resend,
      database: 'connected',
      storage: 'supabase',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Create transfer helper
 */
app.post('/api/create-transfer', strictLimiter, async (req, res) => {
  try {
    const { email, amount, token, senderPublicKey } = req.body;

    // Validation
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    if (!validateToken(token)) {
      return res.status(400).json({ error: `Invalid token. Supported: ${SUPPORTED_TOKENS.join(', ')}` });
    }
    
    if (!validateAmount(amount, token)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Check if sender or email is blocked
    const emailBlocked = await db.blocked.isBlocked('email', email);
    if (emailBlocked) {
      return res.status(403).json({ error: 'This email address is blocked' });
    }

    if (senderPublicKey) {
      const walletBlocked = await db.blocked.isBlocked('wallet', senderPublicKey);
      if (walletBlocked) {
        return res.status(403).json({ error: 'This wallet is blocked' });
      }
    }

    // Generate claim code and hashes
    const claimCode = generateClaimCode();
    const claimCodeHash = hashClaimCode(claimCode);
    const emailHash = hashEmail(email);

    // Store transfer in Supabase
    const transfer = await db.transfers.create({
      email,
      emailHash: Array.from(emailHash),
      claimCode,
      claimCodeHash: Array.from(claimCodeHash),
      amount,
      token,
      senderPubkey: senderPublicKey || 'unknown',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    // Emit event
    await db.events.emit('transfer_created', {
      transferId: transfer.id,
      amount,
      token,
      sender: senderPublicKey,
    }, { transferId: transfer.id });

    // Send email notification asynchronously
    sendClaimEmail(email, claimCode, amount, token, transfer.id).catch(err => {
      console.error('Failed to send claim email:', err);
    });

    // Return hashes to frontend
    res.json({
      emailHash: Array.from(emailHash),
      claimCodeHash: Array.from(claimCodeHash),
      ...(config.nodeEnv !== 'production' && { claimCode }),
    });
    
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Confirm transfer was created on-chain
 */
app.post('/api/confirm-transfer', async (req, res) => {
  try {
    const { claimCode, signature, transferPubkey } = req.body;

    if (!claimCode || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transfer = await db.transfers.getByClaimCode(claimCode);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    // Verify transaction on-chain
    try {
      const tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return res.status(400).json({ error: 'Transaction not found on chain' });
      }

      if (tx.meta?.err) {
        return res.status(400).json({ error: 'Transaction failed on chain' });
      }
    } catch (txError) {
      console.error('Error verifying transaction:', txError);
      return res.status(400).json({ error: 'Failed to verify transaction' });
    }

    // Update transfer in Supabase
    await db.transfers.confirm(claimCode, signature, transferPubkey);

    // Emit event
    await db.events.emit('transfer_confirmed', {
      transferId: transfer.id,
      signature,
      transferPubkey,
    }, { transferId: transfer.id });

    res.json({ success: true });
    
  } catch (error) {
    console.error('Error confirming transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get transfer details by claim code
 */
app.get('/api/transfer/:claimCode', async (req, res) => {
  try {
    const { claimCode } = req.params;
    
    if (!validateClaimCode(claimCode)) {
      return res.status(400).json({ error: 'Invalid claim code format' });
    }
    
    const transfer = await db.transfers.getByClaimCode(claimCode);
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const isExpired = new Date(transfer.expires_at) < new Date();
    
    const tokenMints = {
      USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      SOL: 'So11111111111111111111111111111111111111112',
    };
    
    res.json({
      amount: transfer.amount,
      token: transfer.token,
      sender: transfer.sender_pubkey,
      expiresAt: transfer.expires_at,
      claimed: transfer.status === 'claimed',
      expired: isExpired,
      transferPubkey: transfer.transfer_pubkey,
      emailHash: transfer.email_hash,
      tokenMint: tokenMints[transfer.token] || tokenMints.USDC,
    });
    
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Submit claim transaction
 */
app.post('/api/claim', strictLimiter, async (req, res) => {
  try {
    const { claimCode, signature, recipientPublicKey } = req.body;

    if (!claimCode || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validateClaimCode(claimCode)) {
      return res.status(400).json({ error: 'Invalid claim code format' });
    }

    const transfer = await db.transfers.getByClaimCode(claimCode);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    if (transfer.status === 'claimed') {
      return res.status(400).json({ error: 'Transfer already claimed' });
    }

    // Verify transaction on-chain
    try {
      const tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return res.status(400).json({ error: 'Transaction not found on chain' });
      }

      if (tx.meta?.err) {
        return res.status(400).json({ error: 'Claim transaction failed on chain' });
      }
    } catch (txError) {
      console.error('Error verifying claim transaction:', txError);
      return res.status(400).json({ error: 'Failed to verify transaction' });
    }

    // Update transfer status in Supabase
    await db.transfers.markClaimed(claimCode, signature, recipientPublicKey);

    // Emit event
    await db.events.emit('transfer_claimed', {
      transferId: transfer.id,
      signature,
      recipientPubkey: recipientPublicKey,
      amount: transfer.amount,
      token: transfer.token,
    }, { transferId: transfer.id });

    res.json({ 
      success: true,
      signature,
    });
    
  } catch (error) {
    console.error('Error claiming transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get claim data for frontend
 */
app.get('/api/claim-hash/:claimCode', async (req, res) => {
  try {
    const { claimCode } = req.params;
    
    if (!validateClaimCode(claimCode)) {
      return res.status(400).json({ error: 'Invalid claim code format' });
    }
    
    const transfer = await db.transfers.getByClaimCode(claimCode);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    if (transfer.status === 'claimed') {
      return res.status(400).json({ error: 'Transfer already claimed' });
    }

    const tokenMints = {
      USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      SOL: 'So11111111111111111111111111111111111111112',
    };

    res.json({
      claimCode,
      transferPubkey: transfer.transfer_pubkey,
      sender: transfer.sender_pubkey,
      emailHash: transfer.email_hash,
      tokenMint: tokenMints[transfer.token] || tokenMints.USDC,
    });
    
  } catch (error) {
    console.error('Error fetching claim hash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

/**
 * Get pending missions (admin only - add auth in production!)
 */
app.get('/admin/missions', async (req, res) => {
  try {
    const missions = await db.missions.getPending(50);
    res.json({ missions });
  } catch (error) {
    console.error('Error fetching missions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get autonomous agent status
 */
app.get('/admin/agent-status', async (req, res) => {
  try {
    const lastLoop = await db.agentState.get('last_loop');
    const startup = await db.agentState.get('startup');
    
    res.json({
      status: 'ok',
      lastLoop,
      startup,
    });
  } catch (error) {
    console.error('Error fetching agent status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get analytics summary
 */
app.get('/admin/analytics', async (req, res) => {
  try {
    const { data } = await db.supabase
      .from('analytics_daily')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);
    
    res.json({ analytics: data });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Email Service
// ============================================================================

async function sendClaimEmail(email, claimCode, amount, token, transferId) {
  const claimUrl = `${config.frontendUrl}/claim/${claimCode}`;
  
  // Queue email via Supabase instead of sending directly
  await db.emailQueue.queue({
    toEmail: email,
    subject: `You've received ${amount} ${token}!`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #9945FF, #14F195); border-radius: 12px; margin: 0 auto 16px;"></div>
            <h1 style="color: #1a1a2e; margin: 0; font-size: 24px;">You've received crypto!</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #9945FF, #14F195); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; color: white;">${amount} ${token}</span>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Someone sent you crypto via PayInbox. Click the button below to claim it to your wallet.
            No wallet? No problem – we'll help you create one!
          </p>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #9945FF, #14F195); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Claim Your ${token}
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-bottom: 8px;">
            This link expires in 72 hours.
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      </body>
      </html>
    `,
    emailType: 'claim',
    transferId,
  });
  
  console.log(`📧 Claim email queued for: ${email}`);
}

// ============================================================================
// Chain Monitoring
// ============================================================================

let monitoringActive = false;

async function startChainMonitor() {
  if (monitoringActive) return;
  monitoringActive = true;
  
  console.log('🔍 Starting chain monitor...');
  
  const programPubkey = new PublicKey(config.programId);
  
  const subscriptionId = connection.onLogs(
    programPubkey,
    (logs, context) => {
      handleProgramLogs(logs, context);
    },
    'confirmed'
  );
  
  console.log(`📡 Subscribed to program logs (subscription: ${subscriptionId})`);
  
  process.on('SIGINT', async () => {
    console.log('Cleaning up chain monitor...');
    await connection.removeOnLogsListener(subscriptionId);
    process.exit(0);
  });
}

async function handleProgramLogs(logs, context) {
  for (const log of logs.logs) {
    if (log.includes('TransferCreated')) {
      console.log('📬 New transfer created:', logs.signature);
      await db.events.emit('chain_transfer_created', { signature: logs.signature });
    } else if (log.includes('TransferClaimed')) {
      console.log('✅ Transfer claimed:', logs.signature);
      await db.events.emit('chain_transfer_claimed', { signature: logs.signature });
    } else if (log.includes('TransferCancelled')) {
      console.log('↩️ Transfer cancelled:', logs.signature);
      await db.events.emit('chain_transfer_cancelled', { signature: logs.signature });
    } else if (log.includes('TransferReclaimed')) {
      console.log('⏰ Expired transfer reclaimed:', logs.signature);
      await db.events.emit('chain_transfer_reclaimed', { signature: logs.signature });
    }
  }
}

// ============================================================================
// Error Handling
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(config.port, async () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       PayInbox Agent Service (Supabase Edition)        ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Port:        ${config.port.toString().padEnd(40)} ║`);
  console.log(`║  Environment: ${config.nodeEnv.padEnd(40)} ║`);
  console.log(`║  RPC:         ${config.solanaRpc.substring(0, 40).padEnd(40)} ║`);
  console.log(`║  Program ID:  ${config.programId.substring(0, 40).padEnd(40)} ║`);
  console.log(`║  Email:       ${(resend ? 'Enabled' : 'Disabled (dev mode)').padEnd(40)} ║`);
  console.log(`║  Storage:     ${'Supabase ✓'.padEnd(40)} ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Test database connection
  try {
    await db.agentState.set('api_startup', {
      timestamp: new Date().toISOString(),
      port: config.port,
    });
    console.log('✅ Supabase connection verified');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
  }
  
  if (config.nodeEnv === 'production') {
    startChainMonitor();
  }
});

module.exports = { app };
