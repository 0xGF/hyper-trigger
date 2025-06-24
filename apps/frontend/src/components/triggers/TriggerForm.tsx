'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TokenIcon } from '@/components/ui/token-icon'
import { useAccount } from 'wagmi'
import { PriceChart } from './PriceChart'
import { motion } from 'framer-motion'
import { 
  Search, 
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react'
import { Logo } from '../logo'
import { TriggerInput } from '@/components/ui/trigger-input'
import { SwapInput } from '../ui/swap-input'
import { useMultipleTokenBalances } from '@/hooks/useTokenBalance'
import { useTriggerContract } from '@/hooks/useTriggerContract'
import { 
  DEFAULT_TOKENS, 
  TRADING_RULES,
  validateSwapPair,
  getSwapDirection,
  formatPrice,
  formatAmount,
} from './constants'

// 🎯 USE UNIFIED TOKEN SYSTEM - Single source of truth
import { 
  UnifiedToken,
  getToken,
  getTriggerableTokens,
  getTradableTokens,
  sortTokensByImportance,
  updateTokenPrices
} from '@/lib/tokens'

interface FormData {
  fromToken: string
  fromAmount: string
  toToken: string
  triggerToken: string
  triggerPrice: string
  slippageTolerance: string
  triggerCondition: '>' | '<'
}

// 🔧 MOVE MODAL OUTSIDE MAIN COMPONENT TO PREVENT RE-CREATION
const TokenModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  title, 
  modalType,
  searchTerm,
  onSearchChange,
  triggerableTokens,
  tradableTokens,
  prices
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (symbol: string) => void
  title: string
  modalType: 'from' | 'to' | 'trigger'
  searchTerm: string
  onSearchChange: (value: string) => void
  triggerableTokens: UnifiedToken[]
  tradableTokens: UnifiedToken[]
  prices: Record<string, number>
}) => {
  const handleTokenSelect = useCallback((symbol: string) => {
    onSelect(symbol)
    onClose()
    onSearchChange('') // Clear search when closing
  }, [onSelect, onClose, onSearchChange])

  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      onClose()
      onSearchChange('') // Clear search when closing
    }
  }, [onClose, onSearchChange])

  // Stable filtered tokens with proper memoization
  const filteredTokens = useMemo(() => {
    const baseTokens = modalType === 'trigger' ? triggerableTokens : tradableTokens
    
    if (!searchTerm.trim()) {
      return baseTokens
    }
    
    const searchLower = searchTerm.toLowerCase()
    return baseTokens.filter(token => {
      return token.symbol.toLowerCase().includes(searchLower) ||
             token.name.toLowerCase().includes(searchLower)
    })
  }, [modalType, triggerableTokens, tradableTokens, searchTerm])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {modalType === 'trigger' ? (
              'Core tokens available for price monitoring'
            ) : (
              'All active tokens can be traded with USDC routing'
            )}
          </p>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="max-h-80 overflow-y-auto space-y-1">
          {filteredTokens.length > 0 ? (
            filteredTokens.map((token) => (
              <button
                key={token.symbol}
                onClick={() => handleTokenSelect(token.symbol)}
                className="w-full p-3 text-left rounded-lg hover:bg-card transition-colors flex items-center gap-3"
              >
                <TokenIcon symbol={token.symbol} size="md" />
                <div className="flex-1">
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-muted-foreground text-sm">{token.name}</div>
                  <div className="text-xs text-green-400 capitalize">
                    {token.category} • {modalType === 'trigger' ? 'Triggerable' : 'Tradable'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ${token.price?.toFixed(2) || prices[token.symbol]?.toFixed(2) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Select
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No tokens found</div>
              <div className="text-xs">Try adjusting your search</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TriggerForm() {
  const { address, isConnected } = useAccount()
  
  // Contract integration
  const { 
    createTrigger, 
    isWritePending, 
    isConfirming, 
  } = useTriggerContract()
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    fromToken: DEFAULT_TOKENS.sell,
    fromAmount: '0.00',
    toToken: DEFAULT_TOKENS.buy,
    triggerToken: DEFAULT_TOKENS.trigger,
    triggerPrice: '0',
    slippageTolerance: TRADING_RULES.DEFAULT_SLIPPAGE,
    triggerCondition: '>'
  })

  // Modal states - keep them stable
  const [showToTokenModal, setShowToTokenModal] = useState(false)
  const [showFromTokenModal, setShowFromTokenModal] = useState(false)
  const [showTriggerTokenModal, setShowTriggerTokenModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Data states
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)
  const [initialPriceSet, setInitialPriceSet] = useState(false)
  const [liveCurrentPrice, setLiveCurrentPrice] = useState<number | undefined>(undefined)

  // 🎯 TOKEN LISTS - Stable memoization
  const triggerableTokens = useMemo(() => sortTokensByImportance(getTriggerableTokens()), [])
  const tradableTokens = useMemo(() => sortTokensByImportance(getTradableTokens()), [])

  // Get real user balances for all tokens
  const userBalances = useMultipleTokenBalances(
    address as `0x${string}` | undefined, 
    [formData.fromToken, formData.toToken, formData.triggerToken, 'HYPE', 'USDC']
  )

  // 🔄 PRICE FETCHING - Simplified using unified tokens
  const fetchCurrentPrices = useCallback(async () => {
    try {
      // Simple price fetch for core tokens only
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const priceData = await response.json()
      
      // Extract prices for our core tokens only
      const newPrices: Record<string, number> = { 'USDC': 1.0 } // USDC always $1
      
      triggerableTokens.forEach(token => {
        if (priceData[token.symbol]) {
          newPrices[token.symbol] = parseFloat(priceData[token.symbol])
        }
      })
      
      // Update prices in unified system
      updateTokenPrices(newPrices)
      setPrices(newPrices)
      
      console.log('✅ Prices updated:', Object.keys(newPrices))
      
    } catch (error) {
      console.error('❌ Failed to fetch prices:', error)
      setError('Failed to fetch price data. Please try again.')
    }
  }, [triggerableTokens])

  // Get user's actual balance from wallet
  const getUserBalance = useCallback((tokenSymbol: string): string => {
    if (!isConnected || !address) return '0.00'
    
    const tokenBalance = userBalances.balances[tokenSymbol]
    
    if (tokenBalance && !tokenBalance.isLoading && !tokenBalance.error) {
      return tokenBalance.formattedBalance
    }
    
    if (tokenBalance?.isLoading) return 'Loading...'
    if (tokenBalance?.error) return '0.00'
    
    return '0.00'
  }, [isConnected, address, userBalances])

  // Validate current swap pair and get direction
  const swapValidation = useMemo(() => {
    const isValid = validateSwapPair(formData.fromToken, formData.toToken)
    const direction = getSwapDirection(formData.fromToken, formData.toToken)
    
    let errorMessage = null
    if (!isValid) {
        errorMessage = 'Invalid token pair for trading'
    }
    
    return { isValid, direction, errorMessage }
  }, [formData.fromToken, formData.toToken])

  // Update swap error when validation changes
  useEffect(() => {
    setSwapError(swapValidation.errorMessage)
  }, [swapValidation.errorMessage])

  // 🚀 INITIALIZATION - Load prices on mount
  useEffect(() => {
    const initializePrices = async () => {
      try {
        setLoading(true)
        setError(null)
        await fetchCurrentPrices()
      } catch (error) {
        console.error('❌ Failed to initialize:', error)
        setError('Failed to load market data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    initializePrices()
  }, [fetchCurrentPrices])

  // Set initial trigger price only once when prices first load
  useEffect(() => {
    if (Object.keys(prices).length > 0 && !initialPriceSet) {
      const triggerTokenPrice = prices[formData.triggerToken]
      if (triggerTokenPrice && triggerTokenPrice > 0) {
        const currentPrice = formatPrice(triggerTokenPrice)
        setFormData(prev => ({ ...prev, triggerPrice: currentPrice }))
        setInitialPriceSet(true)
      }
    }
  }, [prices, initialPriceSet, formData.triggerToken])

  // Update prices every 5 seconds
  useEffect(() => {
    if (!loading) {
      const interval = setInterval(fetchCurrentPrices, 5000)
      return () => clearInterval(interval)
    }
  }, [loading, fetchCurrentPrices])

  // 🎯 TOKEN SELECTIONS - Using unified system
  const selectedFromToken = useMemo(() => 
    getToken(formData.fromToken),
    [formData.fromToken]
  )
  
  const selectedToToken = useMemo(() => 
    getToken(formData.toToken),
    [formData.toToken]
  )
  
  const selectedTriggerToken = useMemo(() => 
    getToken(formData.triggerToken) || getToken('BTC')!,
    [formData.triggerToken]
  )

  // Auto-determine condition based on trigger price vs current price
  const autoCondition = useMemo(() => {
    const triggerPrice = parseFloat(formData.triggerPrice)
    const currentPrice = selectedTriggerToken ? prices[selectedTriggerToken.symbol] : 0
    
    if (!triggerPrice || !currentPrice || triggerPrice === currentPrice) {
      return '>' // Default to above
    }
    
    return triggerPrice > currentPrice ? '>' : '<'
  }, [formData.triggerPrice, selectedTriggerToken, prices])

  // Enhanced swap calculation
  const estimatedOutput = useMemo(() => {
    const fromAmount = parseFloat(formData.fromAmount)
    const fromPrice = prices[formData.fromToken]
    const toPrice = prices[formData.toToken]
    
    // Validate inputs
    if (!fromAmount || fromAmount <= 0) return '0.00'
    if (!fromPrice || fromPrice <= 0) return '0.00'
    if (!toPrice || toPrice <= 0) return '0.00'
    if (!swapValidation.isValid) return '0.00'
    
    try {
      // Calculate USD value with high precision
      const usdValue = fromAmount * fromPrice
      
      // Validate minimum swap amount
      if (usdValue < TRADING_RULES.MIN_SWAP_AMOUNT) {
        return '0.00'
      }
      
      // Calculate output amount with slippage
      const slippageMultiplier = 1 - (parseFloat(formData.slippageTolerance) / 100)
      const outputAmount = (usdValue / toPrice) * slippageMultiplier
      
      // Format with appropriate precision
      return formatAmount(outputAmount)
    } catch (error) {
      console.error('Error calculating swap output:', error)
      return '0.00'
    }
  }, [
    formData.fromAmount, 
    formData.fromToken, 
    formData.toToken, 
    formData.slippageTolerance, 
    prices, 
    swapValidation.isValid
  ])

  // USD value calculations
  const usdValueInput = useMemo(() => {
    const fromAmount = parseFloat(formData.fromAmount)
    const fromPrice = prices[formData.fromToken]
    
    if (!fromAmount || fromAmount <= 0 || !fromPrice || fromPrice <= 0) {
      return '$0.00'
    }
    
    const usdValue = fromAmount * fromPrice
    return `$${usdValue.toFixed(2)}`
  }, [formData.fromAmount, formData.fromToken, prices])

  const usdValueOutput = useMemo(() => {
    const estimatedOutputNum = parseFloat(estimatedOutput.replace(/[^\d.-]/g, ''))
    const toPrice = prices[formData.toToken]
    
    if (!estimatedOutputNum || estimatedOutputNum <= 0 || !toPrice || toPrice <= 0) {
      return '$0.00'
    }
    
    const usdValue = estimatedOutputNum * toPrice
    return `$${usdValue.toFixed(2)}`
  }, [estimatedOutput, formData.toToken, prices])

  // Update form data helper
  const updateFormData = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Handle swap
  const handleSwap = useCallback(() => {
    if (!swapValidation.isValid) {
      console.warn('Cannot swap invalid pair:', formData.fromToken, '→', formData.toToken)
      return
    }

    const newFromToken = formData.toToken
    const newToToken = formData.fromToken
    const newFromAmount = estimatedOutput || '0.00'
    
    const newPairValid = validateSwapPair(newFromToken, newToToken)
    if (!newPairValid) {
      console.warn('Swap would create invalid pair:', newFromToken, '→', newToToken)
      return
    }
    
    setFormData(prev => ({
      ...prev,
      fromToken: newFromToken,
      toToken: newToToken,
      fromAmount: newFromAmount
    }))
  }, [swapValidation, formData, estimatedOutput])

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!swapValidation.isValid) {
      console.warn('Cannot submit: Invalid swap pair')
      return
    }

    if (!formData.fromAmount || parseFloat(formData.fromAmount) <= 0) {
      console.warn('Cannot submit: Invalid amount')
      return
    }

    if (!formData.triggerPrice || parseFloat(formData.triggerPrice) <= 0) {
      console.warn('Cannot submit: Invalid trigger price')
      return
    }

    if (!isConnected) {
      console.warn('Cannot submit: Wallet not connected')
      return
    }

    try {
      console.log('🚀 Creating trigger...')
      
      const triggerParams = {
        targetToken: formData.toToken,        // Target token to buy
        triggerToken: formData.triggerToken,  // Token to monitor for price
        usdcAmount: formData.fromAmount,      // Amount of USDC to swap
        triggerPrice: parseFloat(formData.triggerPrice),
        isAbove: autoCondition === '>',
        slippagePercent: parseFloat(formData.slippageTolerance)
      }

      console.log('📊 Trigger Parameters:', triggerParams)
      await createTrigger(triggerParams)
      
    } catch (error) {
      console.error('❌ Failed to create trigger:', error)
    }
  }, [swapValidation, formData, autoCondition, isConnected, createTrigger])

  // Token selection handlers - stable callbacks
  const handleTokenSelect = useCallback((symbol: string, type: 'from' | 'to') => {
    if (type === 'from') {
      updateFormData('fromToken', symbol)
    } else {
      updateFormData('toToken', symbol)
    }
  }, [updateFormData])

  const handleTriggerTokenSelect = useCallback((symbol: string) => {
    updateFormData('triggerToken', symbol)
    
    setLiveCurrentPrice(undefined)
    
    const currentPrice = prices[symbol]
    if (currentPrice && currentPrice > 0) {
      const formattedPrice = formatPrice(currentPrice)
      updateFormData('triggerPrice', formattedPrice)
    }
    setInitialPriceSet(false)
  }, [prices, updateFormData])

  const handleTriggerPriceReset = useCallback((newPrice: number) => {
    const formattedPrice = formatPrice(newPrice)
    updateFormData('triggerPrice', formattedPrice)
  }, [updateFormData])

  // Stable modal handlers
  const handleCloseToTokenModal = useCallback(() => setShowToTokenModal(false), [])
  const handleCloseFromTokenModal = useCallback(() => setShowFromTokenModal(false), [])
  const handleCloseTriggerTokenModal = useCallback(() => setShowTriggerTokenModal(false), [])

  // Loading states
  if (loading) {
    return (
      <motion.div 
        className="bg-background text-foreground flex flex-col overflow-hidden" 
        style={{ height: 'calc(100vh - 4rem)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-muted-foreground">Loading market data...</div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Data
        </Button>
      </div>
    )
  }

  return (
    <motion.div 
      className="bg-background text-foreground flex flex-col overflow-hidden" 
      style={{ height: 'calc(100vh - 4rem)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chart + Your Triggers (75% width) */}
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden" 
          style={{ width: '75%' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Chart */}
          <motion.div 
            className="flex-1 overflow-hidden" 
            style={{ height: 'calc(70vh - 4rem)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
              <PriceChart 
                symbol={selectedTriggerToken?.symbol || 'BTC'} 
                triggerPrice={parseFloat(formData.triggerPrice) || undefined}
                onTriggerPriceChange={handleTriggerPriceReset}
                onCurrentPriceChange={setLiveCurrentPrice}
                activeTriggers={[]}
                onCancelTrigger={() => {}}
              />
          </motion.div>

          {/* Your Triggers Section */}
          <motion.div 
            className="border-t border-border bg-background flex flex-col" 
            style={{ height: 'calc(30vh - 2rem)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <span>Your Triggers (0)</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {isConnected ? 'Active' : 'Connect Wallet'}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Logo/>
                  <div className="text-sm font-medium mb-1">No triggers yet</div>
                  <div className="text-xs">Create your first trigger to get started</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Panel - Create Trigger Form (25% width) */}
        <motion.div 
          className="bg-background border-l border-border flex flex-col overflow-hidden" 
          style={{ width: '25%' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="px-6 py-4 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-muted-foreground">Create Trigger</h3>
              <Badge variant="outline" className="capitalize">
                {swapValidation.direction === 'buy' ? 'Buy' : swapValidation.direction === 'sell' ? 'Sell' : 'Swap'} 
                <ArrowUpDown className="h-3 w-3 inline ml-1" />
              </Badge>
            </div>
          
            <form onSubmit={handleSubmit}>
              {/* Trigger Condition */}
              <div className='mb-12 space-y-2'>
                <span className='text-xs pl-2 block text-muted-foreground'>Trigger</span>
                <TriggerInput
                  selectedToken={selectedTriggerToken ? {
                    symbol: selectedTriggerToken.symbol,
                    name: selectedTriggerToken.name
                  } : undefined}
                  onTokenSelect={() => setShowTriggerTokenModal(true)}
                  triggerPrice={formData.triggerPrice}
                  onPriceChange={(value) => updateFormData('triggerPrice', value)}
                  currentPrice={liveCurrentPrice || (selectedTriggerToken ? prices[selectedTriggerToken.symbol] : undefined)}
                  condition={autoCondition}
                  onConditionChange={() => {}}
                  focusColor='orange'
                />
              </div>

              {/* Swap Configuration */}
              <div className='space-y-2'>
                <span className='text-xs pl-2 block text-muted-foreground'>
                  Swap {swapError && <span className="text-destructive">• {swapError}</span>}
                </span>
                <div className="flex flex-col pb-4 bg-background relative space-y-1.5">
                  {/* Sell/From Input */}
                  <SwapInput
                    label="Sell"
                    value={formData.fromAmount}
                    onValueChange={(value) => updateFormData('fromAmount', value)}
                    selectedToken={selectedFromToken ? {
                      symbol: selectedFromToken.symbol,
                      name: selectedFromToken.name
                    } : undefined}
                    onTokenSelect={() => setShowFromTokenModal(true)}
                    balance={`${getUserBalance(formData.fromToken)} ${formData.fromToken}`}
                    usdValue={usdValueInput}
                    showMax={true}
                    onMaxClick={() => {
                      const balance = getUserBalance(formData.fromToken).replace(/,/g, '')
                      updateFormData('fromAmount', balance)
                    }}
                  />
                  
                  {/* Swap Arrow */}
                  <div className="flex justify-center z-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <motion.div 
                      className={`w-12 h-12 bg-background border border-border mb-[60px] rounded-full flex items-center justify-center cursor-pointer ${
                        !swapValidation.isValid ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                      }`}
                      whileHover={swapValidation.isValid ? { scale: 1.1, rotate: 180 } : {}}
                      whileTap={swapValidation.isValid ? { scale: 0.9 } : {}}
                      transition={{ duration: 0.3 }}
                      onClick={swapValidation.isValid ? handleSwap : undefined}
                    >
                      <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </div>

                  {/* Buy/To Input with Slippage */}
                  <div className="flex flex-col bg-[#1c1d1e] border rounded-2xl items-center justify-between">
                     <div className="m-[-1px]">
                      <SwapInput
                        label="Buy"
                        value={estimatedOutput}
                        onValueChange={() => {}}
                        selectedToken={selectedToToken ? {
                          symbol: selectedToToken.symbol,
                          name: selectedToToken.name
                        } : undefined}
                        onTokenSelect={() => setShowToTokenModal(true)}
                        usdValue={usdValueOutput}
                        placeholder="0"
                        disabled={true}
                      />
                     </div>
                     <div className="flex items-center justify-between py-2 px-4 w-full">
                        <span className="text-sm text-muted-foreground">Slippage</span>
                        <div className="flex gap-1">
                          {TRADING_RULES.SLIPPAGE_OPTIONS.map((value) => (
                            <motion.button
                              key={value}
                              type="button"
                              onClick={() => updateFormData('slippageTolerance', value)}
                              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                                formData.slippageTolerance === value 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {value}%
                            </motion.button>
                          ))}
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-colors"
                  disabled={
                    !isConnected || 
                    !swapValidation.isValid ||
                    !formData.fromToken || 
                    !formData.toToken || 
                    !formData.triggerToken || 
                    !formData.triggerPrice || 
                    !formData.fromAmount ||
                    parseFloat(formData.fromAmount) <= 0 ||
                    isWritePending ||
                    isConfirming
                  }
                >
                  {!isConnected 
                    ? 'Connect Wallet' 
                    : !swapValidation.isValid 
                    ? 'Invalid Pair' 
                    : isWritePending
                    ? 'Confirm in Wallet...'
                    : isConfirming
                    ? 'Creating Trigger...'
                    : 'Create Trigger'
                  }
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Token Selection Modals - Now stable and outside main component */}
      <TokenModal
        isOpen={showToTokenModal}
        onClose={handleCloseToTokenModal}
        onSelect={(symbol) => handleTokenSelect(symbol, 'to')}
        title="Select token to buy"
        modalType="to"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        triggerableTokens={triggerableTokens}
        tradableTokens={tradableTokens}
        prices={prices}
      />
      
      <TokenModal
        isOpen={showFromTokenModal}
        onClose={handleCloseFromTokenModal}
        onSelect={(symbol) => handleTokenSelect(symbol, 'from')}
        title="Select token to sell"
        modalType="from"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        triggerableTokens={triggerableTokens}
        tradableTokens={tradableTokens}
        prices={prices}
      />
      
      <TokenModal
        isOpen={showTriggerTokenModal}
        onClose={handleCloseTriggerTokenModal}
        onSelect={handleTriggerTokenSelect}
        title="Select trigger token"
        modalType="trigger"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        triggerableTokens={triggerableTokens}
        tradableTokens={tradableTokens}
        prices={prices}
      />
    </motion.div>
  )
} 