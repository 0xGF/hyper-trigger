import { ApiProperty } from '@nestjs/swagger'

class ServicesStatus {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  hyperliquid: 'up' | 'down'

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  contract: 'up' | 'down'
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'unhealthy'], example: 'healthy' })
  status: 'healthy' | 'degraded' | 'unhealthy'

  @ApiProperty({ example: '2024-01-10T12:00:00.000Z' })
  timestamp: string

  @ApiProperty({ example: '1.0.0' })
  version: string

  @ApiProperty({ type: ServicesStatus })
  services: ServicesStatus
}

