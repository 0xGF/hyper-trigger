'use client'

import { useQuery } from '@tanstack/react-query'
import {
  configureApi,
  api,
  type PricesResponseDto,
  type PricesResponseDtoPrices,
  type PriceResponseDto,
  type PriceHistoryResponseDto,
  type TokensResponseDto,
  type TokenDto,
  type TriggersResponseDto,
  type TriggerDto,
  type TriggerDtoStatus,
  type TriggerCheckResponseDto,
  type AnalyticsOverviewResponseDto,
  type UserAnalyticsResponseDto,
  type HealthResponseDto,
} from '@hyper-trigger/api-client/vanilla'

// Configure API base URL based on environment
if (typeof window !== 'undefined') {
  configureApi({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  })
}

// ============================================
// Price Hooks
// ============================================

export function usePrices() {
  return useQuery({
    queryKey: ['prices'],
    queryFn: async (): Promise<PricesResponseDto> => {
      try {
        const res = await api.getPrices()
        return res.data ?? { prices: {}, timestamp: '' }
      } catch {
        return { prices: {}, timestamp: '' }
      }
    },
    refetchInterval: 2000,
    staleTime: 1000,
  })
}

export function usePrice(symbol: string) {
  return useQuery({
    queryKey: ['price', symbol],
    queryFn: async () => {
      const res = await api.getPriceBySymbol(symbol)
      return res.data
    },
    enabled: !!symbol,
    refetchInterval: 5000,
    staleTime: 3000,
  })
}

export function usePriceHistory(
  symbol: string,
  options?: { interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'; limit?: number }
) {
  return useQuery({
    queryKey: ['priceHistory', symbol, options],
    queryFn: async () => {
      const res = await api.getPriceHistory(symbol, options)
      return res.data
    },
    enabled: !!symbol,
    staleTime: 60000,
  })
}

// ============================================
// Token Hooks
// ============================================

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const res = await api.getTokens()
      return res.data
    },
    staleTime: 300000,
  })
}

export function useToken(symbol: string) {
  return useQuery({
    queryKey: ['token', symbol],
    queryFn: async () => {
      const res = await api.getTokenBySymbol(symbol)
      return res.data
    },
    enabled: !!symbol,
    staleTime: 300000,
  })
}

// ============================================
// Trigger Hooks
// ============================================

export function useTriggers(options?: {
  status?: 'active' | 'executed' | 'cancelled' | 'expired' | 'all'
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['triggers', options],
    queryFn: async () => {
      const res = await api.getTriggers(options)
      return res.data
    },
    refetchInterval: 10000,
  })
}

export function useTrigger(triggerId: number) {
  return useQuery({
    queryKey: ['trigger', triggerId],
    queryFn: async () => {
      const res = await api.getTriggerById(triggerId)
      return res.data
    },
    enabled: triggerId > 0,
    refetchInterval: 5000,
  })
}

export function useUserTriggersApi(
  address: string | undefined,
  status?: 'active' | 'executed' | 'cancelled' | 'expired' | 'all'
) {
  return useQuery({
    queryKey: ['userTriggers', address, status],
    queryFn: async () => {
      const res = await api.getTriggersByUser(address!, { status })
      return res.data
    },
    enabled: !!address,
    refetchInterval: 10000,
  })
}

export function useTriggerCheck(triggerId: number) {
  return useQuery({
    queryKey: ['triggerCheck', triggerId],
    queryFn: async () => {
      const res = await api.checkTriggerReady(triggerId)
      return res.data
    },
    enabled: triggerId > 0,
    refetchInterval: 5000,
  })
}

// ============================================
// Analytics Hooks
// ============================================

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: async () => {
      const res = await api.getAnalyticsOverview()
      return res.data
    },
    staleTime: 30000,
    refetchInterval: 60000,
  })
}

export function useUserAnalytics(address: string | undefined) {
  return useQuery({
    queryKey: ['userAnalytics', address],
    queryFn: async () => {
      const res = await api.getUserAnalytics(address!)
      return res.data
    },
    enabled: !!address,
    staleTime: 30000,
  })
}

// ============================================
// Health Hook
// ============================================

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await api.getHealth()
      return res.data
    },
    staleTime: 10000,
    refetchInterval: 30000,
  })
}

// ============================================
// Re-exports
// ============================================

export { api, configureApi }
export type {
  PricesResponseDto,
  PricesResponseDtoPrices,
  PriceResponseDto,
  PriceHistoryResponseDto,
  TokensResponseDto,
  TokenDto,
  TriggersResponseDto,
  TriggerDto,
  TriggerDtoStatus,
  TriggerCheckResponseDto,
  AnalyticsOverviewResponseDto,
  UserAnalyticsResponseDto,
  HealthResponseDto,
}
