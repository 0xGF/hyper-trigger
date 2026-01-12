import { Controller, Get, Param, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { AnalyticsOverviewResponseDto, UserAnalyticsResponseDto } from './dto/analytics.dto'

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform overview', description: 'Returns platform-wide analytics' })
  @ApiResponse({ status: 200, description: 'Successful response', type: AnalyticsOverviewResponseDto })
  async getOverview(): Promise<AnalyticsOverviewResponseDto> {
    return this.analyticsService.getOverview()
  }

  @Get('user/:address')
  @ApiOperation({ summary: 'User analytics', description: 'Returns analytics for a specific user' })
  @ApiParam({ name: 'address', description: 'User wallet address', example: '0x...' })
  @ApiResponse({ status: 200, description: 'Successful response', type: UserAnalyticsResponseDto })
  async getUserAnalytics(@Param('address') address: string): Promise<UserAnalyticsResponseDto> {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid wallet address')
    }

    return this.analyticsService.getUserAnalytics(address)
  }
}

