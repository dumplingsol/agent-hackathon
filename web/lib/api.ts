/**
 * PayInbox API Client
 * 
 * Handles communication with the agent service
 */

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';

// ============================================================================
// Types
// ============================================================================

export interface CreateTransferRequest {
  email: string;
  amount: number;
  token: 'SOL' | 'USDC';
  senderPublicKey?: string;
}

export interface CreateTransferResponse {
  emailHash: number[];
  claimCodeHash: number[];
  // Only returned in development mode
  claimCode?: string;
}

export interface TransferDetails {
  amount: number;
  token: string;
  sender: string;
  expiresAt: string;
  claimed: boolean;
  expired: boolean;
  transferPubkey: string | null;
}

export interface ClaimHashResponse {
  claimCode: string;
  transferPubkey: string | null;
}

export interface ApiError {
  error: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a new transfer
 * Returns hashes needed for the on-chain transaction
 */
export async function createTransfer(data: CreateTransferRequest): Promise<CreateTransferResponse> {
  const response = await fetch(`${AGENT_URL}/api/create-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create transfer');
  }
  
  return response.json();
}

/**
 * Confirm a transfer was created on-chain
 */
export async function confirmTransfer(
  claimCode: string,
  signature: string,
  transferPubkey: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${AGENT_URL}/api/confirm-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ claimCode, signature, transferPubkey }),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to confirm transfer');
  }
  
  return response.json();
}

/**
 * Get transfer details by claim code
 */
export async function getTransfer(claimCode: string): Promise<TransferDetails> {
  const response = await fetch(`${AGENT_URL}/api/transfer/${claimCode}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Transfer not found or expired');
    }
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to fetch transfer');
  }
  
  return response.json();
}

/**
 * Get the claim code needed for the on-chain claim transaction
 */
export async function getClaimData(claimCode: string): Promise<ClaimHashResponse> {
  const response = await fetch(`${AGENT_URL}/api/claim-hash/${claimCode}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get claim data');
  }
  
  return response.json();
}

/**
 * Submit a claim transaction
 */
export async function submitClaim(
  claimCode: string,
  signature: string,
  recipientPublicKey: string
): Promise<{ success: boolean; signature: string }> {
  const response = await fetch(`${AGENT_URL}/api/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ claimCode, signature, recipientPublicKey }),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Claim failed');
  }
  
  return response.json();
}

/**
 * Check agent service health
 */
export async function checkHealth(): Promise<{
  status: string;
  timestamp: string;
  programId: string;
  rpc: string;
  emailEnabled: boolean;
}> {
  const response = await fetch(`${AGENT_URL}/health`);
  
  if (!response.ok) {
    throw new Error('Agent service unavailable');
  }
  
  return response.json();
}
