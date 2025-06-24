import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Logo } from '../logo'
import { type UserTrigger } from '@/hooks/useUserTriggers'

interface TriggersListProps {
  triggers: UserTrigger[]
  isLoading: boolean
  onCancelTrigger: (triggerId: string) => void
}

export function TriggersList({ triggers, isLoading, onCancelTrigger }: TriggersListProps) {
  const activeTriggers = triggers.filter(t => t.status !== 'cancelled')

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading triggers...</div>
      </div>
    )
  }

  if (activeTriggers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Logo />
          <div className="text-sm font-medium mb-1">No triggers yet</div>
          <div className="text-xs">Create your first trigger to get started</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="text-sm font-medium text-white">
          Your Triggers ({activeTriggers.length})
        </div>
        <Badge variant="secondary" className="text-xs">Active</Badge>
      </div>

      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <div className="grid grid-cols-7 gap-2 text-xs text-gray-400 font-medium">
          <div>Token</div>
          <div>Target</div>
          <div>Price</div>
          <div>Condition</div>
          <div>Amount</div>
          <div>Status</div>
          <div>Action</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTriggers.map((trigger) => (
          <div
            key={trigger.id}
            className="px-4 py-3 hover:bg-border/50 border-b border-border/50"
          >
            <div className="grid grid-cols-7 gap-2 text-xs font-mono items-center">
              <div className="text-white font-semibold">{trigger.triggerToken}</div>
              <div className="text-white">{trigger.fromToken} → {trigger.toToken}</div>
              <div className="text-white">${parseFloat(trigger.triggerPrice).toLocaleString()}</div>
              <div className={trigger.isAbove ? 'text-green-400' : 'text-red-400'}>
                {trigger.isAbove ? 'ABOVE' : 'BELOW'}
              </div>
              <div className="text-white">
                {parseFloat(trigger.fromAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {trigger.fromToken}
              </div>
              <div className={
                trigger.status === 'active' ? 'text-green-400' : 
                trigger.status === 'triggered' ? 'text-blue-400' : 
                trigger.status === 'pending' ? 'text-yellow-400' : 
                'text-gray-400'
              }>
                <div className="flex items-center gap-1">
                  {trigger.status === 'pending' && (
                    <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {trigger.status === 'triggered' && (
                    <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  )}
                  {trigger.status === 'active' && (
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  )}
                  {trigger.status === 'triggered' ? 'EXECUTED' : trigger.status.toUpperCase()}
                </div>
              </div>
              <div>
                {trigger.status === 'active' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelTrigger(trigger.id)}
                    className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    Cancel
                  </Button>
                ) : trigger.status === 'triggered' ? (
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <span>🎯</span>
                    Executed
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 