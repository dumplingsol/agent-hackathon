/**
 * Solmail Program Client
 * 
 * Handles all on-chain interactions with the Solmail program.
 * Uses @coral-xyz/anchor for transaction building and signing.
 */

import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createSyncNativeInstruction,
  NATIVE_MINT,
} from '@solana/spl-token';

import idlJson from './idl.json';

// Program ID (deployed on devnet)
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || '14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h'
);

// Token mints on devnet
export const TOKEN_MINTS = {
  // Devnet USDC (Circle's test token)
  USDC: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  // Native SOL (wrapped)
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
} as const;

// Token decimals
export const TOKEN_DECIMALS = {
  USDC: 6,
  SOL: 9,
} as const;

export type TokenType = keyof typeof TOKEN_MINTS;

// IDL type
const IDL = idlJson as Idl;

/**
 * Create an Anchor program instance
 */
export function getProgram(connection: Connection, wallet?: { publicKey: PublicKey; signTransaction: any; signAllTransactions: any }): Program {
  // Create a dummy wallet for read-only operations
  const dummyWallet = wallet || {
    publicKey: PublicKey.default,
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  };

  const provider = new AnchorProvider(
    connection,
    dummyWallet as any,
    { commitment: 'confirmed' }
  );

  return new Program(IDL, provider);
}

/**
 * Derive the transfer PDA address
 */
export function getTransferPDA(
  sender: PublicKey,
  emailHash: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('transfer'), sender.toBuffer(), Buffer.from(emailHash)],
    PROGRAM_ID
  );
}

/**
 * Derive the escrow token account PDA
 */
export function getEscrowPDA(transferPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), transferPDA.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Build a create_transfer transaction
 */
export async function buildCreateTransferTx(
  connection: Connection,
  sender: PublicKey,
  emailHash: Uint8Array,
  claimCodeHash: Uint8Array,
  amount: number,
  token: TokenType,
  expiryHours: number = 72
): Promise<{ transaction: Transaction; transferPDA: PublicKey }> {
  const program = getProgram(connection);
  const tokenMint = TOKEN_MINTS[token];
  const decimals = TOKEN_DECIMALS[token];

  // Calculate amount in base units
  const amountBN = new BN(Math.floor(amount * Math.pow(10, decimals)));

  // Get PDAs
  const [transferPDA] = getTransferPDA(sender, emailHash);
  const [escrowPDA] = getEscrowPDA(transferPDA);

  // Get sender's associated token account
  const senderATA = await getAssociatedTokenAddress(tokenMint, sender);

  // Initialize transaction
  let transaction = new Transaction();

  // If sending SOL, wrap it first
  if (token === 'SOL') {
    const wrapTx = await wrapSOL(connection, sender, amount);
    transaction.instructions.push(...wrapTx.instructions);
  }

  // Build main instruction
  const ix = await program.methods
    .createTransfer(
      Array.from(emailHash) as any,
      Array.from(claimCodeHash) as any,
      amountBN,
      new BN(expiryHours)
    )
    .accounts({
      transfer: transferPDA,
      sender: sender,
      senderTokenAccount: senderATA,
      tokenMint: tokenMint,
      escrowTokenAccount: escrowPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  transaction.add(ix);

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = sender;

  return { transaction, transferPDA };
}

/**
 * Build a claim_transfer transaction
 */
export async function buildClaimTransferTx(
  connection: Connection,
  recipient: PublicKey,
  transferPDA: PublicKey,
  claimCode: string,
  senderPubkey: PublicKey,
  tokenMint: PublicKey
): Promise<Transaction> {
  const program = getProgram(connection);

  // Get the escrow PDA
  const [escrowPDA] = getEscrowPDA(transferPDA);

  // Get recipient's associated token account
  const recipientATA = await getAssociatedTokenAddress(tokenMint, recipient);

  // Check if recipient ATA exists, create if not
  const transaction = new Transaction();

  try {
    await getAccount(connection, recipientATA);
  } catch {
    // ATA doesn't exist, add create instruction
    const createATAIx = createAssociatedTokenAccountInstruction(
      recipient, // payer
      recipientATA, // ata
      recipient, // owner
      tokenMint // mint
    );
    transaction.add(createATAIx);
  }

  // Build claim instruction
  const claimIx = await program.methods
    .claimTransfer(claimCode)
    .accounts({
      transfer: transferPDA,
      recipient: recipient,
      recipientTokenAccount: recipientATA,
      escrowTokenAccount: escrowPDA,
      sender: senderPubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  transaction.add(claimIx);

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = recipient;

  return transaction;
}

/**
 * Fetch a transfer account's data
 */
export async function fetchTransferAccount(
  connection: Connection,
  transferPDA: PublicKey
): Promise<{
  sender: PublicKey;
  emailHash: number[];
  claimCodeHash: number[];
  amount: BN;
  tokenMint: PublicKey;
  escrowTokenAccount: PublicKey;
  createdAt: BN;
  expiry: BN;
  status: { active?: object; claimed?: object; cancelled?: object; expired?: object };
  bump: number;
  escrowBump: number;
} | null> {
  const program = getProgram(connection);

  try {
    // Use type assertion for dynamic account access
    const accounts = program.account as Record<string, { fetch: (address: PublicKey) => Promise<unknown> }>;
    const account = await accounts['transferAccount'].fetch(transferPDA);
    return account as any;
  } catch {
    return null;
  }
}

/**
 * Check if sender has sufficient balance
 */
export async function checkBalance(
  connection: Connection,
  owner: PublicKey,
  tokenMint: PublicKey,
  requiredAmount: number,
  decimals: number
): Promise<{ sufficient: boolean; balance: number }> {
  // Special handling for native SOL
  if (tokenMint.equals(TOKEN_MINTS.SOL)) {
    try {
      const lamports = await connection.getBalance(owner);
      const balance = lamports / Math.pow(10, decimals);
      // Need extra 0.01 SOL for wrapping + fees
      const requiredWithFees = requiredAmount + 0.01;
      return {
        sufficient: balance >= requiredWithFees,
        balance,
      };
    } catch {
      return { sufficient: false, balance: 0 };
    }
  }

  // Standard SPL token handling
  try {
    const ata = await getAssociatedTokenAddress(tokenMint, owner);
    const account = await getAccount(connection, ata);
    const balance = Number(account.amount) / Math.pow(10, decimals);
    return {
      sufficient: balance >= requiredAmount,
      balance,
    };
  } catch {
    // ATA doesn't exist
    return { sufficient: false, balance: 0 };
  }
}

/**
 * Wrap native SOL into wSOL for SPL token transfer
 */
async function wrapSOL(
  connection: Connection,
  owner: PublicKey,
  amount: number
): Promise<Transaction> {
  const tx = new Transaction();
  const wsolATA = await getAssociatedTokenAddress(NATIVE_MINT, owner);

  // Check if ATA exists
  try {
    await getAccount(connection, wsolATA);
  } catch {
    // Create ATA if it doesn't exist
    tx.add(
      createAssociatedTokenAccountInstruction(
        owner, // payer
        wsolATA, // ATA address
        owner, // owner
        NATIVE_MINT // mint
      )
    );
  }

  // Transfer SOL to the ATA
  const lamports = Math.floor(amount * Math.pow(10, 9));
  tx.add(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: wsolATA,
      lamports,
    })
  );

  // Sync the native balance
  tx.add(createSyncNativeInstruction(wsolATA));

  return tx;
}

/**
 * Ensure the sender has an ATA for the token
 */
export async function ensureATA(
  connection: Connection,
  owner: PublicKey,
  tokenMint: PublicKey,
  payer: PublicKey
): Promise<{ ata: PublicKey; needsCreation: boolean; instruction?: ReturnType<typeof createAssociatedTokenAccountInstruction> }> {
  const ata = await getAssociatedTokenAddress(tokenMint, owner);

  try {
    await getAccount(connection, ata);
    return { ata, needsCreation: false };
  } catch {
    const instruction = createAssociatedTokenAccountInstruction(
      payer,
      ata,
      owner,
      tokenMint
    );
    return { ata, needsCreation: true, instruction };
  }
}
