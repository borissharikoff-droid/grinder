import { useState } from 'react'
import { motion } from 'framer-motion'
import mascotImg from '../../assets/mascot.png'

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
      initial={false}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xs text-center"
    >
      <div className="rounded-2xl bg-discord-card/90 border border-[#8b5cf6]/20 px-5 py-4 relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#8b5cf6]/5 to-transparent pointer-events-none" />

        <div className="relative">
          <img
            src={mascotImg}
            alt="Grinder mascot"
            className="w-20 h-20 mx-auto mb-2"
            draggable={false}
          />

          <h2 className="text-white font-bold text-base mb-1">
            Welcome to the grind
          </h2>

          <p className="text-gray-400 text-xs leading-relaxed mb-3">
            Track your focus. Compete with friends.
            <br />
            Every minute counts — let's get it.
          </p>

          <div className="flex items-center justify-center gap-1.5 text-cyber-neon text-xs font-mono">
            <span className="animate-arrow-blink">▼</span>
            <span>hit GRIND to start</span>
            <span className="animate-arrow-blink">▼</span>
          </div>
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
