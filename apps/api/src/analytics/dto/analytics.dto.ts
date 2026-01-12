import { ApiProperty } from '@nestjs/swagger'

export class PopularTokenDto {
  @ApiProperty({ example: 'UBTC' })
  symbol: string

  @ApiProperty({ example: 45 })
  count: number
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ example: 150 })
  totalTriggers: number

  @ApiProperty({ example: 42 })
  activeTriggers: number

  @ApiProperty({ example: 85 })
  executedTriggers: number

  @ApiProperty({ example: 23 })
  cancelledTriggers: number

  @ApiProperty({ example: '1250000.00' })
  totalVolume: string

  @ApiProperty({ example: 1250000 })
  totalVolumeUsd: number

  @ApiProperty({ example: 78 })
  uniqueUsers: number

  @ApiProperty({ type: [PopularTokenDto] })
  popularTokens: PopularTokenDto[]

  @ApiProperty({ example: '2024-01-10T12:00:00.000Z' })
  timestamp: string
}

export class UserAnalyticsResponseDto {
  @ApiProperty({ example: '0x1234567890abcdef1234567890abcdef12345678' })
  address: string

  @ApiProperty({ example: 12 })
  totalTriggers: number

  @ApiProperty({ example: 3 })
  activeTriggers: number

  @ApiProperty({ example: 7 })
  executedTriggers: number

  @ApiProperty({ example: 2 })
  cancelledTriggers: number

  @ApiProperty({ example: '15000.00' })
  totalVolume: string

  @ApiProperty({ example: 77.78, description: 'Percentage of successfully executed triggers' })
  successRate: number
}

