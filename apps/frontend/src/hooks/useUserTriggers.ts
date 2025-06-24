import { useState, useEffect, useMemo } from 'react'
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, TRIGGER_MANAGER_ABI } from '@/components/triggers/constants'

export interface UserTrigger {
  id: string
  user: string
  fromToken: string
  toToken: string
  triggerToken: string
  fromAmount: string
  triggerPrice: string
  isAbove: boolean
  status: 'active' | 'triggered' | 'cancelled' | 'pending'
  createdAt: string
  hash?: string
}

// Asset index mapping for oracle
const INDEX_TO_SYMBOL: Record<number, string> = {
  0: 'SOL',
  1: 'HYPE', 
  3: 'BTC',
  4: 'ETH'
}

const getTokenSymbol = (assetIndex: number): string => {
  return INDEX_TO_SYMBOL[assetIndex] || `Asset_${assetIndex}`
}

export function useUserTriggers() {
  const { address, isConnected } = useAccount()
  const [triggers, setTriggers] = useState<UserTrigger[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Get trigger IDs
  const { data: triggerIds } = useReadContract({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    functionName: 'getUserTriggers',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 5000,
    }
  })

  // Load trigger details when IDs change
  useEffect(() => {
    if (!triggerIds || !Array.isArray(triggerIds) || triggerIds.length === 0) {
      setTriggers([])
      return
    }

    const loadTriggerDetails = async () => {
      setIsLoading(true)
      const newTriggers: UserTrigger[] = []

      // Load triggers in parallel (max 10)
      const promises = (triggerIds as any[]).slice(0, 10).map(async (triggerId: any) => {
        try {
          // This would need to be implemented with a batch call or individual calls
          // For now, returning null to show the structure
          return null
        } catch (error) {
          console.error(`Failed to load trigger ${triggerId}:`, error)
          return null
        }
      })

      await Promise.all(promises)
      setTriggers(newTriggers)
      setIsLoading(false)
    }

    loadTriggerDetails()
  }, [triggerIds])

  // Watch for new triggers
  useWatchContractEvent({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    eventName: 'TriggerCreated',
    onLogs: (logs: any) => {
      logs.forEach((log: any) => {
        if (log.args?.user === address) {
          const newTrigger: UserTrigger = {
            id: log.args.triggerId?.toString() || '',
            user: log.args.user || '',
            fromToken: log.args.fromToken || '',
            toToken: log.args.toToken || '',
            triggerToken: getTokenSymbol(Number(log.args.triggerAssetIndex || 0)),
            fromAmount: formatUnits(BigInt(log.args.fromAmount || 0), 18),
            triggerPrice: formatUnits(BigInt(log.args.triggerPrice || 0), 18),
            isAbove: log.args.isAbove || false,
            status: 'active',
            createdAt: new Date().toISOString(),
            hash: log.transactionHash
          }
          
          setTriggers(prev => [newTrigger, ...prev])
        }
      })
    }
  })

  // Watch for executed triggers
  useWatchContractEvent({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    eventName: 'TriggerExecuted',
    onLogs: (logs: any) => {
      logs.forEach((log: any) => {
        const triggerId = log.args?.triggerId?.toString()
        if (triggerId) {
          setTriggers(prev => 
            prev.map(t => 
              t.id === triggerId ? { ...t, status: 'triggered' as const } : t
            )
          )
        }
      })
    }
  })

  // Watch for cancelled triggers
  useWatchContractEvent({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    eventName: 'TriggerCancelled',
    onLogs: (logs: any) => {
      logs.forEach((log: any) => {
        if (log.args?.user === address) {
          const triggerId = log.args.triggerId?.toString()
          if (triggerId) {
            setTriggers(prev => 
              prev.map(t => 
                t.id === triggerId ? { ...t, status: 'cancelled' as const } : t
              )
            )
          }
        }
      })
    }
  })

  const activeTriggers = useMemo(() => 
    triggers.filter(t => t.status === 'active'), 
    [triggers]
  )

  return {
    triggers,
    activeTriggers,
    isLoading
  }
} 