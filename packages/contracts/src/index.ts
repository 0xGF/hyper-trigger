// Contract types and utilities will be exported from here
export * from './types'

// Placeholder for now - will be populated when we generate contract types
export const CONTRACT_ADDRESSES = {
  TRIGGER_MANAGER: '',
  PRICE_ORACLE: '',
  SWAP_EXECUTOR: '',
} as const

export type ContractName = keyof typeof CONTRACT_ADDRESSES 