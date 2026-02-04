'use client'

import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-solana-purple to-solana-green rounded-lg" />
          <span className="text-xl font-bold">SolMail</span>
        </Link>

        {/* Menu */}
        <nav className="flex items-center space-x-6">
          <Link 
            href="/how-it-works" 
            className="text-gray-700 hover:text-gray-900 transition"
          >
            How it works
          </Link>
          
          <button className="px-4 py-2 bg-solana-gradient text-white rounded-lg font-medium hover:opacity-90 transition">
            Connect Wallet
          </button>
        </nav>
      </div>
    </header>
  )
}
