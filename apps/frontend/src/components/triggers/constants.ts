// 🎯 TRIGGER CONSTANTS
// Trading rules and formatting helpers

// Trading rules
export const TRADING_RULES = {
  MIN_AMOUNT: 1,          // $1 minimum
  MAX_AMOUNT: 1000000,    // $1M maximum
  DEFAULT_SLIPPAGE: '1',  // 1%
  SLIPPAGE_OPTIONS: ['0.5', '1', '2', '5'],
  DURATION_OPTIONS: ['6', '24', '72', '168'], // hours
} as const

// Formatting helpers
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(0)
  } else if (price >= 1) {
    return price.toFixed(2)
  } else {
    return price.toFixed(6)
  }
}

export function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(2) + 'M'
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + 'K'
  } else if (amount >= 1) {
    return amount.toFixed(6)
  } else {
    return amount.toFixed(8)
  }
}

export function formatDuration(hours: string): string {
  const h = parseInt(hours)
  if (h < 24) return `${h}h`
  const days = h / 24
  return `${days}d`
}
