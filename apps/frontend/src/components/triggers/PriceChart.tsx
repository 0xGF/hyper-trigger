'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts'
import { motion, AnimatePresence } from 'framer-motion'
import { TokenIcon } from '@/components/ui/token-icon'

interface PriceChartProps {
  symbol: string
  triggerPrice?: number
  onTriggerPriceChange?: (price: number) => void
  onCurrentPriceChange?: (price: number) => void
}

interface Candle {
  t: number  // open millis
  T: number  // close millis
  s: string  // coin
  i: string  // interval
  o: number | string  // open price
  c: number | string  // close price
  h: number | string  // high price
  l: number | string  // low price
  v: number | string  // volume
  n: number  // number of trades
}

interface OrderBookLevel {
  px: string  // price
  sz: string  // size
  n: number   // number of orders
}

interface OrderBook {
  coin: string
  levels: [OrderBookLevel[], OrderBookLevel[]]  // [bids, asks]
  time: number
}

export function PriceChart({ symbol, triggerPrice, onTriggerPriceChange, onCurrentPriceChange }: PriceChartProps) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [interval, setInterval] = useState<string>('5m')
  const [candlesLoading, setCandlesLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [showVolume, setShowVolume] = useState<boolean>(true)
  const [chartVisible, setChartVisible] = useState(false)
  const [crosshairInfo, setCrosshairInfo] = useState<{
    price: number
    time: string
    visible: boolean
  }>({ price: 0, time: '', visible: false })
  const [isFirstDataLoad, setIsFirstDataLoad] = useState(true)
  
  const wsRef = useRef<WebSocket | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const prevSymbolRef = useRef<string>('')
  const triggerLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const triggerLineCleanupRef = useRef<(() => void) | null>(null)

  // Map UI intervals to Hyperliquid API intervals
  const getHyperliquidInterval = useCallback((interval: string) => {
    switch (interval) {
      case '1D': return '1d'  // Hyperliquid expects lowercase 'd'
      default: return interval
    }
  }, [])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  }

  const priceStatsVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }

  const orderBookVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }

  // Move formatPrice function up before it's used
  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price) || price <= 0) return '0.00'
    if (price >= 1000) {
      // For large numbers, use more precision to avoid truncation
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6,
        useGrouping: false // Remove commas for input fields
      })
    }
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(8)
  }

  // Initialize chart
  const initChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return

    try {
      const containerWidth = chartContainerRef.current.clientWidth || 800
      const containerHeight = chartContainerRef.current.clientHeight || 400
      
      if (containerWidth < 100 || containerHeight < 100) {
        setTimeout(initChart, 200)
        return
      }
      
      // Get CSS variables for chart colors
      const styles = getComputedStyle(document.documentElement)
      const chartColors = {
        background: styles.getPropertyValue('--chart-background').trim(),
        text: styles.getPropertyValue('--chart-text').trim(),
        grid: styles.getPropertyValue('--chart-grid').trim(),
        crosshair: styles.getPropertyValue('--chart-crosshair').trim(),
        border: styles.getPropertyValue('--chart-border').trim(),
        candleUp: styles.getPropertyValue('--chart-candle-up').trim(),
        candleDown: styles.getPropertyValue('--chart-candle-down').trim(),
        candleUpWick: styles.getPropertyValue('--chart-candle-up-wick').trim(),
        candleDownWick: styles.getPropertyValue('--chart-candle-down-wick').trim(),
        candleUpBorder: styles.getPropertyValue('--chart-candle-up-border').trim(),
        candleDownBorder: styles.getPropertyValue('--chart-candle-down-border').trim(),
        volumeNeutral: styles.getPropertyValue('--chart-volume-neutral').trim(),
      }
      
      const chart = createChart(chartContainerRef.current, {
        width: containerWidth,
        height: containerHeight,
        layout: {
          background: { type: ColorType.Solid, color: chartColors.background },
          textColor: chartColors.text,
        },
        grid: {
          vertLines: { color: chartColors.grid },
          horzLines: { color: chartColors.grid },
        },
        crosshair: {
          mode: 1,
          vertLine: { width: 1, color: chartColors.crosshair, style: 2 },
          horzLine: { width: 1, color: chartColors.crosshair, style: 2 },
        },
        rightPriceScale: {
          borderColor: chartColors.border,
          textColor: chartColors.text,
          scaleMargins: { top: 0.1, bottom: 0.1 }, // Default margins, volume useEffect will adjust
        },
        timeScale: {
          borderColor: chartColors.border,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 12,
          barSpacing: 3,
          shiftVisibleRangeOnNewBar: false,
          lockVisibleTimeRangeOnResize: true,
          rightBarStaysOnScroll: false,
          fixLeftEdge: false,
          fixRightEdge: false,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      })

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: chartColors.candleUp,
        downColor: chartColors.candleDown,
        borderVisible: false,
        wickUpColor: chartColors.candleUpWick,
        wickDownColor: chartColors.candleDownWick,
        borderUpColor: chartColors.candleUpBorder,
        borderDownColor: chartColors.candleDownBorder,
        wickVisible: true,
        priceLineVisible: true,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })

      // Volume series is handled by separate useEffect
      
      chartRef.current = chart
      candlestickSeriesRef.current = candlestickSeries
      volumeSeriesRef.current = null // Will be set by volume useEffect

      setChartReady(true)

      // Add crosshair event listener for price/time display
      chart.subscribeCrosshairMove((param) => {
        if (param.point && param.time && param.seriesData.size > 0) {
          const price = Array.from(param.seriesData.values())[0]
          if (price && typeof price === 'object' && 'value' in price) {
            const date = new Date((param.time as number) * 1000)
            setCrosshairInfo({
              price: price.value as number,
              time: date.toLocaleString(),
              visible: true
            })
          }
        } else {
          setCrosshairInfo(prev => ({ ...prev, visible: false }))
        }
      })

      // Only position chart on very first initialization, not on recreations
      if (!prevSymbolRef.current) {
        // First time loading - position to show recent data
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent()
          }
        }, 500)
      }

      // Fade in chart after initialization
      setTimeout(() => {
        setChartVisible(true)
      }, 600)

      // Handle resize
      const resizeChart = () => {
        if (chartContainerRef.current && chartRef.current) {
          const { clientWidth, clientHeight } = chartContainerRef.current
          try {
            chartRef.current.applyOptions({ 
              width: clientWidth,
              height: clientHeight 
            })
          } catch (resizeError) {
            console.error('❌ Error resizing chart:', resizeError)
          }
        }
      }

      const resizeObserver = new ResizeObserver(resizeChart)
      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current)
      }

      return () => {
        try {
          resizeObserver.disconnect()
          if (chart && typeof chart.remove === 'function') {
            chart.remove()
          }
        } catch (cleanupError) {
          console.error('❌ Error during cleanup:', cleanupError)
        }
      }
    } catch (error) {
      console.error('❌ Error in chart initialization:', error)
      setChartReady(false)
    }
  }, [])

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!chartReady || !candlestickSeriesRef.current || candles.length === 0) {
      return
    }

    try {
      // Validate candles data
      const validCandles = candles.filter(candle => {
        const open = typeof candle.o === 'string' ? parseFloat(candle.o) : candle.o
        const high = typeof candle.h === 'string' ? parseFloat(candle.h) : candle.h
        const low = typeof candle.l === 'string' ? parseFloat(candle.l) : candle.l
        const close = typeof candle.c === 'string' ? parseFloat(candle.c) : candle.c
        
        return !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && 
               open > 0 && high > 0 && low > 0 && close > 0 && candle.t > 0
      })

      if (validCandles.length === 0) {
        console.warn('⚠️ No valid candles data available')
        return
      }

      // Get CSS variables for volume colors
      const styles = getComputedStyle(document.documentElement)
      const volumeUpColor = styles.getPropertyValue('--chart-volume-up').trim()
      const volumeDownColor = styles.getPropertyValue('--chart-volume-down').trim()

      const chartData: CandlestickData[] = validCandles.map((candle) => {
        const open = typeof candle.o === 'string' ? parseFloat(candle.o) : candle.o
        const high = typeof candle.h === 'string' ? parseFloat(candle.h) : candle.h
        const low = typeof candle.l === 'string' ? parseFloat(candle.l) : candle.l
        const close = typeof candle.c === 'string' ? parseFloat(candle.c) : candle.c
        
        return {
          time: (candle.t / 1000) as Time,
          open, high, low, close,
        }
      })

      if (showVolume && volumeSeriesRef.current) {
        const volumeData: HistogramData[] = validCandles.map((candle) => {
          const volume = typeof candle.v === 'string' ? parseFloat(candle.v) : candle.v
          const close = typeof candle.c === 'string' ? parseFloat(candle.c) : candle.c
          const open = typeof candle.o === 'string' ? parseFloat(candle.o) : candle.o
          
          return {
            time: (candle.t / 1000) as Time,
            value: Math.max(0, volume), // Ensure volume is not negative
            color: close >= open ? volumeUpColor : volumeDownColor
          }
        })
        
        volumeSeriesRef.current.setData(volumeData)
      }

      candlestickSeriesRef.current.setData(chartData)
      
      // Chart positioning is handled by the initial setup and user navigation
      // No automatic repositioning to avoid alignment issues
    } catch (error) {
      console.error('❌ Error updating chart data:', error)
    }
  }, [candles, chartReady, showVolume])

  // Handle real-time updates
  const updateRealtimeCandle = useCallback((newCandle: Candle) => {
    if (!chartReady || !candlestickSeriesRef.current) return

    try {
      // Get CSS variables for volume colors
      const styles = getComputedStyle(document.documentElement)
      const volumeUpColor = styles.getPropertyValue('--chart-volume-up').trim()
      const volumeDownColor = styles.getPropertyValue('--chart-volume-down').trim()

      const open = typeof newCandle.o === 'string' ? parseFloat(newCandle.o) : newCandle.o
      const high = typeof newCandle.h === 'string' ? parseFloat(newCandle.h) : newCandle.h
      const low = typeof newCandle.l === 'string' ? parseFloat(newCandle.l) : newCandle.l
      const close = typeof newCandle.c === 'string' ? parseFloat(newCandle.c) : newCandle.c
      const volume = typeof newCandle.v === 'string' ? parseFloat(newCandle.v) : newCandle.v
      
      const candleData: CandlestickData = {
        time: (newCandle.t / 1000) as Time,
        open, high, low, close,
      }

      const volumeData: HistogramData = {
        time: (newCandle.t / 1000) as Time,
        value: volume,
        color: close >= open ? volumeUpColor : volumeDownColor
      }

      // Update data without triggering auto-scroll
      candlestickSeriesRef.current.update(candleData)
      if (showVolume && volumeSeriesRef.current) {
        volumeSeriesRef.current.update(volumeData)
      }
      
      // Chart shifting prevention is handled by timeScale configuration
      // No need to manually preserve visible range
    } catch (error) {
      console.error('❌ Error updating real-time candle:', error)
    }
  }, [chartReady, showVolume])

  // Fetch Hyperliquid historical data (10x more candles)
  const fetchHistoricalData = useCallback(async (targetInterval: string) => {
    try {
      setCandlesLoading(true)
      
      // Map UI intervals to Hyperliquid API intervals
      const apiInterval = getHyperliquidInterval(targetInterval)
      
      let daysBack = 300 // Default for longer timeframes
      if (targetInterval === '1m') {
        daysBack = 6 // 1 minute data for 12 days
      } else if (targetInterval === '5m') {
        daysBack = 28 // 5 minute data for 5 weeks
      } else if (targetInterval === '15m') {
        daysBack = 60 // 15 minute data for 2 month
      } else if (targetInterval === '1h') {
        daysBack = 180 // 1 hour data for 6 months
      } else if (targetInterval === '4h') {
        daysBack = 240 // 4 hour data for 4 months (1440 candles)
      } else if (targetInterval === '1D' || targetInterval === 'D') {
        daysBack = 365 // Daily data for 1 year instead of 3 years - test if large dataset causes drift
      }
      
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: symbol,
            interval: apiInterval, // Use mapped interval
            startTime: Date.now() - (daysBack * 24 * 60 * 60 * 1000),
            endTime: Date.now()
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data && Array.isArray(data) && data.length > 0) {
          setCandles(data)
          
          // Update prevSymbolRef for symbol change tracking
          if (prevSymbolRef.current !== symbol) {
            prevSymbolRef.current = symbol
          }
          
          if (data.length > 0) {
            const lastCandle = data[data.length - 1]
            const price = typeof lastCandle.c === 'string' ? parseFloat(lastCandle.c) : lastCandle.c
            if (!isNaN(price) && price > 0) {
              setCurrentPrice(price)
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching Hyperliquid data:', error)
    } finally {
      setCandlesLoading(false)
    }
  }, [symbol])

  // WebSocket connection to Hyperliquid
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket('wss://api.hyperliquid.xyz/ws')
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)

        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'l2Book', coin: symbol }
        }))

        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'candle', coin: symbol, interval: getHyperliquidInterval(interval) }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.channel === 'candle' && message.data) {
            const candleData = Array.isArray(message.data) ? message.data : [message.data]
            
            candleData.forEach((candle: Candle) => {
              if (candle.s === symbol) {
                setCandles(prev => {
                  const newCandles = [...prev]
                  const existingIndex = newCandles.findIndex(c => c.t === candle.t)
                  if (existingIndex >= 0) {
                    newCandles[existingIndex] = candle
                  } else {
                    newCandles.push(candle)
                  }
                  return newCandles.sort((a, b) => a.t - b.t).slice(-10000) // 10x increase from 1000
                })
                
                // Call updateRealtimeCandle directly without dependency
                if (chartRef.current && candlestickSeriesRef.current) {
                  updateRealtimeCandle(candle)
                }
                
                const price = typeof candle.c === 'string' ? parseFloat(candle.c) : candle.c
                if (!isNaN(price) && price > 0) {
                  setCurrentPrice(price)
                }
              }
            })
          }

          if (message.channel === 'l2Book' && message.data) {
            setOrderBook(message.data)
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error)
    }
  }, [symbol, interval]) // Removed updateRealtimeCandle dependency

  // Handle interval change
  const handleIntervalChange = (newInterval: string) => {
    // Fade out chart during transition
    setChartVisible(false)
    setCandlesLoading(true)
    
    // Clear existing data to prevent stale data display
    setCandles([])
    
    setInterval(newInterval)
    
    // Update WebSocket subscription for new interval
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'candle', coin: symbol, interval: getHyperliquidInterval(newInterval) }
      }))
    }
    
    // Fetch new data - the chart will become visible when data loads
    // (handled by the useEffect that watches candlesLoading state)
  }

  // Initialize chart
  useEffect(() => {
    setChartVisible(false) // Reset visibility on init
    
    const timer = setTimeout(() => {
      initChart()
    }, 100)

    return () => {
      clearTimeout(timer)
      if (wsRef.current) {
        wsRef.current.close()
      }
      // Clean up trigger line event listeners
      if (triggerLineCleanupRef.current) {
        triggerLineCleanupRef.current()
        triggerLineCleanupRef.current = null
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        candlestickSeriesRef.current = null
        volumeSeriesRef.current = null
        triggerLineSeriesRef.current = null
      }
      setChartVisible(false)
    }
  }, []) // Remove initChart dependency to prevent unnecessary recreations

  // Load data - only when symbol or interval changes
  useEffect(() => {
    fetchHistoricalData(interval)
    connectWebSocket()
  }, [symbol, interval]) // Only depend on symbol and interval, not the functions

  // Update chart
  useEffect(() => {
    if (chartReady && candles.length > 0) {
      updateChartData()
    }
  }, [chartReady, updateChartData]) // Removed 'candles' dependency to prevent drift on real-time updates

  // Show chart when data loads after interval change
  useEffect(() => {
    if (!candlesLoading && candles.length > 0 && chartReady) {
      // Data has finished loading, show the chart
      setTimeout(() => {
        setChartVisible(true)
        setIsFirstDataLoad(false)
      }, 200) // Small delay to ensure chart is updated
    }
  }, [candlesLoading, chartReady, isFirstDataLoad, symbol])

  // Handle symbol changes explicitly
  useEffect(() => {
    if (prevSymbolRef.current && prevSymbolRef.current !== symbol) {
      // Clear existing data immediately
      setCandles([])
      setOrderBook(null)
      setCurrentPrice(0)
      
      // Reset first data load flag for new symbol
      setIsFirstDataLoad(true)
      
      // Fade out chart during transition
      setChartVisible(false)
      
      // Close existing WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
      }
      
      // Fade back in after brief delay
      setTimeout(() => {
        setChartVisible(true)
      }, 500)
    }
  }, [symbol])

  // Notify parent of current price changes
  useEffect(() => {
    if (currentPrice > 0 && onCurrentPriceChange) {
      onCurrentPriceChange(currentPrice)
    }
  }, [currentPrice, onCurrentPriceChange])

  // Add trigger price line to chart
  const updateTriggerLine = useCallback(() => {
    if (!chartReady || !chartRef.current) return

    // Clean up previous trigger line and its event listeners
    if (triggerLineCleanupRef.current) {
      triggerLineCleanupRef.current()
      triggerLineCleanupRef.current = null
    }

    // Remove existing trigger line with safety check
    if (triggerLineSeriesRef.current && chartRef.current) {
      try {
        chartRef.current.removeSeries(triggerLineSeriesRef.current)
      } catch (error) {
        console.warn('❌ Error removing trigger line series:', error)
      }
      triggerLineSeriesRef.current = null
    }

    // Add new trigger line if price is set
    if (triggerPrice && triggerPrice > 0) {
      try {
        const triggerLineSeries = chartRef.current.addSeries(LineSeries, {
          color: '#FF8C00', // Orange color
          lineWidth: 1, // Thicker line for better visibility
          lineStyle: 1, // Solid line (not dashed)
          priceLineVisible: true, // Hide price line to prevent scaling issues
          lastValueVisible: true, // Hide last value marker to prevent scaling issues
          crosshairMarkerVisible: true,
          title: `Trigger: $${formatPrice(triggerPrice)}`,
          // Prevent this series from affecting chart auto-scaling
          autoscaleInfoProvider: () => null,
          // Don't include in fit content calculations
          visible: true,
          priceScaleId: 'right' // Use main price scale but prevent scaling
        })

        // Remove the separate price scale configuration since we're using main scale

        // Create a horizontal line that spans a very wide time range
        // This ensures it's always visible regardless of chart navigation
        const now = Date.now() / 1000
        const yearAgo = now - (365 * 24 * 60 * 60) // 1 year ago
        const yearAhead = now + (365 * 24 * 60 * 60) // 1 year ahead
        
        const lineData = [
          { time: yearAgo as Time, value: triggerPrice },
          { time: yearAhead as Time, value: triggerPrice }
        ]
        triggerLineSeries.setData(lineData)

        triggerLineSeriesRef.current = triggerLineSeries
      } catch (error) {
        console.error('❌ Error adding trigger line:', error)
      }
    }
  }, [chartReady, triggerPrice, formatPrice])

  // Update trigger line when trigger price changes
  useEffect(() => {
    if (chartReady) {
      updateTriggerLine()
    }
  }, [triggerPrice, chartReady, updateTriggerLine])

  // Reset trigger line when symbol changes
  useEffect(() => {
    if (prevSymbolRef.current && prevSymbolRef.current !== symbol) {
      // Remove trigger line when symbol changes
      if (triggerLineSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(triggerLineSeriesRef.current)
        triggerLineSeriesRef.current = null
      }
      
      // Reset trigger price to current price of new asset if callback provided
      if (onTriggerPriceChange && currentPrice > 0) {
        onTriggerPriceChange(currentPrice)
      }
    }
  }, [symbol, currentPrice, onTriggerPriceChange])

  // Calculate market stats
  const calculate24hChange = () => {
    if (candles.length < 24) return 0
    const currentCandle = candles[candles.length - 1]
    const oldCandle = candles[Math.max(0, candles.length - 24)]
    if (!currentCandle?.c || !oldCandle?.o) return 0
    const currentClose = typeof currentCandle.c === 'string' ? parseFloat(currentCandle.c) : currentCandle.c
    const oldOpen = typeof oldCandle.o === 'string' ? parseFloat(oldCandle.o) : oldCandle.o
    if (oldOpen <= 0) return 0
    return ((currentClose - oldOpen) / oldOpen) * 100
  }

  const calculate1hChange = () => {
    if (candles.length < 1) return 0
    const currentCandle = candles[candles.length - 1]
    const oldCandle = candles[Math.max(0, candles.length - 1)]
    if (!currentCandle?.c || !oldCandle?.o) return 0
    const currentClose = typeof currentCandle.c === 'string' ? parseFloat(currentCandle.c) : currentCandle.c
    const oldOpen = typeof oldCandle.o === 'string' ? parseFloat(oldCandle.o) : oldCandle.o
    if (oldOpen <= 0) return 0
    return ((currentClose - oldOpen) / oldOpen) * 100
  }

  const calculateWeeklyChange = () => {
    if (candles.length < 168) return 0 // 168 hours in a week
    const currentCandle = candles[candles.length - 1]
    const oldCandle = candles[Math.max(0, candles.length - 168)]
    if (!currentCandle?.c || !oldCandle?.o) return 0
    const currentClose = typeof currentCandle.c === 'string' ? parseFloat(currentCandle.c) : currentCandle.c
    const oldOpen = typeof oldCandle.o === 'string' ? parseFloat(oldCandle.o) : oldCandle.o
    if (oldOpen <= 0) return 0
    return ((currentClose - oldOpen) / oldOpen) * 100
  }

  const get24hHigh = () => {
    if (candles.length < 24) return 0
    const last24h = candles.slice(-24)
    return Math.max(...last24h.map(c => typeof c.h === 'string' ? parseFloat(c.h) : c.h))
  }

  const get24hLow = () => {
    if (candles.length < 24) return 0
    const last24h = candles.slice(-24)
    return Math.min(...last24h.map(c => typeof c.l === 'string' ? parseFloat(c.l) : c.l))
  }

  const getCurrentOpen = () => {
    if (candles.length === 0) return 0
    const currentCandle = candles[candles.length - 1]
    return typeof currentCandle.o === 'string' ? parseFloat(currentCandle.o) : currentCandle.o
  }

  const getOrderBookStyling = (size: string, maxSize: number) => {
    const sizeNum = parseFloat(size || '0')
    const percentage = Math.min((sizeNum / maxSize) * 100, 100)
    const opacity = Math.max(0.1, percentage / 100)
    return { width: `${percentage}%`, opacity: opacity }
  }

  const change24h = calculate24hChange()
  const change1h = calculate1hChange()
  const changeWeekly = calculateWeeklyChange()
  const high24h = get24hHigh()
  const low24h = get24hLow()
  const currentOpen = getCurrentOpen()

  const maxAskSize = orderBook ? Math.max(...orderBook.levels[1].map(ask => parseFloat(ask.sz || '0'))) : 0
  const maxBidSize = orderBook ? Math.max(...orderBook.levels[0].map(bid => parseFloat(bid.sz || '0'))) : 0
  const maxOrderSize = Math.max(maxAskSize, maxBidSize)

  // Handle volume series changes without recreating chart
  useEffect(() => {
    if (!chartReady || !chartRef.current) return

    // Remove existing volume series if it exists
    if (volumeSeriesRef.current) {
      try {
        chartRef.current.removeSeries(volumeSeriesRef.current)
        volumeSeriesRef.current = null
      } catch (error) {
        console.warn('❌ Error removing volume series:', error)
      }
    }

    // Add volume series if showVolume is true
    if (showVolume) {
      try {
        const styles = getComputedStyle(document.documentElement)
        const volumeNeutral = styles.getPropertyValue('--chart-volume-neutral').trim()
        
        const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
          color: volumeNeutral,
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        })
        
        chartRef.current.priceScale('').applyOptions({
          scaleMargins: { top: 0.7, bottom: 0 },
        })
        
        volumeSeriesRef.current = volumeSeries
        
        // Update volume data if we have candles
        if (candles.length > 0) {
          updateChartData()
        }
      } catch (error) {
        console.error('❌ Error adding volume series:', error)
      }
    } else {
      // Reset price scale margins when volume is hidden
      if (chartRef.current && candlestickSeriesRef.current) {
        chartRef.current.priceScale('right').applyOptions({
          scaleMargins: { top: 0.1, bottom: 0.1 },
        })
      }
    }
  }, [showVolume, chartReady, candles, updateChartData])

  return (
    <motion.div 
      className="h-full w-full bg-background text-foreground flex flex-col overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="h-16 bg-background border-b border-border flex items-center justify-between px-4 flex-shrink-0"
        variants={itemVariants}
      >
        <div className="flex items-center gap-6">
          <motion.div 
            className="flex items-center gap-3"
            variants={itemVariants}
          >
            <TokenIcon symbol={symbol} />
            <span className="text-base font-semibold">{symbol}-USD</span>
            <Badge variant="outline" className="text-xs">Hyperliquid</Badge>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-4 text-xs"
            variants={priceStatsVariants}
          >
            {[
              { label: 'Price', value: formatPrice(currentPrice), width: 'w-24' },
              { label: '1h Change', value: change1h !== 0 ? `${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%` : '-', width: 'w-20', color: change1h >= 0 ? 'text-price-positive' : 'text-price-negative' },
              { label: '24h Change', value: change24h !== 0 ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '-', width: 'w-20', color: change24h >= 0 ? 'text-price-positive' : 'text-price-negative' },
              { label: 'Weekly Change', value: changeWeekly !== 0 ? `${changeWeekly >= 0 ? '+' : ''}${changeWeekly.toFixed(2)}%` : '-', width: 'w-24', color: changeWeekly >= 0 ? 'text-price-positive' : 'text-price-negative' },
              { label: '24h High', value: formatPrice(high24h), width: 'w-24' },
              { label: '24h Low', value: formatPrice(low24h), width: 'w-24' },
              { label: 'Open', value: formatPrice(currentOpen), width: 'w-24' }
            ].map((stat, index) => (
              <motion.div 
                key={stat.label}
                className={stat.width}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <div className="text-muted-foreground text-xs">{stat.label}</div>
                <div className={`font-mono font-semibold ${stat.color || ''}`}>
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Trading Interface */}
      <motion.div 
        className="flex-1 flex overflow-hidden"
        variants={itemVariants}
      >
        {/* Left Side - Chart */}
        <motion.div 
          className="flex-1 flex flex-col bg-background overflow-hidden"
          variants={chartVariants}
        >
          {/* Chart Controls */}
          <motion.div 
            className="h-10 bg-background border-b border-border flex items-center justify-between px-4 flex-shrink-0"
            variants={itemVariants}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <motion.span 
                  className="text-price-positive"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ●
                </motion.span>
                <span className="font-mono">{symbol}USD Hyperliquid</span>
              </div>
              
              {/* Chart Control Buttons */}
              <div className="flex items-center gap-1">
                {/* Chart navigation via keyboard shortcuts */}
              </div>
            </div>
            
            <motion.div 
              className="flex items-center gap-2"
              variants={itemVariants}
            >
              {/* Volume Toggle */}
              <motion.button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  showVolume 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Toggle volume"
              >
                Vol
              </motion.button>
              
              {/* Timeframe buttons */}
              {['1m', '5m', '15m', '1h', '4h', '1D'].map((timeframe, index) => (
                <motion.div
                  key={timeframe}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <Button
                    variant={interval === timeframe ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleIntervalChange(timeframe)}
                    className="h-7 px-2 text-xs"
                  >
                    {timeframe}
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Chart */}
          <motion.div 
            className="flex-1 relative"
            variants={chartVariants}
          >
            {/* Crosshair Info Display */}
            <AnimatePresence>
              {crosshairInfo.visible && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs z-10"
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-foreground font-medium">
                      ${formatPrice(crosshairInfo.price)}
                    </div>
                    <div className="text-muted-foreground">
                      {crosshairInfo.time}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div
              ref={chartContainerRef}
              className="absolute inset-0 w-full h-full"
              style={{ minHeight: '400px', minWidth: '600px' }}
              animate={{ 
                opacity: chartVisible ? 1 : 0,
                scale: chartVisible ? 1 : 0.98
              }}
              transition={{ 
                duration: 0.5, 
                ease: "easeInOut" 
              }}
            >
              {/* Chart container - trigger arrows removed as they weren't working properly */}
            </motion.div>
            
            <AnimatePresence>
              {candlesLoading && (
                <motion.div 
                  className="absolute inset-0 w-full h-full bg-background flex flex-col gap-2 p-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Skeleton className="h-full w-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Right Side - Order Book */}
        <motion.div 
          className="w-80 bg-background border-l border-border flex flex-col overflow-hidden"
          variants={orderBookVariants}
        >
          {/* Order Book Header */}
          <motion.div 
            className="h-10 border-b border-border flex items-center justify-between px-4 flex-shrink-0"
            variants={itemVariants}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">Order Book</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div 
                className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-price-positive' : 'bg-price-negative'}`}
                animate={{ scale: wsConnected ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 1, repeat: wsConnected ? Infinity : 0 }}
              />
              <span className="text-xs text-muted-foreground">
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </motion.div>

          <motion.div 
            className="px-4 py-1 border-b border-border flex-shrink-0"
            variants={itemVariants}
          >
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium">
              <div className="text-left">Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
          </motion.div>

          {/* Order Book Content */}
          <motion.div 
            className="flex-1 flex flex-col overflow-hidden"
            variants={itemVariants}
          >
            <AnimatePresence mode="wait">
              {orderBook ? (
                <motion.div
                  key="orderbook-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Asks */}
                  <div className="flex-1 overflow-y-auto">
                    {orderBook.levels[1].slice(0, 12).reverse().map((ask, index) => {
                      const price = parseFloat(ask.px || '0')
                      const size = parseFloat(ask.sz || '0')
                      const total = price * size
                      const styling = getOrderBookStyling(ask.sz, maxOrderSize)
                      
                      return (
                        <motion.div 
                          key={index} 
                          className="relative group hover:bg-orderbook-ask-hover"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div 
                            className="absolute right-0 top-0 h-full bg-orderbook-ask-bg"
                            style={styling}
                          />
                          <div className="relative px-4 py-0.5 grid grid-cols-3 gap-2 text-xs font-mono">
                            <div className="text-orderbook-ask">
                              {formatPrice(price)}
                            </div>
                            <div className="text-muted-foreground text-right">
                              {size.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-right">
                              {total.toLocaleString()}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                  
                  {/* Spread */}
                  <motion.div 
                    className="px-4 py-1 border-y border-border bg-muted/50 flex-shrink-0"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Spread</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground">
                          {orderBook.levels[1][0] && orderBook.levels[0][0] 
                            ? formatPrice(parseFloat(orderBook.levels[1][0].px) - parseFloat(orderBook.levels[0][0].px))
                            : '0'
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Bids */}
                  <div className="flex-1 overflow-y-auto">
                    {orderBook.levels[0].slice(0, 12).map((bid, index) => {
                      const price = parseFloat(bid.px || '0')
                      const size = parseFloat(bid.sz || '0')
                      const total = price * size
                      const styling = getOrderBookStyling(bid.sz, maxOrderSize)
                      
                      return (
                        <motion.div 
                          key={index} 
                          className="relative group hover:bg-orderbook-bid-hover"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div 
                            className="absolute right-0 top-0 h-full bg-orderbook-bid-bg"
                            style={styling}
                          />
                          <div className="relative px-4 py-0.5 grid grid-cols-3 gap-2 text-xs font-mono">
                            <div className="text-orderbook-bid">
                              {formatPrice(price)}
                            </div>
                            <div className="text-muted-foreground text-right">
                              {size.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground text-right">
                              {total.toLocaleString()}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="orderbook-loading"
                  className="flex-1 flex items-center justify-center text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center">
                    <motion.div 
                      className="text-sm"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Loading order book...
                    </motion.div>
                    <div className="text-xs">Connecting to Hyperliquid</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
} 

