'use client'

import { useBalance } from 'wagmi'
import { useMemo, useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { getAllTokens, getToken } from '@/lib/tokens'

// For now, we'll handle balances for HYPE (native) only
// ERC20 contract addresses would need to be added to the shared token configuration
// or fetched from a contract registry
async function fetchTokenAddresses(): Promise<Record<string, `0x${string}` | 'native'>> {
  try {
    const tokens = getAllTokens()
    const addresses: Record<string, `0x${string}` | 'native'> = {
      'HYPE': 'native' // HYPE is always the native gas token
    }
    
    // For now, only HYPE is supported as native
    // Other tokens would need ERC20 contract addresses
    return addresses
  } catch (error) {
    console.error('❌ Failed to fetch token addresses:', error)
    return { 'HYPE': 'native' } // Fallback to just HYPE
  }
}

// Hook to get token addresses
function useTokenAddresses() {
  const [addresses, setAddresses] = useState<Record<string, `0x${string}` | 'native'>>({
    'HYPE': 'native'
  })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchTokenAddresses().then(addr => {
      setAddresses(addr)
      setLoading(false)
    })
  }, [])
  
  return { addresses, loading }
}

// Get token address based on symbol
function getTokenAddress(symbol: string, addresses: Record<string, `0x${string}` | 'native'>): `0x${string}` | 'native' | null {
  return addresses[symbol] || null
}

interface UseTokenBalanceProps {
  address?: `0x${string}`
  token: string
  enabled?: boolean
}

export function useTokenBalance({ address, token, enabled = true }: UseTokenBalanceProps) {
  const { addresses, loading } = useTokenAddresses()
  const tokenAddress = useMemo(() => {
    return getTokenAddress(token, addresses)
  }, [token, addresses])
  
  // For native HYPE token
  const { 
    data: nativeBalance, 
    isLoading: nativeLoading, 
    error: nativeError 
  } = useBalance({
    address,
    query: {
      enabled: enabled && !!address && tokenAddress === 'native'
    }
  })
  
  // For ERC20 tokens - only if we have a valid contract address
  const { 
    data: erc20Balance, 
    isLoading: erc20Loading, 
    error: erc20Error 
  } = useBalance({
    address,
    token: tokenAddress && tokenAddress !== 'native' ? tokenAddress : undefined,
    query: {
      enabled: enabled && !!address && tokenAddress !== 'native' && !!tokenAddress
    }
  })
  
  const result = useMemo(() => {
    // If still loading addresses, return loading state
    if (loading) {
      return {
        balance: null,
        isLoading: true,
        error: null
      }
    }
    
    if (tokenAddress === 'native') {
      return {
        balance: nativeBalance,
        isLoading: nativeLoading,
        error: nativeError
      }
    } else if (tokenAddress) {
      return {
        balance: erc20Balance,
        isLoading: erc20Loading,
        error: erc20Error
      }
    } else {
      // No contract address available - return silent error (don't log constantly)
      return {
        balance: null,
        isLoading: false,
        error: null // Return null instead of error to stop spam
      }
    }
  }, [loading, tokenAddress, nativeBalance, nativeLoading, nativeError, erc20Balance, erc20Loading, erc20Error])
  
  const formattedBalance = useMemo(() => {
    if (!result.balance) return '0.00'
    
    try {
      const formatted = formatUnits(result.balance.value, result.balance.decimals)
      const num = parseFloat(formatted)
      
      // Format based on token type and amount
      if (token === 'HYPE' || token === 'BTC' || token === 'ETH') {
        return num.toFixed(6) // More precision for valuable tokens
      } else if (token === 'USDC' || token === 'USDT') {
        return num.toFixed(2) // Standard USD precision
      } else {
        return num.toLocaleString('en-US', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 6 
        })
      }
    } catch (error) {
      console.error('Error formatting balance:', error)
      return '0.00'
    }
  }, [result.balance, token])
  
  return {
    balance: result.balance,
    formattedBalance,
    isLoading: result.isLoading,
    error: result.error,
    symbol: result.balance?.symbol || token,
    decimals: result.balance?.decimals || 18
  }
}

// Hook for multiple token balances
// Uses individual balance fetches - this is a simplified version that only supports HYPE
export function useMultipleTokenBalances(address?: `0x${string}`, tokens: string[] = []) {
  // Get HYPE balance (native token)
  const hypeBalance = useTokenBalance({ address, token: 'HYPE', enabled: !!address && tokens.includes('HYPE') })
  
  // Build balances object
  const balances = useMemo(() => {
    const result: Record<string, {
      balance: typeof hypeBalance.balance
      formattedBalance: string
      isLoading: boolean
      error: Error | null
      symbol: string
      decimals: number
    }> = {}
    
    if (tokens.includes('HYPE')) {
      result['HYPE'] = {
        balance: hypeBalance.balance,
        formattedBalance: hypeBalance.formattedBalance,
        isLoading: hypeBalance.isLoading,
        error: hypeBalance.error,
        symbol: hypeBalance.symbol,
        decimals: hypeBalance.decimals
      }
    }
    
    // For other tokens, return placeholder (only HYPE is supported as native)
    tokens.filter(t => t !== 'HYPE').forEach(token => {
      result[token] = {
        balance: null,
        formattedBalance: '0.00',
        isLoading: false,
        error: null,
        symbol: token,
        decimals: 18
      }
    })
    
    return result
  }, [tokens, hypeBalance])
  
  const isAnyLoading = hypeBalance.isLoading
  const hasErrors = !!hypeBalance.error
  
  return {
    balances,
    isLoading: isAnyLoading,
    hasErrors
  }
}