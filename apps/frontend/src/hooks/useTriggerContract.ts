'use client'

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import { CONTRACTS, TRIGGER_MANAGER_ABI } from '@/components/triggers/constants'
import { getAssetIndexMap } from '@hyper-trigger/shared/tokens'

// Use shared asset index mapping for consistency
const ASSET_INDEX_MAP = getAssetIndexMap()

// Helper function to get asset index for a token symbol
const getAssetIndex = (tokenSymbol: string): number => {
  const index = ASSET_INDEX_MAP[tokenSymbol]
  if (index === undefined) {
    console.warn(`⚠️ No asset index found for ${tokenSymbol}, using 0 as fallback`)
    return 0 // Fallback to SOL index
  }
  return index
}

// Helper to get token ID for bridging
const getTokenId = (tokenSymbol: string): number => {
  // Token ID mapping based on our shared constants
  const TOKEN_ID_MAP: Record<string, number> = {
    'HYPE': 0,
    'USDC': 1,
    'BTC': 142,
    'ETH': 156,
    'SOL': 0,
  }
  return TOKEN_ID_MAP[tokenSymbol] || 1 // Default to USDC
}

export interface CreateTriggerParams {
  targetToken: string      // Target token to buy (BTC, ETH, etc.)
  triggerToken: string     // Token to monitor for price (usually same as target)
  usdcAmount: string       // Amount of USDC to swap
  triggerPrice: number     // Target price with decimals
  isAbove: boolean         // true = trigger when price >= target
  slippagePercent: number  // 0-100
}

export function useTriggerContract() {
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  })

  const createTrigger = async (params: CreateTriggerParams) => {
    try {
      // Get the oracle index for the trigger token
      const targetOracleIndex = getAssetIndex(params.triggerToken)
      const targetTokenId = getTokenId(params.targetToken)
      
      console.log(`🎯 Creating USDC → ${params.targetToken} trigger`)
      console.log(`📊 Oracle index: ${targetOracleIndex} for ${params.triggerToken}`)
      console.log(`🪙 Target token ID: ${targetTokenId}`)
      
      // Convert USDC amount (6 decimals)
      const usdcAmountWei = parseUnits(params.usdcAmount, 6)
      
      // Convert price to wei (18 decimals for precision)
      const triggerPriceWei = parseEther(params.triggerPrice.toString())

      // Convert slippage percentage to basis points (multiply by 100)
      const slippageBasisPoints = Math.round(params.slippagePercent * 100)

      // Execution reward (0.01 HYPE)
      const executionRewardWei = parseEther('0.01')

      console.log(`💰 USDC amount: ${params.usdcAmount} (${usdcAmountWei.toString()} wei)`)
      console.log(`🎯 Trigger price: $${params.triggerPrice} (${triggerPriceWei.toString()} wei)`)
      console.log(`📈 Condition: Price ${params.isAbove ? '>=' : '<='} $${params.triggerPrice}`)
      console.log(`💸 Execution reward: 0.01 HYPE`)

      // Call the new TriggerContract
      writeContract({
        address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
        abi: TRIGGER_MANAGER_ABI,
        functionName: 'createTrigger',
        args: [
          targetOracleIndex,    // Oracle index for price monitoring
          BigInt(targetTokenId), // Target token ID to buy
          usdcAmountWei,        // Amount of USDC to swap
          triggerPriceWei,      // Trigger price (18 decimals)
          params.isAbove,       // Trigger condition
          BigInt(slippageBasisPoints) // Max slippage in basis points
        ],
        value: executionRewardWei // Send execution reward in HYPE
      })
    } catch (error) {
      console.error('❌ Error creating trigger:', error)
      throw error
    }
  }

  // Hook to read execution reward
  const { data: executionReward } = useReadContract({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    functionName: 'executionReward',
  })

  // Hook to read USDC token ID
  const { data: usdcTokenId } = useReadContract({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    functionName: 'USDC_TOKEN_ID',
  })

  // Hook to get trigger details
  const getTrigger = (triggerId: number) => {
    return useReadContract({
      address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
      abi: TRIGGER_MANAGER_ABI,
      functionName: 'getTrigger',
      args: [BigInt(triggerId)],
    })
  }

  // Hook to get user's triggers
  const getUserTriggers = (userAddress: string) => {
    return useReadContract({
      address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
      abi: TRIGGER_MANAGER_ABI,
      functionName: 'getUserTriggers',
      args: [userAddress as `0x${string}`],
    })
  }

  return {
    createTrigger,
    getTrigger,
    getUserTriggers,
    executionReward,
    usdcTokenId,
    hash,
    isWritePending,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
    contractAddress: CONTRACTS.TRIGGER_CONTRACT.ADDRESS
  }
} 