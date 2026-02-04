'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { createTransfer } from '@/lib/api'

export default function SendForm() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState('USDC')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [claimLink, setClaimLink] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!publicKey) {
      toast.error('Please connect your wallet first')
      return
    }
    
    setLoading(true)
    const toastId = toast.loading('Preparing transaction...')

    try {
      // Step 1: Create transfer parameters
      toast.loading('Creating transfer...', { id: toastId })
      const transferData = await createTransfer({
        email,
        amount: parseFloat(amount),
        token: token as 'SOL' | 'USDC'
      })
      
      // Step 2: Build transaction (TODO: after contract deployed)
      toast.loading('Waiting for wallet signature...', { id: toastId })
      // const transaction = await buildTransferTransaction(...)
      
      // Step 3: Sign transaction
      // if (signTransaction) {
      //   try {
      //     const signed = await signTransaction(transaction)
      //     toast.loading('Sending transaction...', { id: toastId })
      //     const signature = await connection.sendRawTransaction(signed.serialize())
      //     await connection.confirmTransaction(signature)
      //   } catch (sigError: any) {
      //     if (sigError.message?.includes('User rejected')) {
      //       toast.error('Transaction canceled', { id: toastId })
      //     } else {
      //       toast.error('Wallet didn\'t sign', { id: toastId })
      //     }
      //     setLoading(false)
      //     return
      //   }
      // }
      
      // For now: simulate success
      const claimCode = transferData.claimCode
      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
      
      setClaimLink(`${frontendUrl}/claim/${claimCode}`)
      setSuccess(true)
      setLoading(false)
      toast.success('Sent! 🎉', { id: toastId })
    } catch (error: any) {
      console.error('Error:', error)
      const errorMsg = error.message || 'Failed to create transfer'
      setError(errorMsg)
      toast.error(`Error: ${errorMsg}`, { id: toastId })
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h3 className="text-2xl font-bold mb-2">Transfer sent!</h3>
        <p className="text-gray-600 mb-6">
          An email has been sent to <strong>{email}</strong> with instructions to claim their funds.
        </p>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 font-mono text-sm break-all">
          {claimLink}
        </div>

        <button
          onClick={() => {
            setSuccess(false)
            setEmail('')
            setAmount('')
            setError('')
          }}
          className="text-solana-purple hover:underline"
        >
          Send another transfer
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1A3B5D] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 shadow-lg">
      {/* Email Input */}
      <div className="mb-6">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recipient email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          required
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-[#0A2540] dark:text-white rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent outline-none transition"
        />
      </div>

      {/* Amount & Token */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-[#0A2540] dark:text-white rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token
          </label>
          <select
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-[#0A2540] dark:text-white rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent outline-none transition bg-white"
          >
            <option value="USDC">USDC</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
      </div>

      {/* Wallet Status */}
      {!publicKey && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠️ Connect your wallet to send transfers
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !publicKey}
        className="w-full py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : !publicKey ? 'Connect Wallet First' : 'Send via Email'}
      </button>

      {/* Info Text */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        They'll receive an email with a link to claim. Expires in 72 hours.
      </p>
    </form>
  )
}
