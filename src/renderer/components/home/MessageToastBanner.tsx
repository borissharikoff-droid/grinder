import { motion, AnimatePresence } from 'framer-motion'
import { useMessageToastStore } from '../../stores/messageToastStore'

interface MessageToastBannerProps {
  onOpenChat?: (senderId: string) => void
}

export function MessageToastBanner({ onOpenChat }: MessageToastBannerProps) {
  const { current, dismiss } = useMessageToastStore()

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[260px] mx-auto overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-discord-card/90 border border-white/10 shadow-lg">
            {/* Sender avatar */}
            <span className="text-base shrink-0">{current.senderAvatar}</span>

            {/* Message content */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-white leading-snug truncate">
                <span className="font-semibold">{current.senderName}</span>
                <span className="text-gray-400">: {current.preview}</span>
              </p>
            </div>

            {/* Chat button */}
            <button
              type="button"
              onClick={() => {
                const senderId = current.senderId
                dismiss()
                onOpenChat?.(senderId)
              }}
              className="shrink-0 p-1 rounded-md text-gray-400 hover:text-cyber-neon hover:bg-white/5 transition-colors"
              title="Open chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
