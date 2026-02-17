interface ErrorStateProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  secondaryAction?: { label: string; onClick: () => void }
  className?: string
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Retry',
  secondaryAction,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`rounded-xl bg-discord-card/80 border border-red-500/30 p-4 text-center ${className}`} role="status" aria-live="polite">
      <p className="text-red-400 text-sm mb-2">{message}</p>
      {(onRetry || secondaryAction) && (
        <div className="flex items-center justify-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/40 hover:bg-cyber-neon/30 transition-colors"
            >
              {retryLabel}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white border border-white/15 hover:bg-white/10 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
