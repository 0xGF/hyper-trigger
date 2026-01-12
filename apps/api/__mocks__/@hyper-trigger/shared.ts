// Mock for @hyper-trigger/shared
// This allows API tests to run without needing to parse ESM modules

export const TESTNET_TOKENS: UnifiedToken[] = [
  { symbol: 'HYPE', displayName: 'HYPE', category: 'native', spotIndex: 1105, isActive: true, marketName: '@1' },
  { symbol: 'USDC', displayName: 'USD Coin', category: 'stablecoin', spotIndex: 0, isActive: true },
]

export const MAINNET_TOKENS: UnifiedToken[] = [
  { symbol: 'HYPE', displayName: 'HYPE', category: 'native', spotIndex: 150, isActive: true, marketName: '@107' },
  { symbol: 'USDC', displayName: 'USD Coin', category: 'stablecoin', spotIndex: 0, isActive: true },
]

export interface UnifiedToken {
  symbol: string
  displayName: string
  category: 'major' | 'native' | 'stablecoin' | 'alt' | 'meme'
  spotIndex: number
  marketName?: string
  isActive?: boolean
  price?: number
}

export const getCoreTokens = () => MAINNET_TOKENS
export const getHlApiUrl = () => 'https://api.hyperliquid.xyz'
export const getNetwork = () => 'mainnet'

export const getDefaultToken = (symbol: string): UnifiedToken | undefined => {
  return MAINNET_TOKENS.find(t => t.symbol === symbol)
}

export const updateTokenPrices = async () => {}
export const getSpotIndexMap = () => ({})
export const getSymbolByIndex = (index: number) => index === 0 ? 'USDC' : 'HYPE'
export const getSupportedSpotTokens = (): UnifiedToken[] => MAINNET_TOKENS
export const getSpotIndex = (symbol: string) => symbol === 'USDC' ? 0 : 1
export const getMarketName = (symbol: string) => `${symbol}/USDC`
export const populateMarketNames = async () => {}
export const getTriggerableTokens = (): UnifiedToken[] => MAINNET_TOKENS
export const getTradableTokens = (): UnifiedToken[] => MAINNET_TOKENS

export const SHARED_VERSION = '0.1.0'

