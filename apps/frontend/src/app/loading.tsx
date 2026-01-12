export default function Loading() {
  return (
    <div className="flex-1 lg:h-full flex flex-col lg:flex-row gap-1 p-1 lg:overflow-hidden">
      {/* Left Panel - Chart + Active Triggers */}
      <div className="flex flex-col min-w-0 flex-1 min-h-0 shrink-0">
        {/* Token Info Bar Skeleton */}
        <div className="px-3 py-2 mb-1 flex items-center gap-4 lg:gap-10 shrink-0 bg-card border border-border rounded-xl overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="w-20 lg:w-24 h-4 bg-muted rounded animate-pulse" />
          </div>
          
          <div className="w-12 h-6 bg-primary/20 rounded-md animate-pulse shrink-0 text-[10px] lg:text-xs" />
          
          {/* Stats Skeletons - shrinkable on mobile */}
          <div className="flex flex-col shrink-0 h-8 justify-center gap-1 min-w-[60px]">
            <div className="w-8 h-2 bg-muted/50 rounded animate-pulse" />
            <div className="w-16 h-3 bg-muted rounded animate-pulse" />
          </div>
          <div className="hidden sm:flex flex-col shrink-0 h-8 justify-center gap-1 min-w-[60px]">
            <div className="w-16 h-2 bg-muted/50 rounded animate-pulse" />
            <div className="w-12 h-3 bg-muted rounded animate-pulse" />
          </div>
          <div className="hidden md:flex flex-col shrink-0 h-8 justify-center gap-1 min-w-[70px]">
            <div className="w-16 h-2 bg-muted/50 rounded animate-pulse" />
            <div className="w-14 h-3 bg-muted rounded animate-pulse" />
          </div>

          <div className="flex-1" />
          
          {/* Interval Selector Skeleton */}
          <div className="flex gap-0.5 bg-secondary rounded-lg p-0.5 shrink-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-6 lg:w-8 h-6 bg-muted/30 rounded animate-pulse" />
            ))}
            <div className="hidden sm:flex gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-6 lg:w-8 h-6 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Chart + OrderBook Skeleton */}
        <div className="flex-1 min-h-[400px] lg:min-h-[200px] flex gap-1 overflow-hidden">
          {/* Chart Skeleton */}
          <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
            <div className="h-full bg-[#0d0d0d] flex flex-col">
              <div className="flex-1 flex items-end justify-around px-4 pb-8 pt-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm bg-muted/20 animate-pulse"
                    style={{ 
                      height: `${15 + (((i * 7) % 23) + ((i * 13) % 17)) * 1.5}%`,
                      animationDelay: `${(i % 10) * 100}ms`
                    }}
                  />
                ))}
                <div className="hidden sm:contents">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i+20}
                      className="w-1.5 rounded-sm bg-muted/20 animate-pulse"
                      style={{ 
                        height: `${15 + ((((i+20) * 7) % 23) + (((i+20) * 13) % 17)) * 1.5}%`,
                        animationDelay: `${((i+20) % 10) * 100}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="h-6 border-t border-muted/20 flex items-center justify-between px-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-12 h-2 bg-muted/20 rounded animate-pulse" />
                ))}
                <div className="hidden sm:flex gap-8">
                   {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i+3} className="w-12 h-2 bg-muted/20 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* OrderBook Skeleton - Desktop Only */}
          <div className="w-[240px] shrink-0 hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="w-20 h-4 bg-muted rounded animate-pulse" />
              <div className="w-12 h-3 bg-muted/50 rounded animate-pulse" />
            </div>
            <div className="p-3 space-y-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="w-16 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="w-12 h-3 bg-muted/20 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Active Triggers Table Skeleton */}
        <div className="shrink-0 mt-1 bg-card border border-border rounded-xl overflow-hidden min-h-[180px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-2 border-b border-border">
            <div className="w-24 h-3 bg-muted rounded animate-pulse" />
          </div>
          
          {/* Mobile Card View Skeleton */}
          <div className="lg:hidden divide-y divide-border/50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-full bg-muted/30 animate-pulse" />
                    <div className="w-20 h-4 bg-muted/30 rounded animate-pulse" />
                    <div className="w-4 h-4 bg-muted/20 rounded animate-pulse" />
                  </div>
                  <div className="w-10 h-4 bg-muted/20 rounded animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="w-32 h-3 bg-muted/20 rounded animate-pulse" />
                  <div className="w-12 h-3 bg-muted/30 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View Skeleton */}
          <div className="hidden lg:block w-full overflow-x-auto no-scrollbar">
            <table className="w-full text-sm min-w-[600px] lg:min-w-0">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium"><div className="w-8 h-3 bg-muted/20 rounded animate-pulse" /></th>
                  <th className="text-left px-4 py-2.5 font-medium"><div className="w-8 h-3 bg-muted/20 rounded animate-pulse" /></th>
                  <th className="text-left px-4 py-2.5 font-medium"><div className="w-12 h-3 bg-muted/20 rounded animate-pulse" /></th>
                  <th className="text-left px-4 py-2.5 font-medium"><div className="w-10 h-3 bg-muted/20 rounded animate-pulse" /></th>
                  <th className="text-left px-4 py-2.5 font-medium"><div className="w-8 h-3 bg-muted/20 rounded animate-pulse" /></th>
                  <th className="text-left px-4 py-2.5 font-medium"><div className="w-14 h-3 bg-muted/20 rounded animate-pulse" /></th>
                  <th className="text-right px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5"><div className="w-16 h-3 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-2.5"><div className="w-10 h-3 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-2.5"><div className="w-24 h-3 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-2.5"><div className="w-16 h-3 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-2.5"><div className="w-8 h-3 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-2.5"><div className="w-14 h-3 bg-muted/30 rounded animate-pulse" /></td>
                    <td className="px-4 py-2.5 text-right"><div className="w-12 h-3 bg-muted/30 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Right Panel Skeleton */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-1 overflow-hidden lg:overflow-visible">
        {/* Tabs Skeleton */}
        <div className="flex bg-card border border-border rounded-xl overflow-hidden shrink-0">
          <div className="flex-1 px-4 py-3 bg-primary/10 animate-pulse" />
          <div className="flex-1 px-4 py-3 bg-muted/20 animate-pulse" />
        </div>
        
        {/* Trigger Builder Card Skeleton */}
        <div className="flex flex-col overflow-hidden bg-card border border-border rounded-xl shrink-0">
          <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
            <div className="p-3 space-y-2">
              {/* When Container */}
              <div className="bg-secondary border border-muted rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-3 bg-muted/50 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-20 h-9 sm:h-8 bg-muted rounded-lg animate-pulse shrink-0" />
                  <div className="w-4 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="flex-1 h-9 sm:h-8 bg-muted rounded-lg animate-pulse" />
                </div>
                <div className="w-24 h-8 bg-muted/20 rounded animate-pulse" />
              </div>
              
              {/* Sell Container */}
              <div className="bg-secondary border border-muted rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-3 bg-muted/50 rounded animate-pulse" />
                  <div className="w-20 h-3 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-24 h-9 bg-muted rounded-lg animate-pulse shrink-0" />
                  <div className="w-24 h-6 bg-muted/30 rounded animate-pulse" />
                </div>
              </div>

              {/* Swap Arrow Placeholder */}
              <div className="h-0" />

              {/* Buy Container */}
              <div className="bg-secondary border border-muted rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-3 bg-muted/50 rounded animate-pulse" />
                  <div className="w-12 h-3 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-24 h-9 bg-muted rounded-lg animate-pulse shrink-0" />
                  <div className="w-24 h-6 bg-muted/30 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          {/* Button Container */}
          <div className="px-3 pb-3 shrink-0">
            <div className="w-full h-12 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        
        {/* Account Overview Card Skeleton */}
        <div className="flex-1 bg-card border border-border rounded-xl p-3 shrink-0">
          <div className="space-y-1.5 pb-2 border-b border-border/40">
            <div className="flex justify-between items-center">
              <div className="w-10 h-2 bg-muted/50 rounded animate-pulse" />
              <div className="w-16 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex justify-between items-center opacity-40">
              <div className="w-10 h-2 bg-muted/50 rounded animate-pulse" />
              <div className="w-12 h-3 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center">
              <div className="w-20 h-2 bg-muted/50 rounded animate-pulse" />
              <div className="w-12 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex justify-between items-center opacity-40">
              <div className="w-20 h-2 bg-muted/50 rounded animate-pulse" />
              <div className="w-8 h-3 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Portfolio Card Skeleton */}
        <div className="h-[210px] bg-card border border-border rounded-xl p-3 flex flex-col shrink-0">
          <div className="w-16 h-2 bg-muted/50 rounded animate-pulse mb-2" />
          <div className="space-y-1 flex-1 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full bg-muted/30 animate-pulse shrink-0" />
                <div className="w-10 h-2 bg-muted/30 rounded animate-pulse flex-1" />
                <div className="w-12 h-2 bg-muted/30 rounded animate-pulse shrink-0" />
                <div className="w-14 h-2 bg-muted/20 rounded animate-pulse shrink-0 text-right" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
