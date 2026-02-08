import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'

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
    <div className="text-center">
      <motion.div
        animate={status === 'running'
          ? { textShadow: ['0 0 16px rgba(0,255,136,0.3)', '0 0 28px rgba(0,255,136,0.55)', '0 0 16px rgba(0,255,136,0.3)'] }
          : { textShadow: '0 0 0px transparent' }}
        transition={status === 'running'
          ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
          : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`font-mono text-5xl font-bold tabular-nums tracking-wider transition-colors duration-500 ${
          status === 'running' ? 'text-cyber-neon' : status === 'paused' ? 'text-yellow-400' : 'text-white'
        }`}
      >
        {formatTime(elapsed)}
      </motion.div>
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 mt-1"
        >
          <p className="text-xs text-gray-500 font-mono">
            {status === 'running' ? '● grinding...' : '◆ on pause'}
          </p>
          <AnimatePresence>
            {isAfkPaused && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
              >
                AFK
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
