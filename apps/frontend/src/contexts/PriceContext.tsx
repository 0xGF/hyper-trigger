'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { getCoreTokens, getHlApiUrl, populateMarketNames, getMarketName, type UnifiedToken } from '@hyper-trigger/shared/tokens'

// ===========================================
// TYPES
// ===========================================

export interface TokenPrice {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  lastUpdated: number
}

interface PriceContextValue {
  prices: Record<string, TokenPrice>
  getPrice: (symbol: string) => number
  getChange: (symbol: string) => number
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
  marketNamesReady: boolean
}

// ===========================================
// CONTEXT
// ===========================================

const PriceContext = createContext<PriceContextValue | null>(null)

// ===========================================
// PROVIDER
// ===========================================

interface PriceProviderProps {
  children: ReactNode
  refreshInterval?: number // ms, default 3000
}

export function PriceProvider({ children, refreshInterval = 3000 }: PriceProviderProps) {
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [marketNamesReady, setMarketNamesReady] = useState(false)
  const pricesRef = useRef<Record<string, TokenPrice>>({})

  // Initialize market names on mount (required for chart/orderbook)
  useEffect(() => {
    let cancelled = false
    
    async function initMarketNames() {
      console.log('🔍 Frontend: Fetching market names from Hyperliquid...')
      await populateMarketNames()
      if (!cancelled) {
        setMarketNamesReady(true)
        console.log('✅ Frontend: Market names ready')
      }
    }
    
    initMarketNames()
    return () => { cancelled = true }
  }, [])

  // Fetch prices directly from Hyperliquid API using market names
  const fetchPrices = useCallback(async () => {
    if (!marketNamesReady) return
    
    try {
      const response = await fetch(`${getHlApiUrl()}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }

      const mids: Record<string, string> = await response.json()
      const now = Date.now()

      const newPrices: Record<string, TokenPrice> = {}

      for (const token of getCoreTokens()) {
        if (token.symbol === 'USDC') {
          newPrices[token.symbol] = {
            symbol: token.symbol,
            price: 1.0,
            change24h: 0,
            volume24h: 0,
            lastUpdated: now,
          }
        } else {
          // Get spot price using market name (e.g., "@1035" for HYPE on testnet)
          const marketName = getMarketName(token.symbol)
          const price = marketName && mids[marketName] ? parseFloat(mids[marketName]) : 0

          // Calculate change from previous price
          const prevPrice = pricesRef.current[token.symbol]?.price || price
          const change24h = prevPrice > 0 
            ? ((price - prevPrice) / prevPrice) * 100 
            : 0

          newPrices[token.symbol] = {
            symbol: token.symbol,
            price,
            change24h: pricesRef.current[token.symbol]?.change24h ?? change24h,
            volume24h: 0,
            lastUpdated: now,
          }
        }
      }

      pricesRef.current = newPrices
      setPrices(newPrices)
      setLastUpdated(now)
      setError(null)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices')
      setIsLoading(false)
    }
  }, [marketNamesReady])

  // Initial fetch after market names are ready
  useEffect(() => {
    if (marketNamesReady) {
      fetchPrices()
    }
  }, [marketNamesReady, fetchPrices])

  // Refresh interval
  useEffect(() => {
    if (!marketNamesReady) return
    const interval = setInterval(fetchPrices, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchPrices, refreshInterval, marketNamesReady])

  // Helper functions
  const getPrice = useCallback((symbol: string): number => {
    return prices[symbol]?.price ?? 0
  }, [prices])

  const getChange = useCallback((symbol: string): number => {
    return prices[symbol]?.change24h ?? 0
  }, [prices])

  const value: PriceContextValue = {
    prices,
    getPrice,
    getChange,
    isLoading,
    error,
    lastUpdated,
    marketNamesReady,
  }

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  )
}

// ===========================================
// HOOK
// ===========================================

export function usePriceContext(): PriceContextValue {
  const context = useContext(PriceContext)
  if (!context) {
    throw new Error('usePriceContext must be used within a PriceProvider')
  }
  return context
}

// Convenience hook for single token price
export function useTokenPrice(symbol: string): { price: number; change: number; isLoading: boolean } {
  const { getPrice, getChange, isLoading } = usePriceContext()
  return {
    price: getPrice(symbol),
    change: getChange(symbol),
    isLoading,
  }
}

// Convenience hook for all prices
export function useAllPrices(): { prices: Record<string, TokenPrice>; isLoading: boolean } {
  const { prices, isLoading } = usePriceContext()
  return { prices, isLoading }
}

