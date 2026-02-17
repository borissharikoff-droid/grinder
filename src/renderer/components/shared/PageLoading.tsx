interface SkeletonBlockProps {
  className?: string
}

export function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`rounded-lg bg-white/10 animate-pulse ${className}`} />
}

interface PageLoadingProps {
  label?: string
  className?: string
}

export function PageLoading({ label = 'Loading...', className = '' }: PageLoadingProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-discord-card/70 p-4 ${className}`} aria-live="polite" aria-busy="true">
      <div className="space-y-2.5">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
      </div>
      <p className="mt-3 text-xs text-gray-500 font-mono">{label}</p>
    </div>
  )
}
