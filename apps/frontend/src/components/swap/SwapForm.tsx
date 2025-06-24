'use client'

import { useState } from 'react'
import { parseEther, formatEther } from 'viem'
import { CONTRACTS, SWAP_CONTRACT_ABI } from '@/lib/contracts'
import { getAllTokens, type UnifiedToken } from '@/lib/tokens'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown, Zap } from 'lucide-react'

// Mock wagmi hooks for now since wagmi types aren't available
const useWriteContract = () => ({
  writeContract: async (args: any) => console.log('Mock writeContract:', args),
  data: null,
  error: null as { message: string } | null
})

const useWaitForTransactionReceipt = (args: any) => ({
  isLoading: false
})

const useReadContract = (args: any) => ({
  data: null,
  isLoading: false
})

export function SwapForm() {
  const availableTokens = getAllTokens()
  const [fromToken, setFromToken] = useState<UnifiedToken>(availableTokens[0])
  const [toToken, setToToken] = useState<UnifiedToken>(availableTokens[1])
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('1') // 1% default
  const [isSwapping, setIsSwapping] = useState(false)

  const { writeContract, data: hash, error } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })
  
  // Read swap fee from contract
  const { data: swapFee } = useReadContract({
    address: CONTRACTS.SwapContract,
    abi: SWAP_CONTRACT_ABI,
    functionName: 'swapFee'
  })

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    try {
      setIsSwapping(true)
      
      const inputAmount = parseEther(amount)
      const minOutputAmount = calculateMinOutputAmount(inputAmount)
      const totalValue = fromToken.symbol === 'HYPE' 
        ? inputAmount + (swapFee || parseEther('0.001'))
        : (swapFee || parseEther('0.001'))
      
      await writeContract({
        address: CONTRACTS.SwapContract as `0x${string}`,
        abi: SWAP_CONTRACT_ABI,
        functionName: 'executeSwap',
        args: [
          BigInt(fromToken.tokenId || 0), // fromToken ID
          BigInt(toToken.tokenId || 0),   // targetToken ID  
          inputAmount,                    // inputAmount
          minOutputAmount,                // minOutputAmount
          fromToken.oracleIndex || 0,     // fromOracleIndex
          toToken.oracleIndex || 0        // targetOracleIndex
        ],
        value: totalValue
      })
    } catch (err) {
      console.error('Swap failed:', err)
    } finally {
      setIsSwapping(false)
    }
  }

  const calculateMinOutputAmount = (inputAmount: bigint): bigint => {
    // Simple calculation - in production would use actual oracle prices
    const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100))
    const slippageMultiplier = BigInt(10000) - slippageBps
    return (inputAmount * slippageMultiplier) / BigInt(10000)
  }

  const swapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
  }

  const getTokenOptions = (excludeToken?: UnifiedToken) => {
    return availableTokens.filter(token => 
      !excludeToken || token.symbol !== excludeToken.symbol
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="bg-background/50 backdrop-blur border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Instant Swap
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Execute immediate cross-asset swaps via HyperCore
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* From Token Section */}
          <div className="space-y-2">
            <Label htmlFor="from-token">From</Label>
            <div className="relative">
              <Select 
                value={fromToken.symbol} 
                onValueChange={(value) => {
                  const token = availableTokens.find(t => t.symbol === value)
                  if (token) setFromToken(token)
                }}
              >
                <SelectTrigger className="mb-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getTokenOptions(toToken).map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center gap-2">
                        <span>{token.icon}</span>
                        <span>{token.symbol}</span>
                        <span className="text-muted-foreground text-xs">
                          {token.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                id="from-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="text-right text-lg font-mono"
              />
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={swapTokens}
              className="rounded-full border-border/50 hover:bg-primary/10"
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          {/* To Token Section */}
          <div className="space-y-2">
            <Label htmlFor="to-token">To</Label>
            <Select 
              value={toToken.symbol} 
              onValueChange={(value) => {
                const token = availableTokens.find(t => t.symbol === value)
                if (token) setToToken(token)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getTokenOptions(fromToken).map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <span>{token.icon}</span>
                      <span>{token.symbol}</span>
                      <span className="text-muted-foreground text-xs">
                        {token.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slippage Tolerance */}
          <div className="space-y-2">
            <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
            <Input
              id="slippage"
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              step="0.1"
              min="0.1"
              max="20"
              className="font-mono"
            />
          </div>

          {/* Fee Display */}
          {swapFee && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Swap Fee: {formatEther(swapFee)} HYPE
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!amount || parseFloat(amount) <= 0 || isSwapping || isConfirming}
            className="w-full"
            size="lg"
          >
            {isSwapping || isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Swapping...
              </>
            ) : (
              'Swap Now'
            )}
          </Button>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              Error: {error.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 