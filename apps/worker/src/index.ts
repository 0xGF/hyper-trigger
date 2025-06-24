// HyperTrigger Worker Service Entry Point
import { defineChain } from 'viem'
import { createPublicClient, createWalletClient, http, formatUnits, parseAbiItem, getContract } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { PublicClient, WalletClient } from 'viem'
import * as cron from 'node-cron'
import winston from 'winston'
import dotenv from 'dotenv'

// Import shared token configuration - SINGLE SOURCE OF TRUTH
import { 
  getAssetIndexMap, 
  getTokenSymbol, 
  getAssetIndex, 
  getTriggerableTokens,
  type UnifiedToken 
} from '@hyper-trigger/shared/tokens'

// Load environment variables
dotenv.config()

// HyperEVM Testnet chain configuration with correct RPC URL
const hyperEVMTestnet = defineChain({
  id: 998,
  name: 'HyperEVM Testnet',
  network: 'hyperevm-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    },
    public: {
      http: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    },
  },
})

// Contract configuration - Updated for TriggerContract (USDC-only triggers)
const CONTRACT_CONFIG = {
  address: '0xc2E9F304a365fc85A007805C6D569FB900817102' as `0x${string}`,
  abi: [
    {
      "type": "function",
      "name": "createTrigger",
      "inputs": [
        {"name": "targetOracleIndex", "type": "uint32"},
        {"name": "targetToken", "type": "uint64"},
        {"name": "usdcAmount", "type": "uint256"},
        {"name": "triggerPrice", "type": "uint256"},
        {"name": "isAbove", "type": "bool"},
        {"name": "maxSlippage", "type": "uint256"}
      ],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "getTrigger",
      "inputs": [{"name": "triggerId", "type": "uint256"}],
      "outputs": [
        {
          "type": "tuple",
          "components": [
            {"name": "id", "type": "uint256"},
            {"name": "user", "type": "address"},
            {"name": "targetOracleIndex", "type": "uint32"},
            {"name": "targetToken", "type": "uint64"},
            {"name": "usdcAmount", "type": "uint256"},
            {"name": "triggerPrice", "type": "uint256"},
            {"name": "isAbove", "type": "bool"},
            {"name": "maxSlippage", "type": "uint256"},
            {"name": "createdAt", "type": "uint256"},
            {"name": "state", "type": "uint8"},
            {"name": "executionStarted", "type": "uint256"},
            {"name": "outputAmount", "type": "uint256"}
          ]
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getOraclePrice",
      "inputs": [{"name": "oracleIndex", "type": "uint32"}],
      "outputs": [{"name": "", "type": "uint64"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getUserTriggers",
      "inputs": [{"name": "user", "type": "address"}],
      "outputs": [{"name": "", "type": "uint256[]"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "nextTriggerId",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "startTriggerExecution",
      "inputs": [{"name": "triggerId", "type": "uint256"}],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "completeTriggerExecution",
      "inputs": [
        {"name": "triggerId", "type": "uint256"},
        {"name": "actualOutputAmount", "type": "uint256"}
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "markExecutionFailed",
      "inputs": [
        {"name": "triggerId", "type": "uint256"},
        {"name": "reason", "type": "string"}
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "isTriggerReady",
      "inputs": [{"name": "triggerId", "type": "uint256"}],
      "outputs": [
        {"name": "conditionMet", "type": "bool"},
        {"name": "currentPrice", "type": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getContractSpotBalance",
      "inputs": [{"name": "tokenId", "type": "uint64"}],
      "outputs": [
        {"name": "total", "type": "uint64"},
        {"name": "hold", "type": "uint64"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "executionReward",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "USDC_TOKEN_ID",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint64"}],
      "stateMutability": "view"
    },
    {
      "type": "event",
      "name": "TriggerCreated",
      "inputs": [
        {"name": "triggerId", "type": "uint256", "indexed": true},
        {"name": "user", "type": "address", "indexed": true},
        {"name": "targetOracleIndex", "type": "uint32"},
        {"name": "targetToken", "type": "uint64"},
        {"name": "usdcAmount", "type": "uint256"},
        {"name": "triggerPrice", "type": "uint256"},
        {"name": "isAbove", "type": "bool"},
        {"name": "maxSlippage", "type": "uint256"}
      ]
    },
    {
      "type": "event",
      "name": "TriggerExecutionStarted",
      "inputs": [
        {"name": "triggerId", "type": "uint256", "indexed": true},
        {"name": "executor", "type": "address", "indexed": true},
        {"name": "executionPrice", "type": "uint256"}
      ]
    },
    {
      "type": "event",
      "name": "TriggerExecuted",
      "inputs": [
        {"name": "triggerId", "type": "uint256", "indexed": true},
        {"name": "executor", "type": "address", "indexed": true},
        {"name": "executionPrice", "type": "uint256"},
        {"name": "outputAmount", "type": "uint256"}
      ]
    },
    {
      "type": "event",
      "name": "TriggerExecutionFailed",
      "inputs": [
        {"name": "triggerId", "type": "uint256", "indexed": true},
        {"name": "executor", "type": "address", "indexed": true},
        {"name": "reason", "type": "string"}
      ]
    },
    {
      "type": "event",
      "name": "TriggerCancelled",
      "inputs": [
        {"name": "triggerId", "type": "uint256", "indexed": true},
        {"name": "user", "type": "address", "indexed": true}
      ]
    },
    {
      "type": "event",
      "name": "RefundClaimed",
      "inputs": [
        {"name": "triggerId", "type": "uint256", "indexed": true},
        {"name": "user", "type": "address", "indexed": true},
        {"name": "usdcAmount", "type": "uint256"}
      ]
    }
  ],
} as const

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

export const WORKER_VERSION = '0.3.0'

// Execution states enum
enum ExecutionState {
  PENDING = 0,     // Trigger created, waiting for execution
  EXECUTING = 1,   // Execution started, cross-layer operations in progress
  COMPLETED = 2,   // Execution completed successfully
  FAILED = 3,      // Execution failed, user can claim refund
  CANCELLED = 4    // User cancelled trigger
}

interface TriggerData {
  id: string
  user: string
  targetOracleIndex: number  // Oracle index for price monitoring
  targetToken: number        // Target token ID to buy
  usdcAmount: string         // Amount of USDC to swap
  triggerPrice: string       // Target price (18 decimals)
  isAbove: boolean          // Trigger condition
  maxSlippage: number       // Max slippage in basis points
  createdAt: number
  state: ExecutionState
  executionStarted: number
  outputAmount: string
}

// Oracle indices from shared configuration (replaces hardcoded ORACLE_INDICES)
const ORACLE_INDICES = getAssetIndexMap()

class TriggerWorker {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private contract: any
  private isRunning = false
  private retryCount = 0
  private maxRetries = 5
  private retryDelay = 30000 // 30 seconds
  private account: any
  private executingTriggers = new Set<string>() // Track triggers being executed

  constructor() {
    if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your_private_key_here_without_0x_prefix') {
      throw new Error('❌ PRIVATE_KEY environment variable not set')
    }

    this.account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`)

    this.publicClient = createPublicClient({
      chain: hyperEVMTestnet,
      transport: http(),
    })

    this.walletClient = createWalletClient({
      account: this.account,
      chain: hyperEVMTestnet,
      transport: http(),
    })

    this.contract = getContract({
      address: CONTRACT_CONFIG.address,
      abi: CONTRACT_CONFIG.abi,
      client: {
        public: this.publicClient,
        wallet: this.walletClient,
      },
    })

    logger.info('🚀 TriggerWorker initialized', {
      version: WORKER_VERSION,
      account: this.account.address,
      contract: CONTRACT_CONFIG.address,
    })
  }

  private async waitForRpcRecovery(): Promise<boolean> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await this.publicClient.getBlockNumber()
        logger.info('✅ RPC connection recovered')
        this.retryCount = 0
        return true
      } catch (error) {
        logger.warn(`⏳ RPC recovery attempt ${i + 1}/${this.maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
      }
    }
    return false
  }

  private async handleRpcError(error: any): Promise<void> {
    this.retryCount++
    logger.error('🚨 RPC Error detected', {
      error: error.message,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    })

    if (this.retryCount >= this.maxRetries) {
      logger.error('💀 Max retries reached, stopping worker')
      this.stop()
      throw new Error('RPC connection failed permanently')
    }

    const recovered = await this.waitForRpcRecovery()
    if (!recovered) {
      throw new Error('Failed to recover RPC connection')
    }
  }

  async getCurrentPrices(): Promise<Record<number, number>> {
    try {
      const prices: Record<number, number> = {}
      
      for (const [symbol, oracleIndex] of Object.entries(ORACLE_INDICES)) {
        try {
          const rawPrice = await this.contract.read.getOraclePrice([oracleIndex])
          
          // Convert oracle price to human readable format
          // Oracle prices are typically in 6 decimals for spot assets
          const humanPrice = Number(formatUnits(rawPrice, 6))
          prices[oracleIndex] = humanPrice
          
          logger.debug(`📊 ${symbol} (Oracle ${oracleIndex}): $${humanPrice.toFixed(2)}`)
        } catch (error: any) {
          logger.warn(`⚠️ Failed to get price for ${symbol} (Oracle ${oracleIndex}): ${error.message}`)
          prices[oracleIndex] = 0
        }
      }
      
      return prices
    } catch (error: any) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        await this.handleRpcError(error)
        return this.getCurrentPrices() // Retry after recovery
      }
      throw error
    }
  }

  async getAllActiveTriggers(): Promise<TriggerData[]> {
    try {
      const nextTriggerId = await this.contract.read.nextTriggerId()
      const triggers: TriggerData[] = []
      
      for (let i = 1; i < Number(nextTriggerId); i++) {
        try {
          const trigger = await this.contract.read.getTrigger([BigInt(i)])
          
          // Only include pending or executing triggers
          if (trigger.state === ExecutionState.PENDING || trigger.state === ExecutionState.EXECUTING) {
            triggers.push({
              id: i.toString(),
              user: trigger.user,
              targetOracleIndex: Number(trigger.targetOracleIndex),
              targetToken: Number(trigger.targetToken),
              usdcAmount: trigger.usdcAmount.toString(),
              triggerPrice: trigger.triggerPrice.toString(),
              isAbove: trigger.isAbove,
              maxSlippage: Number(trigger.maxSlippage),
              createdAt: Number(trigger.createdAt),
              state: trigger.state,
              executionStarted: Number(trigger.executionStarted),
              outputAmount: trigger.outputAmount.toString()
            })
          }
        } catch (error: any) {
          logger.warn(`⚠️ Failed to get trigger ${i}: ${error.message}`)
        }
      }
      
      return triggers
    } catch (error: any) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        await this.handleRpcError(error)
        return this.getAllActiveTriggers() // Retry after recovery
      }
      throw error
    }
  }

  async startTriggerExecution(triggerId: string): Promise<boolean> {
    try {
      logger.info(`🚀 Starting execution for trigger ${triggerId}`)
      
      // Mark as being executed to prevent double execution
      this.executingTriggers.add(triggerId)
      
      const hash = await this.contract.write.startTriggerExecution([BigInt(triggerId)])
      logger.info(`📝 Start execution transaction: ${hash}`)
      
      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'success') {
        logger.info(`✅ Trigger ${triggerId} execution started successfully`)
        return true
      } else {
        logger.error(`❌ Trigger ${triggerId} execution start failed`)
        this.executingTriggers.delete(triggerId)
        return false
      }
    } catch (error: any) {
      logger.error(`💥 Failed to start trigger ${triggerId} execution: ${error.message}`)
      this.executingTriggers.delete(triggerId)
      return false
    }
  }

  async completeTriggerExecution(triggerId: string, outputAmount: bigint): Promise<boolean> {
    try {
      logger.info(`🎯 Completing execution for trigger ${triggerId} with output ${formatUnits(outputAmount, 18)}`)
      
      const hash = await this.contract.write.completeTriggerExecution([BigInt(triggerId), outputAmount])
      logger.info(`📝 Complete execution transaction: ${hash}`)
      
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'success') {
        logger.info(`✅ Trigger ${triggerId} execution completed successfully`)
        this.executingTriggers.delete(triggerId)
        return true
      } else {
        logger.error(`❌ Trigger ${triggerId} execution completion failed`)
        return false
      }
    } catch (error: any) {
      logger.error(`💥 Failed to complete trigger ${triggerId} execution: ${error.message}`)
      return false
    }
  }

  async markExecutionFailed(triggerId: string, reason: string): Promise<boolean> {
    try {
      logger.info(`🚨 Marking trigger ${triggerId} execution as failed: ${reason}`)
      
      const hash = await this.contract.write.markExecutionFailed([BigInt(triggerId), reason])
      logger.info(`📝 Mark failed transaction: ${hash}`)
      
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'success') {
        logger.info(`✅ Trigger ${triggerId} marked as failed`)
        this.executingTriggers.delete(triggerId)
        return true
      } else {
        logger.error(`❌ Failed to mark trigger ${triggerId} as failed`)
        return false
      }
    } catch (error: any) {
      logger.error(`💥 Failed to mark trigger ${triggerId} as failed: ${error.message}`)
      return false
    }
  }

  shouldExecuteTrigger(trigger: TriggerData, currentPrice: number): boolean {
    const triggerPriceNum = Number(formatUnits(BigInt(trigger.triggerPrice), 18))
    
    if (trigger.isAbove) {
      return currentPrice >= triggerPriceNum
    } else {
      return currentPrice <= triggerPriceNum
    }
  }

  async checkAndExecuteTriggers(): Promise<void> {
    try {
      const [triggers, prices] = await Promise.all([
        this.getAllActiveTriggers(),
        this.getCurrentPrices()
      ])

      logger.info(`🔍 Checking ${triggers.length} active triggers`)

      for (const trigger of triggers) {
        try {
          // Skip if already being executed
          if (this.executingTriggers.has(trigger.id)) {
            logger.debug(`⏳ Trigger ${trigger.id} already being executed, skipping`)
            continue
          }

          const currentPrice = prices[trigger.targetOracleIndex]
          if (!currentPrice || currentPrice === 0) {
            logger.warn(`⚠️ No valid price for oracle ${trigger.targetOracleIndex}, skipping trigger ${trigger.id}`)
            continue
          }

          const tokenSymbol = getTokenSymbol(trigger.targetOracleIndex)
          
          if (trigger.state === ExecutionState.PENDING) {
            // Check if trigger condition is met
            if (this.shouldExecuteTrigger(trigger, currentPrice)) {
              logger.info(`🎯 Trigger ${trigger.id} condition met!`, {
                token: tokenSymbol,
                currentPrice: currentPrice,
                triggerPrice: formatUnits(BigInt(trigger.triggerPrice), 18),
                isAbove: trigger.isAbove
              })
              
              await this.startTriggerExecution(trigger.id)
            } else {
              logger.debug(`⏸️ Trigger ${trigger.id} condition not met`, {
                token: tokenSymbol,
                currentPrice: currentPrice,
                triggerPrice: formatUnits(BigInt(trigger.triggerPrice), 18),
                isAbove: trigger.isAbove
              })
            }
          } else if (trigger.state === ExecutionState.EXECUTING) {
            // Check if execution has been running too long (1 hour timeout)
            const executionTime = Date.now() / 1000 - trigger.executionStarted
            if (executionTime > 3600) { // 1 hour
              logger.warn(`⏰ Trigger ${trigger.id} execution timeout, marking as failed`)
              await this.markExecutionFailed(trigger.id, "Execution timeout")
            } else {
              // In a real implementation, we would:
              // 1. Check if HyperCore trade completed
              // 2. Verify contract has target tokens
              // 3. Calculate actual output amount
              // 4. Call completeTriggerExecution
              
              logger.debug(`⏳ Trigger ${trigger.id} still executing (${Math.floor(executionTime)}s)`)
              
              // For now, simulate completion after 30 seconds for testing
              if (executionTime > 30) {
                try {
                  // Check contract balance for target token
                  const [total, hold] = await this.contract.read.getContractSpotBalance([BigInt(trigger.targetToken)])
                  
                  if (total > 0) {
                    // Simulate successful trade completion
                    const outputAmount = BigInt(trigger.usdcAmount) / 100n // Simplified calculation
                    await this.completeTriggerExecution(trigger.id, outputAmount)
                  } else {
                    await this.markExecutionFailed(trigger.id, "No target tokens in contract balance")
                  }
                } catch (error: any) {
                  logger.error(`💥 Error checking execution status for trigger ${trigger.id}: ${error.message}`)
                }
              }
            }
          }
        } catch (error: any) {
          logger.error(`💥 Error processing trigger ${trigger.id}: ${error.message}`)
        }
      }
    } catch (error: any) {
      logger.error('💥 Error in checkAndExecuteTriggers:', error.message)
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        await this.handleRpcError(error)
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ Worker is already running')
      return
    }

    this.isRunning = true
    logger.info('🔄 Starting HyperTrigger Worker Service', {
      version: WORKER_VERSION,
      account: this.account.address,
    })

    // Initial check
    await this.checkAndExecuteTriggers()

    // Schedule regular checks every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      if (!this.isRunning) return
      
      try {
        await this.checkAndExecuteTriggers()
      } catch (error: any) {
        logger.error('💥 Scheduled check failed:', error.message)
      }
    })

    logger.info('✅ Worker service started successfully')
  }

  stop(): void {
    this.isRunning = false
    this.executingTriggers.clear()
    logger.info('🛑 Worker service stopped')
  }
}

export const getWorkerStatus = () => {
  return {
    version: WORKER_VERSION,
    isHealthy: true,
    timestamp: new Date().toISOString(),
  }
}

const initializeWorker = async () => {
  try {
    const worker = new TriggerWorker()
    await worker.start()

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('🛑 Received SIGINT, shutting down gracefully...')
      worker.stop()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      logger.info('🛑 Received SIGTERM, shutting down gracefully...')
      worker.stop()
      process.exit(0)
    })
  } catch (error: any) {
    logger.error('💀 Failed to initialize worker:', error.message)
    process.exit(1)
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  initializeWorker()
} 