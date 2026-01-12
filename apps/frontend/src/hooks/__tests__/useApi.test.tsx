import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { usePrices, useTokens, useTriggers, useAnalyticsOverview } from '../useApi'

// Mock the API client
jest.mock('@hyper-trigger/api-client/vanilla', () => ({
  configureApi: jest.fn(),
  api: {
    getPrices: jest.fn().mockResolvedValue({
      data: {
        prices: {
          BTC: { symbol: 'BTC', price: 100000, change24h: 2.5 },
          ETH: { symbol: 'ETH', price: 3500, change24h: -1.2 },
          HYPE: { symbol: 'HYPE', price: 25, change24h: 5.0 },
        },
        timestamp: new Date().toISOString(),
      },
    }),
    getTokens: jest.fn().mockResolvedValue({
      data: {
        tokens: [
          { symbol: 'BTC', displayName: 'Bitcoin', category: 'major', isActive: true },
          { symbol: 'ETH', displayName: 'Ethereum', category: 'major', isActive: true },
          { symbol: 'HYPE', displayName: 'HYPE', category: 'native', isActive: true },
        ],
      },
    }),
    getTriggers: jest.fn().mockResolvedValue({
      data: {
        triggers: [
          {
            id: 1,
            user: '0x1234567890abcdef1234567890abcdef12345678',
            inputToken: 'USDC',
            targetToken: 'BTC',
            triggerToken: 'BTC',
            inputAmount: '1000',
            triggerPrice: '100000',
            isAbove: true,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    }),
    getAnalyticsOverview: jest.fn().mockResolvedValue({
      data: {
        totalTriggers: 100,
        activeTriggers: 42,
        executedTriggers: 50,
        cancelledTriggers: 8,
        totalVolume: '5000000',
        totalVolumeUsd: 5000000,
        uniqueUsers: 25,
        popularTokens: [
          { symbol: 'BTC', count: 30 },
          { symbol: 'ETH', count: 25 },
        ],
        timestamp: new Date().toISOString(),
      },
    }),
  },
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return TestWrapper
}

describe('useApi hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('usePrices', () => {
    it('should fetch and return prices', async () => {
      const { result } = renderHook(() => usePrices(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.prices).toBeDefined()
      expect(result.current.data?.prices.BTC.price).toBe(100000)
      expect(result.current.data?.prices.ETH.price).toBe(3500)
      expect(result.current.data?.prices.HYPE.price).toBe(25)
    })
  })

  describe('useTokens', () => {
    it('should fetch and return tokens', async () => {
      const { result } = renderHook(() => useTokens(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.tokens).toHaveLength(3)
      expect(result.current.data?.tokens[0].symbol).toBe('BTC')
    })
  })

  describe('useTriggers', () => {
    it('should fetch and return triggers', async () => {
      const { result } = renderHook(() => useTriggers(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.triggers).toHaveLength(1)
      expect(result.current.data?.triggers[0].status).toBe('active')
    })

    it('should filter by status when provided', async () => {
      const { result } = renderHook(() => useTriggers({ status: 'active' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.triggers[0].status).toBe('active')
    })
  })

  describe('useAnalyticsOverview', () => {
    it('should fetch and return analytics', async () => {
      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.totalTriggers).toBe(100)
      expect(result.current.data?.activeTriggers).toBe(42)
      expect(result.current.data?.uniqueUsers).toBe(25)
    })
  })
})

