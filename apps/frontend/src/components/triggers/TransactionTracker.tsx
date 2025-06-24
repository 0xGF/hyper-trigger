'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWatchContractEvent } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ExternalLink,
  Zap,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { TokenIcon } from '@/components/ui/token-icon'
import { CONTRACTS, TRIGGER_MANAGER_ABI, formatPrice } from './constants'
import { formatEther } from 'viem'

interface TriggerData {
  id: string
  user: string
  fromToken: string
  toToken: string
  triggerToken: string
  fromAmount: string
  triggerPrice: string
  isAbove: boolean
  slippagePercent: string
  isActive: boolean
  createdAt: string
}

interface TransactionStatus {
  hash?: string
  status: 'pending' | 'confirming' | 'confirmed' | 'failed'
  timestamp: number
  type: 'create' | 'execute' | 'cancel'
  triggerData?: Partial<TriggerData>
}

interface TransactionTrackerProps {
  currentTransaction?: TransactionStatus
  onTransactionComplete?: () => void
}

export function TransactionTracker({ currentTransaction, onTransactionComplete }: TransactionTrackerProps) {
  const { address, isConnected } = useAccount()
  const [userTriggers, setUserTriggers] = useState<TriggerData[]>([])
  const [transactionHistory, setTransactionHistory] = useState<TransactionStatus[]>([])
  const [triggerCount, setTriggerCount] = useState(0)

  // Watch for contract events to track triggers
  useWatchContractEvent({
    address: CONTRACTS.TRIGGER_CONTRACT.ADDRESS as `0x${string}`,
    abi: TRIGGER_MANAGER_ABI,
    eventName: 'TriggerCreated',
    onLogs: (logs: any) => {
      console.log('🎯 New trigger created:', logs)
      
      // Extract trigger data from event logs
      logs.forEach((log: any) => {
        if (log.args && log.args.user === address) {
          const newTrigger: TriggerData = {
            id: log.args.triggerId?.toString() || '',
            user: log.args.user || '',
            fromToken: log.args.fromToken || '',
            toToken: log.args.toToken || '',
            triggerToken: log.args.triggerToken || '',
            fromAmount: log.args.fromAmount?.toString() || '',
            triggerPrice: log.args.triggerPrice?.toString() || '',
            isAbove: log.args.isAbove || false,
            slippagePercent: '50', // Default since not in event
            isActive: true,
            createdAt: new Date().toISOString()
          }
          
          setUserTriggers(prev => [newTrigger, ...prev])
          setTriggerCount(prev => prev + 1)
        }
      })
      
      if (onTransactionComplete) {
        onTransactionComplete()
      }
    }
  })

  // Add current transaction to history when it completes
  useEffect(() => {
    if (currentTransaction && currentTransaction.status === 'confirmed') {
      setTransactionHistory(prev => [currentTransaction, ...prev.slice(0, 9)]) // Keep last 10
    }
  }, [currentTransaction])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'confirming':
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Confirming
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  const getTriggerStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
        <Zap className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
        <Clock className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: number | string) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp)
    return date.toLocaleString()
  }

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Connect your wallet to view transactions</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Transaction Tracker</CardTitle>
          <div className="text-sm text-muted-foreground">
            Contract: {CONTRACTS.TRIGGER_CONTRACT.ADDRESS.slice(0, 6)}...{CONTRACTS.TRIGGER_CONTRACT.ADDRESS.slice(-4)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20 rounded-none border-b border-border">
            <TabsTrigger value="current" className="data-[state=active]:bg-background">
              Current Transaction
            </TabsTrigger>
            <TabsTrigger value="triggers" className="data-[state=active]:bg-background">
              Your Triggers ({triggerCount})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background">
              History ({transactionHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Current Transaction */}
          <TabsContent value="current" className="p-6 space-y-4">
            <AnimatePresence mode="wait">
              {currentTransaction ? (
                <motion.div
                  key="current-tx"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Creating Trigger</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentTransaction.triggerData?.fromToken} → {currentTransaction.triggerData?.toToken}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(currentTransaction.status)}
                  </div>

                  {currentTransaction.hash && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Transaction Hash</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a 
                            href={`https://testnet.hyperliquid.xyz/tx/${currentTransaction.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <span className="font-mono text-xs">{truncateHash(currentTransaction.hash)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(currentTransaction.timestamp)}
                      </div>
                    </div>
                  )}

                  {currentTransaction.status === 'pending' && (
                    <div className="text-sm text-muted-foreground">
                      ⏳ Waiting for wallet confirmation...
                    </div>
                  )}
                  {currentTransaction.status === 'confirming' && (
                    <div className="text-sm text-muted-foreground">
                      🔄 Confirming transaction on HyperEVM...
                    </div>
                  )}
                  {currentTransaction.status === 'confirmed' && (
                    <div className="text-sm text-green-400">
                      ✅ Trigger created successfully!
                    </div>
                  )}
                  {currentTransaction.status === 'failed' && (
                    <div className="text-sm text-red-400">
                      ❌ Transaction failed. Please try again.
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="no-tx"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active transaction</p>
                  <p className="text-sm">Create a trigger to see transaction status</p>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* User Triggers */}
          <TabsContent value="triggers" className="p-0">
            <div className="space-y-0">
              {userTriggers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No triggers created yet</p>
                  <p className="text-sm">Create your first trigger to get started</p>
                </div>
              ) : (
                userTriggers.map((trigger, index) => (
                  <motion.div
                    key={trigger.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-border last:border-b-0 p-6 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <TokenIcon symbol={trigger.fromToken} size="sm" />
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <TokenIcon symbol={trigger.toToken} size="sm" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {formatEther(BigInt(trigger.fromAmount))} {trigger.fromToken} → {trigger.toToken}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Trigger ID: {trigger.id}
                          </div>
                        </div>
                      </div>
                      {getTriggerStatusBadge(trigger.isActive)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trigger Price:</span>
                        <div className="font-mono flex items-center gap-1">
                          {trigger.isAbove ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          ${formatPrice(parseFloat(formatEther(BigInt(trigger.triggerPrice))))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <div className="font-mono">
                          {formatTimestamp(trigger.createdAt)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Transaction History */}
          <TabsContent value="history" className="p-0">
            <div className="space-y-0">
              {transactionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transaction history</p>
                  <p className="text-sm">Your completed transactions will appear here</p>
                </div>
              ) : (
                transactionHistory.map((tx, index) => (
                  <motion.div
                    key={`${tx.hash}-${tx.timestamp}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-border last:border-b-0 p-6 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{tx.type} Trigger</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(tx.timestamp)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(tx.status)}
                    </div>

                    {tx.hash && (
                      <div className="ml-11">
                        <Button variant="ghost" size="sm" asChild>
                          <a 
                            href={`https://testnet.hyperliquid.xyz/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs"
                          >
                            <span className="font-mono">{truncateHash(tx.hash)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 