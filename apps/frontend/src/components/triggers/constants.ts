// 🎯 HYPER-TRIGGER CONSTANTS
// Centralized configuration for all token allowlists, defaults, and constraints
// Based on HyperCore ↔ HyperEVM architecture research

// ===== CORE TRADING CONSTRAINTS =====
// USDC is the base pair for all spot trading on Hyperliquid
// All swaps must have USDC on one side (USDC→Token or Token→USDC)
export const TRADING_RULES = {
  // USDC must always be either the FROM or TO token in swaps
  REQUIRES_USDC_PAIR: true,
  
  // Base quote currency for all trading pairs
  BASE_QUOTE_CURRENCY: 'USDC',
  
  // Minimum swap amounts (in USD equivalent)
  MIN_SWAP_AMOUNT: 1.0,
  MAX_SWAP_AMOUNT: 1000000.0,
  
  // Default slippage tolerances
  DEFAULT_SLIPPAGE: '0.5',
  SLIPPAGE_OPTIONS: ['0.5', '1.0', '5.0']
} as const

// ===== STABLECOINS =====
// All recognized stablecoins for USD calculations and pairing rules
export const STABLECOINS = [
  'USDC',    // Primary base currency
  'USDT',    // Secondary stablecoin
  'DAI',     // Decentralized stablecoin
  'BUSD',    // Binance USD (legacy)
  'FEUSD',   // Hyperliquid native stablecoin
  'USDHL'    // Hyperliquid USD
] as const

// ===== TOKEN ALLOWLISTS =====
export const ALLOWED_ASSETS = {
  // For trigger monitoring: Major tokens with reliable price feeds
  // Supports both HyperCore perpetuals and spot assets
  trigger: [
    'BTC', 'ETH', 'SOL',           // Major cryptocurrencies
    'HYPE',                        // Native HyperEVM token
    'FARTCOIN',                    // Popular meme token
    'TRUMP', 'WIF', 'PEPE'         // Additional meme tokens
  ],
  
  // For spot trading: ONLY verified Core + EVM assets with USDC pairs
  // REMOVED PURR - it's EVM-only, not Core + EVM
  spot: [
    'USDC',                        // Base quote currency (always included)
    'BTC', 'ETH', 'SOL',          // Major cryptocurrencies (Core + EVM)
    'HYPE',                        // Native token (Core + EVM)
    'FARTCOIN'                     // Popular meme token (Core + EVM)
  ]
} as const

// ===== LAYER ARCHITECTURE =====
// HyperCore ↔ HyperEVM Layer Information
export const TOKEN_LAYERS = {
  // Available on both HyperCore and HyperEVM (preferred for trading)
  BOTH: ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'HYPE', 'FARTCOIN'],
  
  // Primarily HyperCore (perpetuals + some spot)
  CORE: ['TRUMP', 'WIF', 'PEPE', 'BONK'],
  
  // Primarily HyperEVM (ERC-20 tokens) - NOT available for Core spot trading
  EVM: ['PURR', 'DHYPE', 'WHYPE']
} as const

// ===== UI PRIORITIZATION =====
// Major tokens prioritized in UI (Core + EVM availability only)
export const MAJOR_TOKENS = [
  'USDC',      // Primary base currency
  'BTC',       // Bitcoin
  'ETH',       // Ethereum
  'SOL',       // Solana
  'HYPE',      // Native HyperEVM token
  'FARTCOIN'   // Popular meme token
] as const

// ===== DEFAULT SELECTIONS =====
// Default token selections for optimal UX
export const DEFAULT_TOKENS = {
  trigger: 'BTC',        // Most reliable price feed
  sell: 'USDC',         // Stable base currency (enforces USDC pairing)
  buy: 'FARTCOIN'       // Popular meme token for demo
} as const

// ===== SWAP VALIDATION =====
// Helper functions to validate swap pairs
export const validateSwapPair = (fromToken: any, toToken: any): boolean => {
  // One token must be USDC (base currency requirement)
  const hasUSDC = fromToken === 'USDC' || toToken === 'USDC'
  
  // Both tokens must be in the spot allowlist
  const fromAllowed = ALLOWED_ASSETS.spot.includes(fromToken)
  const toAllowed = ALLOWED_ASSETS.spot.includes(toToken)
  
  return hasUSDC && fromAllowed && toAllowed
}

export const getSwapDirection = (fromToken: any, toToken: any): 'buy' | 'sell' | 'invalid' => {
  if (!validateSwapPair(fromToken, toToken)) return 'invalid'
  
  if (fromToken === 'USDC') return 'buy'   // USDC → Token (buying token)
  if (toToken === 'USDC') return 'sell'    // Token → USDC (selling token)
  
  return 'invalid' // Should never reach here if validation passes
}

// ===== PRICE FORMATTING =====
export const formatPrice = (price: number): string => {
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

export const formatAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(2) + 'M'
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + 'K'
  } else if (amount >= 1) {
    return amount.toFixed(4)
  } else {
    return amount.toFixed(8)
  }
}

// ===== TOKEN METADATA =====
// Full token names for display purposes
export const TOKEN_NAMES: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum', 
  'SOL': 'Solana',
  'USDC': 'USD Coin',
  'USDT': 'Tether',
  'HYPE': 'Hyperliquid',
  'FARTCOIN': 'Fartcoin',
  'TRUMP': 'Trump',
  'WIF': 'Dogwifhat',
  'PEPE': 'Pepe',
  'BONK': 'Bonk',
  'PURR': 'Purr'
} as const

// ===== UNIT TOKEN MAPPING =====
// Maps Hyperliquid Unit tokens to standard symbols
export const UNIT_TOKEN_MAP: Record<string, string> = {
  'UBTC': 'BTC',      // Unit Bitcoin → Bitcoin
  'UETH': 'ETH',      // Unit Ethereum → Ethereum  
  'USOL': 'SOL',      // Unit Solana → Solana
  'UFART': 'FARTCOIN', // Unit Fartcoin → Fartcoin
  'HYPE': 'HYPE',     // HYPE stays HYPE
  'USDC': 'USDC',     // USDC stays USDC
  'USDT': 'USDT'      // USDT stays USDT
} as const

// ===== SYSTEM ADDRESSES =====
// HyperCore system addresses for cross-layer bridging
export const SYSTEM_ADDRESSES = {
  HYPE_BRIDGE: '0x2222222222222222222222222222222222222222',
  USDC_BASE: '0x2000000000000000000000000000000000000000',
  BTC_BRIDGE: '0x200000000000000000000000000000000000c5',
  ETH_BRIDGE: '0x200000000000000000000000000000000000dd',
  SOL_BRIDGE: '0x200000000000000000000000000000000000fe',
  FARTCOIN_BRIDGE: '0x200000000000000000000000000000000000010d'
} as const

// ===== VALIDATION HELPERS =====
export const isStablecoin = (token: string): boolean => {
  return STABLECOINS.includes(token as any)
}

export const isMajorToken = (token: string): boolean => {
  return MAJOR_TOKENS.includes(token as any)
}

export const isSpotTradeable = (token: string): boolean => {
  return ALLOWED_ASSETS.spot.includes(token as any)
}

export const isTriggerMonitorable = (token: string): boolean => {
  return ALLOWED_ASSETS.trigger.includes(token as any)
}

export const getTokenLayer = (token: string): 'both' | 'core' | 'evm' | 'unknown' => {
  if (TOKEN_LAYERS.BOTH.includes(token as any)) return 'both'
  if (TOKEN_LAYERS.CORE.includes(token as any)) return 'core'  
  if (TOKEN_LAYERS.EVM.includes(token as any)) return 'evm'
  return 'unknown'
}

// ===== TYPE EXPORTS =====
export type StablecoinSymbol = typeof STABLECOINS[number]
export type SpotAssetSymbol = typeof ALLOWED_ASSETS.spot[number]
export type TriggerAssetSymbol = typeof ALLOWED_ASSETS.trigger[number]
export type MajorTokenSymbol = typeof MAJOR_TOKENS[number]
export type TokenLayer = 'both' | 'core' | 'evm' | 'unknown'
export type SwapDirection = 'buy' | 'sell' | 'invalid'