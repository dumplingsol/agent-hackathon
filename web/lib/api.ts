// Agent service API client

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001'

export interface CreateTransferRequest {
  email: string
  amount: number
  token: 'SOL' | 'USDC'
}

export interface CreateTransferResponse {
  emailHash: number[]
  claimCodeHash: number[]
  claimCode: string
}

export interface TransferDetails {
  amount: number
  token: string
  sender: string
  expiresAt: string
  claimed: boolean
  transferPubkey: string
}

export async function createTransfer(data: CreateTransferRequest): Promise<CreateTransferResponse> {
  const response = await fetch(`${AGENT_URL}/api/create-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create transfer')
  }
  
  return response.json()
}

export async function getTransfer(claimCode: string): Promise<TransferDetails> {
  const response = await fetch(`${AGENT_URL}/api/transfer/${claimCode}`)
  
  if (!response.ok) {
    throw new Error('Transfer not found')
  }
  
  return response.json()
}

export async function submitClaim(claimCode: string, signature: string): Promise<{ success: boolean; signature: string }> {
  const response = await fetch(`${AGENT_URL}/api/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimCode, signature }),
  })
  
  if (!response.ok) {
    throw new Error('Claim failed')
  }
  
  return response.json()
}
