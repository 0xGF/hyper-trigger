'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'

interface PriceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  token?: string
}

export function PriceInput({ value, onChange, placeholder = "0.00", token }: PriceInputProps) {
  const [currentPrice, setCurrentPrice] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Mock price fetching - in real implementation, this would call Hyperliquid API
  useEffect(() => {
    if (!token) return

    setIsLoading(true)
    // Simulate API call
    const mockPrices: Record<string, string> = {
      'BTC': '97,234.56',
      'ETH': '3,456.78',
      'SOL': '234.56',
      'USDC': '1.00',
      'USDT': '1.00',
      'FARTCOIN': '0.0234',
      'WIF': '2.34',
      'POPCAT': '1.23',
      'BONK': '0.000045',
      'PEPE': '0.000012',
      'DOGE': '0.34',
      'SHIB': '0.000023',
    }

    setTimeout(() => {
      setCurrentPrice(mockPrices[token] || '0.00')
      setIsLoading(false)
    }, 500)
  }, [token])

  const formatPrice = (input: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = input.replace(/[^0-9.]/g, '')
    
    // Ensure only one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('')
    }
    
    return cleaned
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value)
    onChange(formatted)
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        $
      </div>
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-8 pr-20"
      />
      {token && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <span title={`Current ${token} price`}>
              ${currentPrice}
            </span>
          )}
        </div>
      )}
    </div>
  )
} 