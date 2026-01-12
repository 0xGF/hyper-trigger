import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue, Job } from 'bullmq'
import { TRIGGER_QUEUE, EXECUTION_QUEUE, ONCHAIN_QUEUE } from './queue.module'

// Job data types
export interface CheckConditionJob {
  triggerId: number
  watchAsset: string
  targetPrice: number
  isAbove: boolean
}

export interface ExecuteTradeJob {
  triggerId: number
  userAddress: string
  tradeAsset: string
  isBuy: boolean
  amount: string
  maxSlippage: number
}

export interface MarkOnchainJob {
  triggerId: number
  executionId: string
  executionPrice: number
  hlOrderId: string
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(TRIGGER_QUEUE) private triggerQueue: Queue,
    @InjectQueue(EXECUTION_QUEUE) private executionQueue: Queue,
    @InjectQueue(ONCHAIN_QUEUE) private onchainQueue: Queue,
  ) {}

  // ============================================
  // TRIGGER CONDITION CHECKING
  // ============================================

  async addCheckConditionJob(data: CheckConditionJob, priority: number = 0): Promise<Job> {
    return this.triggerQueue.add('check-condition', data, {
      priority,
      jobId: `check-${data.triggerId}`, // Prevent duplicates
    })
  }

  async addBulkCheckConditionJobs(jobs: CheckConditionJob[]): Promise<Job[]> {
    const bulkJobs = jobs.map(data => ({
      name: 'check-condition',
      data,
      opts: {
        jobId: `check-${data.triggerId}`,
      },
    }))
    return this.triggerQueue.addBulk(bulkJobs)
  }

  // ============================================
  // TRADE EXECUTION
  // ============================================

  async addExecuteTradeJob(data: ExecuteTradeJob, priority: number = 10): Promise<Job> {
    return this.executionQueue.add('execute-trade', data, {
      priority,
      jobId: `execute-${data.triggerId}-${Date.now()}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })
  }

  // ============================================
  // ON-CHAIN MARKING
  // ============================================

  async addMarkOnchainJob(data: MarkOnchainJob, priority: number = 5): Promise<Job> {
    return this.onchainQueue.add('mark-onchain', data, {
      priority,
      jobId: `onchain-${data.triggerId}-${data.executionId}`,
      attempts: 5, // More retries for on-chain ops
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    })
  }

  // ============================================
  // QUEUE MANAGEMENT
  // ============================================

  async getQueueStats(): Promise<{
    trigger: { waiting: number; active: number; completed: number; failed: number }
    execution: { waiting: number; active: number; completed: number; failed: number }
    onchain: { waiting: number; active: number; completed: number; failed: number }
  }> {
    const [trigger, execution, onchain] = await Promise.all([
      this.getQueueCounts(this.triggerQueue),
      this.getQueueCounts(this.executionQueue),
      this.getQueueCounts(this.onchainQueue),
    ])
    return { trigger, execution, onchain }
  }

  private async getQueueCounts(queue: Queue): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])
    return { waiting, active, completed, failed }
  }

  async pauseAllQueues(): Promise<void> {
    await Promise.all([
      this.triggerQueue.pause(),
      this.executionQueue.pause(),
      this.onchainQueue.pause(),
    ])
  }

  async resumeAllQueues(): Promise<void> {
    await Promise.all([
      this.triggerQueue.resume(),
      this.executionQueue.resume(),
      this.onchainQueue.resume(),
    ])
  }

  async drainAllQueues(): Promise<void> {
    await Promise.all([
      this.triggerQueue.drain(),
      this.executionQueue.drain(),
      this.onchainQueue.drain(),
    ])
  }

  // Remove a specific job
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)
    if (job) {
      await job.remove()
    }
  }

  private getQueue(name: string): Queue {
    switch (name) {
      case TRIGGER_QUEUE: return this.triggerQueue
      case EXECUTION_QUEUE: return this.executionQueue
      case ONCHAIN_QUEUE: return this.onchainQueue
      default: throw new Error(`Unknown queue: ${name}`)
    }
  }
}

