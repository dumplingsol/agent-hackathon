import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletContextProvider } from '@/lib/wallet'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PayInbox - Send Crypto via Email',
  description: 'Send SOL or USDC to anyone via email. No wallet required.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  )
}
