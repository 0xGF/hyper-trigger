import { Controller, Get, Param, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { TokenDto, TokensResponseDto } from './dto/tokens.dto'

// Token configuration - mirrors @hyper-trigger/shared
const TOKENS: TokenDto[] = [
  {
    symbol: 'USDC',
    displayName: 'USD Coin',
    category: 'stablecoin',
    spotIndex: 0,
    tokenId: '0x6d1e7cde53ba9467b783cb7c530ce054',
    isActive: true,
  },
  {
    symbol: 'HYPE',
    displayName: 'Hyperliquid',
    category: 'native',
    spotIndex: 150,
    tokenId: '0x0d01dc56dcaaca66ad901c959b4011ec',
    isActive: true,
  },
  {
    symbol: 'UBTC',
    displayName: 'Bitcoin',
    category: 'major',
    spotIndex: 197,
    tokenId: '0x8f254b963e8468305d409b33aa137c67',
    isActive: true,
  },
  {
    symbol: 'UETH',
    displayName: 'Ethereum',
    category: 'major',
    spotIndex: 221,
    tokenId: '0xe1edd30daaf5caac3fe63569e24748da',
    isActive: true,
  },
  {
    symbol: 'USOL',
    displayName: 'Solana',
    category: 'major',
    spotIndex: 254,
    tokenId: '0x49b67c39f5566535de22b29b0e51e685',
    isActive: true,
  },
]

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  @Get()
  @ApiOperation({ summary: 'Get all tokens', description: 'Returns a list of all supported tokens' })
  @ApiResponse({ status: 200, description: 'Successful response', type: TokensResponseDto })
  getTokens(): TokensResponseDto {
    return { tokens: TOKENS }
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get token by symbol', description: 'Returns details for a specific token' })
  @ApiParam({ name: 'symbol', description: 'Token symbol', example: 'BTC' })
  @ApiResponse({ status: 200, description: 'Successful response', type: TokenDto })
  @ApiResponse({ status: 404, description: 'Token not found' })
  getTokenBySymbol(@Param('symbol') symbol: string): TokenDto {
    const token = TOKENS.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase())
    if (!token) {
      throw new NotFoundException(`Token ${symbol} not found`)
    }
    return token
  }
}

