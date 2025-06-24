// 🎯 UNIFIED TOKEN CONFIGURATION - Single Source of Truth
// This is the ONE place where all token data is defined and managed
// Used by both frontend and worker for consistency

export interface UnifiedToken {
  symbol: string
  name: string
  icon: string
  category: 'major' | 'native' | 'stablecoin' | 'alt' | 'meme'
  
  // Contract integration
  oracleIndex?: number    // For price monitoring (BTC=3, ETH=4, SOL=0, HYPE=1)
  spotAssetId?: string    // HyperCore spot ID (@145, @156, etc.)
  tokenId?: number        // HyperEVM token ID for bridging
  
  // Market data
  price?: number
  change24h?: number
  volume24h?: number
  
  // Status
  isDelisted?: boolean
  isActive?: boolean
}

// 🚀 CORE TOKENS - The only tokens we support for triggers and trading
export const CORE_TOKENS: UnifiedToken[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    category: 'major',
    oracleIndex: 3,         // CONFIRMED: Oracle index for BTC price monitoring
    spotAssetId: '@145',    // CONFIRMED: BTC spot asset ID from docs
    tokenId: 142,           // BTC token ID for bridging
    isActive: true,
  },
  {
    symbol: 'ETH', 
    name: 'Ethereum',
    icon: 'Ξ',
    category: 'major',
    oracleIndex: 4,         // CONFIRMED: Oracle index for ETH price monitoring
    spotAssetId: '@156',    // CONFIRMED: ETH spot asset ID from docs
    tokenId: 156,           // ETH token ID for bridging
    isActive: true,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: '◎', 
    category: 'major',
    oracleIndex: 0,         // CONFIRMED: Oracle index for SOL price monitoring
    spotAssetId: '@161',    // CONFIRMED: SOL spot asset ID from docs
    tokenId: 161,           // SOL token ID for bridging
    isActive: true,
  },
  {
    symbol: 'HYPE',
    name: 'Hyperliquid',
    icon: '🚀',
    category: 'native',
    oracleIndex: 1,         // CONFIRMED: Oracle index for HYPE price monitoring  
    spotAssetId: '@107',    // CONFIRMED: HYPE spot asset ID from docs
    tokenId: 0,             // HYPE is token ID 0 (native)
    isActive: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin', 
    icon: '$',
    category: 'stablecoin',
    spotAssetId: undefined,     // USDC is the quote currency, no spot ID needed
    tokenId: 1,                 // USDC is token ID 1
    price: 1.0,                 // Always $1.00
    isActive: true,
  },
]

// 🎯 HELPER FUNCTIONS - All token operations go through these

export function getAllTokens(): UnifiedToken[] {
  return CORE_TOKENS.filter(token => token.isActive !== false)
}

export function getToken(symbol: string): UnifiedToken | undefined {
  return CORE_TOKENS.find(token => token.symbol === symbol)
}

export function getOracleIndex(symbol: string): number | undefined {
  return getToken(symbol)?.oracleIndex
}

export function getTokensByCategory(category: UnifiedToken['category']): UnifiedToken[] {
  return CORE_TOKENS.filter(token => token.category === category && token.isActive !== false)
}

export function getTriggerableTokens(): UnifiedToken[] {
  // Only tokens with oracle indices can be used for price monitoring
  return CORE_TOKENS.filter(token => 
    token.oracleIndex !== undefined && token.isActive !== false
  )
}

export function getTradableTokens(): UnifiedToken[] {
  // All active tokens can be traded (USDC routing handles everything)
  return CORE_TOKENS.filter(token => token.isActive !== false)
}

// 🔧 CONTRACT INTEGRATION HELPERS

export function getAssetIndexMap(): Record<string, number> {
  const map: Record<string, number> = {}
  CORE_TOKENS.forEach(token => {
    if (token.oracleIndex !== undefined) {
      map[token.symbol] = token.oracleIndex
    }
  })
  return map
}

export function getSymbolByIndex(index: number): string | undefined {
  const token = CORE_TOKENS.find(token => token.oracleIndex === index)
  return token?.symbol
}

// Contract integration functions using unified tokens
export function getAssetIndex(tokenSymbol: string): number {
  const token = getToken(tokenSymbol)
  if (!token || token.oracleIndex === undefined) {
    throw new Error(`No oracle index found for token: ${tokenSymbol}`)
  }
  return token.oracleIndex
}

export function getTokenSymbol(assetIndex: number): string {
  const symbol = getSymbolByIndex(assetIndex)
  return symbol || `Asset_${assetIndex}`
}

export function getSupportedOracleTokens(): string[] {
  return CORE_TOKENS
    .filter(token => token.oracleIndex !== undefined)
    .map(token => token.symbol)
}

// 🎨 UI HELPERS (for frontend)

export function sortTokensByImportance(tokens: UnifiedToken[]): UnifiedToken[] {
  const categoryOrder = { 'native': 0, 'major': 1, 'stablecoin': 2, 'alt': 3, 'meme': 4 }
  
  return tokens.sort((a, b) => {
    // First by category importance
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
    if (categoryDiff !== 0) return categoryDiff
    
    // Then alphabetically
    return a.symbol.localeCompare(b.symbol)
  })
}

export function updateTokenPrices(prices: Record<string, number>): void {
  CORE_TOKENS.forEach(token => {
    if (prices[token.symbol] !== undefined) {
      token.price = prices[token.symbol]
    }
  })
}

// 🚨 DEPRECATED - For backwards compatibility only
export type SpotToken = UnifiedToken
export const getSpotToken = getToken
export const getAllSpotTokens = getAllTokens
export const getTradableSpotTokens = getTradableTokens 