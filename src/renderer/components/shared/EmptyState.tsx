interface EmptyStateProps {
  title: string
  description?: string
  icon?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ title, description, icon = '•', actionLabel, onAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-discord-card/60 p-4 text-center ${className}`}>
      <span className="text-2xl block mb-2">{icon}</span>
      <p className="text-white text-sm font-medium">{title}</p>
      {description && <p className="text-gray-500 text-xs mt-1">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-white/15 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
