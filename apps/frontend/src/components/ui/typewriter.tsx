'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface TypewriterProps {
  text: string
  delay?: number
  speed?: number
  className?: string
  onComplete?: () => void
}

export function Typewriter({ text, delay = 0, speed = 0.05, className = '', onComplete }: TypewriterProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <span className={className}>{text}</span>

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: delay + index * speed,
            duration: 0
          }}
          onAnimationComplete={() => {
            if (index === text.length - 1 && onComplete) {
              onComplete()
            }
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
} 