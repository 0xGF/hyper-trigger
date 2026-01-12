import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HyperliquidService } from '../hyperliquid/hyperliquid.service'
import { 
  TESTNET_TOKENS, 
  MAINNET_TOKENS, 
  type UnifiedToken,
  populateMarketNames,
  getMarketName,
} from '@hyper-trigger/shared'

export interface PriceData {
  symbol: string
  price: number
  change24h?: number
  volume24h?: number
}

@Injectable()
export class PricesService implements OnModuleInit {
  private readonly isTestnet: boolean
  private readonly tokens: UnifiedToken[]

  constructor(
    private readonly hyperliquidService: HyperliquidService,
    private readonly configService: ConfigService,
  ) {
    this.isTestnet = this.configService.get<string>('NETWORK') !== 'mainnet'
    this.tokens = this.isTestnet ? TESTNET_TOKENS : MAINNET_TOKENS
  }

  async onModuleInit() {
    // Auto-discover market names from Hyperliquid API on startup
    console.log('🔍 Fetching market names from Hyperliquid...')
    await populateMarketNames()
  }

  async getAllPrices(): Promise<Record<string, PriceData>> {
    const prices: Record<string, PriceData> = {}
    
    // Get all mid prices
    const mids = await this.hyperliquidService.getAllMids()
    
    for (const token of this.tokens) {
      if (token.symbol === 'USDC') {
        prices[token.symbol] = {
          symbol: token.symbol,
          price: 1.0,
          change24h: 0,
          volume24h: 0,
        }
      } else {
        // Use marketName from token config to get price
        let price = 0
        
        if (token.marketName) {
          const midPrice = mids[token.marketName]
          if (midPrice) {
            price = parseFloat(midPrice)
          }
        }
        
        prices[token.symbol] = {
          symbol: token.symbol,
          price,
          change24h: 0,
          volume24h: 0,
        }
      }
    }

    return prices
  }

  async getPrice(symbol: string): Promise<PriceData | null> {
    const upperSymbol = symbol.toUpperCase()
    const token = this.tokens.find(t => t.symbol === upperSymbol)
    
    if (!token) return null
    
    if (upperSymbol === 'USDC') {
      return {
        symbol: upperSymbol,
        price: 1.0,
        change24h: 0,
        volume24h: 0,
      }
    }
    
    let price = 0
    
    // Use marketName from token config
    if (token.marketName) {
      const mids = await this.hyperliquidService.getAllMids()
      const midPrice = mids[token.marketName]
      if (midPrice) {
        price = parseFloat(midPrice)
      }
    }
    
    return {
      symbol: upperSymbol,
      price,
      change24h: 0,
      volume24h: 0,
    }
  }

  async getPriceHistory(
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]> {
    // TODO: Implement actual historical data from Hyperliquid candleSnapshot API
    const now = Date.now()
    const intervalMs: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    }

    const ms = intervalMs[interval] || intervalMs['1h']
    const data = []
    let basePrice = 100

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - i * ms
      const variance = Math.random() * 2 - 1
      basePrice = basePrice * (1 + variance * 0.02)

      data.push({
        timestamp,
        open: basePrice * (1 - Math.random() * 0.01),
        high: basePrice * (1 + Math.random() * 0.02),
        low: basePrice * (1 - Math.random() * 0.02),
        close: basePrice,
        volume: Math.random() * 1000000,
      })
    }

    return data
  }
}
