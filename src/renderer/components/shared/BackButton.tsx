import { motion } from 'framer-motion'
import { MOTION } from '../../lib/motion'

interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function BackButton({ onClick, label = 'Back', className = '' }: BackButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={MOTION.interactive.tap}
      className={`flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm ${className}`}
      aria-label={label}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="font-mono text-xs">{label}</span>
    </motion.button>
  )
}
