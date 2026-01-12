import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class TriggerDto {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ example: '0x1234567890abcdef1234567890abcdef12345678' })
  user: string

  @ApiProperty({ example: 'USDC' })
  inputToken: string

  @ApiProperty({ example: 'UBTC' })
  targetToken: string

  @ApiProperty({ example: 'UBTC' })
  triggerToken: string

  @ApiProperty({ example: '1000.0' })
  inputAmount: string

  @ApiProperty({ example: '105000.0' })
  triggerPrice: string

  @ApiProperty({ example: true })
  isAbove: boolean

  @ApiProperty({ enum: ['active', 'executing', 'executed', 'failed', 'cancelled', 'expired'], example: 'active' })
  status: string

  @ApiProperty({ example: '2024-01-10T12:00:00.000Z' })
  createdAt: string

  @ApiPropertyOptional({ example: '2024-02-10T12:00:00.000Z' })
  expiresAt?: string
}

export class TriggersResponseDto {
  @ApiProperty({ type: [TriggerDto] })
  triggers: TriggerDto[]

  @ApiProperty({ example: 100 })
  total: number

  @ApiPropertyOptional({ example: 50 })
  limit?: number

  @ApiPropertyOptional({ example: 0 })
  offset?: number
}

export class TriggerCheckResponseDto {
  @ApiProperty({ example: 1 })
  triggerId: number

  @ApiProperty({ example: false })
  conditionMet: boolean

  @ApiPropertyOptional({ example: 'Price conditions not met' })
  reason?: string

  @ApiProperty({ example: 103500.25 })
  currentPrice: number

  @ApiProperty({ example: 105000.0 })
  triggerPrice: number

  @ApiProperty({ example: true })
  isAbove: boolean

  @ApiProperty({ example: -1.43, description: 'Percentage difference from trigger price' })
  priceDifference: number
}

export class TriggersQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'executed', 'cancelled', 'expired', 'all'], default: 'active' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}

export class MarkTradedDto {
  @ApiProperty({ example: '0x1234567890abcdef1234567890abcdef12345678' })
  @IsString()
  userAddress: string

  @ApiProperty({ example: 'USOL' })
  @IsString()
  tradeAsset: string

  @ApiPropertyOptional({ example: 142.65 })
  @IsOptional()
  executionPrice?: number

  @ApiPropertyOptional({ example: '0.5' })
  @IsOptional()
  @IsString()
  executedSize?: string

  @ApiPropertyOptional({ example: '292122117309' })
  @IsOptional()
  @IsString()
  hlOrderId?: string
}

export class ExecutionResponseDto {
  @ApiProperty({ example: true })
  success: boolean

  @ApiProperty({ example: 'cuid123abc' })
  executionId: string
}

export class QueueStatsDto {
  @ApiProperty()
  trigger: {
    waiting: number
    active: number
    completed: number
    failed: number
  }

  @ApiProperty()
  execution: {
    waiting: number
    active: number
    completed: number
    failed: number
  }

  @ApiProperty()
  onchain: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
}

