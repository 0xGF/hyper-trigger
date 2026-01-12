'use client'

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount, useSwitchChain } from 'wagmi'
import { parseEther, parseUnits } from 'viem'

// Network configuration
const IS_TESTNET = process.env.NEXT_PUBLIC_NETWORK === 'testnet'
const EXPECTED_CHAIN_ID = IS_TESTNET ? 998 : 999

// Contract address - matches deployed TriggerContract
// Validate at module load to catch configuration errors early
const TRIGGER_CONTRACT_ADDRESS = (() => {
  const addr = process.env.NEXT_PUBLIC_TRIGGER_CONTRACT_ADDRESS
  if (!addr) {
    console.warn('[useTriggerContract] NEXT_PUBLIC_TRIGGER_CONTRACT_ADDRESS not set, using default')
    return '0x9029f0676F1Df986DC4bB3aca37158186ad8e570' as `0x${string}`
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    console.error('[useTriggerContract] Invalid NEXT_PUBLIC_TRIGGER_CONTRACT_ADDRESS format')
    throw new Error('Invalid trigger contract address format')
  }
  return addr as `0x${string}`
})()

// ABI matching TriggerContract.sol
const TRIGGER_ABI = [
  {
    type: 'function',
    name: 'createTrigger',
    inputs: [
      { name: 'watchAsset', type: 'string' },
      { name: 'targetPrice', type: 'uint256' },
      { name: 'isAbove', type: 'bool' },
      { name: 'tradeAsset', type: 'string' },
      { name: 'isBuy', type: 'bool' },
      { name: 'amount', type: 'uint256' },
      { name: 'maxSlippage', type: 'uint256' },
      { name: 'durationHours', type: 'uint256' },
    ],
    outputs: [{ name: 'triggerId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'cancelTrigger',
    inputs: [{ name: 'triggerId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateTriggerPrice',
    inputs: [
      { name: 'oldTriggerId', type: 'uint256' },
      { name: 'newTargetPrice', type: 'uint256' },
      { name: 'newIsAbove', type: 'bool' },
    ],
    outputs: [{ name: 'newTriggerId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getTrigger',
    inputs: [{ name: 'triggerId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        name: '',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'watchAsset', type: 'string' },
          { name: 'targetPrice', type: 'uint256' },
          { name: 'isAbove', type: 'bool' },
          { name: 'tradeAsset', type: 'string' },
          { name: 'isBuy', type: 'bool' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxSlippage', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'feePaid', type: 'uint256' },
          { name: 'executedAt', type: 'uint256' },
          { name: 'executionPrice', type: 'uint256' },
          { name: 'executionTxHash', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserTriggers',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserActiveTriggers',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        type: 'tuple[]',
        name: '',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'watchAsset', type: 'string' },
          { name: 'targetPrice', type: 'uint256' },
          { name: 'isAbove', type: 'bool' },
          { name: 'tradeAsset', type: 'string' },
          { name: 'isBuy', type: 'bool' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxSlippage', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'feePaid', type: 'uint256' },
          { name: 'executedAt', type: 'uint256' },
          { name: 'executionPrice', type: 'uint256' },
          { name: 'executionTxHash', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'triggerFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextTriggerId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'checkTrigger',
    inputs: [
      { name: 'triggerId', type: 'uint256' },
      { name: 'currentPrice', type: 'uint256' },
    ],
    outputs: [
      { name: 'shouldExecute', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    stateMutability: 'view',
  },
] as const

// Trigger status enum
export enum TriggerStatus {
  Active = 0,
  Executed = 1,
  Cancelled = 2,
  Expired = 3,
  Failed = 4,
}

// Trigger structure
export interface Trigger {
  id: bigint
  user: string
  watchAsset: string
  targetPrice: bigint
  isAbove: boolean
  tradeAsset: string
  isBuy: boolean
  amount: bigint
  maxSlippage: bigint
  createdAt: bigint
  expiresAt: bigint
  status: number
  feePaid: bigint
  executedAt: bigint
  executionPrice: bigint
  executionTxHash: string
}

export interface CreateTriggerParams {
  watchAsset: string      // Asset to monitor (e.g., "BTC")
  targetPrice: number     // Price level in USD
  isAbove: boolean        // true = trigger when >= price
  tradeAsset: string      // Asset to trade (e.g., "HYPE")
  isBuy: boolean          // true = buy with USDC, false = sell for USDC
  amount: string          // Amount to trade (USDC for buy, token amount for sell)
  slippagePercent: number // Slippage tolerance (e.g., 1 for 1%)
  durationHours: number   // How long trigger is valid
}

export function useTriggerContract() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  const isWrongChain = chainId !== EXPECTED_CHAIN_ID
  
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Get trigger fee
  const { data: triggerFee } = useReadContract({
    address: TRIGGER_CONTRACT_ADDRESS,
    abi: TRIGGER_ABI,
    functionName: 'triggerFee',
    chainId: EXPECTED_CHAIN_ID,
  })
  
  // Ensure correct chain before transactions
  const ensureCorrectChain = async () => {
    if (isWrongChain && switchChain) {
      try {
        await switchChain({ chainId: EXPECTED_CHAIN_ID })
      } catch {
        throw new Error(`Please switch to HyperEVM ${IS_TESTNET ? 'Testnet' : 'Mainnet'}`)
      }
    }
  }

  // Create a new trigger - returns promise that resolves with tx hash
  const createTrigger = async (params: CreateTriggerParams): Promise<`0x${string}` | undefined> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Ensure correct chain
    await ensureCorrectChain()

    // Convert price to 6 decimals (Hyperliquid format)
    const targetPriceWei = parseUnits(params.targetPrice.toString(), 6)
    
    // Convert amount based on trade direction
    // For buys: amount is USDC (6 decimals)
    // For sells: amount is token amount (18 decimals typically)
    const amountDecimals = params.isBuy ? 6 : 18
    const amountWei = parseUnits(params.amount, amountDecimals)
    
    // Convert slippage to basis points (1% = 100)
    const maxSlippageBps = BigInt(Math.round(params.slippagePercent * 100))
    
    // Get fee (default to 0.001 HYPE if not fetched)
    const fee = triggerFee || parseEther('0.001')

    return new Promise((resolve, reject) => {
      writeContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'createTrigger',
        args: [
          params.watchAsset,
          targetPriceWei,
          params.isAbove,
          params.tradeAsset,
          params.isBuy,
          amountWei,
          maxSlippageBps,
          BigInt(params.durationHours),
        ],
        value: fee,
        chainId: EXPECTED_CHAIN_ID,
      }, {
        onSuccess: (hash) => resolve(hash),
        onError: (error) => reject(error),
      })
    })
  }

  // Cancel a trigger - returns promise that resolves with tx hash
  const cancelTrigger = async (triggerId: number): Promise<`0x${string}` | undefined> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Ensure correct chain
    await ensureCorrectChain()

    return new Promise((resolve, reject) => {
      writeContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'cancelTrigger',
        args: [BigInt(triggerId)],
        chainId: EXPECTED_CHAIN_ID,
      }, {
        onSuccess: (hash) => resolve(hash),
        onError: (error) => reject(error),
      })
    })
  }

  // Update trigger price in a single transaction
  const updateTriggerPrice = async (
    oldTriggerId: number,
    newTargetPrice: number,
    newIsAbove: boolean
  ): Promise<`0x${string}` | undefined> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Ensure correct chain
    await ensureCorrectChain()

    // Convert price to 6 decimals
    const newTargetPriceWei = parseUnits(newTargetPrice.toString(), 6)

    return new Promise((resolve, reject) => {
      writeContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'updateTriggerPrice',
        args: [BigInt(oldTriggerId), newTargetPriceWei, newIsAbove],
        value: BigInt(0), // No additional fee needed - uses refunded fee
        chainId: EXPECTED_CHAIN_ID,
      }, {
        onSuccess: (hash) => resolve(hash),
        onError: (error) => reject(error),
      })
    })
  }

  return {
    createTrigger,
    cancelTrigger,
    updateTriggerPrice,
    reset: resetWrite,
    triggerFee,
    hash,
    isWritePending,
    isConfirming,
    isConfirmed,
    isWrongChain,
    error: writeError || confirmError,
    contractAddress: TRIGGER_CONTRACT_ADDRESS,
  }
}

// Hook to get a specific trigger
export function useTrigger(triggerId: number) {
  return useReadContract({
    address: TRIGGER_CONTRACT_ADDRESS,
    abi: TRIGGER_ABI,
    functionName: 'getTrigger',
    args: [BigInt(triggerId)],
    chainId: EXPECTED_CHAIN_ID,
    query: {
      enabled: triggerId > 0,
    },
  })
}

// Hook to get user's trigger IDs
export function useUserTriggerIds() {
  const { address } = useAccount()
  
  return useReadContract({
    address: TRIGGER_CONTRACT_ADDRESS,
    abi: TRIGGER_ABI,
    functionName: 'getUserTriggers',
    args: address ? [address] : undefined,
    chainId: EXPECTED_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  })
}

// Hook to get user's active triggers
export function useUserActiveTriggers() {
  const { address } = useAccount()
  
  return useReadContract({
    address: TRIGGER_CONTRACT_ADDRESS,
    abi: TRIGGER_ABI,
    functionName: 'getUserActiveTriggers',
    args: address ? [address] : undefined,
    chainId: EXPECTED_CHAIN_ID,
    query: {
      enabled: !!address,
      refetchInterval: 2000, // Refresh every 2 seconds to detect executions quickly
      staleTime: 500, // Consider data stale after 0.5 seconds
      gcTime: 1000, // Garbage collect after 1 second
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
    },
  })
}
