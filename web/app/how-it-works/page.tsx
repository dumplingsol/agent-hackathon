'use client';

import Header from '@/components/Header';
import Link from 'next/link';

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0d1225]">
      <Header />

      <section className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center dark:text-white">
          How SolRelay Works
        </h1>

        <div className="space-y-10 md:space-y-12">
          <Step
            number={1}
            title="Enter email & amount"
            description="Connect your wallet and enter the recipient's email address and how much you want to send. They don't need a crypto wallet yet."
            icon="✉️"
          />

          <Step
            number={2}
            title="Sign the transaction"
            description="Your funds are locked in a secure smart contract escrow on Solana. The transaction is fast, cheap, and completely trustless."
            icon="✍️"
          />

          <Step
            number={3}
            title="Recipient gets notified"
            description="They receive an email with a unique claim link. No technical knowledge required - just click and claim."
            icon="📧"
          />

          <Step
            number={4}
            title="Claim instantly"
            description="They can connect an existing wallet or generate a new one right in the browser, then claim their funds with one click."
            icon="💰"
          />
        </div>

        {/* Security Section */}
        <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700/30">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 dark:text-white">
            Security & Trust
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <SecurityCard
              icon="🔐"
              title="Non-custodial"
              description="We never hold your funds. Everything is managed by auditable smart contracts on Solana."
            />
            <SecurityCard
              icon="⏱️"
              title="Auto-refund"
              description="Unclaimed transfers automatically return to you after 72 hours. No action needed."
            />
            <SecurityCard
              icon="🔒"
              title="Encrypted claims"
              description="Claim codes are cryptographically secure. Only the intended recipient can access the funds."
            />
            <SecurityCard
              icon="📖"
              title="Open source"
              description="All code is open source and verifiable. Trust through transparency."
            />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700/30">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 dark:text-white">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <FAQ
              question="Is this safe?"
              answer="Yes! Funds are locked in a Solana smart contract. Only the person with the claim code (sent via email) can claim them. The contract is open source and can be audited by anyone."
            />

            <FAQ
              question="What if they don't claim it?"
              answer="Transfers automatically expire after 72 hours. If unclaimed, your funds are returned to your wallet automatically. You can also manually cancel anytime."
            />

            <FAQ
              question="What if the recipient loses the email?"
              answer="As the sender, you can cancel the transfer anytime before it's claimed and get your funds back immediately. We recommend sharing the claim link through a backup channel if needed."
            />

            <FAQ
              question="What tokens can I send?"
              answer="Currently SOL and USDC on Solana devnet. We'll be adding more tokens and mainnet support soon!"
            />

            <FAQ
              question="Are there fees?"
              answer="Just standard Solana network fees (fraction of a cent). No platform fees - we believe crypto transfers should be free."
            />

            <FAQ
              question="Do recipients need a wallet?"
              answer="No! They can generate a new wallet right in the browser when claiming. We'll show them their recovery phrase so they can keep their funds safe."
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
  );
}

function Step({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-4 md:gap-6">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-solana-gradient flex items-center justify-center text-white font-bold text-lg md:text-xl">
          {number}
        </div>
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <span className="text-2xl md:text-3xl">{icon}</span>
          <h3 className="text-xl md:text-2xl font-bold dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg">{description}</p>
      </div>
    </div>
  );
}

function SecurityCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#1a1f3a] rounded-xl p-5 md:p-6">
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="text-lg font-semibold mb-2 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-6 last:border-0">
      <h3 className="text-lg md:text-xl font-semibold mb-2 dark:text-white">{question}</h3>
      <p className="text-gray-600 dark:text-gray-300">{answer}</p>
    </div>
  );
}
