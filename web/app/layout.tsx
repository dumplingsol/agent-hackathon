import type { Metadata } from 'next'
import { Inter, Archivo } from 'next/font/google'
import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletContextProvider } from '@/lib/wallet'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })

export const metadata: Metadata = {
  title: 'SolRelay - Send Crypto via Email',
  description: 'Send SOL or USDC to anyone via email. No wallet required.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${archivo.variable} font-sans`}>
        <ThemeProvider>
          <WalletContextProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </WalletContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
