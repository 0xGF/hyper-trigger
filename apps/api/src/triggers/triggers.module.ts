import { Module } from '@nestjs/common'
import { TriggersController } from './triggers.controller'
import { TriggersService } from './triggers.service'
import { QueueModule } from '../queue/queue.module'

@Module({
  imports: [QueueModule],
  controllers: [TriggersController],
  providers: [TriggersService],
  exports: [TriggersService],
})
export class TriggersModule {}

