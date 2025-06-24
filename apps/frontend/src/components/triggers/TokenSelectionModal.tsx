import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TokenIcon } from '@/components/ui/token-icon'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { type OnChainToken } from '@/lib/hyperliquid'

interface TokenSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (symbol: string) => void
  tokens: OnChainToken[]
  title: string
}

export function TokenSelectionModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  tokens, 
  title 
}: TokenSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (symbol: string) => {
    onSelect(symbol)
    onClose()
    setSearchTerm('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="max-h-80 overflow-y-auto space-y-1">
          {filteredTokens.map((token) => (
            <button
              key={token.symbol}
              onClick={() => handleSelect(token.symbol)}
              className="w-full p-3 text-left rounded-lg hover:bg-card transition-colors flex items-center gap-3"
            >
              <TokenIcon symbol={token.symbol} size="md" />
              <div className="flex-1">
                <div className="font-medium">{token.symbol}</div>
                <div className="text-muted-foreground text-sm">{token.name}</div>
                {token.price && (
                  <div className="text-muted-foreground text-xs">${token.price.toFixed(2)}</div>
                )}
              </div>
            </button>
          ))}
          {filteredTokens.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No tokens found</div>
              <div className="text-xs">Try adjusting your search</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 