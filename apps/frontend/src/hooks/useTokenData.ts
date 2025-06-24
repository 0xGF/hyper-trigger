import { useState, useEffect } from 'react'
import { 
  getAllTokens,
  getTriggerableTokens, 
  getTradableTokens,
  type UnifiedToken
} from '@/lib/tokens'

export interface TokenData {
  allTokens: UnifiedToken[]
  triggerableTokens: UnifiedToken[]
  tradableTokens: UnifiedToken[]
  prices: Record<string, number>
  isLoading: boolean
  error: string | null
}

export function useTokenData(): TokenData {
  const [tokenData, setTokenData] = useState<TokenData>({
    allTokens: [],
    triggerableTokens: [],
    tradableTokens: [],
    prices: {},
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const loadTokens = () => {
      try {
        const allTokens = getAllTokens()
        const triggerableTokens = getTriggerableTokens()
        const tradableTokens = getTradableTokens()

        // Extract current prices from tokens
        const prices: Record<string, number> = {}
        allTokens.forEach(token => {
          if (token.price !== undefined) {
            prices[token.symbol] = token.price
          }
        })

        // Use core tokens as fallback until oracle data loads
        const tokensForTriggers = triggerableTokens.length > 0 
          ? triggerableTokens 
          : allTokens.filter(t => t.category === 'major' || t.category === 'native')

        const tokensForTrading = tradableTokens.length > 0
          ? tradableTokens
          : allTokens.filter(t => t.category !== 'stablecoin' || t.symbol === 'USDC')

        setTokenData({
          allTokens,
          triggerableTokens: tokensForTriggers,
          tradableTokens: tokensForTrading,
          prices,
          isLoading: false,
          error: null
        })

      } catch (error) {
        console.error('❌ Token loading failed:', error)
        setTokenData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load tokens'
        }))
      }
    }

    loadTokens()
  }, [])

  return tokenData
} 