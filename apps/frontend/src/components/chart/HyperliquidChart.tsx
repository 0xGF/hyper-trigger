'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, CandlestickSeries, CandlestickData, Time, LineSeries } from 'lightweight-charts'
import type { IChartApi, IPriceLine } from 'lightweight-charts'
import { getMarketName, getHlApiUrl } from '@hyper-trigger/shared/tokens'
import { usePriceContext } from '@/contexts/PriceContext'

// Interval mapping for API
const INTERVAL_MAP: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  'D': '1d',
}

// Interval to milliseconds
const INTERVAL_MS: Record<string, number> = {
  '1': 60 * 1000,
  '5': 5 * 60 * 1000,
  '15': 15 * 60 * 1000,
  '60': 60 * 60 * 1000,
  '240': 4 * 60 * 60 * 1000,
  'D': 24 * 60 * 60 * 1000,
}

// Trigger line data for display on chart
export interface TriggerLine {
  id: number
  price: number
  isAbove: boolean
  label?: string
}

interface HyperliquidChartProps {
  symbol: string
  interval?: string
  triggers?: TriggerLine[]
  onTriggerDrag?: (triggerId: number, newPrice: number) => void
}

interface CandleResponse {
  t: number  // timestamp
  o: string  // open
  h: string  // high
  l: string  // low
  c: string  // close
  v: string  // volume
}

// Chart skeleton for loading state
function ChartSkeleton() {
  const bars = Array.from({ length: 50 }).map((_, i) => ({
    height: 15 + (((i * 7) % 23) + ((i * 13) % 17)) * 1.5,
    isGreen: i % 3 !== 0,
  }))
  
  return (
    <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col">
      <div className="flex-1 flex items-end justify-around px-4 pb-8 pt-4">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={`w-1.5 sm:w-2 rounded-sm ${bar.isGreen ? 'bg-primary/20' : 'bg-destructive/20'}`}
            style={{ 
              height: `${bar.height}%`,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              animationDelay: `${(i % 10) * 100}ms`
            }}
          />
        ))}
      </div>
      <div className="h-6 border-t border-muted/20 flex items-center justify-between px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-8 sm:w-12 h-2 bg-muted/20 rounded" />
        ))}
      </div>
    </div>
  )
}

export function HyperliquidChart({ symbol, interval = '60', triggers = [], onTriggerDrag }: HyperliquidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
  const priceLinesRef = useRef<Map<number, IPriceLine>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [draggedTrigger, setDraggedTrigger] = useState<{ id: number; startY: number; startPrice: number } | null>(null)
  
  // Wait for market names to be populated before fetching data
  const { marketNamesReady } = usePriceContext()

  // Get market name for this token (e.g., "@1035" for HYPE/USDC on testnet)
  // Re-computes when marketNamesReady changes
  const candleSymbol = marketNamesReady ? getMarketName(symbol) : null

  // Fetch candle data
  const fetchCandles = useCallback(async (): Promise<CandlestickData<Time>[]> => {
    if (!candleSymbol) {
      return []
    }
    
    const intervalStr = INTERVAL_MAP[interval] || '1h'
    const intervalMs = INTERVAL_MS[interval] || INTERVAL_MS['60']
    const now = Date.now()
    const startTime = now - (1000 * intervalMs) // Get 1000 candles for more context
    
    try {
      const response = await fetch(`${getHlApiUrl()}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: candleSymbol,
            interval: intervalStr,
            startTime,
            endTime: now,
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch candles')
      }

      const data: CandleResponse[] = await response.json()
      
      // Filter out candles with null/empty values
      const validData = data.filter(c => c.o && c.c && c.h && c.l)
      
      if (!validData || validData.length === 0) {
        return []
      }

      // Convert to lightweight-charts format
      const candles: CandlestickData<Time>[] = validData.map(c => ({
        time: Math.floor(c.t / 1000) as Time,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
      }))

      // Sort by time
      candles.sort((a, b) => (a.time as number) - (b.time as number))

      if (candles.length > 0) {
        setCurrentPrice(candles[candles.length - 1].close)
      }

      return candles
    } catch {
      return []
    }
  }, [candleSymbol, interval, marketNamesReady])

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d0d0d' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f1f1f' },
        horzLines: { color: '#1f1f1f' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: '#2d2d2d',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#2d2d2d',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    })

    // Candle colors - teal green up, coral red down
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',      // teal (up/above)
      downColor: '#ef5350',    // coral (down/below)
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        chart.applyOptions({ width, height })
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Load and update data
  useEffect(() => {
    let isMounted = true
    let updateInterval: NodeJS.Timeout

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const candles = await fetchCandles()
        
        if (!isMounted || !seriesRef.current) return
        
        if (candles.length === 0) {
          setError(`No chart data for ${symbol}`)
          setIsLoading(false)
          return
        }
        
        seriesRef.current.setData(candles)
        chartRef.current?.timeScale().fitContent()
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Failed to load chart')
        setIsLoading(false)
      }
    }

    loadData()

    // Refresh every 3 seconds for more responsive updates
    updateInterval = setInterval(async () => {
      if (!isMounted || !seriesRef.current || !candleSymbol) return
      
      try {
        const candles = await fetchCandles()
        if (candles.length > 0 && seriesRef.current) {
          // Update entire dataset to catch any new candles
          seriesRef.current.setData(candles)
          setCurrentPrice(candles[candles.length - 1].close)
        }
      } catch {
        // Silently fail on updates
      }
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(updateInterval)
    }
  }, [fetchCandles, symbol])

  // Update trigger lines when triggers change
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return

    const series = seriesRef.current

    // Remove old price lines that are no longer in triggers
    const currentIds = new Set(triggers.map(t => t.id))
    priceLinesRef.current.forEach((line, id) => {
      if (!currentIds.has(id)) {
        series.removePriceLine(line)
        priceLinesRef.current.delete(id)
      }
    })

    // Add or update price lines
    triggers.forEach(trigger => {
      const existingLine = priceLinesRef.current.get(trigger.id)
      
      const lineOptions = {
        price: trigger.price,
        color: trigger.isAbove ? '#26a69a' : '#ef5350',
        lineWidth: 2 as const,
        lineStyle: 2 as const, // Dashed
        axisLabelVisible: true,
        title: trigger.label || `#${trigger.id}`,
      }

      if (existingLine) {
        // Update existing line
        existingLine.applyOptions(lineOptions)
      } else {
        // Create new line
        const newLine = series.createPriceLine(lineOptions)
        priceLinesRef.current.set(trigger.id, newLine)
      }
    })
  }, [triggers])

  // Handle mouse events for drag functionality
  useEffect(() => {
    if (!containerRef.current || !chartRef.current || !seriesRef.current) return

    const container = containerRef.current
    const chart = chartRef.current
    const series = seriesRef.current

    // Helper to check if mouse is near a trigger line
    const findTriggerNearY = (y: number): TriggerLine | null => {
      const priceToY = (price: number) => series.priceToCoordinate(price)
      let closestTrigger: TriggerLine | null = null
      let closestDistance = Infinity

      triggers.forEach(trigger => {
        const triggerY = priceToY(trigger.price)
        if (triggerY !== null) {
          const distance = Math.abs(triggerY - y)
          if (distance < 10 && distance < closestDistance) {
            closestDistance = distance
            closestTrigger = trigger
          }
        }
      })
      return closestTrigger
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!onTriggerDrag || triggers.length === 0) return
      
      const rect = container.getBoundingClientRect()
      const y = e.clientY - rect.top
      
      const closestTrigger = findTriggerNearY(y)

      if (closestTrigger !== null) {
        // Only intercept if actually on a trigger line
        e.preventDefault()
        e.stopPropagation()
        
        // Disable chart scrolling while dragging
        chart.applyOptions({
          handleScroll: false,
          handleScale: false,
        })
        
        container.style.cursor = 'grabbing'
        setDraggedTrigger({
          id: closestTrigger.id,
          startY: y,
          startPrice: closestTrigger.price,
        })
      }
      // If not near a line, let the chart handle the event normally
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedTrigger) {
        // Just update cursor based on proximity to lines
        if (triggers.length > 0 && onTriggerDrag) {
          const rect = container.getBoundingClientRect()
          const y = e.clientY - rect.top
          const nearTrigger = findTriggerNearY(y)
          container.style.cursor = nearTrigger ? 'grab' : 'crosshair'
        }
        return
      }

      // Dragging a line
      e.preventDefault()
      
      const rect = container.getBoundingClientRect()
      const y = e.clientY - rect.top
      const newPrice = series.coordinateToPrice(y)
      
      if (newPrice !== null) {
        const line = priceLinesRef.current.get(draggedTrigger.id)
        if (line) {
          line.applyOptions({ price: newPrice })
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!draggedTrigger) return

      // Re-enable chart scrolling/scaling
      chart.applyOptions({
        handleScroll: {
          horzTouchDrag: true,
          vertTouchDrag: false,
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      })
      
      container.style.cursor = 'crosshair'
      
      const rect = container.getBoundingClientRect()
      const y = e.clientY - rect.top
      const newPrice = series.coordinateToPrice(y)
      
      if (newPrice !== null && Math.abs(newPrice - draggedTrigger.startPrice) > 0.01) {
        onTriggerDrag?.(draggedTrigger.id, newPrice)
      } else {
        // Reset to original price if not moved enough
        const line = priceLinesRef.current.get(draggedTrigger.id)
        if (line) {
          line.applyOptions({ price: draggedTrigger.startPrice })
        }
      }
      
      setDraggedTrigger(null)
    }

    // Only use capture for mousedown to check if on a line
    container.addEventListener('mousedown', handleMouseDown, { capture: true })
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown, { capture: true })
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [triggers, draggedTrigger, onTriggerDrag])

  return (
    <div className="relative w-full h-full bg-[#0d0d0d] overflow-hidden">
      {/* Loading state */}
      {isLoading && <ChartSkeleton />}
      
      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <p className="text-xs text-muted-foreground/60">
              Spot index: {candleSymbol || 'none'}
            </p>
          </div>
        </div>
      )}
      
      {/* Chart container */}
      <div 
        ref={containerRef} 
        className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  )
}
