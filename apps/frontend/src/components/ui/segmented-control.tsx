'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  variant?: 'default' | 'buy' | 'sell'
  className?: string
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  className
}: SegmentedControlProps<T>) {
  const activeStyles = {
    default: 'bg-primary/10 text-primary',
    buy: 'bg-primary/10 text-primary',
    sell: 'bg-primary/10 text-primary'
  }

  return (
    <div className={cn(
      'inline-flex items-center bg-card border border-border rounded-lg overflow-hidden',
      size === 'sm' ? 'h-8' : 'h-10',
      className
    )}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-full flex items-center gap-1.5 font-medium transition-colors',
            size === 'sm' ? 'px-3 text-xs' : 'px-4 text-sm',
            value === opt.value
              ? activeStyles[variant]
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

