import { motion } from 'framer-motion'
import { MOTION } from '../../lib/motion'

interface StreakOverlayProps {
  streak: number
  onClose: () => void
}

export function StreakOverlay({ streak, onClose }: StreakOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
      {/* Keep the area above the streak text fully black */}
      <div className="absolute inset-0 pointer-events-none bg-black" />
      <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-black" />
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
        onClick={(e) => e.stopPropagation()}
        className="text-center px-12 py-8"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: MOTION.duration.base, ease: MOTION.easing }}
          className="text-cyber-neon font-mono text-4xl font-bold mb-2"
        >
          {streak} Day Streak!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: MOTION.duration.base, ease: MOTION.easing }}
          className="text-white text-lg mb-6"
        >
          Keep grinding.
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: MOTION.duration.base, ease: MOTION.easing }}
          whileTap={MOTION.interactive.tap}
          onClick={onClose}
          className="px-6 py-2 rounded-xl bg-discord-accent text-white font-semibold transition-colors hover:bg-discord-accent/80"
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
