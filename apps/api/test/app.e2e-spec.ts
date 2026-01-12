import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('HyperTrigger API (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Health (GET /api/v1/health)', () => {
    it('should return healthy status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status')
          expect(res.body).toHaveProperty('timestamp')
          expect(res.body).toHaveProperty('version')
          expect(res.body).toHaveProperty('services')
          expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status)
        })
    })
  })

  describe('Tokens (GET /api/v1/tokens)', () => {
    it('should return list of tokens', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tokens')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tokens')
          expect(Array.isArray(res.body.tokens)).toBe(true)
          expect(res.body.tokens.length).toBeGreaterThan(0)
          
          // Check first token has required properties
          const token = res.body.tokens[0]
          expect(token).toHaveProperty('symbol')
          expect(token).toHaveProperty('displayName')
          expect(token).toHaveProperty('category')
          expect(token).toHaveProperty('isActive')
        })
    })

    it('should return specific token by symbol', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tokens/USDC')
        .expect(200)
        .expect((res) => {
          expect(res.body.symbol).toBe('USDC')
          expect(res.body.displayName).toBe('USD Coin')
          expect(res.body.category).toBe('stablecoin')
        })
    })

    it('should return 404 for unknown token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tokens/UNKNOWN')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
        })
    })

    it('should be case insensitive for token symbol', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tokens/usdc')
        .expect(200)
        .expect((res) => {
          expect(res.body.symbol).toBe('USDC')
        })
    })
  })

  describe('Prices (GET /api/v1/prices)', () => {
    it('should return prices for all tokens', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('prices')
          expect(res.body).toHaveProperty('timestamp')
          expect(typeof res.body.prices).toBe('object')
        })
    })

    it('should return price for specific token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/HYPE')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('symbol')
          expect(res.body).toHaveProperty('price')
          expect(res.body).toHaveProperty('timestamp')
          expect(res.body.symbol).toBe('HYPE')
          expect(typeof res.body.price).toBe('number')
        })
    })

    it('should return 404 for unknown token price', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/UNKNOWN')
        .expect(404)
    })
  })

  describe('Price History (GET /api/v1/prices/history/:symbol)', () => {
    it('should return price history with default params', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/history/HYPE')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('symbol')
          expect(res.body).toHaveProperty('interval')
          expect(res.body).toHaveProperty('data')
          expect(Array.isArray(res.body.data)).toBe(true)
        })
    })

    it('should respect interval and limit params', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/history/HYPE?interval=1h&limit=50')
        .expect(200)
        .expect((res) => {
          expect(res.body.interval).toBe('1h')
          expect(res.body.data.length).toBeLessThanOrEqual(50)
          
          // Check candle structure
          if (res.body.data.length > 0) {
            const candle = res.body.data[0]
            expect(candle).toHaveProperty('timestamp')
            expect(candle).toHaveProperty('open')
            expect(candle).toHaveProperty('high')
            expect(candle).toHaveProperty('low')
            expect(candle).toHaveProperty('close')
            expect(candle).toHaveProperty('volume')
          }
        })
    })
  })

  describe('Triggers (GET /api/v1/triggers)', () => {
    it('should return list of triggers', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('triggers')
          expect(res.body).toHaveProperty('total')
          expect(Array.isArray(res.body.triggers)).toBe(true)
        })
    })

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers?status=active')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('triggers')
          // All returned triggers should have active status
          res.body.triggers.forEach((trigger: { status: string }) => {
            expect(trigger.status).toBe('active')
          })
        })
    })

    it('should respect pagination params', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers?limit=10&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.triggers.length).toBeLessThanOrEqual(10)
        })
    })
  })

  describe('Triggers by User (GET /api/v1/triggers/user/:address)', () => {
    it('should return triggers for valid address', () => {
      const validAddress = '0x1234567890123456789012345678901234567890'
      return request(app.getHttpServer())
        .get(`/api/v1/triggers/user/${validAddress}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('triggers')
          expect(res.body).toHaveProperty('total')
        })
    })

    it('should return 400 for invalid address', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers/user/invalid-address')
        .expect(400)
    })

    it('should return 400 for short address', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers/user/0x1234')
        .expect(400)
    })
  })

  describe('Trigger Check (GET /api/v1/triggers/check/:triggerId)', () => {
    it('should return trigger check for valid ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers/check/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('triggerId')
          expect(res.body).toHaveProperty('conditionMet')
          expect(res.body).toHaveProperty('currentPrice')
          expect(res.body).toHaveProperty('triggerPrice')
        })
    })

    it('should return 400 for invalid trigger ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers/check/invalid')
        .expect(400)
    })

    it('should return 400 for negative trigger ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triggers/check/-1')
        .expect(400)
    })
  })

  describe('Analytics Overview (GET /api/v1/analytics/overview)', () => {
    it('should return platform analytics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/overview')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalTriggers')
          expect(res.body).toHaveProperty('activeTriggers')
          expect(res.body).toHaveProperty('executedTriggers')
          expect(res.body).toHaveProperty('totalVolume')
          expect(res.body).toHaveProperty('timestamp')
        })
    })
  })

  describe('User Analytics (GET /api/v1/analytics/user/:address)', () => {
    it('should return user analytics for valid address', () => {
      const validAddress = '0x1234567890123456789012345678901234567890'
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/user/${validAddress}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('address')
          expect(res.body).toHaveProperty('totalTriggers')
          expect(res.body).toHaveProperty('activeTriggers')
          expect(res.body).toHaveProperty('successRate')
          expect(res.body.address).toBe(validAddress)
        })
    })

    it('should return 400 for invalid address', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/user/not-an-address')
        .expect(400)
    })
  })
})

