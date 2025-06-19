'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getTokenIcon } from '@/lib/token-icons'

interface TokenIconProps {
  symbol: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fallbackIcon?: string
}

export function TokenIcon({ symbol, size = 'md', className = '', fallbackIcon }: TokenIconProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  const tokenIcon = getTokenIcon(symbol)
  const displayIcon = fallbackIcon || tokenIcon.emoji

  // Try to load image from /public/tokens/ folder first
  const imagePath = `/tokens/${symbol.toLowerCase()}.png`

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center border border-border/50 overflow-hidden relative`}
      style={{ 
        backgroundColor: imageError ? tokenIcon.backgroundColor : 'transparent',
      }}
    >
      {!imageError ? (
        <>
          <Image
            src={imagePath}
            alt={`${symbol} icon`}
            width={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
            height={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
            className="rounded-full object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            priority={false}
          />
          {imageLoading && (
            <div 
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: tokenIcon.backgroundColor,
                color: tokenIcon.color 
              }}
            >
              <span className="font-semibold text-xs">
                {displayIcon}
              </span>
            </div>
          )}
        </>
      ) : (
        <span 
          className="font-semibold"
          style={{ color: tokenIcon.color }}
        >
          {displayIcon}
        </span>
      )}
    </div>
  )
} 