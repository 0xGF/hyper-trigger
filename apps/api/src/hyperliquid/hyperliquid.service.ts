import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPublicClient, http, formatUnits, type PublicClient } from 'viem'
import { InfoClient, HttpTransport } from '@nktkas/hyperliquid'

// Contract addresses (from environment or defaults)
const TRIGGER_CONTRACT_ADDRESS = (process.env.TRIGGER_CONTRACT_ADDRESS || '0x9029f0676F1Df986DC4bB3aca37158186ad8e570') as `0x${string}`
const ORACLE_PRECOMPILE = '0x0000000000000000000000000000000000000807' as const

const TRIGGER_ABI = [
  {
    type: 'function',
    name: 'getTrigger',
    inputs: [{ name: 'triggerId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'triggerOracleIndex', type: 'uint32' },
          { name: 'fromToken', type: 'uint64' },
          { name: 'toToken', type: 'uint64' },
          { name: 'fromTokenAddress', type: 'address' },
          { name: 'fromAmount', type: 'uint256' },
          { name: 'triggerPrice', type: 'uint256' },
          { name: 'isAbove', type: 'bool' },
          { name: 'minOutputAmount', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextTriggerId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserTriggers',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'canExecuteTrigger',
    inputs: [{ name: 'triggerId', type: 'uint256' }],
    outputs: [
      { name: 'canExecute', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOraclePrice',
    inputs: [{ name: 'oracleIndex', type: 'uint32' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// HyperEVM chain definition
const hyperEVMTestnet = {
  id: 998,
  name: 'HyperEVM Testnet',
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
  },
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
} as const

@Injectable()
export class HyperliquidService implements OnModuleInit {
  private readonly logger = new Logger(HyperliquidService.name)
  private client!: PublicClient
  private infoClient!: InfoClient

  // Price cache
  private priceCache: Map<number, { price: number; timestamp: number }> = new Map()
  private midsCache: { mids: Record<string, string>; timestamp: number } | null = null
  private readonly CACHE_TTL = 5000 // 5 seconds

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const rpcUrl =
      this.configService.get<string>('HYPEREVM_RPC_URL') ||
      'https://rpc.hyperliquid-testnet.xyz/evm'

    // Initialize viem client for on-chain reads
    this.client = createPublicClient({
      chain: hyperEVMTestnet,
      transport: http(rpcUrl),
    }) as PublicClient

    // Initialize Hyperliquid SDK for off-chain API
    const isTestnet = this.configService.get<string>('NETWORK') !== 'mainnet'
    this.infoClient = new InfoClient({
      transport: new HttpTransport({ isTestnet }),
    })

    this.logger.log(`HyperliquidService initialized (testnet: ${isTestnet})`)
  }

  // ============ On-Chain Methods (via viem) ============

  async getOraclePrice(oracleIndex: number): Promise<number> {
    const cached = this.priceCache.get(oracleIndex)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price
    }

    try {
      const result = await this.client.call({
        to: ORACLE_PRECOMPILE,
        data: `0x${oracleIndex.toString(16).padStart(64, '0')}` as `0x${string}`,
      })

      if (result.data) {
        const price = Number(formatUnits(BigInt(result.data), 6))
        this.priceCache.set(oracleIndex, { price, timestamp: Date.now() })
        return price
      }
      return 0
    } catch (error) {
      this.logger.warn(`Failed to fetch price for oracle ${oracleIndex}: ${error}`)
      return 0
    }
  }

  async getTrigger(triggerId: number) {
    try {
      return await this.client.readContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'getTrigger',
        args: [BigInt(triggerId)],
      })
    } catch (error) {
      this.logger.warn(`Failed to fetch trigger ${triggerId}: ${error}`)
      return null
    }
  }

  async getNextTriggerId(): Promise<number> {
    try {
      const result = await this.client.readContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'nextTriggerId',
      })
      return Number(result)
    } catch (error) {
      this.logger.warn(`Failed to fetch nextTriggerId: ${error}`)
      return 1
    }
  }

  async getUserTriggers(address: string): Promise<bigint[]> {
    try {
      const result = await this.client.readContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'getUserTriggers',
        args: [address as `0x${string}`],
      })
      return result as bigint[]
    } catch (error) {
      this.logger.warn(`Failed to fetch user triggers for ${address}: ${error}`)
      return []
    }
  }

  async canExecuteTrigger(triggerId: number): Promise<{ canExecute: boolean; reason: string }> {
    try {
      const result = await this.client.readContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'canExecuteTrigger',
        args: [BigInt(triggerId)],
      })
      const [canExecute, reason] = result as [boolean, string]
      return { canExecute, reason }
    } catch (error) {
      this.logger.warn(`Failed to check trigger ${triggerId}: ${error}`)
      return { canExecute: false, reason: 'Failed to check trigger status' }
    }
  }

  async getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber()
  }

  // ============ Off-Chain Methods (via SDK) ============

  async getAllMids(): Promise<Record<string, string>> {
    if (this.midsCache && Date.now() - this.midsCache.timestamp < this.CACHE_TTL) {
      return this.midsCache.mids
    }

    try {
      const mids = await this.infoClient.allMids()
      this.midsCache = { mids, timestamp: Date.now() }
      return mids
    } catch (error) {
      this.logger.warn(`Failed to fetch all mids: ${error}`)
      return this.midsCache?.mids || {}
    }
  }

  async getSpotMeta() {
    try {
      return await this.infoClient.spotMeta()
    } catch (error) {
      this.logger.warn(`Failed to fetch spot meta: ${error}`)
      return null
    }
  }

  async getSpotMetaAndAssetCtxs() {
    try {
      return await this.infoClient.spotMetaAndAssetCtxs()
    } catch (error) {
      this.logger.warn(`Failed to fetch spot meta and asset ctxs: ${error}`)
      return null
    }
  }

  async getSpotClearinghouseState(address: string) {
    try {
      return await this.infoClient.spotClearinghouseState({ user: address })
    } catch (error) {
      this.logger.warn(`Failed to fetch spot state for ${address}: ${error}`)
      return null
    }
  }

  async getUserFills(address: string) {
    try {
      return await this.infoClient.userFills({ user: address })
    } catch (error) {
      this.logger.warn(`Failed to fetch user fills for ${address}: ${error}`)
      return []
    }
  }

  isHealthy(): boolean {
    return !!this.client && !!this.infoClient
  }
}
