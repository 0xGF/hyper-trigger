'use client'

import { useState, useRef } from 'react'
import { TokenIcon } from '@/components/ui/token-icon'
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface TriggerInputProps {
  selectedToken?: {
    symbol: string
    name: string
  }
  onTokenSelect?: () => void
  triggerPrice: string
  onPriceChange: (value: string) => void
  currentPrice?: number
  condition: '>' | '<'
  onConditionChange: (condition: '>' | '<') => void
  disabled?: boolean
  focusColor?: 'green' | 'red' | 'primary'
}

export function TriggerInput({
  selectedToken,
  onTokenSelect,
  triggerPrice,
  onPriceChange,
  currentPrice,
  condition,
  onConditionChange,
  disabled = false,
  focusColor = 'primary'
}: TriggerInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers, decimal point, and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onPriceChange(value)
    }
  }

  const handleInputFocus = () => {
    setIsFocused(true)
  }

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      // For large numbers, show all significant decimal places
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 8, // Allow up to 8 decimal places
        useGrouping: false // Remove commas for input compatibility
      })
    } else if (price >= 1) {
      return price.toFixed(4)
    } else {
      return price.toFixed(8)
    }
  }

  const handleCurrentPriceClick = () => {
    if (currentPrice) {
      onPriceChange(formatPrice(currentPrice).replace(/,/g, ''))
    }
  }

  // Get dynamic border colors based on focusColor prop
  const getBorderColors = () => {
    switch (focusColor) {
      case 'green':
        return {
          focused: 'border-green-500',
          unfocused: 'border-green-500/50 hover:border-green-500'
        }
      case 'red':
        return {
          focused: 'border-red-500',
          unfocused: 'border-red-500/50 hover:border-red-500'
        }
      default:
        return {
          focused: 'border-primary',
          unfocused: 'border-primary/50 hover:border-primary'
        }
    }
  }

  const borderColors = getBorderColors()

  return (
    <motion.div 
      transition={{ duration: 0.2 }}
      onClick={handleContainerClick} 
      className="flex flex-col bg-[#1c1d1e] border rounded-2xl items-center justify-between"
    >
      <div className="flex items-center justify-between py-2 w-full px-4">
        <div className="flex w-full justify-between items-center gap-3">
          <span className="text-muted-foreground text-sm font-medium">When price</span>
          <div className="flex gap-1">
            <motion.button
              type="button"
              onClick={() => onConditionChange('>')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                condition === '>' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TrendingUp className="h-3 w-3" />
              Above
            </motion.button>
            <motion.button
              type="button"
              onClick={() => onConditionChange('<')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                condition === '<' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TrendingDown className="h-3 w-3" />
              Below
            </motion.button>
          </div>
        </div>
      </div>
      
      <div 
        className={`bg-card backdrop-blur-sm rounded-2xl p-4 border transition-all duration-200 cursor-text ${
          isFocused 
            ? borderColors.focused
            : borderColors.unfocused
        }`}
      >
        {/* Main Content */}
        <div className="flex items-center justify-between gap-3">
          {/* Price Input */}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-2xl font-medium">$</span>
              <input
                ref={inputRef}
                type="number"
                step="any"
                placeholder="0.00"
                value={triggerPrice}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={() => setIsFocused(false)}
                className="w-full bg-transparent text-foreground text-2xl font-medium placeholder:text-muted-foreground/40 border-0 outline-0 p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {currentPrice && selectedToken && (
              <motion.div 
                className="text-muted-foreground text-sm mt-1 cursor-pointer hover:text-primary transition-colors relative"
                onClick={handleCurrentPriceClick}
                whileHover={{ scale: 1.02 }}
                key={currentPrice} // Add key to trigger re-render when price updates
                initial={{ opacity: 0, y: 5 }}
                animate={{ 
                  opacity: 1,
                  y: 0,
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 0.5,
                  scale: {
                    duration: 1,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="relative">
                    Current: ${formatPrice(currentPrice)}
                    <motion.div
                      className="absolute inset-0 bg-primary/20 rounded-md -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.3, 0] }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Token Selection */}
          <div className="flex flex-col items-end gap-1">
            {selectedToken ? (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  onTokenSelect?.()
                }}
                className="flex items-center gap-2 bg-muted/80 hover:bg-muted rounded-full px-3 py-2 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TokenIcon symbol={selectedToken.symbol} size="sm" />
                <span className="text-foreground font-medium text-base">
                  {selectedToken.symbol}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            ) : (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  onTokenSelect?.()
                }}
                className="bg-primary hover:bg-secondary text-background px-4 py-2 rounded-full font-medium text-sm transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Select token <ChevronDown className="h-3 w-3 inline ml-1" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
} 