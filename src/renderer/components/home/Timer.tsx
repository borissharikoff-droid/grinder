import { AnimatePresence, motion } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'
import { MOTION } from '../../lib/motion'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':')
}

export function Timer() {
  const elapsed = useSessionStore((s) => s.elapsedSeconds)
  const status = useSessionStore((s) => s.status)
  const isAfkPaused = useSessionStore((s) => s.isAfkPaused)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="text-center"
    >
      <motion.div
        layout
        className={`font-mono text-5xl font-bold tabular-nums tracking-wider transition-colors duration-150 ${
          status === 'running'
            ? 'text-cyber-neon animate-timer-glow'
            : status === 'paused'
              ? 'text-yellow-400'
              : 'text-white'
        }`}
      >
        {formatTime(elapsed)}
      </motion.div>
      {/* Status line — always same height, instant switch */}
      <div className="h-5 flex items-center justify-center gap-2 mt-3">
        <AnimatePresence mode="wait" initial={false}>
          {status !== 'idle' && (
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
              className="text-xs text-gray-500 font-mono"
              title={status === 'running' ? 'Session is active - tracking your apps' : 'Session paused - timer stopped'}
            >
              {status === 'running' ? '● grinding...' : '◆ on pause'}
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isAfkPaused && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }}
              className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
            >
              AFK
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
