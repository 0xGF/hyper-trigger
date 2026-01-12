import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import { Nav } from '@/components/layout/Nav'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'

// Force dynamic rendering - app uses wallet state that requires localStorage
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HyperTrigger - Automated Trading on HyperEVM',
  description: 'Create price-based triggers for automatic token swaps on HyperEVM. Set your conditions and let HyperTrigger execute trades when prices hit your targets.',
  keywords: ['DeFi', 'HyperEVM', 'Automated Trading', 'Price Triggers', 'Hyperliquid'],
  authors: [{ name: 'HyperTrigger Team' }],
  openGraph: {
    title: 'HyperTrigger - Automated Trading on HyperEVM',
    description: 'Create price-based triggers for automatic token swaps on HyperEVM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HyperTrigger - Automated Trading on HyperEVM',
    description: 'Create price-based triggers for automatic token swaps on HyperEVM',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div id="root" className="min-h-screen lg:h-screen flex flex-col bg-background overflow-x-hidden">
            <Nav />
            <main className="flex-1 min-h-0 lg:overflow-hidden">
              {children}
            </main>
          </div>
          <Toaster 
            position="bottom-right" 
            theme="dark"
            toastOptions={{
              style: {
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
} 