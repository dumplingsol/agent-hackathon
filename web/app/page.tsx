'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import SendForm from '@/components/SendForm'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
          Send crypto as easy as email
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          No wallet required. Just an email address.
          <br />
          Fast, secure, and powered by Solana.
        </p>

        {/* Send Form */}
        <div className="max-w-lg mx-auto">
          <SendForm />
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Feature
            icon="✓"
            title="No wallet needed"
            description="Recipients can claim even if they've never used crypto before"
          />
          <Feature
            icon="🔒"
            title="Secure escrow"
            description="Funds locked in smart contract until claimed or expired"
          />
          <Feature
            icon="↩️"
            title="Automatic refund"
            description="Unclaimed transfers return to sender after 72 hours"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700/30 py-8 text-center text-gray-600 dark:text-gray-300">
        <p>Built for Colosseum Agent Hackathon • Powered by Solana</p>
      </footer>
    </main>
  )
}

function Feature({ icon, title, description }: { icon: string, title: string, description: string }) {
  return (
    <div className="text-center p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}
