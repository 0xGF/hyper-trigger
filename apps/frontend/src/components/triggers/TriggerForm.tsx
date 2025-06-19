'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { TokenIcon } from '@/components/ui/token-icon'
import { useAccount } from 'wagmi'
import { getAllHyperliquidAssets, getCurrentPrices, getSpotAssetsOnly, OnChainToken } from '@/lib/hyperliquid'
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
import { 
  ALLOWED_ASSETS, 
  MAJOR_TOKENS, 
  DEFAULT_TOKENS, 
  STABLECOINS,
  TRADING_RULES,
  validateSwapPair,
  getSwapDirection,
  formatPrice,
  formatAmount,
  isStablecoin,
  type SwapDirection
} from './constants'

interface FormData {
  fromToken: string
  fromAmount: string
  toToken: string
  triggerToken: string
  triggerPrice: string
  slippageTolerance: string
  triggerCondition: '>' | '<'
}

interface UserTrigger {
  id: string
  baseToken: string
  targetToken: string
  triggerPrice: number
  currentPrice: number
  action: 'buy' | 'sell'
  amount: number
  status: 'active' | 'triggered' | 'cancelled'
  createdAt: Date
  condition: '>' | '<' | '>=' | '<='
}

export function TriggerForm() {
  const { address, isConnected } = useAccount()
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
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

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  }

  const chartVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }

  const formVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }
  
  const [formData, setFormData] = useState<FormData>({
    fromToken: DEFAULT_TOKENS.sell,
    fromAmount: '0.00',
    toToken: DEFAULT_TOKENS.buy,
    triggerToken: DEFAULT_TOKENS.trigger,
    triggerPrice: '0',
    slippageTolerance: TRADING_RULES.DEFAULT_SLIPPAGE,
    triggerCondition: '>'
  })

  const [showToTokenModal, setShowToTokenModal] = useState(false)
  const [showFromTokenModal, setShowFromTokenModal] = useState(false)
  const [showTriggerTokenModal, setShowTriggerTokenModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [availableTokens, setAvailableTokens] = useState<OnChainToken[]>([])
  const [spotTokens, setSpotTokens] = useState<OnChainToken[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)
  const [initialPriceSet, setInitialPriceSet] = useState(false)
  
  // Real user triggers data - empty for now since no backend
  const [userTriggers] = useState<UserTrigger[]>([])

  // Validate current swap pair and get direction
  const swapValidation = useMemo(() => {
    const isValid = validateSwapPair(formData.fromToken, formData.toToken)
    const direction = getSwapDirection(formData.fromToken, formData.toToken)
    
    let errorMessage = null
    if (!isValid) {
      if (formData.fromToken !== 'USDC' && formData.toToken !== 'USDC') {
        errorMessage = 'One token must be USDC (base currency)'
      } else {
        errorMessage = 'Invalid token pair for trading'
      }
    }
    
    return { isValid, direction, errorMessage }
  }, [formData.fromToken, formData.toToken])

  // Update swap error when validation changes
  useEffect(() => {
    setSwapError(swapValidation.errorMessage)
  }, [swapValidation.errorMessage])

  // Load tokens and prices on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch all tokens and spot tokens in parallel
        const [allTokens, spotAssets] = await Promise.all([
          getAllHyperliquidAssets(),
          getSpotAssetsOnly()
        ])
        
        // For trigger monitoring: limited allowlist from all available tokens
        const triggerTokens = [...spotAssets, ...allTokens].filter(token => 
          !token.isDelisted && 
          ALLOWED_ASSETS.trigger.includes(token.symbol as any)
        )

        // For trading: ONLY spot assets with allowlist filtering (no perps for trading)
        const allowedSpotTokens = spotAssets.filter(token => 
          !token.isDelisted && 
          ALLOWED_ASSETS.spot.includes(token.symbol as any)
        )
        
        // Remove duplicates from trigger tokens (prioritize spot over perp)
        const uniqueTriggerTokens = triggerTokens.reduce((acc, token) => {
          const existing = acc.find(t => t.symbol === token.symbol)
          if (!existing) {
            acc.push(token)
          } else if (token.type === 'spot' && existing.type === 'perp') {
            // Replace perp with spot version
            const index = acc.indexOf(existing)
            acc[index] = token
          }
          return acc
        }, [] as OnChainToken[])

        // Spot tokens don't need deduplication since we only fetch from spotAssets
        const uniqueSpotTokens = allowedSpotTokens
        
        // Sort tokens by importance (major tokens first, then alphabetically)
        const sortTokens = (tokens: OnChainToken[]) => {
          return tokens.sort((a, b) => {
            // Prioritize major tokens first
            const aIndex = MAJOR_TOKENS.indexOf(a.symbol as any)
            const bIndex = MAJOR_TOKENS.indexOf(b.symbol as any)
            
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
            if (aIndex !== -1) return -1
            if (bIndex !== -1) return 1
            
            // Then sort alphabetically
            return a.symbol.localeCompare(b.symbol)
          })
        }
        
        setAvailableTokens(sortTokens(uniqueTriggerTokens))
        setSpotTokens(sortTokens(uniqueSpotTokens))
        
        // Fetch initial prices
        await updatePrices()
        
      } catch (error) {
        console.error('❌ Failed to fetch market data:', error)
        setError('Failed to load market data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Separate function to update prices without reloading tokens
  const updatePrices = useCallback(async () => {
    try {
      const priceData = await getCurrentPrices()
      
      // Add stablecoins at $1.00 since they're not in the price feed
      const pricesWithStables: Record<string, number> = {
        ...priceData
      }
      
      // Add all stablecoins at $1.00
      STABLECOINS.forEach(stablecoin => {
        pricesWithStables[stablecoin] = 1.0
      })
      
      setPrices(pricesWithStables)
      
      // Set initial trigger price to current price when first loading or when trigger token changes
      const triggerTokenPrice = pricesWithStables[formData.triggerToken]
      if (triggerTokenPrice && (!initialPriceSet || formData.triggerPrice === '0')) {
        const currentPrice = formatPrice(triggerTokenPrice)
        setFormData(prev => ({ ...prev, triggerPrice: currentPrice }))
        setInitialPriceSet(true)
      }
    } catch (error) {
      console.error('❌ Failed to update prices:', error)
    }
  }, [formData.triggerToken, formData.triggerPrice, initialPriceSet])

  // Update prices every 5 seconds for more frequent current price updates
  useEffect(() => {
    if (availableTokens.length > 0) {
      // Initial price update
      updatePrices()
      
      // Set up interval for regular updates
      const interval = setInterval(updatePrices, 5000) // Reduced from 10s to 5s
      return () => clearInterval(interval)
    }
  }, [availableTokens.length, updatePrices]) // Added updatePrices dependency

  // Enhanced swap function with USDC pairing validation
  const handleSwap = () => {
    // Validate current pair before swapping
    if (!swapValidation.isValid) {
      console.warn('Cannot swap invalid pair:', formData.fromToken, '→', formData.toToken)
      return
    }

    const newFromToken = formData.toToken
    const newToToken = formData.fromToken
    const newFromAmount = estimatedOutput || '0.00'
    
    // Validate the new pair after swap
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
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Final validation before submission
    if (!swapValidation.isValid) {
      console.error('Cannot submit invalid swap pair')
      return
    }
    
    // TODO: Implement contract interaction
    console.log('Creating trigger with validated swap pair:', {
      direction: swapValidation.direction,
      fromToken: formData.fromToken,
      toToken: formData.toToken,
      amount: formData.fromAmount,
      triggerToken: formData.triggerToken,
      triggerPrice: formData.triggerPrice
    })
  }

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Enhanced token selection with USDC pairing enforcement
  const handleTokenSelect = (symbol: string, type: 'from' | 'to') => {
    if (type === 'from') {
      // If selecting a non-USDC token as FROM, ensure TO is USDC
      if (symbol !== 'USDC' && formData.toToken !== 'USDC') {
        setFormData(prev => ({ 
          ...prev, 
          fromToken: symbol,
          toToken: 'USDC' // Force USDC pairing
        }))
      } else {
        updateFormData('fromToken', symbol)
      }
    } else {
      // If selecting a non-USDC token as TO, ensure FROM is USDC
      if (symbol !== 'USDC' && formData.fromToken !== 'USDC') {
        setFormData(prev => ({ 
          ...prev, 
          toToken: symbol,
          fromToken: 'USDC' // Force USDC pairing
        }))
      } else {
        updateFormData('toToken', symbol)
      }
    }
  }

  // Custom handler for trigger token selection with auto-price update
  const handleTriggerTokenSelect = (symbol: string) => {
    updateFormData('triggerToken', symbol)
    
    // Auto-set trigger price to current price when changing trigger token
    const currentPrice = prices[symbol]
    if (currentPrice && currentPrice > 0) {
      const formattedPrice = formatPrice(currentPrice)
      updateFormData('triggerPrice', formattedPrice)
    }
    // Reset the initial price set flag so it gets updated with new token price
    setInitialPriceSet(false)
  }

  // Handle trigger price reset when chart symbol changes
  const handleTriggerPriceReset = (newPrice: number) => {
    const formattedPrice = formatPrice(newPrice)
    updateFormData('triggerPrice', formattedPrice)
  }

  // Get user's actual balance from wallet
  const getUserBalance = (tokenSymbol: string): string => {
    // Return 0.00 if wallet is not connected
    if (!isConnected || !address) {
      return '0.00'
    }
    
    // TODO: Replace with actual balance queries using wagmi hooks
    // Example implementation:
    // const { data: balance } = useBalance({ 
    //   address, 
    //   token: getTokenAddress(tokenSymbol) 
    // })
    // return balance ? formatUnits(balance.value, balance.decimals) : '0.00'
    
    // TEMPORARY: Mock balances for development
    const mockBalances: Record<string, string> = {
      'USDC': '1,250.00',
      'BTC': '0.025',
      'ETH': '2.5',
      'SOL': '45.2',
      'HYPE': '1,000.0',
      'FARTCOIN': '50,000'
    }
    return mockBalances[tokenSymbol] || '0.00'
  }

  // Move token selections before they're used
  const selectedFromToken = spotTokens.find(token => token.symbol === formData.fromToken)
  const selectedToToken = spotTokens.find(token => token.symbol === formData.toToken)
  const selectedTriggerToken = availableTokens.find(token => token.symbol === formData.triggerToken)

  // Auto-determine condition based on trigger price vs current price
  const autoCondition = useMemo(() => {
    const triggerPrice = parseFloat(formData.triggerPrice)
    const currentPrice = selectedTriggerToken ? prices[selectedTriggerToken.symbol] : 0
    
    if (!triggerPrice || !currentPrice || triggerPrice === currentPrice) {
      return '>' // Default to above
    }
    
    return triggerPrice > currentPrice ? '>' : '<'
  }, [formData.triggerPrice, selectedTriggerToken, prices])

  // Calculate focus ring color based on trigger vs current price
  const getTriggerInputColor = useMemo(() => {
    const triggerPrice = parseFloat(formData.triggerPrice)
    const currentPrice = selectedTriggerToken ? prices[selectedTriggerToken.symbol] : 0
    
    if (!triggerPrice || !currentPrice) {
      return 'primary' // Default color
    }
    
    return triggerPrice > currentPrice ? 'green' : 'red'
  }, [formData.triggerPrice, selectedTriggerToken, prices])

  // Update condition automatically when trigger price changes
  useEffect(() => {
    if (autoCondition !== formData.triggerCondition) {
      updateFormData('triggerCondition', autoCondition)
    }
  }, [autoCondition, formData.triggerCondition])

  // Ensure trigger price gets set to current price when prices are first loaded
  useEffect(() => {
    const triggerTokenPrice = prices[formData.triggerToken]
    if (triggerTokenPrice && (formData.triggerPrice === '0' || formData.triggerPrice === '')) {
      // Use the same formatPrice that handles large numbers properly
      const currentPrice = formatPrice(triggerTokenPrice)
      updateFormData('triggerPrice', currentPrice)
    }
  }, [prices, formData.triggerToken, formData.triggerPrice])

  // Enhanced swap calculation with better precision and error handling
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
  }, [formData.fromAmount, formData.fromToken, formData.toToken, formData.slippageTolerance, prices, swapValidation.isValid])

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

  // Filter tokens for modals with USDC pairing logic
  const getFilteredTokens = (modalType: 'from' | 'to' | 'trigger') => {
    if (modalType === 'trigger') {
      // Trigger tokens: use full allowlist
      return availableTokens.filter(token => {
        const matchesSearch = token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            token.name.toLowerCase().includes(searchTerm.toLowerCase())
        const isNotSocialToken = !token.symbol.includes('@') && !token.name.includes('@')
        return matchesSearch && isNotSocialToken
      })
    }
    
    // For swap tokens: only show valid pairing options
    const currentOtherToken = modalType === 'from' ? formData.toToken : formData.fromToken
    
    return spotTokens.filter(token => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          token.name.toLowerCase().includes(searchTerm.toLowerCase())
      const isNotSocialToken = !token.symbol.includes('@') && !token.name.includes('@')
      
      // Must form a valid pair with the other token
      const wouldBeValidPair = modalType === 'from' 
        ? validateSwapPair(token.symbol, currentOtherToken)
        : validateSwapPair(currentOtherToken, token.symbol)
      
      return matchesSearch && isNotSocialToken && wouldBeValidPair
    })
  }

  // Token selection modal
  const TokenModal = ({ isOpen, onClose, onSelect, title, modalType }: {
    isOpen: boolean
    onClose: () => void
    onSelect: (symbol: string) => void
    title: string
    modalType: 'from' | 'to' | 'trigger'
  }) => {
    const handleTokenSelect = (symbol: string) => {
      onSelect(symbol)
      onClose()
      setSearchTerm('')
    }

    const handleClose = (open: boolean) => {
      if (!open) {
        onClose()
        setSearchTerm('')
      }
    }

    const filteredTokens = getFilteredTokens(modalType)

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {modalType === 'trigger' ? (
              <p className="text-sm text-muted-foreground">
                Selected tokens available for monitoring
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only Core + EVM assets with USDC pairs
                {swapError && (
                  <span className="block text-destructive text-xs mt-1">
                    {swapError}
                  </span>
                )}
              </p>
            )}
          </DialogHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                    {token.type === 'perp' && token.maxLeverage && (
                      <div className="text-xs text-blue-400">Max {token.maxLeverage}x leverage</div>
                    )}
                    {token.type === 'spot' && (
                      <div className="text-xs text-green-400">
                        Spot asset
                        {token.layer && (
                          <span className="ml-1 text-gray-400">
                            ({token.layer === 'both' ? 'Core + EVM' : token.layer === 'core' ? 'Core' : 'EVM'})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${formatPrice(prices[token.symbol] || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {token.type}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-sm">No valid tokens found</div>
                <div className="text-xs">All swaps must include USDC</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (loading) {
    return <TriggerFormSkeleton />
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

  if (availableTokens.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <div className="text-foreground mb-2">No tokens available</div>
        <div className="text-muted-foreground mb-4">Unable to load market data from Hyperliquid</div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (spotTokens.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <div className="text-foreground mb-2">No spot assets available</div>
        <div className="text-muted-foreground mb-4">No spot tokens found for trading. Please check your connection.</div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <motion.div 
      className="bg-background text-foreground flex flex-col overflow-hidden" 
      style={{ height: 'calc(100vh - 4rem)' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chart + Your Triggers (75% width) */}
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden" 
          style={{ width: '75%' }}
          variants={chartVariants}
        >
          {/* Chart - Takes calc(70vh - 4rem) accounting for nav */}
          <motion.div 
            className="flex-1 overflow-hidden" 
            style={{ height: 'calc(70vh - 4rem)' }}
            variants={itemVariants}
          >
            {selectedTriggerToken ? (
              <PriceChart 
                symbol={selectedTriggerToken.symbol} 
                triggerPrice={parseFloat(formData.triggerPrice) || undefined}
                onTriggerPriceChange={handleTriggerPriceReset}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground bg-[#0a0a0a]">
                <div className="text-center">
                  <div className="text-6xl mb-4">📈</div>
                  <div className="text-xl font-medium mb-2 text-white">Select a trigger token</div>
                  <div className="text-sm text-gray-400">Choose a token to monitor and view its price chart</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Your Triggers Section - Takes remaining space */}
          <motion.div 
            className="border-t border-border bg-background flex flex-col" 
            style={{ height: 'calc(30vh - 2rem)' }}
            variants={itemVariants}
          >
            <motion.div 
              className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <span>Your Triggers ({userTriggers.length})</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {isConnected ? 'Active' : 'Connect Wallet'}
              </Badge>
            </motion.div>

            <motion.div 
              className="flex-1 overflow-y-auto"
              variants={itemVariants}
            >
              {userTriggers.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Logo/>
                    <div className="text-sm font-medium mb-1">No triggers yet</div>
                    <div className="text-xs">Create your first trigger to get started</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 border-b border-border flex-shrink-0">
                    <div className="grid grid-cols-6 gap-2 text-xs text-gray-400 font-medium">
                      <div>Token</div>
                      <div>Target</div>
                      <div>Price</div>
                      <div>Action</div>
                      <div>Amount</div>
                      <div>Status</div>
                    </div>
                  </div>
                  {userTriggers.map((trigger) => (
                    <div key={trigger.id} className="px-4 py-3 hover:bg-border/50 border-b border-border/50">
                      <div className="grid grid-cols-6 gap-2 text-xs font-mono">
                        <div className="text-white font-semibold">{trigger.baseToken}</div>
                        <div className="text-white">{trigger.targetToken}</div>
                        <div className="text-white">{formatPrice(trigger.triggerPrice)}</div>
                        <div className={trigger.action === 'buy' ? 'text-green-400' : 'text-red-400'}>
                          {trigger.action.toUpperCase()}
                        </div>
                        <div className="text-white">${trigger.amount.toLocaleString()}</div>
                        <div className="text-green-400">ACTIVE</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right Panel - Create Trigger Form (25% width) */}
        <motion.div 
          className="bg-background border-l border-border flex flex-col overflow-hidden" 
          style={{ width: '25%' }}
          variants={formVariants}
        >
          {/* Simple text header instead of complex header */}
          <motion.div 
            className="px-6 py-4 pb-4"
            variants={itemVariants}
          >
            <motion.div 
              className="flex items-center justify-between mb-6"
              variants={itemVariants}
            >
              <h3 className="font-semibold text-muted-foreground">Create Trigger</h3>
              <Badge variant="outline" className="capitalize">
                {swapValidation.direction === 'buy' ? 'Buy' : swapValidation.direction === 'sell' ? 'Sell' : 'Swap'} 
                <ArrowUpDown className="h-3 w-3 inline ml-1" />
              </Badge>
            </motion.div>
          
            <form onSubmit={handleSubmit}>
              {/* Trigger Condition */}
              <motion.div className='mb-12 space-y-2' variants={cardVariants}>
                <span className='text-xs pl-2 block text-muted-foreground'>Trigger</span>
                <TriggerInput
                  selectedToken={selectedTriggerToken ? {
                    symbol: selectedTriggerToken.symbol,
                    name: selectedTriggerToken.name
                  } : undefined}
                  onTokenSelect={() => setShowTriggerTokenModal(true)}
                  triggerPrice={formData.triggerPrice}
                  onPriceChange={(value) => updateFormData('triggerPrice', value)}
                  currentPrice={selectedTriggerToken ? prices[selectedTriggerToken.symbol] : undefined}
                  condition={autoCondition}
                  onConditionChange={() => {}}
                  focusColor={getTriggerInputColor}
                />
              </motion.div>

              {/* Swap Configuration */}
              <motion.div className='space-y-2' variants={cardVariants}>
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
                      // Set to user's actual balance
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

                  {/* Slippage */}
                  <div className="flex flex-col bg-[#1c1d1e] border rounded-2xl items-center justify-between">
                     {/* Buy/To Input */}
                     <div className="m-[-1px]">
                      <SwapInput
                        label="Buy"
                        value={estimatedOutput}
                        onValueChange={() => {}} // Read-only estimated output
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
                        <span className="text-sm text-muted-foreground">Slippage tolerance</span>
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
              </motion.div>

              {/* Action Button */}
              <motion.div 
                variants={itemVariants}
              >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full px-4 py-2 rounded-full font-medium text-sm transition-colors"
                      disabled={
                        !isConnected || 
                        !swapValidation.isValid ||
                        !formData.fromToken || 
                        !formData.toToken || 
                        !formData.triggerToken || 
                        !formData.triggerPrice || 
                        !formData.fromAmount ||
                        parseFloat(formData.fromAmount) <= 0
                      }
                    >
                      {!isConnected 
                        ? 'Connect Wallet' 
                        : !swapValidation.isValid 
                        ? 'Invalid Pair' 
                        : 'Create Trigger'
                      }
                    </Button>
                  </motion.div>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      </div>

      {/* Token Selection Modals */}
      <TokenModal
        isOpen={showToTokenModal}
        onClose={() => setShowToTokenModal(false)}
        onSelect={(symbol) => handleTokenSelect(symbol, 'to')}
        title="Select token to buy"
        modalType="to"
      />
      
      <TokenModal
        isOpen={showFromTokenModal}
        onClose={() => setShowFromTokenModal(false)}
        onSelect={(symbol) => handleTokenSelect(symbol, 'from')}
        title="Select token to sell"
        modalType="from"
      />
      
      <TokenModal
        isOpen={showTriggerTokenModal}
        onClose={() => setShowTriggerTokenModal(false)}
        onSelect={handleTriggerTokenSelect}
        title="Select trigger token"
        modalType="trigger"
      />
    </motion.div>
  )
}

// Skeleton component for loading state
function TriggerFormSkeleton() {
  return (
    <motion.div 
      className="bg-muted text-foreground flex flex-col overflow-hidden" 
      style={{ height: 'calc(100vh - 4rem)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel Skeleton - Chart Area */}
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden" 
          style={{ width: '75%' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Chart Skeleton - Simple container */}
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(70vh - 4rem)' }}>
            <Skeleton className="h-full w-full" />
          </div>

          {/* Your Triggers Skeleton - Simple container */}
          <div className="border-t border-border bg-muted flex flex-col" style={{ height: 'calc(30vh - 2rem)' }}>
            <Skeleton className="h-full w-full" />
          </div>
        </motion.div>

        {/* Right Panel Skeleton - Simple container */}
        <motion.div 
          className="bg-muted border-l border-border flex flex-col overflow-hidden" 
          style={{ width: '25%' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Skeleton className="h-full w-full" />
        </motion.div>
      </div>
    </motion.div>
  )
} 