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
 * Transfer status enum matching the on-chain program
 */
export enum TransferStatus {
  Active = 'active',
  Claimed = 'claimed',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

/**
 * Parsed transfer account data
 */
export interface TransferAccountData {
  sender: PublicKey;
  emailHash: number[];
  claimCodeHash: number[];
  amount: BN;
  tokenMint: PublicKey;
  escrowTokenAccount: PublicKey;
  createdAt: BN;
  expiry: BN;
  status: TransferStatus;
  bump: number;
  escrowBump: number;
}

/**
 * Parse the status object from the on-chain account
 */
function parseTransferStatus(statusObj: Record<string, unknown>): TransferStatus {
  if ('active' in statusObj) return TransferStatus.Active;
  if ('claimed' in statusObj) return TransferStatus.Claimed;
  if ('cancelled' in statusObj) return TransferStatus.Cancelled;
  if ('expired' in statusObj) return TransferStatus.Expired;
  return TransferStatus.Active; // fallback
}

/**
 * Fetch a transfer account's data
 */
export async function fetchTransferAccount(
  connection: Connection,
  transferPDA: PublicKey
): Promise<TransferAccountData | null> {
  const program = getProgram(connection);

  try {
    // Use type assertion for dynamic account access
    const accounts = program.account as Record<string, { fetch: (address: PublicKey) => Promise<unknown> }>;
    const account = await accounts['transferAccount'].fetch(transferPDA) as any;
    
    return {
      ...account,
      status: parseTransferStatus(account.status),
    };
  } catch {
    return null;
  }
}

/**
 * Check if an existing transfer exists for the given sender and email hash
 * Returns the transfer data if it exists, null otherwise
 */
export async function checkExistingTransfer(
  connection: Connection,
  sender: PublicKey,
  emailHash: Uint8Array
): Promise<{ transferPDA: PublicKey; data: TransferAccountData } | null> {
  const [transferPDA] = getTransferPDA(sender, emailHash);
  const data = await fetchTransferAccount(connection, transferPDA);
  
  if (data) {
    return { transferPDA, data };
  }
  return null;
}

/**
 * Build a cancel_transfer transaction
 */
export async function buildCancelTransferTx(
  connection: Connection,
  sender: PublicKey,
  transferPDA: PublicKey,
  transferData: TransferAccountData
): Promise<Transaction> {
  const program = getProgram(connection);

  // Get sender's associated token account
  const senderATA = await getAssociatedTokenAddress(transferData.tokenMint, sender);
  const [escrowPDA] = getEscrowPDA(transferPDA);

  // Build cancel instruction
  const ix = await program.methods
    .cancelTransfer()
    .accounts({
      transfer: transferPDA,
      sender: sender,
      senderTokenAccount: senderATA,
      escrowTokenAccount: escrowPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const transaction = new Transaction().add(ix);

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = sender;

  return transaction;
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

/**
 * Parsed transfer with additional computed fields
 */
export interface ParsedTransfer {
  publicKey: PublicKey;
  data: TransferAccountData;
  amountFormatted: string;
  tokenSymbol: string;
  createdDate: Date;
  expiryDate: Date;
  isExpired: boolean;
}

/**
 * Fetch all transfers created by a specific sender wallet.
 * Uses getProgramAccounts with a memcmp filter on the sender field.
 */
export async function fetchAllTransfersForSender(
  connection: Connection,
  sender: PublicKey
): Promise<ParsedTransfer[]> {
  const program = getProgram(connection);

  try {
    // The TransferAccount discriminator (8 bytes) + sender pubkey starts at offset 8
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        // Filter by account discriminator for TransferAccount
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode([166, 217, 148, 252, 107, 104, 0, 90]), // TransferAccount discriminator
          },
        },
        // Filter by sender pubkey (starts at offset 8 after discriminator)
        {
          memcmp: {
            offset: 8,
            bytes: sender.toBase58(),
          },
        },
      ],
    });

    const transfers: ParsedTransfer[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        // Decode the account data using Anchor's coder
        const coder = program.coder.accounts;
        const decoded = coder.decode('transferAccount', account.data) as any;
        
        const transferData: TransferAccountData = {
          ...decoded,
          status: parseTransferStatus(decoded.status),
        };

        // Determine token symbol and format amount
        const tokenSymbol = transferData.tokenMint.equals(TOKEN_MINTS.SOL) ? 'SOL' : 'USDC';
        const decimals = tokenSymbol === 'SOL' ? TOKEN_DECIMALS.SOL : TOKEN_DECIMALS.USDC;
        const amountFormatted = (transferData.amount.toNumber() / Math.pow(10, decimals)).toFixed(
          decimals === 9 ? 4 : 2
        );

        const createdDate = new Date(transferData.createdAt.toNumber() * 1000);
        const expiryDate = new Date(transferData.expiry.toNumber() * 1000);
        const isExpired = Date.now() > expiryDate.getTime();

        transfers.push({
          publicKey: pubkey,
          data: transferData,
          amountFormatted,
          tokenSymbol,
          createdDate,
          expiryDate,
          isExpired,
        });
      } catch (err) {
        console.error('Failed to decode transfer account:', pubkey.toBase58(), err);
      }
    }

    // Sort by created date (newest first)
    transfers.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());

    return transfers;
  } catch (err) {
    console.error('Error fetching transfers for sender:', err);
    return [];
  }
}

// Base58 encoding helper
const bs58 = {
  encode: (bytes: number[]): string => {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    let num = BigInt(0);
    for (const byte of bytes) {
      num = num * BigInt(256) + BigInt(byte);
    }
    while (num > 0) {
      result = ALPHABET[Number(num % BigInt(58))] + result;
      num = num / BigInt(58);
    }
    // Handle leading zeros
    for (const byte of bytes) {
      if (byte === 0) {
        result = ALPHABET[0] + result;
      } else {
        break;
      }
    }
    return result || ALPHABET[0];
  },
};
