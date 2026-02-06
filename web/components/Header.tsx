'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Logo from './Logo'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="border-b border-[#1d2646] bg-[#0d1225] backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <Logo className="w-8 h-8 transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold text-white">SolRelay</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center space-x-3">
          <Link 
            href="/how-it-works" 
            className="text-gray-300 hover:text-white transition"
          >
            How it works
          </Link>
          
          <WalletMultiButton />
        </nav>

        {/* Mobile: Hamburger */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 flex flex-col items-center justify-center space-y-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span 
              className={`w-5 h-0.5 bg-gray-300 transition-all duration-300 ${
                isMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`} 
            />
            <span 
              className={`w-5 h-0.5 bg-gray-300 transition-all duration-300 ${
                isMenuOpen ? 'opacity-0' : ''
              }`} 
            />
            <span 
              className={`w-5 h-0.5 bg-gray-300 transition-all duration-300 ${
                isMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`} 
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 top-[73px] bg-black/50 md:hidden transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile Slide-out Menu */}
      <div
        ref={menuRef}
        className={`fixed top-[73px] right-0 h-[calc(100vh-73px)] w-72 bg-[#0d1225] border-l border-[#1d2646] md:hidden transition-transform duration-300 ease-out shadow-xl ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col p-6 space-y-6">
          {/* How it works link */}
          <Link 
            href="/how-it-works" 
            onClick={closeMenu}
            className="flex items-center space-x-3 text-lg text-gray-300 hover:text-white transition py-2 px-3 rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>How it works</span>
          </Link>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Wallet button */}
          <div className="pt-2">
            <WalletMultiButton className="!w-full !justify-center" />
          </div>
        </nav>
      </div>
    </header>
  )
}
