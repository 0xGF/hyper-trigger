import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse backdrop-blur-xl bg-muted/50", className)}
      {...props}
    />
  )
}

export { Skeleton } 