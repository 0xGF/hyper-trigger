import { Module, Global } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { TriggerRepository } from './repositories/trigger.repository'
import { ExecutionRepository } from './repositories/execution.repository'
import { JobRepository } from './repositories/job.repository'

@Global()
@Module({
  providers: [
    PrismaService,
    TriggerRepository,
    ExecutionRepository,
    JobRepository,
  ],
  exports: [
    PrismaService,
    TriggerRepository,
    ExecutionRepository,
    JobRepository,
  ],
})
export class DatabaseModule {}
