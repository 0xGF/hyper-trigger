import { Module, Global } from '@nestjs/common'
import { HyperliquidService } from './hyperliquid.service'

@Global()
@Module({
  providers: [HyperliquidService],
  exports: [HyperliquidService],
})
export class HyperliquidModule {}

