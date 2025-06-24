// Trading validation utilities

import { getAllSpotTokens } from '@/lib/tokens'

export const validateSwapPair = (fromToken: string, toToken: string): boolean => {
  if (!fromToken || !toToken || fromToken === toToken) {
    return false
  }
  
  const allTokens = getAllSpotTokens()
  const fromExists = allTokens.some(token => token.symbol === fromToken)
  const toExists = allTokens.some(token => token.symbol === toToken)
  
  return fromExists && toExists
}

export const getSwapDirection = (fromToken: string, toToken: string): 'buy' | 'sell' | 'swap' => {
  if (!validateSwapPair(fromToken, toToken)) {
    return 'swap'
  }
  
  if (fromToken === 'USDC') {
    return 'buy'
  }
  
  if (toToken === 'USDC') {
    return 'sell'
  }
  
  return 'swap'
}

export const validateTriggerPrice = (price: string): boolean => {
  const numPrice = parseFloat(price)
  return !isNaN(numPrice) && numPrice > 0
}

export const validateAmount = (amount: string): boolean => {
  const numAmount = parseFloat(amount)
  return !isNaN(numAmount) && numAmount > 0
} 