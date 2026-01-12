'use client'

import { useQuery } from '@tanstack/react-query'

interface ChartDataPoint {
  date: Date
  volume: number
  cumulativeVolume: number
  transactions: number
}

interface Transaction {
  hash: string
  timestamp: Date
  volume: number
  price: number
  from: string
  to: string
}

interface BuybackData {
  totalVolume: number
  totalTransactions: number
  avgTransactionSize: number
  last24hVolume: number
  last24hTransactions: number
  currentPrice: number
  chartData: ChartDataPoint[]
  transactions: Transaction[]
}

const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz'

// Request deduplication to prevent multiple simultaneous calls
const pendingRequests = new Map<string, Promise<any>>()

function dedupedFetch(url: string, options: RequestInit): Promise<Response> {
  const key = `${url}:${JSON.stringify(options.body)}`
  
  if (pendingRequests.has(key)) {
    console.log('[API] Deduplicating request:', key)
    return pendingRequests.get(key)!
  }
  
  const promise = fetch(url, options).finally(() => {
    pendingRequests.delete(key)
  })
  
  pendingRequests.set(key, promise)
  return promise
}

interface HyperLiquidUserFill {
  coin: string
  px: string
  sz: string
  side: 'B' | 'A' // B = Buy, A = Sell
  time: number
  hash: string
  oid: number
  crossed: boolean
  fee: string
  tid: number
  feeToken: string
  dir: string
  startPosition: string
  closedPnl: string
}

interface HyperLiquidPriceResponse {
  [key: string]: string // e.g., { "@107": "38.48" }
}

// Fetch ALL user fills using pagination with userFillsByTime
async function fetchAllHyperLiquidUserFills(address: string): Promise<HyperLiquidUserFill[]> {
  console.log(`[HyperLiquid API] Starting paginated fetch for ALL fills for ${address}`)
  
  const allFills: HyperLiquidUserFill[] = []
  let currentStartTime = 0 // Start from epoch (all history)
  let hasMoreData = true
  let pageCount = 0
  const maxPages = 50 // Safety limit to prevent infinite loops
  
  while (hasMoreData && pageCount < maxPages) {
    pageCount++
    console.log(`[HyperLiquid API] Fetching page ${pageCount}, startTime: ${currentStartTime}`)
    
    const requestBody = {
      type: 'userFillsByTime',
      user: address,
      startTime: currentStartTime,
      // endTime: current time (default)
    }

    console.log(`[HyperLiquid API] Page ${pageCount} request:`, requestBody)

    const response = await dedupedFetch('/api/hyperliquid-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[HyperLiquid API] Page ${pageCount} failed:`, response.status, errorText)
      throw new Error(`HyperLiquid API error: ${response.status} ${errorText}`)
    }

    const fills: HyperLiquidUserFill[] = await response.json()
    console.log(`[HyperLiquid API] Page ${pageCount} received ${fills.length} fills`)

    if (fills.length === 0) {
      console.log(`[HyperLiquid API] No more data available, stopping pagination`)
      hasMoreData = false
      break
    }

    // Filter for HYPE buy transactions only
    const hypeFills = fills.filter(fill => fill.coin === '@107' && fill.side === 'B')
    console.log(`[HyperLiquid API] Page ${pageCount}: ${hypeFills.length} HYPE buy fills out of ${fills.length} total`)

    allFills.push(...hypeFills)

    // If we got less than 2000 fills, we've reached the end
    if (fills.length < 2000) {
      console.log(`[HyperLiquid API] Received ${fills.length} < 2000 fills, reached end of data`)
      hasMoreData = false
    } else {
      // Set next startTime to the timestamp of the last fill + 1ms
      const lastFill = fills[fills.length - 1]
      currentStartTime = lastFill.time + 1
      console.log(`[HyperLiquid API] Next startTime: ${currentStartTime} (${new Date(currentStartTime).toISOString()})`)
    }
  }

  if (pageCount >= maxPages) {
    console.warn(`[HyperLiquid API] Reached maximum page limit (${maxPages}), may have missed some data`)
  }

  console.log(`[HyperLiquid API] Pagination complete: ${pageCount} pages, ${allFills.length} total HYPE buy fills`)
  
  // Sort by timestamp (oldest first) for proper cumulative calculations
  allFills.sort((a, b) => a.time - b.time)
  
  return allFills
}

// Fetch current HYPE price
async function fetchHyperLiquidPrice(): Promise<number> {
  const requestBody = {
    type: 'allMids',
  }

  console.log(`[HyperLiquid API] Fetching current HYPE price`)

  const response = await dedupedFetch('/api/hyperliquid-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[HyperLiquid API] Price fetch failed:`, response.status, errorText)
    throw new Error(`HyperLiquid price API error: ${response.status} ${errorText}`)
  }

  const prices: HyperLiquidPriceResponse = await response.json()
  const hypePrice = parseFloat(prices['@107'] || '0')
  
  console.log(`[HyperLiquid API] Current HYPE price: $${hypePrice}`)
  
  return hypePrice
}

// Process all fills into buyback data with proper time filtering for display
async function processBuybackData(address: string, timeRange: string): Promise<BuybackData> {
  try {
    console.log(`[Buyback Data] Processing data for address: ${address}, display range: ${timeRange}`)
    
    // Get ALL historical data (no time filtering on fetch)
    const [allFills, currentPrice] = await Promise.all([
      fetchAllHyperLiquidUserFills(address),
      fetchHyperLiquidPrice()
    ])

    if (allFills.length === 0) {
      console.log(`[Buyback Data] No HYPE buy fills found for address ${address}`)
      return {
        totalVolume: 0,
        totalTransactions: 0,
        avgTransactionSize: 0,
        last24hVolume: 0,
        last24hTransactions: 0,
        currentPrice,
        chartData: [],
        transactions: []
      }
    }

    console.log(`[Buyback Data] Processing ${allFills.length} HYPE buy transactions`)

    // Calculate time range cutoff for display filtering
    const now = Date.now()
    let displayCutoff = 0 // Show all data by default
    
    switch (timeRange) {
      case '24h':
        displayCutoff = now - 24 * 60 * 60 * 1000
        break
      case '7d':
        displayCutoff = now - 7 * 24 * 60 * 60 * 1000
        break
      case '30d':
        displayCutoff = now - 30 * 24 * 60 * 60 * 1000
        break
      case '90d':
        displayCutoff = now - 90 * 24 * 60 * 60 * 1000
        break
    }

    // Filter fills for display (but keep all for cumulative calculations)
    const displayFills = allFills.filter(fill => fill.time >= displayCutoff)
    console.log(`[Buyback Data] Showing ${displayFills.length} fills for ${timeRange} range`)

    // Calculate total statistics from ALL fills (cumulative)
    const totalVolume = allFills.reduce((sum, fill) => sum + parseFloat(fill.sz), 0)
    const totalTransactions = allFills.length
    const avgTransactionSize = totalVolume / totalTransactions

    // Calculate last 24h statistics
    const last24hCutoff = now - 24 * 60 * 60 * 1000
    const last24hFills = allFills.filter(fill => fill.time >= last24hCutoff)
    const last24hVolume = last24hFills.reduce((sum, fill) => sum + parseFloat(fill.sz), 0)
    const last24hTransactions = last24hFills.length

    console.log(`[Buyback Data] Statistics:`)
    console.log(`  - Total Volume: ${totalVolume.toLocaleString()} HYPE`)
    console.log(`  - Total Transactions: ${totalTransactions.toLocaleString()}`)
    console.log(`  - Average Size: ${avgTransactionSize.toLocaleString()} HYPE`)
    console.log(`  - Last 24h Volume: ${last24hVolume.toLocaleString()} HYPE`)
    console.log(`  - Last 24h Transactions: ${last24hTransactions.toLocaleString()}`)
    console.log(`  - Current Price: $${currentPrice}`)

    // Group by day for chart data (using display filtered fills)
    const dailyData = new Map<string, { volume: number; transactions: number }>()
    
    displayFills.forEach(fill => {
      const date = new Date(fill.time)
      date.setHours(0, 0, 0, 0) // Start of day
      const dateKey = date.toISOString().split('T')[0]
      
      const existing = dailyData.get(dateKey) || { volume: 0, transactions: 0 }
      existing.volume += parseFloat(fill.sz)
      existing.transactions += 1
      dailyData.set(dateKey, existing)
    })

    // Convert to chart data with cumulative calculations
    const sortedDates = Array.from(dailyData.keys()).sort()
    let cumulativeVolume = 0
    
    // For cumulative calculation, we need to include ALL fills up to each date
    const chartData = sortedDates.map(dateKey => {
      const date = new Date(dateKey + 'T00:00:00.000Z')
      const dayData = dailyData.get(dateKey)!
      
      // Calculate cumulative volume up to this date from ALL fills
      const fillsUpToDate = allFills.filter(fill => fill.time <= date.getTime() + 24 * 60 * 60 * 1000 - 1)
      const cumulativeVolumeToDate = fillsUpToDate.reduce((sum, fill) => sum + parseFloat(fill.sz), 0)
      
      return {
        date,
        volume: dayData.volume,
        cumulativeVolume: cumulativeVolumeToDate,
        transactions: dayData.transactions
      }
    })

    // Convert recent transactions for timeline (last 100 from display range)
    const recentTransactions = displayFills
      .slice(-100)
      .reverse()
      .map(fill => ({
        hash: fill.hash,
        timestamp: new Date(fill.time),
        volume: parseFloat(fill.sz),
        price: parseFloat(fill.px),
        from: address,
        to: address // This is the buyback address
      }))

    console.log(`[Buyback Data] Generated ${chartData.length} chart points and ${recentTransactions.length} recent transactions`)

    return {
      totalVolume,
      totalTransactions,
      avgTransactionSize,
      last24hVolume,
      last24hTransactions,
      currentPrice,
      chartData,
      transactions: recentTransactions
    }

  } catch (error) {
    console.error('[Buyback Data] Error processing data:', error)
    throw error
  }
}

// Main hook for fetching buyback data
export function useBuybackData(address: string, timeRange: string) {
  return useQuery({
    queryKey: ['buyback-data', address, timeRange],
    queryFn: async () => {
      console.log(`[useBuybackData] Fetching data for ${address}, range: ${timeRange}`)
      
      // Use the server-side API endpoint directly
      const response = await fetch(`/api/buyback-data?address=${address}&timeRange=${timeRange}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[useBuybackData] API error:', response.status, errorText)
        throw new Error(`API error: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`[useBuybackData] Received data:`, {
        totalVolume: data.totalVolume,
        totalTransactions: data.totalTransactions,
        chartDataPoints: data.chartData?.length,
        transactions: data.transactions?.length
      })
      
      // Convert string dates back to Date objects for client-side components
      const processedData = {
        ...data,
        chartData: data.chartData.map((point: any) => ({
          ...point,
          date: new Date(point.date)
        })),
        transactions: data.transactions.map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }))
      }
      
      return processedData
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry 422 validation errors
      if (error.message.includes('422')) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
} 