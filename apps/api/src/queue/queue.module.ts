import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { QueueService } from './queue.service'
import { TriggerQueueProcessor } from './processors/trigger.processor'

// Queue names
export const TRIGGER_QUEUE = 'trigger-queue'
export const EXECUTION_QUEUE = 'execution-queue'
export const ONCHAIN_QUEUE = 'onchain-queue'

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,  // Keep last 100 completed jobs
          removeOnFail: 500,      // Keep last 500 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: TRIGGER_QUEUE },
      { name: EXECUTION_QUEUE },
      { name: ONCHAIN_QUEUE },
    ),
  ],
  providers: [QueueService, TriggerQueueProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

