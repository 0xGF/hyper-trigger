// 🎯 UNIFIED TOKEN CONFIGURATION - Single Source of Truth
// This is the ONE place where all token data is defined
// Used by frontend, backend API, worker, and contracts

export interface UnifiedToken {
  symbol: string           // Internal symbol (e.g., 'UBTC', 'HYPE')
  displayName: string      // User-friendly name (e.g., 'Bitcoin', 'HYPE')
  category: 'major' | 'native' | 'stablecoin' | 'alt' | 'meme'
  
  // Hyperliquid indices
  spotIndex: number        // Spot token index from spotMeta
  marketName?: string      // allMids key for price lookup (e.g., "@107" for HYPE/USDC on mainnet)
  
  // Status
  isActive?: boolean
  
  // Runtime price (set dynamically)
  price?: number
}

// ===========================================
// TESTNET TOKENS
// marketName = the allMids key for price lookup (from spotMeta universe entry's "name" field)
// To find: curl -X POST https://api.hyperliquid-testnet.xyz/info -d '{"type":"spotMeta"}' | jq '.universe[] | select(.tokens[0] == TOKEN_INDEX and .tokens[1] == 0)'
// ===========================================
const TESTNET_TOKENS: UnifiedToken[] = [
  {
    symbol: 'HYPE',
    displayName: 'HYPE',
    category: 'native',
    spotIndex: 1105,
    isActive: true,
  },
  {
    symbol: 'USDC',
    displayName: 'USD Coin',
    category: 'stablecoin',
    spotIndex: 0,
    isActive: true,
  },
]

// ===========================================
// MAINNET TOKENS
// marketName = allMids key (from spotMeta universe "name" field for USDC pairs)
// ===========================================
const MAINNET_TOKENS: UnifiedToken[] = [
  {
    symbol: 'HYPE',
    displayName: 'HYPE',
    category: 'native',
    spotIndex: 150,
    isActive: true,
  },
  {
    symbol: 'UBTC',
    displayName: 'Bitcoin',
    category: 'major',
    spotIndex: 197,
    isActive: true,
  },
  {
    symbol: 'UETH',
    displayName: 'Ethereum',
    category: 'major',
    spotIndex: 221,
    isActive: true,
  },
  {
    symbol: 'USOL',
    displayName: 'Solana',
    category: 'major',
    spotIndex: 254,
    isActive: true,
  },
  {
    symbol: 'UFART',
    displayName: 'FARTCOIN',
    category: 'meme',
    spotIndex: 269,
    isActive: true,
  },
  {
    symbol: 'UPUMP',
    displayName: 'PUMP',
    category: 'meme',
    spotIndex: 299,
    isActive: true,
  },
  {
    symbol: 'USDC',
    displayName: 'USD Coin',
    category: 'stablecoin',
    spotIndex: 0,
    isActive: true,
  },
]

// ===========================================
// NETWORK DETECTION - Runtime evaluation
// ===========================================
export function isTestnet(): boolean {
  // Works in both Node.js and browser - evaluated at RUNTIME
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_NETWORK === 'testnet' || 
           process.env.NETWORK === 'testnet'
  }
  return false
}

// ===========================================
// CORE TOKEN LIST (network-aware) - Runtime getters
// ===========================================

// Re-export for explicit access
export { TESTNET_TOKENS, MAINNET_TOKENS }

// Runtime getter - evaluates network each time it's called
export function getCoreTokens(): UnifiedToken[] {
  return isTestnet() ? TESTNET_TOKENS : MAINNET_TOKENS
}

// ===========================================
// API URLs - Runtime getters
// ===========================================
export function getHlApiUrl(): string {
  return isTestnet() 
    ? 'https://api.hyperliquid-testnet.xyz' 
    : 'https://api.hyperliquid.xyz'
}

export function getNetwork(): string {
  return isTestnet() ? 'testnet' : 'mainnet'
}

// ===========================================
// DEPRECATED CONSTANTS - Use getter functions instead!
// These are kept ONLY for backwards compatibility during migration.
// All new code should use getCoreTokens(), getHlApiUrl(), getNetwork() instead.
// ===========================================

/**
 * @deprecated Use getCoreTokens() for proper runtime network detection.
 * This constant evaluates at module load time which may be BEFORE env vars are loaded.
 */
export const CORE_TOKENS = getCoreTokens()

/**
 * @deprecated Use getHlApiUrl() for proper runtime network detection.
 */
export const HL_API_URL = getHlApiUrl()

/**
 * @deprecated Use getNetwork() for proper runtime network detection.
 */
export const NETWORK = getNetwork()

// ===========================================
// HELPER FUNCTIONS - All use runtime detection
// ===========================================

export function getAllTokens(): UnifiedToken[] {
  return getCoreTokens().filter(token => token.isActive !== false)
}

export function getToken(symbol: string): UnifiedToken | undefined {
  return getCoreTokens().find(token => token.symbol === symbol)
}

export function getSpotIndex(symbol: string): number | undefined {
  return getToken(symbol)?.spotIndex
}

// DEPRECATED: Use getMarketName from DYNAMIC MARKET NAME RESOLUTION section
// This now checks cache first, then falls back to static config

// Get spot symbol for allMids API (format: @index) - DEPRECATED, use getMarketName
export function getSpotSymbol(symbol: string): string | undefined {
  const index = getSpotIndex(symbol)
  if (index === undefined) return undefined
  return `@${index}`
}

// Build map for chart/API use
export function getSpotSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {}
  getCoreTokens().forEach(token => {
    if (token.spotIndex !== undefined) {
      const spotSymbol = `@${token.spotIndex}`
      map[token.symbol] = spotSymbol
      map[token.displayName] = spotSymbol
    }
  })
  return map
}

export function getTokensByCategory(category: UnifiedToken['category']): UnifiedToken[] {
  return getCoreTokens().filter(token => token.category === category && token.isActive !== false)
}

export function getTriggerableTokens(): UnifiedToken[] {
  return getCoreTokens().filter(token => 
    token.spotIndex !== undefined && 
    token.symbol !== 'USDC' && 
    token.isActive !== false
  )
}

export function getTradableTokens(): UnifiedToken[] {
  return getCoreTokens().filter(token => token.isActive !== false)
}

export function getDefaultToken(): UnifiedToken {
  // Default to BTC (UBTC) as the primary watch token
  const tokens = getCoreTokens()
  return tokens.find(t => t.symbol === 'UBTC') || tokens.find(t => t.symbol !== 'USDC') || tokens[0]
}

// Update token prices in-place
export function updateTokenPrices(prices: Record<string, number>): void {
  getCoreTokens().forEach(token => {
    if (prices[token.symbol] !== undefined) {
      token.price = prices[token.symbol]
    }
  })
}

// ===========================================
// DYNAMIC MARKET NAME RESOLUTION
// ===========================================

// Cache for dynamically resolved market names
const marketNameCache: Map<string, string> = new Map()

/**
 * Fetch and populate market names from Hyperliquid API
 * This maps token symbols to their allMids/spotMetaAndAssetCtxs keys
 * Call this once on startup in worker/API
 */
export async function populateMarketNames(): Promise<void> {
  const apiUrl = `${getHlApiUrl()}/info`
  
  try {
    // Fetch spot metadata to get market names
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'spotMeta' })
    })
    
    if (!response.ok) {
      console.warn('Failed to fetch spotMeta for market names')
      return
    }
    
    const spotMeta = await response.json() as { 
      universe?: Array<{ name: string; tokens: number[]; index: number }> 
    }
    const tokens = getCoreTokens()
    
    // spotMeta.universe has entries like:
    // { "name": "@967", "tokens": [1035, 0], "index": 967, ... }
    // tokens[0] is the base token index, tokens[1] is quote (0 = USDC)
    if (spotMeta?.universe) {
      for (const market of spotMeta.universe) {
        // Only consider USDC pairs (tokens[1] === 0)
        if (market.tokens && market.tokens[1] === 0) {
          const baseTokenIndex = market.tokens[0]
          const marketName = market.name // e.g., "@967"
          
          // Find token with matching spotIndex
          const token = tokens.find(t => t.spotIndex === baseTokenIndex)
          if (token && marketName) {
            marketNameCache.set(token.symbol, marketName)
            console.log(`Mapped ${token.symbol} (index ${baseTokenIndex}) → ${marketName}`)
          }
        }
      }
    }
    
    console.log(`Populated ${marketNameCache.size} market names`)
  } catch (error) {
    console.warn('Error populating market names:', error)
  }
}

/**
 * Get the market name for price lookups
 * First checks cache (populated by populateMarketNames), then falls back to static config
 */
export function getMarketName(symbol: string): string | undefined {
  // Check cache first (populated by populateMarketNames)
  if (marketNameCache.has(symbol)) {
    return marketNameCache.get(symbol)
  }
  
  // Fall back to static config
  const token = getCoreTokens().find(t => t.symbol === symbol)
  return token?.marketName || undefined
}

/**
 * Set market name manually (for tokens not auto-discovered)
 */
export function setMarketName(symbol: string, marketName: string): void {
  marketNameCache.set(symbol, marketName)
}

/**
 * Get all cached market names
 */
export function getMarketNameCache(): Record<string, string> {
  return Object.fromEntries(marketNameCache)
}

// ===========================================
// CONTRACT INTEGRATION
// ===========================================

export function getSpotIndexMap(): Record<string, number> {
  const map: Record<string, number> = {}
  getCoreTokens().forEach(token => {
    if (token.spotIndex !== undefined) {
      map[token.symbol] = token.spotIndex
    }
  })
  return map
}

export function getSymbolByIndex(index: number): string | undefined {
  const token = getCoreTokens().find(token => token.spotIndex === index)
  return token?.symbol
}

export function getAssetIndex(tokenSymbol: string): number {
  const token = getToken(tokenSymbol)
  if (!token || token.spotIndex === undefined) {
    throw new Error(`No spot index found for token: ${tokenSymbol}`)
  }
  return token.spotIndex
}

export function getTokenSymbol(assetIndex: number): string {
  const symbol = getSymbolByIndex(assetIndex)
  return symbol || `Asset_${assetIndex}`
}

export function getSupportedSpotTokens(): string[] {
  return getCoreTokens()
    .filter(token => token.spotIndex !== undefined)
    .map(token => token.symbol)
}

// ===========================================
// UI HELPERS
// ===========================================

export function sortTokensByImportance(tokens: UnifiedToken[]): UnifiedToken[] {
  const categoryOrder = { 'native': 0, 'stablecoin': 1, 'major': 2, 'alt': 3, 'meme': 4 }
  
  return [...tokens].sort((a, b) => {
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
    if (categoryDiff !== 0) return categoryDiff
    return a.symbol.localeCompare(b.symbol)
  })
}

export function getTokenName(token: UnifiedToken): string {
  return token.displayName
}

// Get display name (strip U prefix for synthetic tokens)
export function getDisplayName(symbol: string): string {
  if (symbol.startsWith('U') && symbol !== 'USDC' && symbol !== 'USDH') {
    return symbol.slice(1)
  }
  return symbol
}

// ===========================================
// DEPRECATED - Backwards compatibility
// ===========================================
export const getSpotToken = getToken
export const getAllSpotTokens = getAllTokens
export const getTradableSpotTokens = getTradableTokens
export const getOracleIndex = getSpotIndex
export const getAssetIndexMap = getSpotIndexMap
export const getSupportedOracleTokens = getSupportedSpotTokens

// Type alias
export type SpotToken = UnifiedToken
