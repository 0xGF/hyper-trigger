import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { PricesService } from './prices.service'
import {
  PricesResponseDto,
  PriceResponseDto,
  PriceHistoryResponseDto,
  PriceHistoryQueryDto,
} from './dto/prices.dto'

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all token prices', description: 'Returns current prices for all supported tokens' })
  @ApiResponse({ status: 200, description: 'Successful response', type: PricesResponseDto })
  async getPrices(): Promise<PricesResponseDto> {
    const prices = await this.pricesService.getAllPrices()
    return {
      prices,
      timestamp: new Date().toISOString(),
    }
  }

  @Get('history/:symbol')
  @ApiOperation({ summary: 'Get price history', description: 'Returns historical price data for a token' })
  @ApiParam({ name: 'symbol', description: 'Token symbol', example: 'BTC' })
  @ApiQuery({ name: 'interval', required: false, enum: ['1m', '5m', '15m', '1h', '4h', '1d'], description: 'Time interval' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of data points' })
  @ApiResponse({ status: 200, description: 'Successful response', type: PriceHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async getPriceHistory(
    @Param('symbol') symbol: string,
    @Query() query: PriceHistoryQueryDto,
  ): Promise<PriceHistoryResponseDto> {
    const { interval = '1h', limit = 100 } = query
    const data = await this.pricesService.getPriceHistory(symbol, interval, Math.min(limit, 1000))

    return {
      symbol: symbol.toUpperCase(),
      interval,
      data,
    }
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get price by symbol', description: 'Returns the current price for a specific token' })
  @ApiParam({ name: 'symbol', description: 'Token symbol', example: 'BTC' })
  @ApiResponse({ status: 200, description: 'Successful response', type: PriceResponseDto })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async getPriceBySymbol(@Param('symbol') symbol: string): Promise<PriceResponseDto> {
    const price = await this.pricesService.getPrice(symbol)
    if (!price) {
      throw new NotFoundException(`Token ${symbol} not found`)
    }

    return {
      ...price,
      timestamp: new Date().toISOString(),
    }
  }
}

