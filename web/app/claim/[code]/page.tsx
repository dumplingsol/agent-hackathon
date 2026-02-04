'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'

export default function ClaimPage() {
  const params = useParams()
  const code = params?.code as string
  
  const [loading, setLoading] = useState(true)
  const [transfer, setTransfer] = useState<any>(null)
  const [error, setError] = useState('')
  const [claimMethod, setClaimMethod] = useState<'connect' | 'generate' | null>(null)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    loadTransfer()
  }, [code])

  const loadTransfer = async () => {
    try {
      // TODO: Fetch from agent API
      const response = await fetch(`http://localhost:3001/api/transfer/${code}`)
      const data = await response.json()
      
      if (response.ok) {
        setTransfer(data)
      } else {
        setError('Transfer not found or already claimed')
      }
    } catch (err) {
      console.error('Error loading transfer:', err)
      // For now, use mock data
      setTransfer({
        amount: 25,
        token: 'USDC',
        sender: '7xKX...y9Zp',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        claimed: false
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    // TODO: Implement claim logic with wallet
    console.log('Claiming with method:', claimMethod)
    setClaimed(true)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-solana-purple border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transfer...</p>
        </div>
      </main>
    )
  }

  if (error || !transfer) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Transfer Not Found</h1>
          <p className="text-gray-600">
            This transfer may have expired, been claimed, or the link is invalid.
          </p>
        </div>
      </main>
    )
  }

  if (claimed) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-4">Funds Claimed!</h1>
          <p className="text-xl text-gray-600 mb-8">
            {transfer.amount} {transfer.token} is now in your wallet
          </p>
          <div className="bg-gray-100 rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600">Your wallet address</p>
            <p className="font-mono">7xKX...y9Zp</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <section className="max-w-2xl mx-auto px-4 py-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            You've received {transfer.amount} {transfer.token}!
          </h1>
          <p className="text-gray-600">
            From: <span className="font-mono">{transfer.sender}</span>
          </p>
        </div>

        {!claimMethod ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg space-y-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Choose how to claim</h2>
            
            <button
              onClick={() => setClaimMethod('connect')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-solana-purple transition text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Connect existing wallet</h3>
                  <p className="text-gray-600">
                    Use Phantom, Solflare, or another Solana wallet
                  </p>
                </div>
                <span className="text-2xl">→</span>
              </div>
            </button>

            <button
              onClick={() => setClaimMethod('generate')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-solana-purple transition text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Generate new wallet</h3>
                  <p className="text-gray-600">
                    New to crypto? We'll create a wallet for you
                  </p>
                </div>
                <span className="text-2xl">→</span>
              </div>
            </button>

            <p className="text-sm text-gray-500 text-center mt-6">
              Expires in 48 hours
            </p>
          </div>
        ) : claimMethod === 'connect' ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-6">Connect Your Wallet</h2>
            <button
              onClick={handleClaim}
              className="px-8 py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition"
            >
              Connect Wallet
            </button>
            <button
              onClick={() => setClaimMethod(null)}
              className="block mx-auto mt-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Create New Wallet</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-900">
                ⚠️ Save your recovery phrase in a safe place. You'll need it to access your funds later.
              </p>
            </div>

            <div className="bg-gray-100 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-3 text-center">Your recovery phrase:</p>
              <div className="grid grid-cols-3 gap-2">
                {['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7', 'word8', 'word9', 'word10', 'word11', 'word12'].map((word, i) => (
                  <div key={i} className="bg-white rounded px-3 py-2 text-center font-mono text-sm">
                    {word}
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 mb-6">
              <input type="checkbox" className="w-5 h-5" />
              <span className="text-sm">I've saved my recovery phrase in a safe place</span>
            </label>

            <button
              onClick={handleClaim}
              className="w-full py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition"
            >
              Claim Funds
            </button>
            
            <button
              onClick={() => setClaimMethod(null)}
              className="block mx-auto mt-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
