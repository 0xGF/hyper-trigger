import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class PriceDto {
  @ApiProperty({ example: 'BTC' })
  symbol: string

  @ApiProperty({ example: 104500.25 })
  price: number

  @ApiPropertyOptional({ example: 2.5 })
  change24h?: number

  @ApiPropertyOptional({ example: 18000000 })
  volume24h?: number
}

export class PricesResponseDto {
  @ApiProperty({ type: 'object', additionalProperties: { $ref: '#/components/schemas/PriceDto' } })
  prices: Record<string, PriceDto>

  @ApiProperty({ example: '2024-01-10T12:00:00.000Z' })
  timestamp: string
}

export class PriceResponseDto extends PriceDto {
  @ApiProperty({ example: '2024-01-10T12:00:00.000Z' })
  timestamp: string
}

export class CandleDto {
  @ApiProperty({ example: 1704888000000, description: 'Unix timestamp in milliseconds' })
  timestamp: number

  @ApiProperty({ example: 104000 })
  open: number

  @ApiProperty({ example: 105000 })
  high: number

  @ApiProperty({ example: 103500 })
  low: number

  @ApiProperty({ example: 104500 })
  close: number

  @ApiProperty({ example: 1500000 })
  volume: number
}

export class PriceHistoryResponseDto {
  @ApiProperty({ example: 'BTC' })
  symbol: string

  @ApiProperty({ example: '1h' })
  interval: string

  @ApiProperty({ type: [CandleDto] })
  data: CandleDto[]
}

export class PriceHistoryQueryDto {
  @ApiPropertyOptional({ enum: ['1m', '5m', '15m', '1h', '4h', '1d'], default: '1h' })
  @IsOptional()
  @IsString()
  interval?: string

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number
}

