import type { Metadata } from 'next'
import { Inter, Archivo, Kanit } from 'next/font/google'
import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletContextProvider } from '@/lib/wallet'
import { ThemeProvider } from '@/components/ThemeProvider'
import { GradientBackground } from '@/components/GradientBackground'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })
const kanit = Kanit({ subsets: ['latin'], weight: '500', variable: '--font-kanit' })

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
      <body className={`${inter.variable} ${archivo.variable} ${kanit.variable} font-sans`}>
        <ThemeProvider>
          <WalletContextProvider>
            <GradientBackground />
            <div className="content-overlay">
              {children}
            </div>
            <Toaster position="bottom-right" richColors />
          </WalletContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
