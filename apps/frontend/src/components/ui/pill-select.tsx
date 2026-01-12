'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PillSelectProps {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  formatLabel?: (value: string) => string
  className?: string
}

export function PillSelect({
  options,
  value,
  onChange,
  formatLabel,
  className
}: PillSelectProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'h-7 px-2.5 text-xs font-medium rounded-md transition-colors',
            value === opt
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {formatLabel ? formatLabel(opt) : opt}
        </button>
      ))}
    </div>
  )
}

