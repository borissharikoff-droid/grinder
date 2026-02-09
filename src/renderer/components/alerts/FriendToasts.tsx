import { motion, AnimatePresence } from 'framer-motion'
import { useFriendToastStore } from '../../stores/friendToastStore'

export function FriendToasts() {
  const { toasts, dismiss } = useFriendToastStore()

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-[240px]">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="pointer-events-auto rounded-xl bg-discord-card border border-white/10 shadow-lg px-3 py-2.5 flex items-center gap-2"
          >
            <span className="text-base shrink-0">
              {t.type === 'online' ? '🟢' : '⚡'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white font-medium truncate">
                {t.type === 'online'
                  ? `${t.friendName} is online`
                  : `${t.friendName} started ${t.skillName ?? 'grinding'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-gray-500 hover:text-gray-300 text-[10px] p-0.5"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
