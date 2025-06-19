'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function AnimatedGrid() {
  const [mounted, setMounted] = useState(false)
  const [spreadingCells, setSpreadingCells] = useState<{[key: string]: number}>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const gridSize = 40
    const cols = Math.floor((window?.innerWidth || 1200) / gridSize)
    const rows = Math.floor((window?.innerHeight || 800) / gridSize)

    const startSpread = () => {
      // Start with a single random cell
      const startCol = Math.floor(Math.random() * (cols - 2)) + 1
      const startRow = Math.floor(Math.random() * (rows - 2)) + 1
      const startKey = `${startCol},${startRow}`
      
      const newCells: {[key: string]: number} = {}
      newCells[startKey] = 0 // delay 0 for start cell
      
      // Spread to 4-8 adjacent cells randomly
      const spreadCount = Math.floor(Math.random() * 5) + 4
      const activeCells = new Set([startKey])
      
      for (let i = 1; i < spreadCount; i++) {
        const availableCells = Array.from(activeCells).flatMap(cellKey => {
          const [col, row] = cellKey.split(',').map(Number)
          return [
            `${col-1},${row}`, `${col+1},${row}`, // left, right
            `${col},${row-1}`, `${col},${row+1}`, // up, down
          ].filter(key => {
            const [c, r] = key.split(',').map(Number)
            return c >= 0 && c < cols && r >= 0 && r < rows && !activeCells.has(key)
          })
        })
        
        if (availableCells.length === 0) break
        
        const nextCell = availableCells[Math.floor(Math.random() * availableCells.length)]
        newCells[nextCell] = i * 300 // stagger by 300ms (slower)
        activeCells.add(nextCell)
      }
      
      setSpreadingCells(newCells)
      
      // Clear after animation completes
      setTimeout(() => {
        setSpreadingCells({})
      }, spreadCount * 300 + 5000) // spread time + longer hold time
    }

    // Start immediately, then repeat every 6-10 seconds
    startSpread()
    
    const interval = setInterval(() => {
      startSpread()
    }, Math.random() * 4000 + 6000) // 6-10 seconds

    return () => {
      clearInterval(interval)
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
      {/* Clean Grid Base */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} 
      />

      {/* Spreading Grid Cells */}
      <div className="absolute inset-0">
        {Object.entries(spreadingCells).map(([cellKey, delay]) => {
          const [col, row] = cellKey.split(',').map(Number)
          
          return (
            <motion.div
              key={cellKey}
              className="absolute border-2 border-green-400/60"
              style={{
                left: col * 40,
                top: row * 40,
                width: 40,
                height: 40,
              }}
              initial={{ 
                backgroundColor: 'rgba(34, 197, 94, 0)',
                borderColor: 'rgba(34, 197, 94, 0)',
                scale: 0.7
              }}
              animate={{
                backgroundColor: [
                  'rgba(34, 197, 94, 0)',
                  'rgba(34, 197, 94, 0.4)',
                  'rgba(34, 197, 94, 0.6)',
                  'rgba(34, 197, 94, 0.4)',
                  'rgba(34, 197, 94, 0)'
                ],
                borderColor: [
                  'rgba(34, 197, 94, 0)',
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(34, 197, 94, 1)',
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(34, 197, 94, 0)'
                ],
                scale: [0.7, 1, 1, 1, 0.7]
              }}
              transition={{
                duration: 4,
                delay: delay / 1000, // convert ms to seconds
                ease: "easeInOut"
              }}
            />
          )
        })}
      </div>
    </div>
  )
} 