import { Injectable } from '@nestjs/common'
import { TriggersService } from '../triggers/triggers.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly triggersService: TriggersService) {}

  async getOverview(): Promise<{
    totalTriggers: number
    activeTriggers: number
    executedTriggers: number
    cancelledTriggers: number
    totalVolume: string
    totalVolumeUsd: number
    uniqueUsers: number
    popularTokens: { symbol: string; count: number }[]
    timestamp: string
  }> {
    // Get all triggers
    const { triggers } = await this.triggersService.getTriggers('all', 1000, 0)

    let activeTriggers = 0
    let executedTriggers = 0
    let cancelledTriggers = 0
    let totalVolume = 0
    const uniqueUsers = new Set<string>()
    const tokenCounts: Record<string, number> = {}

    for (const trigger of triggers) {
      uniqueUsers.add(trigger.user)
      totalVolume += parseFloat(trigger.inputAmount) || 0

      switch (trigger.status) {
        case 'active':
          activeTriggers++
          break
        case 'executed':
          executedTriggers++
          break
        case 'cancelled':
          cancelledTriggers++
          break
      }

      // Count popular tokens
      tokenCounts[trigger.targetToken] = (tokenCounts[trigger.targetToken] || 0) + 1
    }

    // Sort and get top tokens
    const popularTokens = Object.entries(tokenCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symbol, count]) => ({ symbol, count }))

    return {
      totalTriggers: triggers.length,
      activeTriggers,
      executedTriggers,
      cancelledTriggers,
      totalVolume: totalVolume.toFixed(2),
      totalVolumeUsd: totalVolume, // Simplified - assume USDC
      uniqueUsers: uniqueUsers.size,
      popularTokens,
      timestamp: new Date().toISOString(),
    }
  }

  async getUserAnalytics(address: string): Promise<{
    address: string
    totalTriggers: number
    activeTriggers: number
    executedTriggers: number
    cancelledTriggers: number
    totalVolume: string
    successRate: number
  }> {
    const triggers = await this.triggersService.getTriggersByUser(address, 'all')

    let activeTriggers = 0
    let executedTriggers = 0
    let cancelledTriggers = 0
    let totalVolume = 0

    for (const trigger of triggers) {
      totalVolume += parseFloat(trigger.inputAmount) || 0

      switch (trigger.status) {
        case 'active':
          activeTriggers++
          break
        case 'executed':
          executedTriggers++
          break
        case 'cancelled':
          cancelledTriggers++
          break
      }
    }

    const completedTriggers = executedTriggers + cancelledTriggers
    const successRate = completedTriggers > 0
      ? Math.round((executedTriggers / completedTriggers) * 10000) / 100
      : 0

    return {
      address,
      totalTriggers: triggers.length,
      activeTriggers,
      executedTriggers,
      cancelledTriggers,
      totalVolume: totalVolume.toFixed(2),
      successRate,
    }
  }
}

