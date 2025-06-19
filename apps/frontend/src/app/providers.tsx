'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { WagmiProvider } from 'wagmi'
import { createConfig, http } from 'wagmi'
import { 
  RainbowKitProvider, 
  darkTheme,
  connectorsForWallets
} from '@rainbow-me/rainbowkit'
import { 
  metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { hyperEvmTestnet, hyperEvmMainnet } from '@/lib/networks'

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

// Create custom wallet list with ONLY MetaMask - no WalletConnect
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
      ],
    },
  ],
  {
    appName: 'HyperTrigger',
    projectId: 'dummy-project-id', // Required but not used since we're not using WalletConnect
  },
)

// Create wagmi config with our custom connectors
const config = createConfig({
  chains: [hyperEvmTestnet, hyperEvmMainnet],
  connectors,
  transports: {
    [hyperEvmTestnet.id]: http(),
    [hyperEvmMainnet.id]: http(),
  },
  ssr: true,
})

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
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
            {children}
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// TODO: Add back wallet providers once basic setup is working
// - WagmiProvider with proper SSR configuration
// - RainbowKitProvider
// - Supabase client with environment variables 