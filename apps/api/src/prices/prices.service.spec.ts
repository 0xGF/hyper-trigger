import { Test, TestingModule } from '@nestjs/testing'
import { PricesService } from './prices.service'
import { HyperliquidService } from '../hyperliquid/hyperliquid.service'
import { ConfigService } from '@nestjs/config'

describe('PricesService', () => {
  let service: PricesService

  const mockHyperliquidService = {
    getOraclePrice: jest.fn(),
    getAllMids: jest.fn().mockResolvedValue({
      '@107': '25.50',
      '@1': '25.50',
    }),
    isHealthy: jest.fn().mockReturnValue(true),
  }

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'NETWORK') return 'mainnet'
      return 'https://rpc.hyperliquid.xyz/evm'
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricesService,
        {
          provide: HyperliquidService,
          useValue: mockHyperliquidService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<PricesService>(PricesService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getAllPrices', () => {
    it('should return prices for all tokens', async () => {
      mockHyperliquidService.getAllMids.mockResolvedValue({
        '@107': '25.50',
      })

      const prices = await service.getAllPrices()

      expect(prices).toHaveProperty('USDC')
      expect(prices).toHaveProperty('HYPE')

      expect(prices.USDC.price).toBe(1.0)
      expect(prices.HYPE.price).toBe(25.50)

      expect(mockHyperliquidService.getAllMids).toHaveBeenCalled()
    })

    it('should include required fields in price data', async () => {
      mockHyperliquidService.getAllMids.mockResolvedValue({
        '@107': '100',
      })

      const prices = await service.getAllPrices()
      const priceData = prices.HYPE

      expect(priceData).toHaveProperty('symbol')
      expect(priceData).toHaveProperty('price')
      expect(priceData).toHaveProperty('change24h')
      expect(priceData).toHaveProperty('volume24h')
    })
  })

  describe('getPrice', () => {
    it('should return price for valid token symbol', async () => {
      mockHyperliquidService.getAllMids.mockResolvedValue({
        '@107': '25.50',
      })

      const price = await service.getPrice('HYPE')

      expect(price).not.toBeNull()
      expect(price?.symbol).toBe('HYPE')
      expect(price?.price).toBe(25.50)
    })

    it('should return null for invalid token symbol', async () => {
      const price = await service.getPrice('INVALID')

      expect(price).toBeNull()
      expect(mockHyperliquidService.getAllMids).not.toHaveBeenCalled()
    })

    it('should be case insensitive', async () => {
      mockHyperliquidService.getAllMids.mockResolvedValue({
        '@107': '25.50',
      })

      const price = await service.getPrice('hype')

      expect(price).not.toBeNull()
      expect(price?.symbol).toBe('HYPE')
    })
  })

  describe('getPriceHistory', () => {
    it('should return candle data array', async () => {
      const history = await service.getPriceHistory('HYPE', '1h', 10)

      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBe(10)
    })

    it('should return candles with correct structure', async () => {
      const history = await service.getPriceHistory('UBTC', '1h', 5)

      history.forEach((candle) => {
        expect(candle).toHaveProperty('timestamp')
        expect(candle).toHaveProperty('open')
        expect(candle).toHaveProperty('high')
        expect(candle).toHaveProperty('low')
        expect(candle).toHaveProperty('close')
        expect(candle).toHaveProperty('volume')

        expect(typeof candle.timestamp).toBe('number')
        expect(typeof candle.open).toBe('number')
        expect(typeof candle.high).toBe('number')
        expect(typeof candle.low).toBe('number')
        expect(typeof candle.close).toBe('number')
        expect(typeof candle.volume).toBe('number')
      })
    })

    it('should respect limit parameter', async () => {
      const history = await service.getPriceHistory('HYPE', '1h', 50)
      expect(history.length).toBe(50)
    })

    it('should respect different intervals', async () => {
      const intervals = ['1m', '5m', '15m', '1h', '4h', '1d']
      
      for (const interval of intervals) {
        const history = await service.getPriceHistory('HYPE', interval, 10)
        expect(history.length).toBe(10)
      }
    })
  })
})

