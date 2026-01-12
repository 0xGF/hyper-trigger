'use client'

import { useEffect, useRef, memo, useState, useMemo } from 'react'

interface TradingViewChartProps {
  symbol: string
  interval?: string
  onSymbolChange?: (symbol: string) => void
}

// Chart skeleton component with stable random heights
function ChartSkeleton() {
  // Generate stable heights once
  const bars = useMemo(() => 
    Array.from({ length: 50 }).map((_, i) => ({
      height: 15 + (((i * 7) % 23) + ((i * 13) % 17)) * 1.5,
      isGreen: i % 3 !== 0,
    })), []
  )
  
  return (
    <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col">
      {/* Fake candles skeleton */}
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
      {/* Bottom axis skeleton */}
      <div className="h-6 border-t border-muted/20 flex items-center justify-between px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-8 sm:w-12 h-2 bg-muted/20 rounded" />
        ))}
      </div>
    </div>
  )
}

function TradingViewChartComponent({ symbol, interval = '60' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)
  
  // Generate a unique ID for this component instance
  const widgetIdRef = useRef(`tv_widget_${Math.random().toString(36).slice(2, 11)}`)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const widgetContainer = widgetContainerRef.current
    if (!widgetContainer) return
    
    setIsLoading(true)
    
    // Clear existing content
    widgetContainer.innerHTML = ''
    
    // Create the inner div that TradingView will use
    const innerDiv = document.createElement('div')
    innerDiv.id = widgetIdRef.current
    innerDiv.style.height = '100%'
    innerDiv.style.width = '100%'
    widgetContainer.appendChild(innerDiv)

    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      if (!mountedRef.current) return
      
      // Verify the element exists in DOM
      const targetEl = document.getElementById(widgetIdRef.current)
      if (!targetEl) {
        console.warn('TradingView container not found')
        setIsLoading(false)
        return
      }
      
      // Create the TradingView widget script
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.type = 'text/javascript'
      script.async = true
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: symbol === 'HYPE' ? `MEXC:HYPEUSDT` : `BINANCE:${symbol}USDT`,
        interval: interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        backgroundColor: 'rgba(13, 13, 13, 1)',
        gridColor: 'rgba(42, 42, 42, 0.3)',
        hide_top_toolbar: true,
        hide_legend: true,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        save_image: false,
        calendar: false,
        hide_volume: true,
        withdateranges: false,
        details: false,
        hotlist: false,
        enable_publishing: false,
        container_id: widgetIdRef.current,
        support_host: 'https://www.tradingview.com',
        isTransparent: true,
      })
      
      script.onload = () => {
        // Wait for the iframe to actually render content
        const checkIframe = setInterval(() => {
          if (!mountedRef.current) {
            clearInterval(checkIframe)
            return
          }
          const iframe = widgetContainer?.querySelector('iframe')
          if (iframe) {
            // Give extra time for chart to render inside iframe
            setTimeout(() => {
              if (mountedRef.current) setIsLoading(false)
            }, 1500)
            clearInterval(checkIframe)
          }
        }, 100)
        
        // Fallback: hide skeleton after max wait time
        setTimeout(() => {
          clearInterval(checkIframe)
          if (mountedRef.current) setIsLoading(false)
        }, 5000)
      }
      
      script.onerror = () => {
        if (mountedRef.current) setIsLoading(false)
      }

      targetEl.appendChild(script)
    }, 100)

    return () => {
      clearTimeout(initTimeout)
      // Clean up on unmount or prop change
      if (widgetContainer) {
        widgetContainer.innerHTML = ''
      }
    }
  }, [symbol, interval])

  return (
    <div className="relative h-full w-full overflow-hidden" ref={containerRef}>
      {/* Loading skeleton */}
      {isLoading && <ChartSkeleton />}
      
      {/* Oversized widget container to clip borders - completely hidden until loaded */}
      <div 
        className="tradingview-widget-container absolute -top-[2px] -left-[2px]"
        ref={widgetContainerRef}
        style={{
          height: 'calc(100% + 4px)',
          width: 'calc(100% + 4px)',
          visibility: isLoading ? 'hidden' : 'visible',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out',
        }}
      />
      {/* Cover borders */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0d0d0d] z-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#0d0d0d] z-50 pointer-events-none" />
      <div className="absolute left-0 top-0 h-full w-[3px] bg-[#0d0d0d] z-50 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-[4px] bg-[#0d0d0d] z-50 pointer-events-none" />
    </div>
  )
}

export const TradingViewChart = memo(TradingViewChartComponent)
