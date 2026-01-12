import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { TriggerJob, JobType, JobStatus } from '@prisma/client'

@Injectable()
export class JobRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<TriggerJob | null> {
    return this.prisma.triggerJob.findUnique({ where: { id } })
  }

  async findByTriggerId(triggerId: number): Promise<TriggerJob[]> {
    return this.prisma.triggerJob.findMany({
      where: { triggerId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findPending(limit: number = 100): Promise<TriggerJob[]> {
    return this.prisma.triggerJob.findMany({
      where: {
        status: JobStatus.PENDING,
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: { trigger: true },
    })
  }

  async create(data: {
    triggerId: number
    jobType: JobType
    priority?: number
    scheduledFor?: Date
  }): Promise<TriggerJob> {
    return this.prisma.triggerJob.create({
      data: {
        triggerId: data.triggerId,
        jobType: data.jobType,
        priority: data.priority || 0,
        scheduledFor: data.scheduledFor,
      },
    })
  }

  async claim(id: string, workerId: string): Promise<TriggerJob> {
    return this.prisma.triggerJob.update({
      where: { id },
      data: {
        status: JobStatus.PROCESSING,
        workerId,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })
  }

  async complete(id: string): Promise<TriggerJob> {
    return this.prisma.triggerJob.update({
      where: { id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    })
  }

  async fail(id: string, error: string): Promise<TriggerJob> {
    const job = await this.prisma.triggerJob.findUnique({ where: { id } })
    if (!job) throw new Error('Job not found')

    const newStatus = job.attempts >= job.maxAttempts 
      ? JobStatus.FAILED 
      : JobStatus.PENDING

    return this.prisma.triggerJob.update({
      where: { id },
      data: {
        status: newStatus,
        lastError: error,
        workerId: null,
      },
    })
  }

  async cancel(id: string): Promise<TriggerJob> {
    return this.prisma.triggerJob.update({
      where: { id },
      data: { status: JobStatus.CANCELLED },
    })
  }

  async cleanupStale(minutes: number = 10): Promise<number> {
    const staleTime = new Date(Date.now() - minutes * 60 * 1000)
    const result = await this.prisma.triggerJob.updateMany({
      where: {
        status: JobStatus.PROCESSING,
        startedAt: { lt: staleTime },
      },
      data: {
        status: JobStatus.PENDING,
        workerId: null,
      },
    })
    return result.count
  }

  async existsForTrigger(triggerId: number, jobType: JobType): Promise<boolean> {
    const job = await this.prisma.triggerJob.findFirst({
      where: {
        triggerId,
        jobType,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
    })
    return !!job
  }

  async getStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.prisma.triggerJob.count({ where: { status: JobStatus.PENDING } }),
      this.prisma.triggerJob.count({ where: { status: JobStatus.PROCESSING } }),
      this.prisma.triggerJob.count({ where: { status: JobStatus.COMPLETED } }),
      this.prisma.triggerJob.count({ where: { status: JobStatus.FAILED } }),
    ])
    return { pending, processing, completed, failed }
  }
}

