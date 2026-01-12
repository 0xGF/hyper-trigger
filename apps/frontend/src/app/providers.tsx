'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { 
  RainbowKitProvider, 
  darkTheme,
  connectorsForWallets
} from '@rainbow-me/rainbowkit'
import { 
  metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { hyperEvmTestnet, hyperEvmMainnet } from '@/lib/networks'
import { PriceProvider } from '@/contexts/PriceContext'

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css'

// Create a client for React Query (safe for SSR)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

interface ProvidersProps {
  children: React.ReactNode
}

// Loading skeleton that matches the app layout
function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <header className="h-14 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted animate-pulse" />
            <div className="w-28 h-5 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-4 rounded bg-muted animate-pulse" />
            <div className="w-14 h-4 rounded bg-muted animate-pulse" />
            <div className="w-16 h-4 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="w-36 h-9 rounded-xl bg-muted animate-pulse" />
      </header>
      
      {/* Main content skeleton */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Chart area */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="w-20 h-5 rounded bg-muted animate-pulse" />
              <div className="w-8 h-7 rounded-lg bg-muted animate-pulse" />
              <div className="w-32 h-8 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <div className="w-6 h-3 rounded bg-muted animate-pulse" />
                  <div className="w-12 h-4 rounded bg-muted animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="w-6 h-3 rounded bg-muted animate-pulse" />
                  <div className="w-14 h-4 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <div className="w-48 h-8 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
          {/* Chart */}
          <div className="flex-1 rounded-xl bg-muted/50 animate-pulse" />
        </div>
        
        {/* Right panel - Trigger Builder skeleton */}
        <div className="w-[420px] shrink-0 flex flex-col">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="w-32 h-6 rounded bg-muted animate-pulse" />
            </div>
            {/* Token selectors */}
            <div className="space-y-3">
              <div className="h-14 rounded-2xl bg-muted animate-pulse" />
              <div className="h-14 rounded-2xl bg-muted animate-pulse" />
            </div>
            {/* Price input */}
            <div className="h-12 rounded-xl bg-muted animate-pulse" />
            {/* Condition buttons */}
            <div className="flex gap-2">
              <div className="flex-1 h-10 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 h-10 rounded-xl bg-muted animate-pulse" />
            </div>
            {/* Submit button */}
            <div className="h-12 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false)

  // Create wagmi config only on client side
  const config = useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const connectors = connectorsForWallets(
      [
        {
          groupName: 'Recommended',
          wallets: [metaMaskWallet],
        },
      ],
      {
        appName: 'HyperTrigger',
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'hypertrigger-local-dev',
      },
    )

    return createConfig({
      chains: [hyperEvmTestnet, hyperEvmMainnet],
      connectors,
      transports: {
        [hyperEvmTestnet.id]: http(),
        [hyperEvmMainnet.id]: http(),
      },
      ssr: true,
    })
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before hydration, show loading skeleton
  if (!mounted || !config) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <AppLoadingSkeleton />
      </ThemeProvider>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={hyperEvmTestnet}
          theme={darkTheme({
            accentColor: '#22c55e',
            accentColorForeground: 'white',
            borderRadius: 'small',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          showRecentTransactions={true}
          modalSize="compact"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <PriceProvider refreshInterval={3000}>
              {children}
            </PriceProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
