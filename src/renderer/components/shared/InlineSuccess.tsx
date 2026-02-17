interface InlineSuccessProps {
  message: string
  className?: string
}

export function InlineSuccess({ message, className = '' }: InlineSuccessProps) {
  return (
    <p className={`text-xs text-cyber-neon bg-cyber-neon/10 border border-cyber-neon/20 rounded-lg px-2.5 py-1.5 ${className}`} role="status" aria-live="polite">
      {message}
    </p>
  )
}
