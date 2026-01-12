import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { HyperliquidService } from '../hyperliquid/hyperliquid.service'
import { HealthResponseDto } from './dto/health.dto'

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly hyperliquidService: HyperliquidService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns the health status of the API' })
  @ApiResponse({ status: 200, description: 'API is healthy', type: HealthResponseDto })
  async getHealth(): Promise<HealthResponseDto> {
    const hyperliquidHealthy = this.hyperliquidService.isHealthy()

    return {
      status: hyperliquidHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        hyperliquid: hyperliquidHealthy ? 'up' : 'down',
        contract: hyperliquidHealthy ? 'up' : 'down',
      },
    }
  }
}

