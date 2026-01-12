import { Controller, Get, Post, Param, Query, Body, NotFoundException, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiSecurity } from '@nestjs/swagger'
import { TriggersService } from './triggers.service'
import { ExecutionRepository } from '../database/repositories/execution.repository'
import { TriggerRepository } from '../database/repositories/trigger.repository'
import { QueueService } from '../queue/queue.service'
import { WorkerOnly } from '../auth/api-key.guard'
import {
  TriggerDto,
  TriggersResponseDto,
  TriggerCheckResponseDto,
  TriggersQueryDto,
  MarkTradedDto,
  ExecutionResponseDto,
  QueueStatsDto,
} from './dto/triggers.dto'

@ApiTags('triggers')
@Controller('triggers')
export class TriggersController {
  constructor(
    private readonly triggersService: TriggersService,
    private readonly executionRepo: ExecutionRepository,
    private readonly triggerRepo: TriggerRepository,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all triggers', description: 'Returns a list of all triggers' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'executed', 'cancelled', 'expired', 'all'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Successful response', type: TriggersResponseDto })
  async getTriggers(@Query() query: TriggersQueryDto): Promise<TriggersResponseDto> {
    const { status = 'active', limit = 50, offset = 0 } = query
    const result = await this.triggersService.getTriggers(status, Math.min(limit, 100), offset)

    return {
      ...result,
      limit,
      offset,
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get trigger and queue stats', description: 'Returns statistics about triggers and job queues' })
  @ApiResponse({ status: 200, description: 'Stats response' })
  async getStats(): Promise<{
    triggers: any
    executions: any
    queues: any
  }> {
    const [triggers, executions, queues] = await Promise.all([
      this.triggerRepo.getStats(),
      this.executionRepo.getStats(),
      this.queueService.getQueueStats(),
    ])
    return { triggers, executions, queues }
  }

  @Get('check/:triggerId')
  @ApiOperation({ summary: 'Check trigger status', description: 'Check if a trigger is ready to execute' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID', type: Number })
  @ApiResponse({ status: 200, description: 'Successful response', type: TriggerCheckResponseDto })
  async checkTrigger(@Param('triggerId') triggerId: string): Promise<TriggerCheckResponseDto> {
    const id = parseInt(triggerId)
    if (isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid trigger ID')
    }

    return this.triggersService.checkTriggerReady(id)
  }

  @Get('user/:address')
  @ApiOperation({ summary: 'Get user triggers', description: 'Returns all triggers for a user' })
  @ApiParam({ name: 'address', description: 'User wallet address', example: '0x...' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'executed', 'cancelled', 'expired', 'all'] })
  @ApiResponse({ status: 200, description: 'Successful response', type: TriggersResponseDto })
  async getUserTriggers(
    @Param('address') address: string,
    @Query('status') status?: string,
  ): Promise<TriggersResponseDto> {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid wallet address')
    }

    const triggers = await this.triggersService.getTriggersByUser(address, status)
    return {
      triggers,
      total: triggers.length,
    }
  }

  @Get(':triggerId')
  @ApiOperation({ summary: 'Get trigger by ID', description: 'Returns details for a specific trigger' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID', type: Number })
  @ApiResponse({ status: 200, description: 'Successful response', type: TriggerDto })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async getTriggerById(@Param('triggerId') triggerId: string): Promise<TriggerDto> {
    const id = parseInt(triggerId)
    if (isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid trigger ID')
    }

    const trigger = await this.triggersService.getTriggerById(id)
    if (!trigger) {
      throw new NotFoundException(`Trigger ${triggerId} not found`)
    }

    return trigger
  }

  // ============================================
  // WORKER API - Execution Tracking (Protected)
  // ============================================

  @Get('executions/:triggerId')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Get executions for trigger', description: 'Get all execution records for a trigger (Worker only)' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID', type: Number })
  @ApiResponse({ status: 200, description: 'List of executions' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getExecutions(@Param('triggerId') triggerId: string): Promise<{ executions: any[] }> {
    const id = parseInt(triggerId)
    if (isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid trigger ID')
    }

    const executions = await this.executionRepo.findByTriggerId(id)
    return { executions }
  }

  @Get('traded/:triggerId')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Check if trigger was traded', description: 'Check if a trigger has been executed on Hyperliquid (Worker only)' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns traded status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async isTriggerTraded(@Param('triggerId') triggerId: string): Promise<{ traded: boolean; execution?: any }> {
    const id = parseInt(triggerId)
    if (isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid trigger ID')
    }

    const traded = await this.executionRepo.isTriggered(id)
    if (traded) {
      const execution = await this.executionRepo.findLatestByTriggerId(id)
      return { traded: true, execution }
    }
    return { traded: false }
  }

  @Post('traded/:triggerId')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Record trade execution', description: 'Record a trade execution on Hyperliquid (Worker only)' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID', type: Number })
  @ApiBody({ type: MarkTradedDto })
  @ApiResponse({ status: 200, description: 'Execution recorded', type: ExecutionResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async recordExecution(
    @Param('triggerId') triggerId: string,
    @Body() body: MarkTradedDto,
  ): Promise<ExecutionResponseDto> {
    const id = parseInt(triggerId)
    if (isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid trigger ID')
    }

    // Create execution record
    const execution = await this.executionRepo.create({
      triggerId: id,
      executionPrice: body.executionPrice || 0,
      executedSize: body.executedSize || '0',
      hlOrderId: body.hlOrderId,
      status: 'FILLED',
    })

    // Update trigger status
    await this.triggerRepo.markExecuted(id)

    // Queue on-chain marking job
    if (body.hlOrderId) {
      await this.queueService.addMarkOnchainJob({
        triggerId: id,
        executionId: execution.id,
        executionPrice: body.executionPrice || 0,
        hlOrderId: body.hlOrderId,
      })
    }

    return {
      success: true,
      executionId: execution.id,
    }
  }

  @Post('traded/:triggerId/onchain')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Mark execution confirmed on-chain', description: 'Mark that the execution was confirmed on-chain (Worker only)' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID', type: Number })
  @ApiResponse({ status: 200, description: 'Marked on-chain' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markOnchain(
    @Param('triggerId') triggerId: string,
    @Body() body: { executionId: string; txHash: string },
  ): Promise<{ success: boolean }> {
    const id = parseInt(triggerId)
    if (isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid trigger ID')
    }

    await this.executionRepo.markOnchain(body.executionId, body.txHash)
    return { success: true }
  }

  @Get('executions/unmarked/all')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Get unmarked executions', description: 'Get all executions not yet marked on-chain (Worker only)' })
  @ApiResponse({ status: 200, description: 'List of unmarked executions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnmarkedExecutions(): Promise<{ executions: any[] }> {
    const executions = await this.executionRepo.findUnmarkedOnchain()
    return { executions }
  }

  // ============================================
  // QUEUE MANAGEMENT (Protected)
  // ============================================

  @Get('queue/stats')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Get queue statistics', description: 'Get job queue statistics (Worker only)' })
  @ApiResponse({ status: 200, description: 'Queue stats', type: QueueStatsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQueueStats(): Promise<QueueStatsDto> {
    return this.queueService.getQueueStats()
  }

  @Post('queue/pause')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Pause all queues', description: 'Pause processing on all job queues (Worker only)' })
  @ApiResponse({ status: 200, description: 'Queues paused' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async pauseQueues(): Promise<{ success: boolean }> {
    await this.queueService.pauseAllQueues()
    return { success: true }
  }

  @Post('queue/resume')
  @WorkerOnly()
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Resume all queues', description: 'Resume processing on all job queues (Worker only)' })
  @ApiResponse({ status: 200, description: 'Queues resumed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resumeQueues(): Promise<{ success: boolean }> {
    await this.queueService.resumeAllQueues()
    return { success: true }
  }
}
