'use client'

import Header from '@/components/Header'
import Link from 'next/link'

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <section className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-8 text-center">How SolMail Works</h1>
        
        <div className="space-y-12">
          <Step
            number={1}
            title="Enter email & amount"
            description="Connect your wallet and enter the recipient's email address and how much you want to send. No need for them to have a crypto wallet."
            icon="✉️"
          />
          
          <Step
            number={2}
            title="Sign transaction"
            description="Your funds are locked in a secure smart contract escrow on Solana. Fast, cheap, and trustless."
            icon="✍️"
          />
          
          <Step
            number={3}
            title="Recipient gets email"
            description="They receive an email with a unique claim link. No technical knowledge required."
            icon="📧"
          />
          
          <Step
            number={4}
            title="Claim instantly"
            description="They can generate a new wallet or connect an existing one, then claim the funds with one click."
            icon="💰"
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-20 pt-12 border-t border-gray-200">
          <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <FAQ
              question="Is this safe?"
              answer="Yes! Funds are locked in a Solana smart contract. Only the person with the claim code (sent via email) can claim them. The contract is open source and audited."
            />
            
            <FAQ
              question="What if they don't claim it?"
              answer="Transfers automatically expire after 72 hours. If unclaimed, your funds are returned to your wallet automatically."
            />
            
            <FAQ
              question="What if I lose the email?"
              answer="As the sender, you can cancel the transfer anytime before it's claimed and get your funds back immediately."
            />
            
            <FAQ
              question="What tokens can I send?"
              answer="Currently SOL and USDC. More tokens coming soon!"
            />
            
            <FAQ
              question="Are there fees?"
              answer="Just standard Solana network fees (fraction of a cent). No platform fees."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition"
          >
            Send Your First Transfer
          </Link>
        </div>
      </section>
    </main>
  )
}

function Step({ number, title, description, icon }: { 
  number: number
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-solana-gradient flex items-center justify-center text-white font-bold text-xl">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>
        <p className="text-gray-600 text-lg">{description}</p>
      </div>
    </div>
  )
}

function FAQ({ question, answer }: { question: string, answer: string }) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  )
}
