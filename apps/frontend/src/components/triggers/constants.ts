// 🎯 TRIGGER FORM CONSTANTS
// Contract addresses, trading rules, and validation functions only
// All token data comes from unified @/lib/tokens

import type { Abi } from 'viem'
// 🎯 IMPORT FROM UNIFIED TOKEN SYSTEM
import { 
  getAllTokens, 
  getToken,
  getAssetIndex,
  getTokenSymbol,
  getSupportedOracleTokens
} from '@/lib/tokens'

// 🔄 UPDATED: Use new deployed contracts
import { CONTRACTS as NEW_CONTRACTS, TRIGGER_CONTRACT_ABI } from '@/lib/contracts'

// Contract configuration
export const CONTRACTS = {
  TRIGGER_CONTRACT: {
    ADDRESS: NEW_CONTRACTS.TriggerContract,
    CHAIN_ID: 998, // HyperEVM Testnet
  },
} as const

// Use the proper ABI from contracts
export const TRIGGER_MANAGER_ABI = TRIGGER_CONTRACT_ABI

// Default token selections - UPDATED for new contract
export const DEFAULT_TOKENS = {
  sell: 'USDC',    // ✅ TriggerContract uses USDC as input (stable refunds)
  buy: 'BTC',      // Can buy any supported token
  trigger: 'BTC',  // Can monitor any token with oracle price
} as const

// Trading rules
export const TRADING_RULES = {
  MIN_SWAP_AMOUNT: 1, // $1 minimum
  MAX_SWAP_AMOUNT: 1000000, // $1M maximum
  DEFAULT_SLIPPAGE: '1.0', // 1%
  SLIPPAGE_OPTIONS: ['0.5', '1.0', '2.0', '5.0'],
  GAS_ESTIMATE: 0.01, // ~0.01 HYPE execution reward
} as const

// Trading validation using unified tokens - UPDATED for USDC-only
export function validateSwapPair(fromToken: string, toToken: string): boolean {
  const allTokens = getAllTokens()
  const fromExists = allTokens.some(token => token.symbol === fromToken)
  const toExists = allTokens.some(token => token.symbol === toToken)
  
  // Basic validation
  if (!fromExists || !toExists || fromToken === toToken) {
    return false
  }
  
  // ✅ NEW CONTRACT: Only USDC can be used as input for triggers
  if (fromToken !== 'USDC') {
    return false
  }
  
  return true
}

export function getSwapDirection(fromToken: string, toToken: string): 'buy' | 'sell' | 'swap' {
  if (fromToken === 'USDC') return 'buy'
  if (toToken === 'USDC') return 'sell'
  return 'swap'
}

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

// Token capability helpers using unified system - UPDATED
export function canUseAsInput(token: string): boolean {
  // ✅ NEW CONTRACT: Only USDC can be used as input for stable refunds
  return token === 'USDC'
}

export function canUseAsTrigger(token: string): boolean {
  // Any token with oracle price can be used for trigger monitoring
  const tokenData = getToken(token)
  return tokenData?.oracleIndex !== undefined
}

// Re-export oracle functions from unified system (for convenience)
export { getAssetIndex, getTokenSymbol, getSupportedOracleTokens } from '@/lib/tokens'

export type SwapDirection = 'buy' | 'sell' | 'swap'