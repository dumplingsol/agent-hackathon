'use client'

import Link from 'next/link'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { ThemeToggle } from './ThemeToggle'

export default function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800/30 bg-white/80 dark:bg-[#0A2540]/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-solana-purple to-solana-green rounded-lg" />
          <span className="text-xl font-bold dark:text-white">PayInbox</span>
        </Link>

        {/* Menu */}
        <nav className="flex items-center space-x-3">
          <Link 
            href="/how-it-works" 
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            How it works
          </Link>
          
          <ThemeToggle />
          
          <WalletMultiButton />
        </nav>
      </div>
    </header>
  )
}
