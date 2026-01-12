// Mock for @nktkas/hyperliquid SDK
export class InfoClient {
  constructor(_config: any) {}
  
  async allMids() {
    return {
      'BTC': '104500',
      'ETH': '2500',
      'SOL': '145',
      'HYPE': '25.50',
    }
  }
  
  async spotMeta() {
    return {
      tokens: [
        { name: 'USDC', index: 0 },
        { name: 'HYPE', index: 150 },
      ],
      universe: [],
    }
  }
  
  async spotClearinghouseState(_params: any) {
    return {
      balances: [],
    }
  }
  
  async userFills(_params: any) {
    return []
  }
}

export class ExchangeClient {
  constructor(_config: any) {}
}

export class HttpTransport {
  constructor(_config?: any) {}
}

export class WebSocketTransport {
  constructor(_config?: any) {}
}

