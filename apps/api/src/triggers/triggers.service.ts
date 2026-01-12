import { Injectable } from '@nestjs/common'
import { HyperliquidService } from '../hyperliquid/hyperliquid.service'
import { formatUnits } from 'viem'

// Status mapping
const TriggerStatus = ['active', 'executed', 'cancelled', 'expired'] as const

// Token symbol mapping (simplified - in production use shared package)
const TOKEN_SYMBOLS: Record<number, string> = {
  0: 'USDC',
  150: 'HYPE',
  197: 'UBTC',
  221: 'UETH',
  254: 'USOL',
}

// Raw trigger data from contract
interface RawTrigger {
  id: bigint
  user: string
  fromToken: bigint
  toToken: bigint
  triggerOracleIndex: number
  fromAmount: bigint
  triggerPrice: bigint
  isAbove: boolean
  status: number
  createdAt: bigint
  expiresAt?: bigint
}

export interface TriggerData {
  id: number
  user: string
  inputToken: string
  targetToken: string
  triggerToken: string
  inputAmount: string
  triggerPrice: string
  isAbove: boolean
  status: string
  createdAt: string
  expiresAt?: string
}

@Injectable()
export class TriggersService {
  constructor(private readonly hyperliquidService: HyperliquidService) {}

  private formatTrigger(trigger: RawTrigger): TriggerData {
    return {
      id: Number(trigger.id),
      user: trigger.user,
      inputToken: TOKEN_SYMBOLS[Number(trigger.fromToken)] || `Token_${trigger.fromToken}`,
      targetToken: TOKEN_SYMBOLS[Number(trigger.toToken)] || `Token_${trigger.toToken}`,
      triggerToken: TOKEN_SYMBOLS[Number(trigger.triggerOracleIndex)] || `Token_${trigger.triggerOracleIndex}`,
      inputAmount: formatUnits(trigger.fromAmount, 18),
      triggerPrice: formatUnits(trigger.triggerPrice, 18),
      isAbove: trigger.isAbove,
      status: TriggerStatus[trigger.status] || 'unknown',
      createdAt: new Date(Number(trigger.createdAt) * 1000).toISOString(),
      expiresAt: trigger.expiresAt
        ? new Date(Number(trigger.expiresAt) * 1000).toISOString()
        : undefined,
    }
  }

  async getTriggers(
    status: string = 'active',
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ triggers: TriggerData[]; total: number }> {
    const nextTriggerId = await this.hyperliquidService.getNextTriggerId()
    const totalTriggers = nextTriggerId - 1
    const triggers: TriggerData[] = []

    // Fetch triggers (starting from most recent)
    for (let i = totalTriggers; i >= 1 && triggers.length < limit + offset; i--) {
      const trigger = await this.hyperliquidService.getTrigger(i) as RawTrigger | null
      if (!trigger) continue

      const formatted = this.formatTrigger(trigger)

      if (status === 'all' || formatted.status === status) {
        triggers.push(formatted)
      }
    }

    return {
      triggers: triggers.slice(offset, offset + limit),
      total: triggers.length,
    }
  }

  async getTriggerById(id: number): Promise<TriggerData | null> {
    const trigger = await this.hyperliquidService.getTrigger(id) as RawTrigger | null
    if (!trigger || Number(trigger.id) === 0) return null
    return this.formatTrigger(trigger)
  }

  async getTriggersByUser(address: string, status?: string): Promise<TriggerData[]> {
    const triggerIds = await this.hyperliquidService.getUserTriggers(address)
    const triggers: TriggerData[] = []

    for (const id of triggerIds) {
      const trigger = await this.hyperliquidService.getTrigger(Number(id)) as RawTrigger | null
      if (!trigger) continue

      const formatted = this.formatTrigger(trigger)
      if (!status || status === 'all' || formatted.status === status) {
        triggers.push(formatted)
      }
    }

    return triggers
  }

  async checkTriggerReady(triggerId: number): Promise<{
    triggerId: number
    conditionMet: boolean
    reason?: string
    currentPrice: number
    triggerPrice: number
    isAbove: boolean
    priceDifference: number
  }> {
    const trigger = await this.hyperliquidService.getTrigger(triggerId) as RawTrigger | null
    if (!trigger) {
      return {
        triggerId,
        conditionMet: false,
        reason: 'Trigger not found',
        currentPrice: 0,
        triggerPrice: 0,
        isAbove: false,
        priceDifference: 0,
      }
    }

    const { canExecute, reason } = await this.hyperliquidService.canExecuteTrigger(triggerId)
    const currentPrice = await this.hyperliquidService.getOraclePrice(trigger.triggerOracleIndex)
    const triggerPriceNum = Number(formatUnits(trigger.triggerPrice, 18))
    const priceDifference = ((currentPrice - triggerPriceNum) / triggerPriceNum) * 100

    return {
      triggerId,
      conditionMet: canExecute,
      reason: reason || undefined,
      currentPrice,
      triggerPrice: triggerPriceNum,
      isAbove: trigger.isAbove,
      priceDifference,
    }
  }
}

