// Price and amount formatting utilities

export const formatPrice = (price: number): string => {
  if (!price || price <= 0) return '0'
  
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  } else {
    return price.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }
}

export const formatAmount = (amount: number): string => {
  if (!amount || amount <= 0) return '0.00'
  
  if (amount >= 1000) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
  } else if (amount >= 1) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 4 })
  } else {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }
}

export const formatUSD = (value: number): string => {
  if (!value || value <= 0) return '$0.00'
  return `$${value.toFixed(2)}`
} 