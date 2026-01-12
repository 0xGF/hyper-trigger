// HyperTrigger Worker Service
// Executes SPOT trades on HyperCore via Hyperliquid API when trigger conditions are met

import { defineChain, formatUnits, parseUnits } from 'viem'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { PublicClient, WalletClient } from 'viem'
import * as cron from 'node-cron'
import winston from 'winston'
import dotenv from 'dotenv'
import axios from 'axios'

// Hyperliquid SDK for trading and market data
import { 
  InfoClient, 
  ExchangeClient, 
  HttpTransport,
} from '@nktkas/hyperliquid'

// Shared token config - single source of truth
import { getSpotIndex, getMarketName, populateMarketNames } from '@hyper-trigger/shared'

// Order request uses abbreviated keys as required by @nktkas/hyperliquid SDK
// a = asset ID, b = is_buy, p = price, s = size, r = reduce_only, t = order_type
interface OrderRequest {
  a: number        // Asset ID (spot index for spot orders)
  b: boolean       // Position side (true = buy/long, false = sell/short)
  p: string        // Price
  s: string        // Size
  r: boolean       // Is reduce-only
  t: { limit: { tif: 'Gtc' | 'Ioc' | 'Alo' | 'FrontendMarket' } }  // Order type
}

// Load environment variables
dotenv.config()

// Network configuration
const IS_TESTNET = process.env.NETWORK === 'testnet'

// HyperEVM Testnet chain configuration
const hyperEVMTestnet = defineChain({
  id: 998,
  name: 'HyperEVM Testnet',
  network: 'hyperevm-testnet',
  nativeCurrency: { decimals: 18, name: 'HYPE', symbol: 'HYPE' },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
  },
})

// HyperEVM Mainnet chain configuration
const hyperEVMMainnet = defineChain({
  id: 999,
  name: 'HyperEVM',
  network: 'hyperevm',
  nativeCurrency: { decimals: 18, name: 'HYPE', symbol: 'HYPE' },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
})

// Use appropriate chain based on environment
const hyperEVMChain = IS_TESTNET ? hyperEVMTestnet : hyperEVMMainnet

// Trigger Contract configuration (from environment or default)
const TRIGGER_CONTRACT_ADDRESS = (process.env.TRIGGER_CONTRACT_ADDRESS || '0x9029f0676F1Df986DC4bB3aca37158186ad8e570') as `0x${string}`

const TRIGGER_ABI = [
  {
    type: 'function',
    name: 'getTrigger',
    inputs: [{ name: 'triggerId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        name: '',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'watchAsset', type: 'string' },
          { name: 'targetPrice', type: 'uint256' },
          { name: 'isAbove', type: 'bool' },
          { name: 'tradeAsset', type: 'string' },
          { name: 'isBuy', type: 'bool' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxSlippage', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'executedAt', type: 'uint256' },
          { name: 'executionPrice', type: 'uint256' },
          { name: 'executionTxHash', type: 'bytes32' },
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
    name: 'markExecuted',
    inputs: [
      { name: 'triggerId', type: 'uint256' },
      { name: 'executionPrice', type: 'uint256' },
      { name: 'executionTxHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'markFailed',
    inputs: [
      { name: 'triggerId', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'checkTrigger',
    inputs: [
      { name: 'triggerId', type: 'uint256' },
      { name: 'currentPrice', type: 'uint256' },
    ],
    outputs: [
      { name: 'shouldExecute', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    stateMutability: 'view',
  },
] as const

// Trigger status enum matching contract
enum TriggerStatus {
  Active = 0,
  Executed = 1,
  Cancelled = 2,
  Expired = 3,
  Failed = 4,
}

// Trigger structure matching contract
interface OnChainTrigger {
  id: bigint
  user: string
  watchAsset: string
  targetPrice: bigint
  isAbove: boolean
  tradeAsset: string
  isBuy: boolean
  amount: bigint
  maxSlippage: bigint
  createdAt: bigint
  expiresAt: bigint
  status: number
  executedAt: bigint
  executionPrice: bigint
  executionTxHash: string
}

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
          return `${timestamp} [${level}]: ${message}${metaStr}`
        })
      ),
    }),
  ],
})

export const WORKER_VERSION = '2.0.0'

// API configuration
const API_URL = process.env.API_URL || 'http://localhost:4000'
const WORKER_API_KEY = process.env.WORKER_API_KEY || ''

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'x-api-key': WORKER_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

class TriggerWorker {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private infoClient: InfoClient
  private exchangeClient: ExchangeClient | null = null
  private isRunning = false
  private executingTriggers = new Set<number>()
  private tradedTriggersCache = new Set<number>() // Local cache of traded triggers
  private account: ReturnType<typeof privateKeyToAccount>
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map()
  private readonly PRICE_CACHE_TTL = 3000 // 3 seconds
  
  // Check if trigger was already traded (via API)
  private async isTriggerTraded(triggerId: number): Promise<boolean> {
    // Check local cache first
    if (this.tradedTriggersCache.has(triggerId)) {
      return true
    }
    
    try {
      const response = await api.get(`/triggers/traded/${triggerId}`)
      if (response.data.traded) {
        this.tradedTriggersCache.add(triggerId) // Update local cache
        return true
      }
      return false
    } catch (error) {
      // If API is down, rely on local cache only
      logger.warn(`Failed to check traded status via API for trigger ${triggerId}`)
      return false
    }
  }
  
  // Mark trigger as traded (via API)
  private async markTriggerAsTraded(
    triggerId: number,
    userAddress: string,
    tradeAsset: string,
    executionPrice?: number,
    executedSize?: string,
    hlOrderId?: string,
  ): Promise<boolean> {
    try {
      await api.post(`/triggers/traded/${triggerId}`, {
        userAddress,
        tradeAsset,
        executionPrice,
        executedSize,
        hlOrderId,
      })
      this.tradedTriggersCache.add(triggerId) // Update local cache
      logger.info(`📝 Marked trigger ${triggerId} as traded in database`)
      return true
    } catch (error) {
      logger.error(`Failed to mark trigger ${triggerId} as traded in database`, { error: String(error) })
      // Still add to local cache to prevent re-trading in this session
      this.tradedTriggersCache.add(triggerId)
      return false
    }
  }
  
  // Mark trigger as confirmed on-chain (via API)
  private async markTriggerOnchainViaAPI(triggerId: number, executionId: string, txHash: string): Promise<boolean> {
    try {
      await api.post(`/triggers/traded/${triggerId}/onchain`, { executionId, txHash })
      return true
    } catch (error) {
      logger.error(`Failed to mark trigger ${triggerId} as on-chain via API`, { error: String(error) })
      return false
    }
  }

  constructor() {
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey || privateKey === 'your_private_key_here') {
      throw new Error('PRIVATE_KEY environment variable not set')
    }

    this.account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}` as `0x${string}`)

    this.publicClient = createPublicClient({
      chain: hyperEVMChain,
      transport: http(),
    }) as PublicClient

    this.walletClient = createWalletClient({
      account: this.account,
      chain: hyperEVMChain,
      transport: http(),
    })

    // Initialize Hyperliquid SDK clients
    this.infoClient = new InfoClient({
      transport: new HttpTransport({ isTestnet: IS_TESTNET }),
    })

    // Exchange client for placing orders (requires agent authorization)
    // Note: This only works if users have authorized this wallet as an agent
    this.exchangeClient = new ExchangeClient({
      transport: new HttpTransport({ isTestnet: IS_TESTNET }),
      wallet: this.account,
    })

    logger.info('🚀 TriggerWorker v2 initialized', {
      version: WORKER_VERSION,
      account: this.account.address,
      contract: TRIGGER_CONTRACT_ADDRESS,
      network: IS_TESTNET ? 'testnet' : 'mainnet',
    })
  }

  /**
   * Get current SPOT price for an asset from Hyperliquid
   * Uses marketName from token config to look up price in allMids
   */
  async getPrice(asset: string): Promise<number | null> {
    // Check cache
    const cached = this.priceCache.get(asset)
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached.price
    }

    try {
      // Get market name from shared token config
      const marketName = getMarketName(asset)
      
      if (!marketName) {
        logger.warn(`No marketName configured for ${asset}`)
        return null
      }
      
      // Get price from allMids using the market name
      const mids = await this.infoClient.allMids()
      const midPrice = mids[marketName]
      
      if (midPrice) {
        const priceNum = parseFloat(midPrice)
        this.priceCache.set(asset, { price: priceNum, timestamp: Date.now() })
        logger.debug(`Spot price for ${asset}: $${priceNum.toFixed(2)} (market ${marketName})`)
        return priceNum
      }
      
      logger.warn(`No mid price found for ${asset} at market ${marketName}`)
      return null
    } catch (error) {
      logger.warn(`Failed to fetch spot price for ${asset}`, { error })
      return null
    }
  }

  /**
   * Fetch all active triggers from the contract
   */
  async getActiveTriggers(): Promise<OnChainTrigger[]> {
    try {
      const nextId = await this.publicClient.readContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'nextTriggerId',
      }) as bigint

      const triggers: OnChainTrigger[] = []

      for (let i = 1; i < Number(nextId); i++) {
        try {
          const trigger = await this.publicClient.readContract({
            address: TRIGGER_CONTRACT_ADDRESS,
            abi: TRIGGER_ABI,
            functionName: 'getTrigger',
            args: [BigInt(i)],
          }) as OnChainTrigger

          if (trigger.status === TriggerStatus.Active) {
            triggers.push(trigger)
          }
        } catch (err) {
          // Trigger may not exist or error reading
          continue
        }
      }

      return triggers
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('Failed to fetch triggers from contract', { error: errorMsg })
      return []
    }
  }

  /**
   * Check if trigger conditions are met
   */
  async checkTriggerCondition(trigger: OnChainTrigger): Promise<{
    shouldExecute: boolean
    currentPrice: number
    reason: string
  }> {
    // Get current price
    const currentPrice = await this.getPrice(trigger.watchAsset)
    
    if (currentPrice === null) {
      return { shouldExecute: false, currentPrice: 0, reason: 'Could not fetch price' }
    }

    // Check expiry
    if (Date.now() / 1000 > Number(trigger.expiresAt)) {
      return { shouldExecute: false, currentPrice, reason: 'Trigger expired' }
    }

    // Target price is in 6 decimals (Hyperliquid format)
    const targetPriceNum = Number(formatUnits(trigger.targetPrice, 6))

    // Check price condition
    const conditionMet = trigger.isAbove
      ? currentPrice >= targetPriceNum
      : currentPrice <= targetPriceNum

    if (!conditionMet) {
      return { 
        shouldExecute: false, 
        currentPrice, 
        reason: `Price ${currentPrice} has not ${trigger.isAbove ? 'reached' : 'dropped to'} ${targetPriceNum}` 
      }
    }

    return { shouldExecute: true, currentPrice, reason: 'Ready to execute' }
  }

  /**
   * Round price to 5 significant figures (Hyperliquid requirement)
   */
  roundToSignificantFigures(num: number, sigFigs: number): number {
    if (num === 0) return 0
    const mult = Math.pow(10, sigFigs - Math.floor(Math.log10(Math.abs(num))) - 1)
    return Math.round(num * mult) / mult
  }

  /**
   * Format price for Hyperliquid orders
   * Hyperliquid requires prices to have max 5 significant figures AND follow tick size rules
   * For spot, prices need to be formatted with appropriate decimal places based on price level
   */
  formatPriceForHL(price: number): number {
    if (price === 0) return 0
    
    // First round to 5 significant figures
    const sigFigPrice = this.roundToSignificantFigures(price, 5)
    
    // Then ensure proper decimal places based on price level
    // Hyperliquid typically uses these tick sizes:
    // - Price >= 1000: no decimals needed, round to whole numbers
    // - Price >= 100: 1 decimal place
    // - Price >= 10: 2 decimal places
    // - Price >= 1: 3 decimal places  
    // - Price >= 0.1: 4 decimal places
    // - Price < 0.1: 5 decimal places max
    let decimals: number
    if (sigFigPrice >= 1000) {
      decimals = 0
    } else if (sigFigPrice >= 100) {
      decimals = 1
    } else if (sigFigPrice >= 10) {
      decimals = 2
    } else if (sigFigPrice >= 1) {
      decimals = 3
    } else if (sigFigPrice >= 0.1) {
      decimals = 4
    } else {
      decimals = 5
    }
    
    // Round to the appropriate decimal places
    const factor = Math.pow(10, decimals)
    return Math.round(sigFigPrice * factor) / factor
  }

  /**
   * Execute a SPOT trade on Hyperliquid on behalf of a user
   * NOTE: This requires the user to have authorized this wallet as an agent
   */
  async executeTrade(trigger: OnChainTrigger, currentPrice: number): Promise<{
    success: boolean
    executionPrice: number
    executedSize?: string
    txHash: string
    error?: string
  }> {
    if (!this.exchangeClient) {
      return { success: false, executionPrice: 0, txHash: '', error: 'Exchange client not initialized' }
    }

    try {
      // Get SPOT token index from shared config
      const tokenIndex = getSpotIndex(trigger.tradeAsset)
      
      if (tokenIndex === undefined) {
        return { success: false, executionPrice: 0, txHash: '', error: `Spot token ${trigger.tradeAsset} not found in config` }
      }

      // Get spot metadata to find szDecimals AND the market universe index
      const spotMeta = await this.infoClient.spotMeta()
      const spotInfo = spotMeta.tokens.find(t => t.index === tokenIndex)
      const szDecimals = spotInfo?.szDecimals ?? 4
      
      // Find the market (universe) index for this token - this is different from token index!
      // Universe entries have: { name: "@156", tokens: [254, 0], index: 156 }
      // tokens[0] is base token index, tokens[1] is quote (0 = USDC)
      const universe = (spotMeta as { universe?: Array<{ name: string; tokens: number[]; index: number }> }).universe
      const market = universe?.find(m => m.tokens && m.tokens[0] === tokenIndex && m.tokens[1] === 0)
      
      if (!market) {
        return { success: false, executionPrice: 0, txHash: '', error: `No USDC market found for ${trigger.tradeAsset} (token index ${tokenIndex})` }
      }
      
      const marketIndex = market.index
      logger.info(`Found market for ${trigger.tradeAsset}: token=${tokenIndex}, market=${marketIndex} (${market.name})`)

      // Get the TRADE asset price (this is what we're actually buying/selling)
      // Note: currentPrice is the WATCH asset price (used to trigger the order)
      const tradeAssetPrice = await this.getPrice(trigger.tradeAsset)
      if (!tradeAssetPrice) {
        return { success: false, executionPrice: 0, txHash: '', error: `Could not get price for ${trigger.tradeAsset}` }
      }

      // Calculate slippage-adjusted limit price based on TRADE asset
      // Clamp slippage to max 5% to stay well within Hyperliquid's 95% rule
      const slippageBps = Math.min(Number(trigger.maxSlippage), 500) // Max 5%
      const slippageMultiplier = trigger.isBuy 
        ? 1 + slippageBps / 10000  // Pay more for buys
        : 1 - slippageBps / 10000  // Accept less for sells

      // Calculate and format limit price
      const rawLimitPrice = tradeAssetPrice * slippageMultiplier
      let limitPrice = this.formatPriceForHL(rawLimitPrice)
      
      // Verify limit price is within acceptable range (5% of market) - clamp if needed
      const priceDiff = Math.abs(limitPrice - tradeAssetPrice) / tradeAssetPrice
      if (priceDiff > 0.05) {
        logger.warn(`Limit price ${limitPrice} is ${(priceDiff * 100).toFixed(1)}% from market ${tradeAssetPrice}, clamping to 5%`)
        const clampedPrice = trigger.isBuy 
          ? tradeAssetPrice * 1.05  
          : tradeAssetPrice * 0.95
        limitPrice = this.formatPriceForHL(clampedPrice)
      }

      // Amount in proper decimals
      // For buys: amount is USDC (6 decimals)
      // For sells: amount is token amount (18 decimals typically)
      const amountDecimals = trigger.isBuy ? 6 : 18
      const amountValue = Number(formatUnits(trigger.amount, amountDecimals))
      
      logger.info(`Trigger calculation`, {
        watchAsset: trigger.watchAsset,
        watchPrice: currentPrice,
        tradeAsset: trigger.tradeAsset,
        tradePrice: tradeAssetPrice,
        rawAmount: trigger.amount.toString(),
        decimals: amountDecimals,
        amountValue,
        isBuy: trigger.isBuy,
      })
      
      // Calculate asset size
      // For buy orders: we have USDC amount, convert to asset quantity
      // For sell orders: amount is already the asset quantity
      let assetSize: number
      if (trigger.isBuy) {
        // Convert USDC amount to asset quantity: USDC / tradeAssetPrice
        assetSize = amountValue / tradeAssetPrice
      } else {
        assetSize = amountValue
      }
      
      // Round size to asset's decimal precision
      const sizeFactor = Math.pow(10, szDecimals)
      assetSize = Math.floor(assetSize * sizeFactor) / sizeFactor
      
      // Minimum order size check (Hyperliquid requires at least $10, we use $12 for safety buffer)
      let orderValue = assetSize * tradeAssetPrice
      const minOrderValue = 12.0
      
      // If order value is below minimum, try to round UP to meet the requirement
      if (orderValue < minOrderValue) {
        if (trigger.isBuy) {
          // For buy orders, we can round up the size to ensure we meet minimum
          // This uses slightly more USDC but ensures the order goes through
          const minAssetSize = minOrderValue / tradeAssetPrice
          const roundedUpSize = Math.ceil(minAssetSize * sizeFactor) / sizeFactor
          const roundedUpValue = roundedUpSize * tradeAssetPrice
          
          // Allow up to 5% over the original amount to account for rounding
          // Most assets with low decimals (0-3) can cause up to ~2% variance
          const maxAllowedValue = amountValue * 1.05
          
          if (roundedUpValue <= maxAllowedValue) {
            logger.info(`Adjusted order size to meet $10 minimum: $${orderValue.toFixed(2)} → $${roundedUpValue.toFixed(2)}`)
            assetSize = roundedUpSize
            orderValue = roundedUpValue
          } else {
            return { success: false, executionPrice: 0, txHash: '', error: `Order value too small: $${orderValue.toFixed(2)} (min $10, and rounding up exceeds deposit)` }
          }
        } else {
          return { success: false, executionPrice: 0, txHash: '', error: `Order value too small: $${orderValue.toFixed(2)} (min $10)` }
        }
      }
      
      // Format size with proper decimal places (after any adjustments)
      const sizeStr = assetSize.toFixed(szDecimals)

      logger.info(`Placing SPOT ${trigger.isBuy ? 'buy' : 'sell'} order`, {
        asset: trigger.tradeAsset,
        tokenIndex,
        marketIndex,
        assetSize: sizeStr,
        limitPrice,
        szDecimals,
        orderValue: orderValue.toFixed(2),
        user: trigger.user,
      })

      // For SPOT orders, the asset ID is: 10000 + market universe index
      const spotAssetId = 10000 + marketIndex

      // Place SPOT order as agent for the user
      // Note: user must have authorized this wallet as an agent first
      const orderRequest: OrderRequest = {
        a: spotAssetId,                         // Spot Asset ID (10000 + marketIndex)
        b: trigger.isBuy,                       // true = buy
        p: limitPrice.toString(),               // Price as string (5 sig figs)
        s: sizeStr,                             // Size as string with proper decimals
        r: false,                               // Not reduce-only
        t: { limit: { tif: 'Ioc' } },           // Immediate-or-Cancel
      }

      // Execute as agent for the user
      // Note: The user must have authorized this worker wallet as an agent on Hyperliquid
      const result = await this.exchangeClient.order({
        orders: [orderRequest],
      })

      // Check result - the response structure varies based on success/failure
      if (result.response && 'data' in result.response) {
        const data = result.response.data as { statuses?: Array<unknown> } | undefined
        const statuses = data?.statuses || []
        if (statuses.length > 0) {
          const status = statuses[0] as Record<string, unknown>
          // Check if order was filled or resting
          if (status && typeof status === 'object') {
            if ('filled' in status) {
              const filled = status.filled as { totalSz: string; avgPx: string; oid: number }
              return {
                success: true,
                executionPrice: parseFloat(filled.avgPx) || limitPrice,
                executedSize: filled.totalSz,
                txHash: String(filled.oid),
              }
            }
            if ('resting' in status) {
              const resting = status.resting as { oid: number }
              return {
                success: true,
                executionPrice: limitPrice,
                executedSize: sizeStr, // Use the order size
                txHash: String(resting.oid),
              }
            }
          }
        }
      }

      return { 
        success: false, 
        executionPrice: 0, 
        txHash: '', 
        error: 'Order not filled' 
      }

    } catch (error) {
      // Safely extract error details without BigInt serialization issues
      let errorDetails: string
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { status?: string; response?: unknown } }
        errorDetails = JSON.stringify(apiError.response, (_, v) => 
          typeof v === 'bigint' ? v.toString() : v
        )
      } else if (error instanceof Error) {
        errorDetails = error.message
      } else {
        errorDetails = String(error)
      }
      
      logger.error('Trade execution failed', { 
        error: errorDetails, 
        triggerId: Number(trigger.id) 
      })
      return { 
        success: false, 
        executionPrice: 0, 
        txHash: '', 
        error: errorDetails
      }
    }
  }

  /**
   * Mark trigger as executed on-chain
   */
  async markTriggerExecuted(
    triggerId: number, 
    executionPrice: number, 
    txHash: string
  ): Promise<boolean> {
    try {
      const priceWei = parseUnits(executionPrice.toString(), 6)
      const txHashBytes = `0x${txHash.padStart(64, '0')}` as `0x${string}`

      const { request } = await this.publicClient.simulateContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'markExecuted',
        args: [BigInt(triggerId), priceWei, txHashBytes],
        account: this.account,
      })

      const hash = await this.walletClient.writeContract(request)
      await this.publicClient.waitForTransactionReceipt({ hash })

      logger.info(`Marked trigger ${triggerId} as executed on-chain`, { hash })
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to mark trigger ${triggerId} as executed`, { error: errorMsg })
      return false
    }
  }

  /**
   * Mark trigger as failed on-chain
   */
  async markTriggerFailed(triggerId: number, reason: string): Promise<boolean> {
    try {
      const { request } = await this.publicClient.simulateContract({
        address: TRIGGER_CONTRACT_ADDRESS,
        abi: TRIGGER_ABI,
        functionName: 'markFailed',
        args: [BigInt(triggerId), reason],
        account: this.account,
      })

      const hash = await this.walletClient.writeContract(request)
      await this.publicClient.waitForTransactionReceipt({ hash })

      logger.info(`Marked trigger ${triggerId} as failed on-chain`, { hash, reason })
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to mark trigger ${triggerId} as failed`, { error: errorMsg })
      return false
    }
  }

  /**
   * Process a single trigger
   */
  async processTrigger(trigger: OnChainTrigger): Promise<void> {
    const triggerId = Number(trigger.id)
    
    // Skip if already executing
    if (this.executingTriggers.has(triggerId)) {
      return
    }
    
    // CRITICAL: Check if already traded (via API database)
    // This prevents re-trading even after worker restart
    const alreadyTraded = await this.isTriggerTraded(triggerId)
    if (alreadyTraded) {
      logger.warn(`⚠️ Trigger ${triggerId} already traded on HL - skipping to prevent double-trade`)
      return
    }

    try {
      this.executingTriggers.add(triggerId)

      // Check if conditions are met
      const check = await this.checkTriggerCondition(trigger)
      
      if (!check.shouldExecute) {
        const targetPrice = Number(formatUnits(trigger.targetPrice, 6))
        const direction = trigger.isAbove ? '↑' : '↓'
        const priceDiff = trigger.isAbove 
          ? (targetPrice - check.currentPrice).toFixed(2)
          : (check.currentPrice - targetPrice).toFixed(2)
        logger.info(`⏳ Trigger #${triggerId}: ${trigger.watchAsset} ${direction}$${targetPrice.toFixed(2)} (current: $${check.currentPrice.toFixed(2)}, needs ${trigger.isAbove ? '+' : '-'}$${priceDiff})`)
        return
      }

      logger.info(`🎯 Trigger ${triggerId} conditions met!`, {
        watchAsset: trigger.watchAsset,
        currentPrice: check.currentPrice,
        targetPrice: Number(formatUnits(trigger.targetPrice, 6)),
        isAbove: trigger.isAbove,
        tradeAsset: trigger.tradeAsset,
        isBuy: trigger.isBuy,
      })

      // Execute the trade
      const tradeResult = await this.executeTrade(trigger, check.currentPrice)

      if (tradeResult.success) {
        // CRITICAL: Mark as traded in database FIRST
        // This prevents re-trading even if subsequent steps fail
        const dbResult = await this.markTriggerAsTraded(
          triggerId,
          trigger.user,
          trigger.tradeAsset,
          tradeResult.executionPrice,
          tradeResult.executedSize || '0',
          tradeResult.txHash,
        )
        
        if (!dbResult) {
          logger.warn(`⚠️ Trigger ${triggerId} traded but failed to record in database - continuing anyway`)
        }
        
        // Mark as executed on-chain
        const onChainHash = await this.markTriggerExecuted(triggerId, tradeResult.executionPrice, tradeResult.txHash)
        if (onChainHash) {
          logger.info(`✅ Trigger ${triggerId} executed and marked on-chain`, {
            executionPrice: tradeResult.executionPrice,
            hlOrderId: tradeResult.txHash,
            onChainTx: onChainHash,
          })
        } else {
          // Trade succeeded but on-chain marking failed
          // The trigger is in database so it won't re-trade
          // The API will queue a job to retry on-chain marking
          logger.warn(`⚠️ Trigger ${triggerId} traded on HL but failed to mark on-chain - will retry via queue`, {
            executionPrice: tradeResult.executionPrice,
            hlOrderId: tradeResult.txHash,
          })
        }
      } else {
        // Trade failed - trigger will be retried next cycle
        logger.error(`❌ Trigger ${triggerId} execution failed - will retry`, {
          error: tradeResult.error,
        })
      }

    } catch (error) {
      // Safely serialize error, handling BigInt
      let errorMsg: string
      if (error instanceof Error) {
        errorMsg = error.message
      } else {
        try {
          errorMsg = JSON.stringify(error, (_, v) => typeof v === 'bigint' ? v.toString() : v)
        } catch {
          errorMsg = String(error)
        }
      }
      logger.error(`Error processing trigger ${triggerId}`, { error: errorMsg })
    } finally {
      this.executingTriggers.delete(triggerId)
    }
  }

  /**
   * Main check loop
   */
  async checkAndExecuteTriggers(): Promise<void> {
    try {
      const triggers = await this.getActiveTriggers()
      
      if (triggers.length === 0) {
        logger.debug('No active triggers')
        return
      }

      logger.info(`Checking ${triggers.length} active triggers`)

      for (const trigger of triggers) {
        await this.processTrigger(trigger)
      }
    } catch (error) {
      logger.error('Error in checkAndExecuteTriggers', { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker is already running')
      return
    }

    this.isRunning = true
    logger.info('🚀 Starting HyperTrigger Worker v2', { version: WORKER_VERSION })

    // Auto-discover market names from Hyperliquid API
    logger.info('🔍 Fetching market names from Hyperliquid...')
    await populateMarketNames()

    // Verify spot price lookup on startup
    const hypeMarketName = getMarketName('HYPE')
    const hypePrice = await this.getPrice('HYPE')
    
    logger.info('🔍 Spot price verification', {
      asset: 'HYPE',
      marketName: hypeMarketName || 'NOT_CONFIGURED',
      price: hypePrice ? `$${hypePrice.toFixed(2)}` : 'NOT FOUND',
    })

    // Initial check
    await this.checkAndExecuteTriggers()

    // Schedule checks every 15 seconds to avoid rate limiting
    cron.schedule('*/15 * * * * *', async () => {
      if (!this.isRunning) return
      await this.checkAndExecuteTriggers()
    })

    // Log market status every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      if (!this.isRunning) return
      
      const hypePrice = await this.getPrice('HYPE')
      
      logger.info('📊 SPOT Market update', {
        HYPE: hypePrice?.toFixed(2) || 'N/A',
      })
    })

    logger.info('✅ Worker started successfully')
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false
    this.executingTriggers.clear()
    logger.info('🛑 Worker stopped')
  }
}

// Health check export
export const getWorkerStatus = () => ({
  version: WORKER_VERSION,
  isHealthy: true,
  timestamp: new Date().toISOString(),
})

// Main entry point
const main = async () => {
  try {
    const worker = new TriggerWorker()
    await worker.start()

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down...')
      worker.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    logger.error('Failed to start worker', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    process.exit(1)
  }
}

// Start if run directly
if (require.main === module) {
  main()
}
