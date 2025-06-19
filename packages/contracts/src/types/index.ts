// Basic trigger types - will be enhanced when we generate from contracts
export interface TriggerData {
  id: string
  user: string
  baseToken: string
  targetToken: string
  triggerPrice: string
  action: 'buy' | 'sell'
  amount: string
  status: 'active' | 'executed' | 'cancelled' | 'expired'
  createdAt: number
  expiresAt?: number
}

export interface PriceData {
  token: string
  price: string
  timestamp: number
  source: string
}

// Contract event types
export interface TriggerCreatedEvent {
  triggerId: string
  user: string
  baseToken: string
  targetToken: string
  triggerPrice: string
  action: 'buy' | 'sell'
  amount: string
}

export interface TriggerExecutedEvent {
  triggerId: string
  executor: string
  executionPrice: string
  amountIn: string
  amountOut: string
  gasUsed: string
}

export interface TriggerCancelledEvent {
  triggerId: string
  user: string
  reason: string
} 