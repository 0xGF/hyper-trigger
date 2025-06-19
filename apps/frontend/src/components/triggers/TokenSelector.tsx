'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TokenSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

// Popular tokens on HyperEVM/Hyperliquid ecosystem
const POPULAR_TOKENS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$' },
  { symbol: 'USDT', name: 'Tether', icon: '$' },
  { symbol: 'FARTCOIN', name: 'Fartcoin', icon: '💨' },
  { symbol: 'WIF', name: 'dogwifhat', icon: '🐕' },
  { symbol: 'POPCAT', name: 'Popcat', icon: '🐱' },
  { symbol: 'BONK', name: 'Bonk', icon: '🔥' },
  { symbol: 'PEPE', name: 'Pepe', icon: '🐸' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: '🐕' },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕' },
]

export function TokenSelector({ value, onChange, placeholder = "Select token" }: TokenSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {POPULAR_TOKENS.map((token) => (
          <SelectItem key={token.symbol} value={token.symbol}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{token.icon}</span>
              <span className="font-medium">{token.symbol}</span>
              <span className="text-muted-foreground text-sm">- {token.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 