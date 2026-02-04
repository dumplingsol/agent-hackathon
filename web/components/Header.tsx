'use client'

import Link from 'next/link'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Header() {
  return (
    <header className="border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-solana-purple to-solana-green rounded-lg" />
          <span className="text-xl font-bold">PayInbox</span>
        </Link>

        {/* Menu */}
        <nav className="flex items-center space-x-6">
          <Link 
            href="/how-it-works" 
            className="text-gray-700 hover:text-gray-900 transition"
          >
            How it works
          </Link>
          
          <WalletMultiButton />
        </nav>
      </div>
    </header>
  )
}
