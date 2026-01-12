'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TokenIcon } from './token-icon'
import { Input } from './input'
import type { UnifiedToken } from '@/lib/tokens'

// Token Button
interface TokenButtonProps {
  symbol: string
  onClick?: () => void
  selectable?: boolean
  className?: string
}

export function TokenButton({ symbol, onClick, selectable = true, className }: TokenButtonProps) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 h-10 px-3 bg-card border border-muted rounded-lg transition-colors',
        onClick && 'hover:bg-muted hover:border-primary/30 cursor-pointer group',
        className
      )}
    >
      <TokenIcon symbol={symbol} size="sm" />
      <span className="text-sm font-semibold text-foreground">{symbol}</span>
      {selectable && onClick && (
        <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </Component>
  )
}

// Token Modal
interface TokenModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (symbol: string) => void
  tokens: UnifiedToken[]
  balances?: Record<string, string>
  title: string
  excludeToken?: string
}

export function TokenModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  tokens, 
  balances = {},
  title, 
  excludeToken 
}: TokenModalProps) {
  const [search, setSearch] = useState('')
  
  // Sort tokens - ones with balance first, then alphabetically
  const filteredTokens = useMemo(() => {
    return tokens
      .filter(t => t.symbol !== excludeToken)
      .filter(t => 
        !search || 
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.displayName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const balA = parseFloat(balances[a.symbol] || '0')
        const balB = parseFloat(balances[b.symbol] || '0')
        if (balA > 0 && balB <= 0) return -1
        if (balB > 0 && balA <= 0) return 1
        return 0
      })
  }, [tokens, search, excludeToken, balances])

  const handleSelect = (symbol: string) => {
    onSelect(symbol)
    onClose()
    setSearch('')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background border border-muted rounded-xl w-full max-w-sm max-h-[60vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-muted flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{title}</span>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* Search */}
          <div className="px-4 py-3 border-b border-muted">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 h-9 bg-input text-sm"
              />
            </div>
          </div>
          
          {/* Token List */}
          <div className="overflow-y-auto max-h-[320px] p-1.5">
            {filteredTokens.map(token => {
              const balance = balances[token.symbol]
              const hasBalance = balance && parseFloat(balance) > 0
              
              return (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => handleSelect(token.symbol)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted rounded-lg transition-colors"
                >
                  <TokenIcon symbol={token.symbol} size="md" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">{token.displayName}</div>
                  </div>
                  {hasBalance && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground tabular-nums">
                        {parseFloat(balance).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 4 
                        })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Balance</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

