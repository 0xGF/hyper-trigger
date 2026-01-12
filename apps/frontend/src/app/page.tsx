'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { formatUnits } from 'viem'
import { TriggerBuilder } from '@/components/triggers/TriggerBuilder'
import { HyperliquidChart, TriggerLine } from '@/components/chart/HyperliquidChart'
import { OrderBook } from '@/components/chart/OrderBook'
import { ChevronDown, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { TokenIcon } from '@/components/ui/token-icon'
import { TokenModal } from '@/components/ui/token-select'
import { usePriceContext } from '@/contexts/PriceContext'
import { getTriggerableTokens, getDefaultToken, sortTokensByImportance, getDisplayName } from '@hyper-trigger/shared/tokens'
import { useUserActiveTriggers, useTriggerContract, Trigger, TriggerStatus } from '@/hooks/useTriggerContract'
import { usePublicClient } from 'wagmi'
import { useBridge } from '@/hooks/useBridge'
import { toast } from 'sonner'
import { formatErrorMessage, isUserRejection } from '@/lib/errors'

export default function HomePage() {
  const defaultToken = getDefaultToken()
  // Default to BTC (UBTC) for consistent initial load
  const [watchToken, setWatchToken] = useState('UBTC')
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [interval, setInterval] = useState('60')
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  
  // Use the SAME token list as TriggerBuilder
  const tokens = useMemo(() => sortTokensByImportance(getTriggerableTokens()), [])
  const currentToken = tokens.find(t => t.symbol === watchToken) || defaultToken
  
  // Use the SAME price context as everywhere else
  const { prices } = usePriceContext()
  const priceData = prices[watchToken]
  
  // Fetch user's active triggers from contract
  const { data: activeTriggers, refetch: refetchTriggers } = useUserActiveTriggers()
  const { cancelTrigger, createTrigger, updateTriggerPrice } = useTriggerContract()
  
  // Get spot balances for Account Equity section
  const { spotBalances, isLoadingBalances, fetchSpotBalances: refetchBalances } = useBridge()
  
  // Calculate total spot equity value
  const totalSpotValue = useMemo(() => {
    if (!spotBalances.length) return 0
    return spotBalances.reduce((total, balance) => {
      const tokenPrice = prices[balance.symbol]?.price || (balance.symbol === 'USDC' ? 1 : 0)
      return total + parseFloat(balance.total) * tokenPrice
    }, 0)
  }, [spotBalances, prices])
  
  // Filter triggers for the current watch token
  const triggersForChart = useMemo((): TriggerLine[] => {
    if (!activeTriggers) return []
    return (activeTriggers as Trigger[])
      .filter(t => t.watchAsset === watchToken)
      .map(t => ({
        id: Number(t.id),
        price: Number(formatUnits(t.targetPrice, 6)),
        isAbove: t.isAbove,
        label: `${t.isAbove ? '↑' : '↓'} ${t.tradeAsset}`,
      }))
  }, [activeTriggers, watchToken])
  
  // All active triggers for the list - with executing state
  const allTriggers = useMemo(() => {
    if (!activeTriggers) return []
    return (activeTriggers as Trigger[]).map(t => {
      const targetPrice = Number(formatUnits(t.targetPrice, 6))
      const currentPrice = prices[t.watchAsset]?.price || 0
      
      // Check if conditions are met (trigger should be executing)
      const conditionMet = currentPrice > 0 && (
        t.isAbove ? currentPrice >= targetPrice : currentPrice <= targetPrice
      )
      
      return {
        id: Number(t.id),
        watchAsset: t.watchAsset,
        targetPrice,
        isAbove: t.isAbove,
        tradeAsset: t.tradeAsset,
        isBuy: t.isBuy,
        amount: t.isBuy ? formatUnits(t.amount, 6) : formatUnits(t.amount, 18),
        maxSlippage: Number(t.maxSlippage),
        isExecuting: conditionMet, // NEW: show executing state
      }
    })
  }, [activeTriggers, prices])
  
  // Calculate total committed value in USD (for both buy and sell triggers)
  const totalCommittedValue = useMemo(() => {
    if (!allTriggers.length) return 0
    
    let total = 0
    allTriggers.forEach(trigger => {
      if (trigger.isBuy) {
        // For buys, USDC amount is the commitment
        total += parseFloat(trigger.amount)
      } else {
        // For sells, calculate current USD value of tokens
        const tokenPrice = prices[trigger.tradeAsset]?.price || 0
        total += parseFloat(trigger.amount) * tokenPrice
      }
    })
    
    return total
  }, [allTriggers, prices])
  
  // Track previous triggers to detect executions
  const prevTriggersRef = useRef<Map<number, { tradeAsset: string; isBuy: boolean; amount: string; wasExecuting: boolean }>>(new Map())
  const publicClient = usePublicClient()
  
  // Check if any trigger is currently executing
  const hasExecutingTrigger = useMemo(() => allTriggers.some(t => t.isExecuting), [allTriggers])
  
  // Poll more aggressively when a trigger is executing
  useEffect(() => {
    if (!hasExecutingTrigger) return
    
    // Poll every 500ms when executing for faster detection
    const intervalId = window.setInterval(() => {
      void refetchTriggers()
      void refetchBalances()
    }, 500)
    
    return () => window.clearInterval(intervalId)
  }, [hasExecutingTrigger, refetchTriggers, refetchBalances])
  
  // Detect when triggers get executed (removed from active list)
  useEffect(() => {
    if (!activeTriggers || !publicClient) return
    
    const currentIds = new Set(allTriggers.map(t => t.id))
    const prevTriggers = prevTriggersRef.current
    
    // Check for triggers that disappeared (not cancelled by user)
    prevTriggers.forEach((trigger, id) => {
      if (!currentIds.has(id) && cancellingId !== id) {
        // Trigger disappeared - if it was executing, it was likely executed successfully
        if (trigger.wasExecuting) {
          const action = trigger.isBuy ? 'Bought' : 'Sold'
          const amount = parseFloat(trigger.amount).toFixed(4)
          toast.success(
            `Trigger executed: ${action} ${amount} ${getDisplayName(trigger.tradeAsset)}`,
            { duration: 5000 }
          )
        }
        // Always refetch balances when a trigger is removed
        refetchBalances()
      }
    })
    
    // Update previous triggers map
    const newMap = new Map<number, { tradeAsset: string; isBuy: boolean; amount: string; wasExecuting: boolean }>()
    allTriggers.forEach(t => {
      newMap.set(t.id, { tradeAsset: t.tradeAsset, isBuy: t.isBuy, amount: t.amount, wasExecuting: t.isExecuting })
    })
    prevTriggersRef.current = newMap
  }, [allTriggers, cancellingId, refetchBalances, publicClient])
  
  // Handle trigger cancellation
  const handleCancelTrigger = useCallback(async (triggerId: number) => {
    setCancellingId(triggerId)
    try {
      const hash = await cancelTrigger(triggerId)
      if (hash) {
        toast.success('Trigger cancelled! Waiting for confirmation...')
        // Refetch multiple times as chain confirms
        setTimeout(() => { refetchTriggers(); refetchBalances() }, 500)
        setTimeout(() => { refetchTriggers(); refetchBalances() }, 2000)
        setTimeout(() => { refetchTriggers(); refetchBalances() }, 4000)
      }
    } catch (err) {
      if (!isUserRejection(err)) {
        toast.error(formatErrorMessage(err))
      }
    } finally {
      setCancellingId(null)
    }
  }, [cancelTrigger, refetchTriggers, refetchBalances])
  
  // Handle trigger line drag (single atomic transaction to update price)
  const handleTriggerDrag = useCallback(async (triggerId: number, newPrice: number) => {
    const trigger = allTriggers.find(t => t.id === triggerId)
    if (!trigger) return
    
    try {
      // Keep the original direction (isAbove) - don't auto-switch
      await updateTriggerPrice(triggerId, newPrice, trigger.isAbove)
      
      toast.success(`Trigger updated to $${newPrice.toFixed(2)}`)
      setTimeout(() => {
        refetchTriggers()
        refetchBalances()
      }, 2000)
    } catch (err) {
      if (!isUserRejection(err)) {
        toast.error(formatErrorMessage(err))
      }
      refetchTriggers() // Refetch to reset the UI
    }
  }, [allTriggers, prices, updateTriggerPrice, refetchTriggers, refetchBalances])
  
  // Convert spot balances to Record<string, string> for TokenModal
  const balancesMap = useMemo(() => {
    const b: Record<string, string> = {}
    spotBalances.forEach(bal => {
      b[bal.symbol] = bal.total
    })
    return b
  }, [spotBalances])
  
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (price >= 1) return price.toFixed(2)
    return price.toFixed(4)
  }
  
  const getDisplayName = (symbol: string) => {
    if (symbol.startsWith('U') && symbol !== 'USDC') {
      return symbol.slice(1)
    }
    return symbol
  }
  
  return (
    <div className="h-full flex flex-col lg:flex-row gap-1 p-1 overflow-hidden">
      {/* Left Panel - Chart + Active Triggers */}
      <div className="flex flex-col min-w-0 flex-1 min-h-0">
        {/* Token Info Bar */}
        <div className="px-3 py-2 mb-1 flex items-center gap-10 shrink-0 bg-card border border-border rounded-xl overflow-x-auto">
          {/* Token Selector */}
          <button
            onClick={() => setShowTokenModal(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
          >
            <TokenIcon symbol={watchToken} size="md" />
            <span className="font-semibold text-foreground text-base">{currentToken.displayName}/USDC</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          
          {/* Spot Badge */}
          <span className="px-2.5 py-1 text-xs font-medium bg-primary/20 text-primary rounded-md shrink-0">
            Spot
          </span>
          
          {/* Stats - always render with fixed height to prevent flicker */}
          {/* Price */}
          <div className="flex flex-col shrink-0 h-8 justify-center">
            <span className="text-[10px] text-muted-foreground leading-none">Price</span>
            <span className="text-xs font-semibold text-foreground tabular-nums leading-tight">
              {priceData ? formatPrice(priceData.price) : '—'}
            </span>
          </div>
          
          {/* 24H Change */}
          <div className="flex flex-col shrink-0 h-8 justify-center">
            <span className="text-[10px] text-muted-foreground leading-none">24H Change</span>
            <span className={`text-xs font-semibold tabular-nums leading-tight ${
              priceData && (priceData.change24h ?? 0) >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {priceData ? `${(priceData.change24h ?? 0) >= 0 ? '+' : ''}${(((priceData.change24h ?? 0) / (priceData.price - (priceData.change24h ?? 0))) * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
          
          {/* 24H Volume */}
          <div className="flex flex-col shrink-0 h-8 justify-center">
            <span className="text-[10px] text-muted-foreground leading-none">24H Volume</span>
            <span className="text-xs font-semibold text-foreground tabular-nums leading-tight">
              {priceData ? `${(priceData.volume24h ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
            </span>
          </div>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Interval Selector */}
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 shrink-0">
            {[
              { label: '1m', value: '1' },
              { label: '5m', value: '5' },
              { label: '15m', value: '15' },
              { label: '1H', value: '60' },
              { label: '4H', value: '240' },
              { label: '1D', value: 'D' },
            ].map(int => (
              <button
                key={int.value}
                onClick={() => setInterval(int.value)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  interval === int.value 
                    ? 'bg-card text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Token Modal */}
        <TokenModal
          isOpen={showTokenModal}
          onClose={() => setShowTokenModal(false)}
          onSelect={setWatchToken}
          tokens={tokens}
          balances={balancesMap}
          title="Select Token"
        />
        
        {/* Chart + OrderBook */}
        <div className="flex-1 min-h-[200px] flex gap-1">
          {/* Chart */}
          <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
            <HyperliquidChart 
              symbol={watchToken} 
              interval={interval}
              triggers={triggersForChart}
              onTriggerDrag={handleTriggerDrag}
            />
          </div>
          
          {/* OrderBook */}
          <div className="w-[240px] shrink-0 hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            <OrderBook symbol={watchToken} />
          </div>
        </div>
        
        {/* Active Triggers Table */}
        <div className="shrink-0 mt-1 bg-card border border-border rounded-xl overflow-hidden min-h-[180px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-2 border-b border-border">
            <span className="text-xs font-medium text-foreground">Active Triggers</span>
            {allTriggers.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({allTriggers.length})</span>
            )}
          </div>
          
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Time</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">When</th>
                <th className="text-left px-4 py-2.5 font-medium">Trade</th>
                <th className="text-left px-4 py-2.5 font-medium">Side</th>
                <th className="text-left px-4 py-2.5 font-medium">Amount</th>
                <th className="text-right px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {allTriggers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No active triggers
                  </td>
                </tr>
              ) : (
                allTriggers.map(trigger => (
                  <tr 
                    key={trigger.id}
                    onClick={() => setWatchToken(trigger.watchAsset)}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    {/* Time */}
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                      {new Date().toLocaleDateString()} 
                    </td>
                    
                    {/* Type */}
                    <td className="px-4 py-2.5 text-foreground">
                      Spot
                    </td>
                    
                    {/* When (Watch Asset + Direction + Price) */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <TokenIcon symbol={trigger.watchAsset} size="sm" />
                        <span className="text-foreground">{getDisplayName(trigger.watchAsset)}</span>
                        <span className={`inline-flex items-center ${
                          trigger.isAbove ? 'text-primary' : 'text-destructive'
                        }`}>
                          {trigger.isAbove ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                        </span>
                        <span className="text-muted-foreground">${trigger.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                    
                    {/* Trade Asset */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <TokenIcon symbol={trigger.tradeAsset} size="sm" />
                        <span className="text-foreground">{getDisplayName(trigger.tradeAsset)}</span>
                      </div>
                    </td>
                    
                    {/* Side (Buy/Sell) */}
                    <td className="px-4 py-2.5">
                      <span className={trigger.isBuy ? 'text-primary' : 'text-destructive'}>
                        {trigger.isBuy ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    
                    {/* Size */}
                    <td className="px-4 py-2.5 text-foreground tabular-nums">
                      {trigger.isBuy 
                        ? `$${parseFloat(trigger.amount).toFixed(2)}`
                        : `${parseFloat(trigger.amount).toFixed(4)} ${getDisplayName(trigger.tradeAsset)}`
                      }
                    </td>
                    
                    {/* Status/Cancel */}
                    <td className="px-4 py-2.5 text-right">
                      {trigger.isExecuting ? (
                        <div className="w-20 flex items-center justify-end gap-1.5 text-primary text-xs font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing</span>
                        </div>
                      ) : cancellingId === trigger.id ? (
                        <div className="w-20 flex items-center justify-end">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelTrigger(trigger.id) }}
                          disabled={cancellingId !== null}
                          className="w-20 text-destructive hover:text-destructive/80 text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-end"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Right Panel */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-1 overflow-hidden">
        {/* Spot/Perps Tabs Card */}
        <div className="flex bg-card border border-border rounded-xl overflow-hidden shrink-0">
          <button
            className="flex-1 px-4 py-3.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgba(74, 222, 128, 0.2)',
              color: '#4ade80'
            }}
          >
            Spot
          </button>
          <button
            disabled
            className="flex-1 px-4 py-3.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
            title="Coming soon"
          >
            Perps
          </button>
        </div>
        
        {/* Trigger Builder Card */}
        <div className="flex flex-col overflow-hidden bg-card border border-border rounded-xl shrink-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <TriggerBuilder 
              watchToken={watchToken} 
              onWatchTokenChange={setWatchToken}
              onTriggerCreated={() => {
                refetchTriggers()
                refetchBalances()
              }}
              spotBalances={spotBalances}
              isLoadingBalances={isLoadingBalances}
            />
          </div>
        </div>
        
        {/* Account Overview Card */}
        <div className="flex-1 bg-card border border-border rounded-xl p-2.5">
          {/* Balances Section */}
          <div className="space-y-1.5 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Spot</span>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {isLoadingBalances ? '—' : `$${totalSpotValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="flex items-center justify-between opacity-40">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Perps</span>
              <span className="text-xs text-muted-foreground tabular-nums">$0.00</span>
            </div>
          </div>
          
          {/* Triggers Section */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Spot Triggers</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {allTriggers.length > 0 ? `$${totalCommittedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between opacity-40">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Perp Triggers</span>
              <span className="text-xs text-muted-foreground tabular-nums">—</span>
            </div>
          </div>
        </div>
        
        {/* Portfolio Card */}
        <div className="h-[210px] bg-card border border-border rounded-xl p-2.5 flex flex-col shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Portfolio</div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {spotBalances.length === 0 || spotBalances.filter(bal => parseFloat(bal.total) > 0).length === 0 ? (
              <div className="text-[10px] text-muted-foreground/60 py-2">No assets</div>
            ) : (
              spotBalances
                .filter(bal => parseFloat(bal.total) > 0)
                .map(bal => {
                  const tokenPrice = prices[bal.symbol]?.price || (bal.symbol === 'USDC' ? 1 : 0)
                  const usdValue = parseFloat(bal.total) * tokenPrice
                  return (
                    <div key={bal.symbol} className="flex items-center gap-2 py-0.5">
                      <TokenIcon symbol={bal.symbol} size="xs" />
                      <span className="text-[10px] font-medium text-foreground flex-1">{bal.symbol}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {parseFloat(bal.total).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums w-14 text-right">
                        ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
