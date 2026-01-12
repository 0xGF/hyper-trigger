import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TokenDto {
  @ApiProperty({ example: 'BTC' })
  symbol: string

  @ApiProperty({ example: 'Bitcoin' })
  displayName: string

  @ApiProperty({ enum: ['major', 'native', 'stablecoin', 'alt', 'meme'], example: 'major' })
  category: 'major' | 'native' | 'stablecoin' | 'alt' | 'meme'

  @ApiPropertyOptional({ example: 197 })
  spotIndex?: number

  @ApiPropertyOptional({ example: '0x8f254b963e8468305d409b33aa137c67' })
  tokenId?: string

  @ApiProperty({ example: true })
  isActive: boolean
}

export class TokensResponseDto {
  @ApiProperty({ type: [TokenDto] })
  tokens: TokenDto[]
}

