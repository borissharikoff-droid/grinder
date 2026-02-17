import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'
import { playClickSound } from '../../lib/sounds'
import { MOTION } from '../../lib/motion'

interface SessionControlsProps {
  glowPulse?: boolean
}

export function SessionControls({ glowPulse }: SessionControlsProps) {
  const { status, elapsedSeconds, start, stop, pause, resume } = useSessionStore()
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isActive = isRunning || isPaused
  const [confirmState, setConfirmState] = useState<'none' | 'discard' | 'confirm'>('none')
  const [starting, setStarting] = useState(false)
  const [showStartFx, setShowStartFx] = useState(false)
  const fxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (fxTimerRef.current) clearTimeout(fxTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (status !== 'running' || !starting) return
    const t = setTimeout(() => setStarting(false), 220)
    return () => clearTimeout(t)
  }, [status, starting])

  const handleStartStop = async () => {
    if (isActive) {
      playClickSound()
      if (elapsedSeconds < 30) {
        setConfirmState('discard')
        return
      }
      setConfirmState('confirm')
    } else {
      setStarting(true)
      setShowStartFx(true)
      if (fxTimerRef.current) clearTimeout(fxTimerRef.current)
      fxTimerRef.current = setTimeout(() => setShowStartFx(false), 1150)
      playClickSound()
      // Let the first animation frame render before tracker startup work begins.
      await new Promise((resolve) => setTimeout(resolve, 120))
      try {
        await start()
      } catch {
        setStarting(false)
      }
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
    <div className="relative flex flex-col items-center w-full">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
        className="w-full flex justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {confirmState !== 'none' ? (
            <motion.div
              key="confirm-card"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
              className="w-full max-w-[320px] rounded-2xl p-3.5 border border-white/10 bg-discord-card/90 shadow-lg"
            >
              <p className="text-sm font-semibold text-center mb-1 text-white">
                {confirmState === 'discard' ? 'Session under 30s' : 'Stop grinding?'}
              </p>
              <p className="text-xs text-gray-400 text-center mb-3">
                {confirmState === 'discard'
                  ? 'This session is too short to save. Discard it?'
                  : 'End this grind session and save progress?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm text-white font-medium hover:bg-white/10 transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleConfirmStop}
                  className="flex-1 py-2.5 rounded-xl bg-discord-red text-white text-sm font-semibold hover:bg-red-500 transition-colors"
                >
                  {confirmState === 'discard' ? 'Discard' : 'Stop'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main-controls"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
              className="flex items-center justify-center gap-6"
            >
              <div className="relative">
                <AnimatePresence>
                  {showStartFx && (
                    <>
                      <motion.div
                        key="start-fx-ring-1"
                        initial={{ opacity: 0.4, scale: 0.78 }}
                        animate={{ opacity: 0, scale: 1.28 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.75, ease: MOTION.easing }}
                        className="absolute -inset-2.5 rounded-2xl border border-cyber-neon/40 pointer-events-none"
                      />
                      <motion.div
                        key="start-fx-ring-2"
                        initial={{ opacity: 0.25, scale: 0.84 }}
                        animate={{ opacity: 0, scale: 1.44 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: MOTION.easing, delay: 0.06 }}
                        className="absolute -inset-3.5 rounded-2xl border border-cyber-neon/25 pointer-events-none"
                      />
                    </>
                  )}
                </AnimatePresence>
                {glowPulse && (
                  <div className="absolute -inset-2 rounded-2xl animate-glow-pulse pointer-events-none" />
                )}
                <motion.button
                  onClick={handleStartStop}
                  disabled={starting}
                  whileHover={!starting ? MOTION.interactive.hover : undefined}
                  whileTap={!starting ? MOTION.interactive.tap : undefined}
                  animate={starting ? { scale: 1.015 } : { scale: 1 }}
                  transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
                  className={`relative min-w-[120px] px-8 py-3 rounded-2xl font-bold text-sm transition-colors duration-200 ${
                    starting
                      ? 'bg-cyber-neon/60 text-discord-darker cursor-wait'
                      : isActive
                        ? 'bg-discord-red text-white hover:bg-red-600'
                        : 'bg-cyber-neon text-discord-darker shadow-glow hover:shadow-[0_0_30px_rgba(0,255,136,0.5)]'
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={starting ? 'starting' : isActive ? 'stop' : 'grind'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
                      className="inline-block"
                    >
                      {starting ? 'Starting...' : isActive ? 'STOP' : 'GRIND'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
              {isActive && (
                <motion.button
                  onClick={handlePauseResume}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  whileHover={MOTION.interactive.hover}
                  whileTap={MOTION.interactive.tap}
                  transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
                  className="py-3 px-5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-150 border-2 border-discord-accent/50 bg-discord-accent/15 text-white hover:bg-discord-accent/25 hover:border-discord-accent/70 hover:shadow-glow-accent"
                >
                  {isPaused ? 'RESUME' : 'PAUSE'}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
