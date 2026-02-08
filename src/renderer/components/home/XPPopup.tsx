import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'

export function XPPopup() {
  const xpPopups = useSessionStore((s) => s.xpPopups)

  return (
    <div className="fixed top-4 right-4 pointer-events-none z-40 flex flex-col items-end gap-1">
      <AnimatePresence>
        {xpPopups.map((popup) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-cyber-neon text-sm font-mono"
          >
            +{popup.amount} xp
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
