interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Loading({ message = "Loading...", size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-2 border-muted border-t-primary mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  )
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-3 w-3 border',
    md: 'h-4 w-4 border-2',
    lg: 'h-6 w-6 border-2'
  }

  return (
    <div className={`animate-spin rounded-full border-muted border-t-primary ${sizeClasses[size]}`}></div>
  )
}
