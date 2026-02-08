import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'
import { playClickSound } from '../../lib/sounds'

interface SessionControlsProps {
  glowPulse?: boolean
}

export function SessionControls({ glowPulse }: SessionControlsProps) {
  const { status, elapsedSeconds, start, stop, pause, resume } = useSessionStore()
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isActive = isRunning || isPaused
  const [confirmState, setConfirmState] = useState<'none' | 'discard' | 'confirm'>('none')

  const handleStartStop = () => {
    playClickSound()
    if (isActive) {
      // Short session: confirm discard
      if (elapsedSeconds < 30) {
        setConfirmState('discard')
        return
      }
      // Normal session: quick confirm
      setConfirmState('confirm')
    } else {
      start()
    }
  }

  const handleConfirmStop = () => {
    playClickSound()
    setConfirmState('none')
    stop()
  }

  const handleCancel = () => {
    playClickSound()
    setConfirmState('none')
  }

  const handlePauseResume = () => {
    playClickSound()
    if (isPaused) resume()
    else pause()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Confirmation dialogs */}
      <AnimatePresence>
        {confirmState !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl bg-discord-card/95 border border-white/10 p-4 backdrop-blur-sm w-72"
          >
            <p className="text-sm text-white font-semibold text-center mb-1">
              {confirmState === 'discard' ? 'Session under 30s' : 'Stop grinding?'}
            </p>
            <p className="text-xs text-gray-400 text-center mb-3">
              {confirmState === 'discard'
                ? 'This session is too short to save. Discard it?'
                : 'End this grind session and save progress?'}
            </p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="flex-1 py-2 rounded-lg bg-discord-darker border border-white/10 text-sm text-gray-300 font-medium hover:bg-discord-darker/80 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmStop}
                className="flex-1 py-2 rounded-lg bg-discord-red text-white text-sm font-bold hover:bg-red-600 transition-colors"
              >
                {confirmState === 'discard' ? 'Discard' : 'Stop'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main controls */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Pulsing glow behind button — perfectly round, matching button shape */}
          {glowPulse && (
            <div className="absolute -inset-3 rounded-[20px] bg-cyber-neon/25 blur-2xl animate-pulse pointer-events-none" />
          )}
          {glowPulse && (
            <div className="absolute -inset-1.5 rounded-[18px] bg-cyber-neon/15 blur-md animate-pulse pointer-events-none" />
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', damping: 18, stiffness: 400 }}
            onClick={handleStartStop}
            className={`relative px-8 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
              isActive
                ? 'bg-discord-red text-white hover:bg-red-600'
                : 'bg-cyber-neon text-discord-darker shadow-glow hover:shadow-[0_0_30px_rgba(0,255,136,0.5)]'
            }`}
          >
            {isActive ? 'STOP' : 'GRIND'}
          </motion.button>
        </div>
        <AnimatePresence>
          {isActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: -10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              onClick={handlePauseResume}
              className="px-5 py-3 rounded-2xl font-bold text-sm bg-discord-card text-white border border-white/10 transition-colors duration-200 hover:bg-discord-cardHover"
            >
              {isPaused ? 'RESUME' : 'PAUSE'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
