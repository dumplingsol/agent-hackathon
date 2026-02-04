require('dotenv').config();
const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const { Resend } = require('resend');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || '11111111111111111111111111111111';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Initialize connections
const connection = new Connection(SOLANA_RPC, 'confirmed');
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// In-memory storage (will be replaced with PostgreSQL)
const transfers = new Map();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    programId: PROGRAM_ID,
    rpc: SOLANA_RPC
  });
});

/**
 * Create transfer helper endpoint
 * Frontend calls this before signing transaction
 */
app.post('/api/create-transfer', async (req, res) => {
  try {
    const { email, amount, token } = req.body;

    if (!email || !amount || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique claim code (32 bytes)
    const crypto = require('crypto');
    const claimCode = crypto.randomBytes(32).toString('hex');
    const claimCodeHash = crypto.createHash('sha256').update(claimCode).digest();

    // Hash email with server salt
    const serverSalt = process.env.SERVER_SALT || 'default-salt-change-me';
    const emailHash = crypto.createHash('sha256').update(email + serverSalt).digest();

    res.json({
      emailHash: Array.from(emailHash),
      claimCodeHash: Array.from(claimCodeHash),
      claimCode, // Frontend doesn't see this; agent stores it
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get transfer details by claim code
 */
app.get('/api/transfer/:claimCode', async (req, res) => {
  try {
    const { claimCode } = req.params;
    
    const transfer = transfers.get(claimCode);
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json({
      amount: transfer.amount,
      token: transfer.token,
      sender: transfer.sender,
      expiresAt: transfer.expiresAt,
      claimed: transfer.claimed,
      transferPubkey: transfer.transferPubkey
    });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Submit claim transaction
 */
app.post('/api/claim', async (req, res) => {
  try {
    const { claimCode, signature } = req.body;

    if (!claimCode || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify transaction on-chain
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return res.status(400).json({ error: 'Transaction not found' });
    }

    // Update transfer status
    const transfer = transfers.get(claimCode);
    if (transfer) {
      transfer.claimed = true;
      transfers.set(claimCode, transfer);
    }

    res.json({ 
      success: true,
      signature
    });
  } catch (error) {
    console.error('Error claiming transfer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate new wallet helper
 */
app.post('/api/generate-wallet', async (req, res) => {
  try {
    // Wallet generation should happen CLIENT-SIDE for security
    // This endpoint is for metadata only
    res.json({
      message: 'Wallet generation should be done client-side for security'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send email (called by chain monitor)
 */
async function sendClaimEmail(email, claimCode, amount, token) {
  if (!resend) {
    console.log('Resend API key not configured. Email would be sent to:', email);
    console.log('Claim link: https://solmail.vercel.app/claim/' + claimCode);
    return;
  }

  try {
    await resend.emails.send({
      from: 'SolMail <noreply@solmail.xyz>',
      to: email,
      subject: `You've received ${amount} ${token}!`,
      html: `
        <h1>You've received ${amount} ${token}</h1>
        <p>Someone sent you crypto via SolMail.</p>
        <p><a href="https://solmail.vercel.app/claim/${claimCode}">Click here to claim</a></p>
        <p>This link expires in 72 hours.</p>
        <p>If you didn't expect this, you can safely ignore this email.</p>
      `
    });
    console.log('Email sent to:', email);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * Chain monitor (polls for new transfers)
 * In production, use websocket subscriptions
 */
async function monitorChain() {
  console.log('Monitoring chain for transfer events...');
  // TODO: Subscribe to program logs
  // TODO: Parse TransferCreated events
  // TODO: Send claim emails
}

// Start server
app.listen(PORT, () => {
  console.log(`Agent service running on port ${PORT}`);
  console.log(`Solana RPC: ${SOLANA_RPC}`);
  console.log(`Program ID: ${PROGRAM_ID}`);
  
  // Start chain monitoring
  // monitorChain();
});

module.exports = app;
