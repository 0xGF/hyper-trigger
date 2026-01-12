'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getHlApiUrl, getMarketName } from '@hyper-trigger/shared/tokens'
import { usePriceContext } from '@/contexts/PriceContext'

interface OrderBookLevel {
  price: number
  size: number
  total: number
}

interface OrderBookData {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
}

interface OrderBookProps {
  symbol: string
}

export function OrderBook({ symbol }: OrderBookProps) {
  const [data, setData] = useState<OrderBookData>({ asks: [], bids: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Wait for market names to be populated
  const { marketNamesReady } = usePriceContext()

  // Get market name for this token (e.g., "@1035" for HYPE/USDC on testnet)
  const bookSymbol = marketNamesReady ? getMarketName(symbol) : null

  // Fetch orderbook data
  const fetchOrderBook = useCallback(async () => {
    if (!bookSymbol) {
      setError('No spot market available')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${getHlApiUrl()}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'l2Book',
          coin: bookSymbol,
        }),
      })

      if (!response.ok) {
        setError('Failed to fetch')
        setIsLoading(false)
        return
      }

      const result = await response.json()
      const levels = result.levels

      if (!levels || levels.length !== 2) {
        setError('No orderbook data')
        setIsLoading(false)
        return
      }

      // Parse asks and bids
      const rawAsks: Array<{ px: string; sz: string; n: number }> = levels[1] || []
      const rawBids: Array<{ px: string; sz: string; n: number }> = levels[0] || []

      // Asks: API returns ascending (lowest first), we want highest at top, lowest near spread
      // Take first 15 (closest to spread), then reverse so highest is at top
      const askLevels = rawAsks.slice(0, 15).map(level => ({
        price: parseFloat(level.px),
        size: parseFloat(level.sz),
        total: 0,
      }))
      // Reverse so highest price is at top, lowest (closest to spread) at bottom
      askLevels.reverse()
      // Calculate running totals from top down
      let askTotal = 0
      const asks = askLevels.map(level => {
        askTotal += level.size
        return { ...level, total: askTotal }
      })

      // Bids: API returns descending (highest first), which is correct
      // Highest bid (closest to spread) at top, lowest at bottom
      let bidTotal = 0
      const bids: OrderBookLevel[] = rawBids.slice(0, 15).map(level => {
        const size = parseFloat(level.sz)
        bidTotal += size
        return {
          price: parseFloat(level.px),
          size,
          total: bidTotal,
        }
      })

      setData({ asks, bids })
      setError(null)
      setIsLoading(false)
    } catch {
      setError('Connection error')
      setIsLoading(false)
    }
  }, [bookSymbol, marketNamesReady])

  // Fetch on mount and interval
  useEffect(() => {
    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 1000)
    return () => clearInterval(interval)
  }, [fetchOrderBook])

  // Calculate spread
  const spread = useMemo(() => {
    if (data.asks.length === 0 || data.bids.length === 0) return null
    const lowestAsk = data.asks[data.asks.length - 1]?.price || 0
    const highestBid = data.bids[0]?.price || 0
    if (lowestAsk === 0 || highestBid === 0) return null
    const spreadValue = lowestAsk - highestBid
    const spreadPercent = (spreadValue / lowestAsk) * 100
    return { value: spreadValue, percent: spreadPercent }
  }, [data.asks, data.bids])

  // Calculate max size for depth visualization (based on individual order sizes, not cumulative)
  const maxSize = useMemo(() => {
    const maxAskSize = Math.max(...data.asks.map(a => a.size), 0)
    const maxBidSize = Math.max(...data.bids.map(b => b.size), 0)
    return Math.max(maxAskSize, maxBidSize) || 1
  }, [data.asks, data.bids])

  const formatPrice = (price: number) => {
    return price.toFixed(3)
  }

  const formatSize = (size: number) => {
    if (size >= 1000) return size.toLocaleString('en-US', { maximumFractionDigits: 2 })
    return size.toFixed(2)
  }

  // Show loading skeleton - matches the actual order book layout
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium text-foreground">Order Book</span>
          <span className="text-xs text-muted-foreground">{symbol}</span>
        </div>
        <div className="grid grid-cols-3 px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
          <span>Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">Total</span>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Asks skeleton */}
          <div className="flex-1 flex flex-col justify-end px-3 py-1 gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`ask-${i}`} className="grid grid-cols-3 py-0.5">
                <div className="h-3 bg-destructive/10 rounded w-16 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                <div className="h-3 bg-muted/30 rounded w-12 ml-auto animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                <div className="h-3 bg-muted/30 rounded w-14 ml-auto animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              </div>
            ))}
          </div>
          {/* Spread skeleton */}
          <div className="grid grid-cols-3 px-3 py-1.5 border-y border-border bg-secondary/30">
            <span className="text-xs text-muted-foreground">Spread</span>
            <div className="h-3 bg-muted/30 rounded w-10 ml-auto animate-pulse" />
            <div className="h-3 bg-muted/30 rounded w-12 ml-auto animate-pulse" />
          </div>
          {/* Bids skeleton */}
          <div className="flex-1 px-3 py-1 space-y-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`bid-${i}`} className="grid grid-cols-3 py-0.5">
                <div className="h-3 bg-primary/10 rounded w-16 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                <div className="h-3 bg-muted/30 rounded w-12 ml-auto animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                <div className="h-3 bg-muted/30 rounded w-14 ml-auto animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || (data.asks.length === 0 && data.bids.length === 0)) {
    return (
      <div className="h-full flex flex-col bg-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium text-foreground">Order Book</span>
          <span className="text-xs text-muted-foreground">{symbol}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs text-muted-foreground">{error || 'No data'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">Order Book</span>
        <span className="text-xs text-muted-foreground">{symbol}</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Asks (Sells) - Red - prices above current, selling pressure */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden">
          {data.asks.map((level, i) => {
            const depthPercent = (level.size / maxSize) * 100
            return (
              <div
                key={`ask-${i}`}
                className="relative grid grid-cols-3 px-3 py-0.5 text-xs hover:bg-white/5 transition-colors"
              >
                {/* Depth bar based on size at this price */}
                <div
                  className="absolute left-0 top-0 h-full pointer-events-none"
                  style={{ 
                    width: `${depthPercent}%`,
                    background: `linear-gradient(to right, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.05))`,
                  }}
                />
                <span className="relative text-destructive tabular-nums">{formatPrice(level.price)}</span>
                <span className="relative text-right text-foreground tabular-nums">{formatSize(level.size)}</span>
                <span className="relative text-right text-foreground tabular-nums">{formatSize(level.total)}</span>
              </div>
            )
          })}
        </div>

        {/* Spread */}
        {spread && (
          <div className="grid grid-cols-3 px-3 py-1.5 text-xs border-y border-border bg-secondary/30">
            <span className="text-muted-foreground">Spread</span>
            <span className="text-right text-foreground tabular-nums">{spread.value.toFixed(3)}</span>
            <span className="text-right text-muted-foreground tabular-nums">{spread.percent.toFixed(3)}%</span>
          </div>
        )}

        {/* Bids (Buys) - Green - prices below current, buying pressure */}
        <div className="flex-1 overflow-hidden">
          {data.bids.map((level, i) => {
            const depthPercent = (level.size / maxSize) * 100
            return (
              <div
                key={`bid-${i}`}
                className="relative grid grid-cols-3 px-3 py-0.5 text-xs hover:bg-white/5 transition-colors"
              >
                {/* Depth bar based on size at this price */}
                <div
                  className="absolute left-0 top-0 h-full pointer-events-none"
                  style={{ 
                    width: `${depthPercent}%`,
                    background: `linear-gradient(to right, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.05))`,
                  }}
                />
                <span className="relative text-primary tabular-nums">{formatPrice(level.price)}</span>
                <span className="relative text-right text-foreground tabular-nums">{formatSize(level.size)}</span>
                <span className="relative text-right text-foreground tabular-nums">{formatSize(level.total)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

