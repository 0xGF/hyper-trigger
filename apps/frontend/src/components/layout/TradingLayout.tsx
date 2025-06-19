'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Image from 'next/image'
import { Logo } from '../logo'

interface TradingLayoutProps {
  children: React.ReactNode
}

export function TradingLayout({ children }: TradingLayoutProps) {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="px-6 mx-auto">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo and nav */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="rounded flex items-center justify-center">
                <Logo/>
                  <Image
                    src="/logo.png"
                    alt="HyperTrigger Logo"
                    width={150}
                    height={30}
                    className="rounded"
                  />
                </div>
              </Link>

              <nav className="flex space-x-8">
                <Link
                  href="/"
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    pathname === '/' ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/triggers"
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    pathname === '/triggers' ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Create Trigger
                </Link>
              </nav>
            </div>

            {/* Right side - Network status and wallet */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>HyperEVM</span>
                </div>
                <span>•</span>
                <span>Gas: ~0.1 gwei</span>
              </div>
              
              {/* Wallet Connection */}
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal, connectModalOpen }) => (
                    <Button 
                      onClick={openConnectModal}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold py-2 px-4 rounded-xl border border-primary/20 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                      disabled={connectModalOpen}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                        Connect Wallet
                      </div>
                    </Button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <ConnectButton.Custom>
                  {({ openAccountModal }) => (
                    <Button 
                      onClick={openAccountModal}
                      variant="ghost" 
                      className="h-auto p-2 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg border border-border/50 hover:border-border transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </div>
                    </Button>
                  )}
                </ConnectButton.Custom>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main>
        {children}
      </main>
    </div>
  )
} 