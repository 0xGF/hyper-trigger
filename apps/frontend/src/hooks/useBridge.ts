'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, useSwitchChain } from 'wagmi'
import { parseEther, parseUnits, formatUnits, erc20Abi } from 'viem'
import { hyperEvmTestnet } from '@/lib/networks'

// Network configuration
const IS_TESTNET = process.env.NEXT_PUBLIC_NETWORK === 'testnet'
const HL_API_URL = IS_TESTNET ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'
const EXPECTED_CHAIN_ID = IS_TESTNET ? 998 : 999

// Bridge Helper contract address - validate format
const BRIDGE_HELPER_ADDRESS = (() => {
  const addr = process.env.NEXT_PUBLIC_BRIDGE_HELPER_ADDRESS
  if (!addr) {
    return '0x0000000000000000000000000000000000000000' as `0x${string}`
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    console.warn('[useBridge] Invalid NEXT_PUBLIC_BRIDGE_HELPER_ADDRESS format')
    return '0x0000000000000000000000000000000000000000' as `0x${string}`
  }
  return addr as `0x${string}`
})()

// HyperCore system addresses
const HYPE_SYSTEM_ADDRESS = '0x2222222222222222222222222222222222222222' as const

// USDC address on HyperEVM (needs to be configured per network)
const USDC_ADDRESS = (() => {
  const addr = process.env.NEXT_PUBLIC_USDC_ADDRESS
  if (!addr) {
    return '0x0000000000000000000000000000000000000000' as `0x${string}`
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    console.warn('[useBridge] Invalid NEXT_PUBLIC_USDC_ADDRESS format')
    return '0x0000000000000000000000000000000000000000' as `0x${string}`
  }
  return addr as `0x${string}`
})()
const USDC_DECIMALS = 6

// Bridge Helper ABI
const BRIDGE_HELPER_ABI = [
  {
    type: 'function',
    name: 'bridgeHype',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'bridgeToken',
    inputs: [
      { name: 'symbol', type: 'string' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSystemAddress',
    inputs: [{ name: 'tokenIndex', type: 'uint64' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'pure',
  },
] as const

export interface BridgeState {
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: string | null
  txHash: string | null
}

export interface SpotBalance {
  symbol: string
  available: string
  total: string
}

export function useBridge() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  const [bridgeState, setBridgeState] = useState<BridgeState>({
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    txHash: null,
  })

  const [spotBalances, setSpotBalances] = useState<SpotBalance[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)

  // Check if on correct chain
  const isWrongChain = chainId !== EXPECTED_CHAIN_ID

  // Get native HYPE balance
  const { data: hypeBalance } = useBalance({
    address,
    chainId: EXPECTED_CHAIN_ID,
  })

  // Get USDC balance (ERC20)
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
  })

  // Contract write for bridging
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract()

  // Wait for transaction
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Update state based on transaction status
  useEffect(() => {
    if (isWritePending) {
      setBridgeState(prev => ({ ...prev, isPending: true, error: null }))
    }
    if (hash) {
      setBridgeState(prev => ({ ...prev, txHash: hash }))
    }
    if (isConfirming) {
      setBridgeState(prev => ({ ...prev, isPending: false, isConfirming: true }))
    }
    if (isConfirmed) {
      setBridgeState(prev => ({ ...prev, isConfirming: false, isSuccess: true }))
    }
    if (writeError || confirmError) {
      const error = writeError || confirmError
      setBridgeState(prev => ({
        ...prev,
        isPending: false,
        isConfirming: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      }))
    }
  }, [isWritePending, hash, isConfirming, isConfirmed, writeError, confirmError])

  // Fetch HyperCore spot balances
  const fetchSpotBalances = useCallback(async () => {
    if (!address || !isConnected) {
      setSpotBalances([])
      return
    }

    setIsLoadingBalances(true)

    try {
      const response = await fetch(`${HL_API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'spotClearinghouseState',
          user: address,
        }),
      })

      const data = await response.json()
      
      // API might return error in JSON body even with 200 status
      if (!response.ok || data.error) {
        setSpotBalances([])
        return
      }
      
      // Parse balances from response
      const balances: SpotBalance[] = data.balances?.map((b: { coin: string; hold: string; total: string }) => ({
        symbol: b.coin,
        available: (parseFloat(b.total) - parseFloat(b.hold)).toFixed(6),
        total: b.total,
      })) || []

      setSpotBalances(balances)
    } catch {
      setSpotBalances([])
    } finally {
      setIsLoadingBalances(false)
    }
  }, [address, isConnected])

  // Switch to correct chain
  const ensureCorrectChain = useCallback(async () => {
    if (isWrongChain && switchChain) {
      try {
        await switchChain({ chainId: EXPECTED_CHAIN_ID })
        return true
      } catch {
        throw new Error(`Please switch to HyperEVM ${IS_TESTNET ? 'Testnet' : 'Mainnet'}`)
      }
    }
    return true
  }, [isWrongChain, switchChain])

  // Bridge HYPE to HyperCore
  const bridgeHype = useCallback(async (amount: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Ensure correct chain
    await ensureCorrectChain()

    setBridgeState({
      isPending: true,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null,
    })

    try {
      const amountWei = parseEther(amount)

      // Direct transfer to HYPE system address
      writeContract({
        address: HYPE_SYSTEM_ADDRESS,
        abi: [{
          type: 'fallback',
          stateMutability: 'payable',
        }] as const,
        functionName: '' as never,
        value: amountWei,
        chainId: EXPECTED_CHAIN_ID,
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bridge failed'
      setBridgeState(prev => ({
        ...prev,
        isPending: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [address, isConnected, writeContract, ensureCorrectChain])

  // Bridge USDC to HyperCore
  const bridgeUsdc = useCallback(async (amount: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Ensure correct chain
    await ensureCorrectChain()

    setBridgeState({
      isPending: true,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null,
    })

    try {
      const amountUnits = parseUnits(amount, USDC_DECIMALS)
      
      // USDC system address (spot index 0 for USDC on Hyperliquid)
      const usdcSystemAddress = '0x2000000000000000000000000000000000000000' as `0x${string}`

      // Transfer USDC to system address
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [usdcSystemAddress, amountUnits],
        chainId: EXPECTED_CHAIN_ID,
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bridge failed'
      setBridgeState(prev => ({
        ...prev,
        isPending: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [address, isConnected, writeContract, ensureCorrectChain])

  // Reset state
  const reset = useCallback(() => {
    setBridgeState({
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null,
    })
  }, [])

  // Fetch balances on mount and after successful bridge
  useEffect(() => {
    fetchSpotBalances()
  }, [fetchSpotBalances])

  useEffect(() => {
    if (bridgeState.isSuccess) {
      // Refresh balances after successful bridge
      setTimeout(fetchSpotBalances, 2000)
    }
  }, [bridgeState.isSuccess, fetchSpotBalances])

  return {
    // State
    bridgeState,
    spotBalances,
    isLoadingBalances,
    isWrongChain,
    
    // EVM Balances
    hypeBalance: hypeBalance ? formatUnits(hypeBalance.value, 18) : '0',
    usdcBalance: usdcBalance ? formatUnits(usdcBalance.value, USDC_DECIMALS) : '0',
    
    // Actions
    bridgeHype,
    bridgeUsdc,
    fetchSpotBalances,
    ensureCorrectChain,
    reset,
  }
}

