import { motion } from 'framer-motion'
import { playClickSound } from '../../lib/sounds'

interface StreakOverlayProps {
  streak: number
  onClose: () => void
}

export function StreakOverlay({ streak, onClose }: StreakOverlayProps) {
  const handleClose = () => {
    playClickSound()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      onClick={handleClose}
    >
      {/* Animated fire emoji */}
      <motion.div
        initial={{ y: -40, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 12 }}
        className="mb-4"
      >
        <motion.span
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, -5, 5, -3, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-6xl block"
        >
          🔥
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="text-center px-12 py-4"
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-cyber-neon font-mono text-4xl font-bold mb-2"
        >
          {streak} Day Streak!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-white text-lg mb-6"
        >
          Keep grinding.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleClose}
          className="px-8 py-2.5 rounded-xl bg-discord-accent text-white font-semibold transition-colors hover:bg-discord-accent/80"
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
