import { useState } from 'react'
import { motion } from 'framer-motion'

interface WelcomeBannerProps {
  onDismiss: () => void
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(true)

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xs text-center"
    >
      <div className="rounded-2xl bg-discord-card/80 border border-cyber-neon/20 px-5 py-4 backdrop-blur-sm relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-neon/5 to-transparent pointer-events-none" />

        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-3xl mb-2"
          >
            👋
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white font-bold text-base mb-1"
          >
            Welcome to the grind
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400 text-xs leading-relaxed mb-3"
          >
            Track your focus. Compete with friends.
            <br />
            Every minute counts — let's get it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-1.5 text-cyber-neon text-xs font-mono"
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ▼
            </motion.span>
            <span>hit GRIND to start</span>
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ▼
            </motion.span>
          </motion.div>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-400 transition-colors text-xs w-5 h-5 flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
