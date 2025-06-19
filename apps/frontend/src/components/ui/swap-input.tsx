'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { TokenIcon } from '@/components/ui/token-icon'
import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface SwapInputProps {
  label: 'Sell' | 'Buy'
  value: string
  onValueChange: (value: string) => void
  selectedToken?: {
    symbol: string
    name: string
  }
  onTokenSelect?: () => void
  balance?: string
  usdValue?: string
  showMax?: boolean
  onMaxClick?: () => void
  disabled?: boolean
  placeholder?: string
}

export function SwapInput({
  label,
  value,
  onValueChange,
  selectedToken,
  onTokenSelect,
  balance,
  usdValue = '$0',
  showMax = false,
  onMaxClick,
  disabled = false,
  placeholder = '0'
}: SwapInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers, decimal point, and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onValueChange(value)
    }
  }

  const handleInputFocus = () => {
    setIsFocused(true)
    // Clear the input if it's showing default values like "0.00" or "0"
    if (value === '0.00' || value === '0') {
      onValueChange('')
    }
  }

  return (
    <motion.div 
      className={`bg-card backdrop-blur-sm rounded-2xl p-4 border transition-all duration-200 cursor-text ${
        isFocused 
          ? 'border-primary' 
          : 'border-border/50 hover:border-border'
      }`}
      transition={{ duration: 0.2 }}
      onClick={handleContainerClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
        </div>
        {showMax && balance && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onMaxClick?.()
            }}
            className="bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded-full text-xs font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Max
          </motion.button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-between gap-3">
        {/* Amount Input */}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="number"
            step="any"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            className="w-full bg-transparent text-foreground text-2xl font-medium placeholder:text-muted-foreground/40 border-0 outline-0 p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="text-muted-foreground text-sm mt-1">
            {usdValue}
          </div>
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
          
          {balance && (
            <div className="text-muted-foreground text-xs">
              {balance}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
} 