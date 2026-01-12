import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { Trigger, TriggerStatus, Prisma } from '@prisma/client'

@Injectable()
export class TriggerRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: number): Promise<Trigger | null> {
    return this.prisma.trigger.findUnique({ where: { id } })
  }

  async findByUser(userAddress: string, status?: TriggerStatus): Promise<Trigger[]> {
    return this.prisma.trigger.findMany({
      where: {
        userAddress: userAddress.toLowerCase(),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findActive(): Promise<Trigger[]> {
    return this.prisma.trigger.findMany({
      where: { status: TriggerStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findPendingExecution(): Promise<Trigger[]> {
    return this.prisma.trigger.findMany({
      where: { status: TriggerStatus.PENDING_EXECUTION },
    })
  }

  async findByWatchAsset(asset: string): Promise<Trigger[]> {
    return this.prisma.trigger.findMany({
      where: { 
        watchAsset: asset,
        status: TriggerStatus.ACTIVE,
      },
    })
  }

  async upsert(data: {
    id: number
    userAddress: string
    watchAsset: string
    tradeAsset: string
    targetPrice: number
    isAbove: boolean
    isBuy: boolean
    amount: string
    maxSlippage: number
    status: TriggerStatus
    createdAt: Date
    expiresAt: Date
  }): Promise<Trigger> {
    return this.prisma.trigger.upsert({
      where: { id: data.id },
      create: {
        ...data,
        userAddress: data.userAddress.toLowerCase(),
        targetPrice: new Prisma.Decimal(data.targetPrice),
        amount: new Prisma.Decimal(data.amount),
      },
      update: {
        status: data.status,
        syncedAt: new Date(),
      },
    })
  }

  async updateStatus(id: number, status: TriggerStatus): Promise<Trigger> {
    return this.prisma.trigger.update({
      where: { id },
      data: { status, syncedAt: new Date() },
    })
  }

  async markPendingExecution(id: number): Promise<Trigger> {
    return this.prisma.trigger.update({
      where: { id },
      data: { status: TriggerStatus.PENDING_EXECUTION },
    })
  }

  async markExecuted(id: number): Promise<Trigger> {
    return this.prisma.trigger.update({
      where: { id },
      data: { status: TriggerStatus.EXECUTED },
    })
  }

  async markFailed(id: number): Promise<Trigger> {
    return this.prisma.trigger.update({
      where: { id },
      data: { status: TriggerStatus.FAILED },
    })
  }

  async countByStatus(status: TriggerStatus): Promise<number> {
    return this.prisma.trigger.count({ where: { status } })
  }

  async getStats(): Promise<{
    total: number
    active: number
    executed: number
    failed: number
  }> {
    const [total, active, executed, failed] = await Promise.all([
      this.prisma.trigger.count(),
      this.prisma.trigger.count({ where: { status: TriggerStatus.ACTIVE } }),
      this.prisma.trigger.count({ where: { status: TriggerStatus.EXECUTED } }),
      this.prisma.trigger.count({ where: { status: TriggerStatus.FAILED } }),
    ])
    return { total, active, executed, failed }
  }
}

