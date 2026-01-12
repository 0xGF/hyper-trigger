import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { TriggerExecution, ExecutionStatus, Prisma } from '@prisma/client'

@Injectable()
export class ExecutionRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<TriggerExecution | null> {
    return this.prisma.triggerExecution.findUnique({ where: { id } })
  }

  async findByTriggerId(triggerId: number): Promise<TriggerExecution[]> {
    return this.prisma.triggerExecution.findMany({
      where: { triggerId },
      orderBy: { tradedAt: 'desc' },
    })
  }

  async findLatestByTriggerId(triggerId: number): Promise<TriggerExecution | null> {
    return this.prisma.triggerExecution.findFirst({
      where: { triggerId },
      orderBy: { tradedAt: 'desc' },
    })
  }

  async findUnmarkedOnchain(): Promise<TriggerExecution[]> {
    return this.prisma.triggerExecution.findMany({
      where: {
        markedOnchain: false,
        status: { in: [ExecutionStatus.FILLED, ExecutionStatus.PARTIALLY_FILLED] },
      },
      include: { trigger: true },
    })
  }

  async findByStatus(status: ExecutionStatus): Promise<TriggerExecution[]> {
    return this.prisma.triggerExecution.findMany({
      where: { status },
      include: { trigger: true },
    })
  }

  async create(data: {
    triggerId: number
    executionPrice: number
    executedSize: string
    hlOrderId?: string
    status?: ExecutionStatus
  }): Promise<TriggerExecution> {
    return this.prisma.triggerExecution.create({
      data: {
        triggerId: data.triggerId,
        executionPrice: new Prisma.Decimal(data.executionPrice),
        executedSize: new Prisma.Decimal(data.executedSize),
        hlOrderId: data.hlOrderId,
        status: data.status || ExecutionStatus.PENDING,
      },
    })
  }

  async markFilled(id: string, hlOrderId: string): Promise<TriggerExecution> {
    return this.prisma.triggerExecution.update({
      where: { id },
      data: {
        status: ExecutionStatus.FILLED,
        hlOrderId,
      },
    })
  }

  async markOnchain(id: string, txHash: string): Promise<TriggerExecution> {
    return this.prisma.triggerExecution.update({
      where: { id },
      data: {
        markedOnchain: true,
        onchainTxHash: txHash,
        status: ExecutionStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    })
  }

  async markFailed(id: string, errorMessage: string): Promise<TriggerExecution> {
    return this.prisma.triggerExecution.update({
      where: { id },
      data: {
        status: ExecutionStatus.FAILED,
        errorMessage,
        retryCount: { increment: 1 },
      },
    })
  }

  async isTriggered(triggerId: number): Promise<boolean> {
    const execution = await this.prisma.triggerExecution.findFirst({
      where: {
        triggerId,
        status: { in: [ExecutionStatus.FILLED, ExecutionStatus.CONFIRMED] },
      },
    })
    return !!execution
  }

  async getStats(): Promise<{
    total: number
    filled: number
    confirmed: number
    failed: number
    pending: number
  }> {
    const [total, filled, confirmed, failed, pending] = await Promise.all([
      this.prisma.triggerExecution.count(),
      this.prisma.triggerExecution.count({ where: { status: ExecutionStatus.FILLED } }),
      this.prisma.triggerExecution.count({ where: { status: ExecutionStatus.CONFIRMED } }),
      this.prisma.triggerExecution.count({ where: { status: ExecutionStatus.FAILED } }),
      this.prisma.triggerExecution.count({ where: { status: ExecutionStatus.PENDING } }),
    ])
    return { total, filled, confirmed, failed, pending }
  }
}

