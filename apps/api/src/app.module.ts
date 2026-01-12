import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PricesModule } from './prices/prices.module'
import { TokensModule } from './tokens/tokens.module'
import { TriggersModule } from './triggers/triggers.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { HealthModule } from './health/health.module'
import { HyperliquidModule } from './hyperliquid/hyperliquid.module'
import { DatabaseModule } from './database/database.module'
import { QueueModule } from './queue/queue.module'
import { ApiKeyGuard } from './auth/api-key.guard'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Rate limiting - configurable via environment
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('THROTTLE_TTL', 60000),   // 1 minute default
        limit: config.get<number>('THROTTLE_LIMIT', 100), // 100 requests/minute default
      }]),
    }),
    DatabaseModule,
    QueueModule,
    HyperliquidModule,
    HealthModule,
    PricesModule,
    TokensModule,
    TriggersModule,
    AnalyticsModule,
  ],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply API key guard globally
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}

