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
  
  // All active triggers for the list
  const allTriggers = useMemo(() => {
    if (!activeTriggers) return []
    return (activeTriggers as Trigger[]).map(t => ({
      id: Number(t.id),
      watchAsset: t.watchAsset,
      targetPrice: Number(formatUnits(t.targetPrice, 6)),
      isAbove: t.isAbove,
      tradeAsset: t.tradeAsset,
      isBuy: t.isBuy,
      amount: t.isBuy ? formatUnits(t.amount, 6) : formatUnits(t.amount, 18),
      maxSlippage: Number(t.maxSlippage),
    }))
  }, [activeTriggers])
  
  // Calculate what's committed to active triggers (in USD value)
  const committedToTriggers = useMemo(() => {
    if (!allTriggers.length) return { usdc: 0, tokens: new Map<string, number>() }
    
    let usdcCommitted = 0
    const tokenAmounts = new Map<string, number>()
    
    allTriggers.forEach(trigger => {
      if (trigger.isBuy) {
        // For buys, USDC is committed
        usdcCommitted += parseFloat(trigger.amount)
      } else {
        // For sells, the token is committed
        const currentAmount = tokenAmounts.get(trigger.tradeAsset) || 0
        tokenAmounts.set(trigger.tradeAsset, currentAmount + parseFloat(trigger.amount))
      }
    })
    
    return { usdc: usdcCommitted, tokens: tokenAmounts }
  }, [allTriggers])
  
  // Calculate total committed value in USD
  const totalCommittedValue = useMemo(() => {
    let total = committedToTriggers.usdc // USDC is 1:1
    
    committedToTriggers.tokens.forEach((amount, symbol) => {
      const tokenPrice = prices[symbol]?.price || 0
      total += amount * tokenPrice
    })
    
    return total
  }, [committedToTriggers, prices])
  
  // Track previous triggers to detect executions
  const prevTriggersRef = useRef<Map<number, { tradeAsset: string; isBuy: boolean; amount: string }>>(new Map())
  const publicClient = usePublicClient()
  
  // Detect when triggers get executed (removed from active list without user cancelling)
  useEffect(() => {
    if (!activeTriggers || !publicClient) return
    
    const currentIds = new Set(allTriggers.map(t => t.id))
    const prevTriggers = prevTriggersRef.current
    
    // Check for triggers that disappeared (not cancelled by user)
    prevTriggers.forEach(async (trigger, id) => {
      if (!currentIds.has(id) && cancellingId !== id) {
        // Trigger disappeared - check on-chain status to confirm execution
        try {
          const TRIGGER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIGGER_CONTRACT_ADDRESS as `0x${string}`
          const TRIGGER_ABI = [
            {
              type: 'function',
              name: 'getTrigger',
              inputs: [{ name: 'triggerId', type: 'uint256' }],
              outputs: [
                {
                  type: 'tuple',
                  components: [
                    { name: 'status', type: 'uint8' },
                    { name: 'executedAt', type: 'uint256' },
                  ],
                },
              ],
              stateMutability: 'view',
            },
          ] as const
          
          const result = await publicClient.readContract({
            address: TRIGGER_CONTRACT_ADDRESS,
            abi: TRIGGER_ABI,
            functionName: 'getTrigger',
            args: [BigInt(id)],
          }) as { status: number; executedAt: bigint }
          
          // Only show success if status is Executed (1)
          if (result.status === TriggerStatus.Executed && result.executedAt > BigInt(0)) {
            const action = trigger.isBuy ? 'Bought' : 'Sold'
            const amount = parseFloat(trigger.amount).toFixed(4)
            toast.success(
              `Trigger executed: ${action} ${amount} ${getDisplayName(trigger.tradeAsset)}`,
              { duration: 5000 }
            )
            refetchBalances()
          } else {
            // Trigger was cancelled/expired/failed - no notification needed
            refetchBalances()
          }
        } catch (error) {
          // Failed to check status - just refetch balance silently
          refetchBalances()
        }
      }
    })
    
    // Update previous triggers map
    const newMap = new Map<number, { tradeAsset: string; isBuy: boolean; amount: string }>()
    allTriggers.forEach(t => {
      newMap.set(t.id, { tradeAsset: t.tradeAsset, isBuy: t.isBuy, amount: t.amount })
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
  
  // Convert prices to simple Record<string, number> for TokenModal
  const pricesMap = useMemo(() => {
    const p: Record<string, number> = {}
    Object.entries(prices).forEach(([symbol, data]) => {
      p[symbol] = data.price
    })
    return p
  }, [prices])
  
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
          prices={pricesMap}
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
                <th className="text-left px-4 py-2.5 font-medium">Size</th>
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
                      {parseFloat(trigger.amount).toFixed(4)}
                    </td>
                    
                    {/* Cancel */}
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancelTrigger(trigger.id) }}
                        disabled={cancellingId !== null}
                        className="w-14 text-destructive hover:text-destructive/80 text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center ml-auto"
                      >
                        {cancellingId === trigger.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Cancel'
                        )}
                      </button>
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
            />
          </div>
        </div>
        
        {/* Account Equity Card */}
        <div className="flex-1 bg-card border border-border rounded-xl p-3 space-y-2 overflow-y-auto">
          <div className="text-xs font-medium text-foreground">Account Equity</div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Spot Balance</span>
              <span className="text-xs font-medium text-foreground">
                {isLoadingBalances ? '—' : `$${totalSpotValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            {allTriggers.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">In Triggers</span>
                  <span className="text-xs text-muted-foreground">
                    −${totalCommittedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Available</span>
                  <span className="text-xs font-medium text-foreground">
                    ${Math.max(0, totalSpotValue - totalCommittedValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground line-through opacity-50">Perps</span>
              <span className="text-xs text-muted-foreground/50">$0.00</span>
            </div>
          </div>
          
          {/* Committed Breakdown */}
          {allTriggers.length > 0 && (
            <div className="pt-1.5 border-t border-border/30">
              <div className="text-[10px] text-muted-foreground/70 mb-1">Trigger Allocations</div>
              <div className="space-y-0.5">
                {committedToTriggers.usdc > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TokenIcon symbol="USDC" size="xs" />
                      <span className="text-[10px] text-muted-foreground/70">USDC</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                      {committedToTriggers.usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {Array.from(committedToTriggers.tokens.entries()).map(([symbol, amount]) => (
                  <div key={symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TokenIcon symbol={symbol} size="xs" />
                      <span className="text-[10px] text-muted-foreground/70">{getDisplayName(symbol)}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                      {amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2 border-t border-border/50">
            <div className="text-sm font-medium text-muted-foreground/50 mb-2">Perps Overview</div>
            <div className="space-y-1.5 text-muted-foreground/40">
              <div className="flex items-center justify-between">
                <span className="text-xs line-through">Balance</span>
                <span className="text-xs">$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Unrealized PNL</span>
                <span className="text-xs">$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs line-through">Cross Margin Ratio</span>
                <span className="text-xs text-primary/40">0.00%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs line-through">Maintenance Margin</span>
                <span className="text-xs">$0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs line-through">Cross Account Leverage</span>
                <span className="text-xs">0.00x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
