'use client'

import Link from 'next/link'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { ThemeToggle } from './ThemeToggle'
import Logo from './Logo'

export default function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-[#1d2646] bg-white/80 dark:bg-[#0d1225] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <Logo className="w-8 h-8 transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold dark:text-white">SolRelay</span>
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
