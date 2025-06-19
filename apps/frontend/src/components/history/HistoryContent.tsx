'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowRight, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

interface TriggerExecution {
  id: string
  type: 'Economy' | 'Fast'
  status: 'completed' | 'failed' | 'pending'
  fromToken: {
    symbol: string
    icon: string
    amount: string
    usdValue: string
  }
  toToken: {
    symbol: string
    icon: string
    amount: string
    usdValue: string
  }
  account: string
  timestamp: string
  txHash: string
  gasUsed?: string
  executionReward?: string
}

// Mock transaction data with the style from the image
const mockExecutions: TriggerExecution[] = [
  {
    id: '1',
    type: 'Economy',
    status: 'completed',
    fromToken: { symbol: 'USDC', icon: '$', amount: '99.891399', usdValue: '$99.87' },
    toToken: { symbol: 'BTC', icon: '₿', amount: '0.001024', usdValue: '$99.87' },
    account: '0xe37...b88b5',
    timestamp: '1 minute ago',
    txHash: '0x1234...5678'
  },
  {
    id: '2',
    type: 'Fast',
    status: 'completed',
    fromToken: { symbol: 'ETH', icon: 'Ξ', amount: '0.039884', usdValue: '$101.00' },
    toToken: { symbol: 'PEPE', icon: '🐸', amount: '2847291.82', usdValue: '$101.00' },
    account: '0xab5...c5bc7',
    timestamp: '1 minute ago',
    txHash: '0x2345...6789'
  },
  {
    id: '3',
    type: 'Fast',
    status: 'completed',
    fromToken: { symbol: 'ETH', icon: 'Ξ', amount: '0.449977', usdValue: '$1139.49' },
    toToken: { symbol: 'DOGE', icon: '🐕', amount: '3547.12', usdValue: '$1139.49' },
    account: '0xfbc...e79f2',
    timestamp: '1 minute ago',
    txHash: '0x3456...7890'
  },
  {
    id: '4',
    type: 'Economy',
    status: 'completed',
    fromToken: { symbol: 'ETH', icon: 'Ξ', amount: '0.021924', usdValue: '$55.52' },
    toToken: { symbol: 'USDT', icon: '$', amount: '55.52', usdValue: '$55.52' },
    account: '0xe37...b88b5',
    timestamp: '1 minute ago',
    txHash: '0x4567...8901'
  },
  {
    id: '5',
    type: 'Economy',
    status: 'completed',
    fromToken: { symbol: 'ETH', icon: 'Ξ', amount: '0.024234', usdValue: '$61.37' },
    toToken: { symbol: 'USDT', icon: '$', amount: '61.37', usdValue: '$61.37' },
    account: '0xe37...b88b5',
    timestamp: '1 minute ago',
    txHash: '0x5678...9012'
  },
  {
    id: '6',
    type: 'Fast',
    status: 'completed',
    fromToken: { symbol: 'DOGE', icon: '🐕', amount: '0.006663', usdValue: '$16.87' },
    toToken: { symbol: 'USDC', icon: '$', amount: '16.87', usdValue: '$16.87' },
    account: '0xeef...0f13b',
    timestamp: '1 minute ago',
    txHash: '0x6789...0123'
  },
  {
    id: '7',
    type: 'Fast',
    status: 'completed',
    fromToken: { symbol: 'USDC', icon: '$', amount: '999.949999', usdValue: '$999.78' },
    toToken: { symbol: 'PEPE', icon: '🐸', amount: '31247891.42', usdValue: '$999.78' },
    account: '0x171...84282',
    timestamp: '1 minute ago',
    txHash: '0x7890...1234'
  },
  {
    id: '8',
    type: 'Fast',
    status: 'completed',
    fromToken: { symbol: 'ETH', icon: 'Ξ', amount: '0.003499', usdValue: '$8.86' },
    toToken: { symbol: 'PEPE', icon: '🐸', amount: '276842.91', usdValue: '$8.86' },
    account: '0x2d7...41ef4',
    timestamp: '1 minute ago',
    txHash: '0x8901...2345'
  },
  {
    id: '9',
    type: 'Fast',
    status: 'completed',
    fromToken: { symbol: 'USDC', icon: '$', amount: '500.000000', usdValue: '$499.91' },
    toToken: { symbol: 'FARTCOIN', icon: '💨', amount: '12847.52', usdValue: '$499.91' },
    account: '0x33b...53ef9',
    timestamp: '1 minute ago',
    txHash: '0x9012...3456'
  }
]

export function HistoryContent() {
  const [filter, setFilter] = useState('all')
  const [timeframe, setTimeframe] = useState('24h')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      default:
        return null
    }
  }

  const getTransferTypeBadge = (type: string) => {
    return type === 'Fast' ? (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
        <Zap className="w-3 h-3 mr-1" />
        Fast
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
        <Clock className="w-3 h-3 mr-1" />
        Economy
      </Badge>
    )
  }

  return (
    <section className="py-8">
      <div className="wrapper mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-light">Execution History</h1>
            <p className="text-muted-foreground text-sm mt-1">Track all your trigger executions and transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Execution History Table */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium">Recent Executions</CardTitle>
              <div className="text-sm text-muted-foreground">
                {mockExecutions.length} total executions
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-border bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground">Transfer type</div>
                  <div className="text-sm font-medium text-muted-foreground">Action</div>
                  <div className="text-sm font-medium text-muted-foreground">From / To</div>
                  <div className="text-sm font-medium text-muted-foreground text-right">Amount</div>
                  <div className="text-sm font-medium text-muted-foreground">Account</div>
                  <div className="text-sm font-medium text-muted-foreground">Time</div>
                </div>

                {/* Table Rows */}
                {mockExecutions.map((execution) => (
                  <div 
                    key={execution.id} 
                    className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-border hover:bg-muted/5 transition-colors cursor-pointer"
                  >
                    {/* Transfer Type */}
                    <div className="flex items-center">
                      {getTransferTypeBadge(execution.type)}
                    </div>

                    {/* Action - Token Flow */}
                    <div className="flex items-center gap-3">
                      {/* From Token */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                          {execution.fromToken.icon}
                        </div>
                        <span className="text-sm font-medium">{execution.fromToken.symbol}</span>
                      </div>
                      
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      
                      {/* To Token */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
                          {execution.toToken.icon}
                        </div>
                        <span className="text-sm font-medium">{execution.toToken.symbol}</span>
                      </div>
                    </div>

                    {/* From / To */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                          {execution.fromToken.icon}
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                          {execution.toToken.icon}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="text-sm font-medium">{execution.fromToken.amount}</div>
                      <div className="text-xs text-muted-foreground">{execution.fromToken.usdValue}</div>
                    </div>

                    {/* Account */}
                    <div className="flex items-center">
                      <span className="text-sm font-mono text-muted-foreground">{execution.account}</span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">{execution.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-400">127</div>
                  <div className="text-sm text-muted-foreground">Total Executions</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-400">$24,891</div>
                  <div className="text-sm text-muted-foreground">Total Volume</div>
                </div>
                <ArrowRight className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">$12.47</div>
                  <div className="text-sm text-muted-foreground">Avg. Gas Fee</div>
                </div>
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-400">98.7%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <CheckCircle className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
} 