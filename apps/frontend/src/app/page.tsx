import Link from 'next/link'
import { TradingLayout } from '@/components/layout/TradingLayout'
import { Button } from '@/components/ui/button'
import { AnimatedGrid } from '@/components/ui/animated-grid'
import { Typewriter } from '@/components/ui/typewriter'

export default function HomePage() {
  return (
    <TradingLayout>
      {/* Hero Section with Animated Technical Background */}
      <section className="relative min-h-[79vh] flex items-center justify-center overflow-hidden">
        {/* Animated Grid Background */}
        <AnimatedGrid />

        <div className="relative z-10 wrapper mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Main content */}
            <div className="space-y-8 relative">
              <div className="space-y-6 z-10 relative">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light leading-none">
                  <Typewriter 
                    text="Cross-Asset" 
                    delay={0.5}
                    speed={0.1}
                    className="text-foreground font-light"
                  />
                  <br />
                  <Typewriter 
                    text="Triggered" 
                    delay={1.5}
                    speed={0.08}
                    className="text-primary font-light italic"
                  />
                  <br />
                  <Typewriter 
                    text="Trading" 
                    delay={2.8}
                    speed={0.1}
                    className="text-foreground font-light"
                  />
                </h1>
                
                <div className="pt-8">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="border-white/20 hover:border-white/40 bg-transparent text-white font-mono text-sm px-8 py-3"
                    asChild
                  >
                    <Link href="/triggers">
                      START TRIGGERING →
                    </Link>
                  </Button>
                </div>
              </div>
            <div className="bg-background/70 z-0 blur-[100px] absolute -inset-20"/>
            </div>
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="absolute bottom-8 right-8 text-xs text-gray-500 font-mono">
          <Typewriter 
            text="/// BUY FARTCOIN WHEN BTC HITS $100,000." 
            delay={8.0}
            speed={0.02}
          />
        </div>
      </section>

      {/* Technical Stats */}
      <section className="py-32 border-t border-white/10 relative overflow-hidden">
        {/* Vertical Lines Background Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.1) 2px,
              rgba(255,255,255,0.1) 3px
            )`,
            backgroundSize: '60px 100%'
          }}
        />
        
        <div className="wrapper mx-auto relative z-10">
          <div className="flex justify-between items-center mb-16">
            <div className="text-xs text-gray-500 font-mono">[ TRIGGERS ]</div>
            <div className="text-xs text-gray-500 font-mono tracking-wider">PROTOCOL METRICS</div>
          </div>
          
          {/* Large hero metric */}
          <div className="mb-20">
            <div className="text-8xl md:text-9xl font-mono font-light tracking-tight text-white">
              000,000,000
            </div>
          </div>

          {/* Supporting metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div>
              <div className="text-xs text-gray-500 font-mono mb-4 tracking-wider">
                VALUE<br />IN TRIGGERS
              </div>
              <div className="text-4xl md:text-5xl font-mono font-light tracking-tight">
                $1M+
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 font-mono mb-4 tracking-wider">
                TOKENS<br />SUPPORTED
              </div>
              <div className="text-4xl md:text-5xl font-mono font-light tracking-tight">
                100+
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 font-mono mb-4 tracking-wider">
                MOST POPULAR<br />TRIGGER
              </div>
              <div className="text-4xl md:text-5xl font-mono font-light tracking-tight">
                BTC_BREAKOUT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 border-y border-border">
        <div className="wrapper mx-auto">
          <div className="flex justify-between items-center mb-16">
            <div className="text-xs text-gray-500 font-mono">[ ? ]</div>
            <div className="text-xs text-gray-500 font-mono tracking-wider">FEATURES</div>
          </div>
          
          <div className="mb-16">
            <h2 className="text-4xl font-light">Why HyperTrigger?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-xs text-gray-500 font-mono">A /</div>
                <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light">INSTANT SETUP</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Create price-based triggers in seconds with our intuitive interface. 
                Set precise thresholds and execute trades automatically when 
                market conditions are met.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-xs text-gray-500 font-mono">B /</div>
                <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light">UNIFIED SECURITY</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Multi-oracle validation with MEV protection ensures reliable execution. 
                Built-in slippage control and emergency safeguards protect your trades 
                across all market conditions.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-xs text-gray-500 font-mono">C /</div>
                <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light">CUSTOM EXECUTION</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Configure execution parameters to match your strategy. 
                Set custom slippage tolerance, gas limits, and timing preferences 
                for optimal trade execution.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-xs text-gray-500 font-mono">D /</div>
                <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light">COST-EFFECTIVE</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Pay-as-you-execute model with ultra-low fees on HyperEVM. 
                No subscription costs, only minimal execution fees when 
                your triggers activate successfully.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Strategies - Minimal */}
      <section className="py-20 border-t relative border-white/10">
        <div className="wrapper mx-auto relative z-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-white/10 p-8 bg-background relative">
              <div className="absolute top-6 right-6 text-xs text-gray-500 font-mono">/ 01</div>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-light mb-4">Any Price</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Trigger trades based on any asset price from BTC, ETH, to memecoins. 
                Set precise thresholds with multi-oracle validation for reliable execution.
              </p>
            </div>

            <div className="border border-white/10 p-8 bg-background relative">
              <div className="absolute top-6 right-6 text-xs text-gray-500 font-mono">/ 02</div>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-2xl font-light mb-4">Any Token</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Execute swaps on any HyperEVM / Hyperliquid exchange token across HyperEVM. 
                From blue chips to emerging assets, create triggers with unified liquidity and optimal routing powered by HyperEVM.
              </p>
            </div>

            <div className="border border-white/10 p-8 bg-background relative">
              <div className="absolute top-6 right-6 text-xs text-gray-500 font-mono">/ 03</div>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-light mb-4">Any Time</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                24/7 automated execution with sub-second latency. 
                Never miss market opportunities with continuous monitoring and instant trade execution.
              </p>
            </div>
          </div>
        </div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.1) 2px,
              rgba(255,255,255,0.1) 3px
            )`,
            backgroundSize: '60px 100%'
          }}
        />
      </section>

      {/* Bottom CTA */}
      <section className="py-[78px] border-t border-white/10 relative overflow-hidden">
        {/* Animated Grid Background */}
        <AnimatedGrid />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="space-y-8 relative z-10">
            <h2 className="text-3xl font-light">Ready to automate?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Join traders executing perfect entries and exits, 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/20 hover:border-white/40 bg-transparent text-white font-mono text-sm px-8 py-3"
                asChild
              >
                <Link href="/triggers">
                  CREATE TRIGGER →
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="text-gray-400 hover:text-white font-mono text-sm px-8 py-3"
                asChild
              >
                <Link href="/dashboard">
                  VIEW DASHBOARD
                </Link>
              </Button>
            </div>
          </div>
          <div className="bg-background/70 z-0 blur-[30px] absolute -inset-10"/>
        </div>
      </section>
    </TradingLayout>
  )
} 