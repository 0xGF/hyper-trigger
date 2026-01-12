'use client'

import { useState } from 'react'
import { getTokenIcon, getTokenImageUrl } from '@/lib/token-icons'

interface TokenIconProps {
  symbol: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function TokenIcon({ symbol, size = 'md', className = '' }: TokenIconProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const textSizes = {
    xs: 'text-[8px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  }

  const tokenStyle = getTokenIcon(symbol)
  const imageUrl = getTokenImageUrl(symbol)

  return (
    <div 
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center border border-border/50 overflow-hidden relative`}
      style={{ 
        backgroundColor: imageError ? tokenStyle.backgroundColor : 'transparent',
      }}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt={`${symbol} icon`}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <span 
          className={`font-bold ${textSizes[size]} uppercase`}
          style={{ color: tokenStyle.color }}
        >
          {symbol.slice(0, 2)}
        </span>
      )}
    </div>
  )
}
