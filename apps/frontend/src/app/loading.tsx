export default function Loading() {
  return (
    <div className="h-full flex flex-col lg:flex-row gap-1 p-1 overflow-hidden">
      {/* Left Panel - Chart + Active Triggers */}
      <div className="flex flex-col min-w-0 flex-1 min-h-0">
        {/* Token Info Bar Skeleton */}
        <div className="px-3 py-2 mb-1 flex items-center gap-10 shrink-0 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="w-24 h-4 bg-muted rounded animate-pulse" />
          </div>
          
          <div className="w-12 h-6 bg-primary/10 rounded-md animate-pulse" />
          
          {/* Stats Skeletons */}
          <div className="flex flex-col gap-1">
            <div className="w-8 h-2 bg-muted/50 rounded animate-pulse" />
            <div className="w-16 h-3 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-16 h-2 bg-muted/50 rounded animate-pulse" />
            <div className="w-12 h-3 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-16 h-2 bg-muted/50 rounded animate-pulse" />
            <div className="w-14 h-3 bg-muted rounded animate-pulse" />
          </div>

          <div className="flex-1" />
          
          {/* Interval Selector Skeleton */}
          <div className="flex gap-0.5 bg-secondary rounded-lg p-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-8 h-6 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        </div>
        
        {/* Chart + OrderBook Skeleton */}
        <div className="flex-1 min-h-[200px] flex gap-1">
          {/* Chart Skeleton */}
          <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
            <div className="h-full bg-[#0d0d0d] flex flex-col">
              <div className="flex-1 flex items-end justify-around px-4 pb-8 pt-4">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm bg-muted/20 animate-pulse"
                    style={{ 
                      height: `${15 + (((i * 7) % 23) + ((i * 13) % 17)) * 1.5}%`,
                      animationDelay: `${(i % 10) * 100}ms`
                    }}
                  />
                ))}
              </div>
              <div className="h-6 border-t border-muted/20 flex items-center justify-between px-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-12 h-2 bg-muted/20 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
          
          {/* OrderBook Skeleton */}
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
        
        {/* Triggers Table Skeleton */}
        <div className="shrink-0 mt-1 bg-card border border-border rounded-xl overflow-hidden min-h-[180px] flex flex-col">
          <div className="px-4 py-2 border-b border-border">
            <div className="w-24 h-3 bg-muted rounded animate-pulse" />
          </div>
          <div className="p-0">
            <div className="grid grid-cols-7 border-b border-border px-4 py-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-12 h-3 bg-muted/20 rounded animate-pulse" />
              ))}
            </div>
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-7 items-center">
                  <div className="w-16 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="w-10 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="w-24 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="w-8 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="w-14 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="flex justify-end">
                    <div className="w-12 h-3 bg-muted/30 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel Skeleton */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-1 overflow-hidden">
        {/* Tabs Skeleton */}
        <div className="flex bg-card border border-border rounded-xl overflow-hidden shrink-0">
          <div className="flex-1 px-4 py-3.5 bg-primary/10 animate-pulse" />
          <div className="flex-1 px-4 py-3.5 bg-muted/20 animate-pulse" />
        </div>
        
        {/* Trigger Builder Skeleton */}
        <div className="flex flex-col bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="w-24 h-4 bg-muted rounded animate-pulse mb-2" />
          <div className="space-y-3">
            <div className="h-20 bg-secondary rounded-xl animate-pulse" />
            <div className="h-20 bg-secondary rounded-xl animate-pulse" />
            <div className="h-20 bg-secondary rounded-xl animate-pulse" />
          </div>
          <div className="h-12 bg-muted rounded-xl animate-pulse mt-2" />
        </div>
        
        {/* Account Overview Skeleton */}
        <div className="bg-card border border-border rounded-xl p-3 space-y-3">
          <div className="space-y-2 pb-2 border-b border-border/40">
            <div className="flex justify-between">
              <div className="w-10 h-2 bg-muted/50 rounded animate-pulse" />
              <div className="w-16 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="w-12 h-2 bg-muted/30 rounded animate-pulse" />
              <div className="w-12 h-3 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex justify-between">
              <div className="w-20 h-2 bg-muted/50 rounded animate-pulse" />
              <div className="w-12 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="w-20 h-2 bg-muted/30 rounded animate-pulse" />
              <div className="w-8 h-3 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Portfolio Skeleton */}
        <div className="h-[210px] bg-card border border-border rounded-xl p-3 flex flex-col">
          <div className="w-16 h-2 bg-muted/50 rounded animate-pulse mb-3" />
          <div className="space-y-3 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-muted/30 animate-pulse" />
                <div className="w-10 h-2 bg-muted/30 rounded animate-pulse flex-1" />
                <div className="w-12 h-2 bg-muted/30 rounded animate-pulse" />
                <div className="w-10 h-2 bg-muted/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
