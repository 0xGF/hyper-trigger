'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ChevronRight, ArrowDown, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react'
import { TokenIcon } from '@/components/ui/token-icon'
import { TokenModal } from '@/components/ui/token-select'
import { useTriggerContract } from '@/hooks/useTriggerContract'
import { useAgentAuth } from '@/hooks/useAgentAuth'
import { usePriceContext } from '@/contexts/PriceContext'
import { toast } from 'sonner'
import { formatErrorMessage, isUserRejection } from '@/lib/errors'
import { 
  getTriggerableTokens,
  getTradableTokens,
  sortTokensByImportance,
} from '@/lib/tokens'

interface SpotBalance {
  symbol: string
  total: string
  available: string
}

interface TriggerBuilderProps {
  watchToken?: string
  onWatchTokenChange?: (token: string) => void
  onTriggerCreated?: () => void
  spotBalances?: SpotBalance[]
  isLoadingBalances?: boolean
}

interface TriggerState {
  targetPrice: string
  condition: 'above' | 'below'
  sellToken: string
  sellAmount: string
  buyToken: string
  slippage: string
}

export function TriggerBuilder({ 
  watchToken: externalWatchToken, 
  onWatchTokenChange, 
  onTriggerCreated,
  spotBalances = [],
  isLoadingBalances = false,
}: TriggerBuilderProps) {
  const { isConnected } = useAccount()
  const { createTrigger, isWritePending, isConfirming, error } = useTriggerContract()
  const { 
    isAuthorized,
    isFullyEnabled,
    isPending: isAuthPending, 
    enableTrading,
    isWalletReady,
    hasExistingAgent,
    existingAgents,
    revokeAgentByAddress 
  } = useAgentAuth()
  
  // Use centralized price context - single source of truth
  const { prices: priceData, getPrice } = usePriceContext()
  
  // Convert price context data to simple Record<string, number> for compatibility
  const prices = useMemo(() => {
    const p: Record<string, number> = {}
    Object.entries(priceData).forEach(([symbol, data]) => {
      p[symbol] = data.price
    })
    return p
  }, [priceData])
  
  // Convert spot balances to Record<string, string> for TokenModal
  const balancesMap = useMemo(() => {
    const b: Record<string, string> = {}
    spotBalances.forEach(bal => {
      b[bal.symbol] = bal.total
    })
    return b
  }, [spotBalances])
  
  const triggerableTokens = useMemo(() => sortTokensByImportance(getTriggerableTokens()), [])
  const tradableTokens = useMemo(() => sortTokensByImportance(getTradableTokens()), [])
  
  const [internalWatchToken, setInternalWatchToken] = useState('HYPE')
  const [state, setState] = useState<TriggerState>({
    targetPrice: '',
    condition: 'above',
    sellToken: 'USDC',
    sellAmount: '',
    buyToken: 'HYPE',
    slippage: '1'
  })
  const [activeModal, setActiveModal] = useState<'watch' | 'token' | null>(null)
  const [editingSide, setEditingSide] = useState<'sell' | 'buy'>('buy')
  
  // Use external watch token if provided, otherwise use internal
  const watchToken = externalWatchToken ?? internalWatchToken
  const setWatchToken = (token: string) => {
    if (onWatchTokenChange) {
      onWatchTokenChange(token)
    } else {
      setInternalWatchToken(token)
    }
  }
  
  // Set initial target price when price loads
  useEffect(() => {
    const price = getPrice(watchToken)
    if (price && !state.targetPrice) {
      setState(s => ({ ...s, targetPrice: price.toFixed(2) }))
    }
  }, [watchToken, getPrice, state.targetPrice])
  
  // Show errors as toast
  useEffect(() => {
    if (error && !isUserRejection(error)) {
      toast.error(formatErrorMessage(error))
    }
  }, [error])

  const currentPrice = getPrice(watchToken)
  
  // User controls condition (above/below) directly - no auto-switching
  const selectedCondition = state.condition
  
  const tradeToken = state.sellToken === 'USDC' ? state.buyToken : state.sellToken
  const isBuying = state.sellToken === 'USDC'
  
  const estimatedOutput = useMemo(() => {
    const amount = parseFloat(state.sellAmount) || 0
    if (!amount) return ''
    const sellPrice = prices[state.sellToken] || 0
    const buyPrice = prices[state.buyToken] || 0
    if (!sellPrice || !buyPrice) return ''
    const usdValue = amount * sellPrice
    const output = usdValue / buyPrice
    const slipMult = 1 - (parseFloat(state.slippage) / 100)
    return (output * slipMult).toFixed(4)
  }, [state.sellAmount, state.sellToken, state.buyToken, state.slippage, prices])
  
  const MIN_ORDER_VALUE = 12 // Hyperliquid minimum + buffer for rounding
  
  const usdValue = useMemo(() => {
    const amount = parseFloat(state.sellAmount) || 0
    const price = prices[state.sellToken] || 0
    return (amount * price).toFixed(2)
  }, [state.sellAmount, state.sellToken, prices])
  
  const orderValueNum = parseFloat(usdValue) || 0
  const isBelowMinimum = orderValueNum > 0 && orderValueNum < MIN_ORDER_VALUE

  const handleSubmit = async () => {
    if (!isConnected) return
    
    // If there's an existing agent (not ours), revoke it first
    if (hasExistingAgent && existingAgents.length > 0) {
      const success = await revokeAgentByAddress(existingAgents[0])
      if (success) {
        // After revoking, enable trading (authorize agent + approve builder fee)
        await enableTrading()
      }
      return
    }
    
    // If not fully enabled (agent + builder), do the combined enableTrading flow
    if (!isFullyEnabled) {
      await enableTrading()
      return
    }
    try {
      await createTrigger({
        watchAsset: watchToken,
        targetPrice: parseFloat(state.targetPrice),
        isAbove: selectedCondition === 'above',
        tradeAsset: tradeToken,
        isBuy: isBuying,
        amount: state.sellAmount,
        slippagePercent: parseFloat(state.slippage),
        durationHours: 24
      })
      toast.success('Trigger created! Waiting for confirmation...')
      // Call callback to refetch triggers multiple times as chain confirms
      if (onTriggerCreated) {
        setTimeout(onTriggerCreated, 500)
        setTimeout(onTriggerCreated, 2000)
        setTimeout(onTriggerCreated, 4000)
        setTimeout(onTriggerCreated, 6000)
      }
      // Reset form
      setState(s => ({ ...s, sellAmount: '', targetPrice: '' }))
    } catch (e) {
      if (!isUserRejection(e)) {
        toast.error(formatErrorMessage(e))
      }
    }
  }

  const isLoading = isWritePending || isConfirming || isAuthPending
  const isValid = state.sellAmount && state.targetPrice && parseFloat(state.sellAmount) > 0 && parseFloat(state.targetPrice) > 0 && !isBelowMinimum
  
  // Button should be enabled for authorization even without form being valid
  const isButtonDisabled = isLoading || (isFullyEnabled && !isValid)

  const swapTokens = () => {
    setState(s => ({
      ...s,
      sellToken: s.buyToken,
      buyToken: s.sellToken,
      sellAmount: estimatedOutput || ''
    }))
  }

  const openTokenSelector = (side: 'sell' | 'buy') => {
    setEditingSide(side)
    setActiveModal('token')
  }

  const handleTokenSelect = (symbol: string) => {
    if (editingSide === 'sell') {
      setState(s => ({ ...s, sellToken: symbol, buyToken: 'USDC' }))
    } else {
      setState(s => ({ ...s, sellToken: 'USDC', buyToken: symbol }))
    }
  }

  const handleWatchTokenSelect = (symbol: string) => {
    setWatchToken(symbol)
    setState(s => ({ ...s, targetPrice: '' }))
  }
  
  // Get display name for token (strip U prefix for synthetic tokens)
  const getDisplayName = (symbol: string) => {
    if (symbol.startsWith('U') && symbol !== 'USDC') {
      return symbol.slice(1)
    }
    return symbol
  }
  
  // Get HyperCore spot balance for a token
  const getSpotBalance = (symbol: string) => {
    const displaySymbol = getDisplayName(symbol)
    const balance = spotBalances.find(b => b.symbol === displaySymbol || b.symbol === symbol)
    return balance?.available || '0'
  }

  return (
    <div className="w-full flex flex-col">
      {/* Main Card */}
      <div className="overflow-hidden p-3 space-y-2">
        
        {/* When Container */}
        <div className="bg-secondary border border-muted rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">When</span>
            <div className="text-xs text-muted-foreground">
              Now: ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => setActiveModal('watch')}
              className="flex items-center gap-1.5 h-8 px-2.5 bg-muted hover:bg-accent rounded-lg transition-colors shrink-0"
            >
              <TokenIcon symbol={watchToken} size="sm" />
              <span className="font-medium text-foreground text-sm">{getDisplayName(watchToken)}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            
            <span className="text-muted-foreground text-xs shrink-0">is</span>
            
            <div className="flex items-center flex-1 bg-muted rounded-lg overflow-hidden">
              <button
                onClick={() => setState(s => ({ ...s, condition: 'above' }))}
                className="flex-1 flex items-center justify-center gap-1 h-8 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: selectedCondition === 'above' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                  color: selectedCondition === 'above' ? '#4ade80' : 'var(--muted-foreground)'
                }}
              >
                <TrendingUp className="w-3 h-3" />
                above
              </button>
              <button
                onClick={() => setState(s => ({ ...s, condition: 'below' }))}
                className="flex-1 flex items-center justify-center gap-1 h-8 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: selectedCondition === 'below' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: selectedCondition === 'below' ? 'var(--destructive)' : 'var(--muted-foreground)'
                }}
              >
                <TrendingDown className="w-3 h-3" />
                below
              </button>
            </div>
          </div>
          
          {/* Target Price */}
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">$</span>
            <input
              type="text"
              value={state.targetPrice}
              onChange={e => setState(s => ({ ...s, targetPrice: e.target.value }))}
              placeholder="0.00"
              className="w-full h-10 pl-5 pr-3 bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>
        </div>
        
        {/* Sell Container */}
        <div className="bg-secondary border border-muted rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Sell</span>
            <div className="flex items-center gap-1.5 text-xs">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {isLoadingBalances ? '...' : parseFloat(getSpotBalance(state.sellToken)).toFixed(2)}
              </span>
              <button 
                onClick={() => {
                  const bal = parseFloat(getSpotBalance(state.sellToken))
                  if (bal > 0) setState(s => ({ ...s, sellAmount: (bal / 2).toString() }))
                }}
                className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded text-xs"
              >
                50%
              </button>
              <button 
                onClick={() => {
                  const bal = getSpotBalance(state.sellToken)
                  if (parseFloat(bal) > 0) setState(s => ({ ...s, sellAmount: bal }))
                }}
                className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded text-xs"
              >
                Max
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => openTokenSelector('sell')}
              className="flex items-center gap-1.5 h-9 px-2.5 bg-muted hover:bg-accent rounded-lg transition-colors shrink-0"
            >
              <TokenIcon symbol={state.sellToken} size="sm" />
              <span className="font-medium text-foreground text-sm">{getDisplayName(state.sellToken)}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <div className="flex-1 text-right">
              <input
                type="text"
                value={state.sellAmount}
                onChange={e => setState(s => ({ ...s, sellAmount: e.target.value }))}
                placeholder="0"
                className="w-full text-right text-2xl font-semibold bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <div className={`text-xs ${isBelowMinimum ? 'text-destructive' : 'text-muted-foreground'}`}>
                ${usdValue}
                {isBelowMinimum && <span className="ml-1">(min $12)</span>}
              </div>
            </div>
          </div>
        </div>
        
        {/* Swap Arrow */}
        <div className="relative h-0 z-10">
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2">
            <button 
              onClick={swapTokens}
              className="w-8 h-8 bg-card border border-muted rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Buy Container */}
        <div className="bg-secondary border border-muted rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Buy</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="w-3 h-3" />
              <span>{isLoadingBalances ? '...' : parseFloat(getSpotBalance(state.buyToken)).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => openTokenSelector('buy')}
              className="flex items-center gap-1.5 h-9 px-2.5 bg-muted hover:bg-accent rounded-lg transition-colors shrink-0"
            >
              <TokenIcon symbol={state.buyToken} size="sm" />
              <span className="font-medium text-foreground text-sm">{getDisplayName(state.buyToken)}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <div className="flex-1 text-right">
              <input
                type="text"
                value={estimatedOutput}
                readOnly
                placeholder="0"
                className="w-full text-right text-2xl font-semibold bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <div className="text-xs text-muted-foreground">
                ${prices[state.buyToken] ? (parseFloat(estimatedOutput || '0') * prices[state.buyToken]).toFixed(2) : '0'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Show existing agent warning */}
        {hasExistingAgent && !isFullyEnabled && (
          <div className="p-2 bg-amber-500/10 border text-center border-amber-500/20 rounded-lg text-xs text-amber-500">
            ⚠️ Another agent authorized. Click below to revoke and enable trading.
          </div>
        )}
      </div>
      
      {/* Submit Button */}
      <div className="px-3 pb-3 shrink-0">
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }: { openConnectModal: () => void }) => (
              <button
                onClick={openConnectModal}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors"
              >
                CONNECT WALLET
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isButtonDisabled || (!isFullyEnabled && !isWalletReady && !hasExistingAgent)}
            className="w-full border border-muted border-0.5 h-12 bg-primary hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground font-bold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : hasExistingAgent && !isFullyEnabled ? (
              'REVOKE OLD & ENABLE TRADING'
            ) : !isFullyEnabled ? (
              !isWalletReady ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ENABLE TRADING'
            ) : (
              'CREATE TRIGGER'
            )}
          </button>
        )}
      </div>
     
      {/* Modals */}
      <TokenModal
        isOpen={activeModal === 'watch'}
        onClose={() => setActiveModal(null)}
        onSelect={handleWatchTokenSelect}
        tokens={triggerableTokens}
        balances={balancesMap}
        title="Select Watch Token"
        excludeToken="USDC"
      />
      
      <TokenModal
        isOpen={activeModal === 'token'}
        onClose={() => setActiveModal(null)}
        onSelect={handleTokenSelect}
        tokens={tradableTokens}
        balances={balancesMap}
        title="Select Token"
      />
    </div>
  )
}
