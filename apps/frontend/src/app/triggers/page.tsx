'use client'

import { useState } from 'react'
import { TriggerForm } from '@/components/triggers/TriggerForm'
import { SwapForm } from '@/components/swap/SwapForm'
import { TradingLayout } from '@/components/layout/TradingLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type TradingMode = 'swap' | 'trigger'

export default function TradingPage() {
  const [mode, setMode] = useState<TradingMode>('swap')

  return (
    <TradingLayout>
      <section className="py-8">
        <div className="wrapper mx-auto">
          {/* Mode Selector */}
          <div className="mb-8">
            <Card className="w-fit mx-auto">
              <CardContent className="p-2">
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'swap' ? 'default' : 'outline'}
                    onClick={() => setMode('swap')}
                    className="px-6 py-2"
                  >
                    🚀 Instant Swap
                  </Button>
                  <Button
                    variant={mode === 'trigger' ? 'default' : 'outline'}
                    onClick={() => setMode('trigger')}
                    className="px-6 py-2"
                  >
                    ⏰ Price Trigger
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Mode Description */}
            <div className="text-center mt-4 text-sm text-muted-foreground">
              {mode === 'swap' ? (
                <span>Execute immediate any-to-any token swaps via HyperCore</span>
              ) : (
                <span>Set USDC-based price triggers that execute automatically</span>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="w-full">
            {mode === 'swap' ? <SwapForm /> : <TriggerForm />}
          </div>
        </div>
      </section>
    </TradingLayout>
  )
} 