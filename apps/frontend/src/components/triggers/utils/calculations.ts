// Trading calculation utilities

import { formatAmount } from './formatters'

export const calculateSwapOutput = (
  fromAmount: string,
  fromPrice: number,
  toPrice: number,
  slippageTolerance: string
): string => {
  const amount = parseFloat(fromAmount)
  
  if (!amount || !fromPrice || !toPrice || amount <= 0 || fromPrice <= 0 || toPrice <= 0) {
    return '0.00'
  }
  
  const usdValue = amount * fromPrice
  const slippageMultiplier = 1 - (parseFloat(slippageTolerance) / 100)
  const outputAmount = (usdValue / toPrice) * slippageMultiplier
  
  return formatAmount(outputAmount)
}

export const calculateUSDValue = (amount: string, price: number): string => {
  const numAmount = parseFloat(amount)
  
  if (!numAmount || !price || numAmount <= 0 || price <= 0) {
    return '$0.00'
  }
  
  const usdValue = numAmount * price
  return `$${usdValue.toFixed(2)}`
}

export const determineTriggerCondition = (triggerPrice: number, currentPrice: number): '>' | '<' => {
  if (!triggerPrice || !currentPrice || triggerPrice === currentPrice) {
    return '>'
  }
  
  return triggerPrice > currentPrice ? '>' : '<'
} 