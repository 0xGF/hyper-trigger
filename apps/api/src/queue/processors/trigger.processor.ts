import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { TRIGGER_QUEUE } from '../queue.module'
import { TriggerRepository } from '../../database/repositories/trigger.repository'
import { CheckConditionJob } from '../queue.service'

// This processor runs in the API for lightweight jobs
// Heavy trade execution jobs should be processed by the dedicated worker service

@Processor(TRIGGER_QUEUE)
export class TriggerQueueProcessor extends WorkerHost {
  constructor(private triggerRepo: TriggerRepository) {
    super()
  }

  async process(job: Job<CheckConditionJob>): Promise<any> {
    const { triggerId, watchAsset, targetPrice, isAbove } = job.data

    console.log(`Processing trigger check: ${triggerId} for ${watchAsset}`)

    // This is a placeholder - actual condition checking should be done
    // by the worker service which has access to Hyperliquid API
    
    // For now, just log and return
    return {
      triggerId,
      checked: true,
      timestamp: new Date().toISOString(),
    }
  }
}

