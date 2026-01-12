// Vanilla (non-React Query) API client
// Re-exports from generated vanilla client

export { configureApi, getApiConfig, ApiError } from './fetcher.js'
export * from './vanilla/client.js'

// Convenience API object for easier usage
import {
  healthControllerGetHealth,
  pricesControllerGetPrices,
  pricesControllerGetPriceBySymbol,
  pricesControllerGetPriceHistory,
  tokensControllerGetTokens,
  tokensControllerGetTokenBySymbol,
  triggersControllerGetTriggers,
  triggersControllerGetTriggerById,
  triggersControllerGetUserTriggers,
  triggersControllerCheckTrigger,
  analyticsControllerGetOverview,
  analyticsControllerGetUserAnalytics,
  type TriggersControllerGetTriggersParams,
  type TriggersControllerGetUserTriggersParams,
  type PricesControllerGetPriceHistoryParams,
} from './vanilla/client.js'

export const api = {
  // Health
  getHealth: () => healthControllerGetHealth(),

  // Prices
  getPrices: () => pricesControllerGetPrices(),
  getPriceBySymbol: (symbol: string) => pricesControllerGetPriceBySymbol(symbol),
  getPriceHistory: (symbol: string, params?: PricesControllerGetPriceHistoryParams) =>
    pricesControllerGetPriceHistory(symbol, params),

  // Tokens
  getTokens: () => tokensControllerGetTokens(),
  getTokenBySymbol: (symbol: string) => tokensControllerGetTokenBySymbol(symbol),

  // Triggers
  getTriggers: (params?: TriggersControllerGetTriggersParams) =>
    triggersControllerGetTriggers(params),
  getTriggerById: (triggerId: number) => triggersControllerGetTriggerById(triggerId),
  getTriggersByUser: (address: string, params?: TriggersControllerGetUserTriggersParams) =>
    triggersControllerGetUserTriggers(address, params),
  checkTriggerReady: (triggerId: number) => triggersControllerCheckTrigger(triggerId),

  // Analytics
  getAnalyticsOverview: () => analyticsControllerGetOverview(),
  getUserAnalytics: (address: string) => analyticsControllerGetUserAnalytics(address),
}

// Re-export types for convenience
export type {
  HealthResponseDto,
  PricesResponseDto,
  PriceResponseDto,
  PriceHistoryResponseDto,
  CandleDto,
  TokensResponseDto,
  TokenDto,
  TriggersResponseDto,
  TriggerDto,
  TriggerCheckResponseDto,
  AnalyticsOverviewResponseDto,
  UserAnalyticsResponseDto,
} from './vanilla/client.js'
