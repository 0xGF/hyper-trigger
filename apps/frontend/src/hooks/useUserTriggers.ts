'use client'

import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useUserTriggersApi, type TriggerDto, type TriggerDtoStatus } from './useApi'

// Re-export types from Orval
export type { TriggerDto, TriggerDtoStatus }

export function useUserTriggers() {
  const { address, isConnected } = useAccount()
  
  // Use the Orval-generated API hook
  const { data, isLoading, error } = useUserTriggersApi(
    isConnected ? address : undefined,
    'all'
  )
  
  const triggers = useMemo(() => data?.triggers ?? [], [data?.triggers])
  
  const activeTriggers = useMemo(() => 
    triggers.filter((t: TriggerDto) => t.status === 'active'), 
    [triggers]
  )
  
  const executedTriggers = useMemo(() =>
    triggers.filter((t: TriggerDto) => t.status === 'executed'),
    [triggers]
  )
  
  const cancelledTriggers = useMemo(() =>
    triggers.filter((t: TriggerDto) => t.status === 'cancelled'),
    [triggers]
  )

  return {
    triggers,
    activeTriggers,
    executedTriggers,
    cancelledTriggers,
    isLoading,
    error,
    total: data?.total ?? 0
  }
}
