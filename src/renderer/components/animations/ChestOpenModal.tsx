import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { ChestType, LootItemDef } from '../../lib/loot'
import { CHEST_DEFS } from '../../lib/loot'
import { MOTION } from '../../lib/motion'
import { PixelConfetti } from '../home/PixelConfetti'
import { playClickSound, playLootRaritySound } from '../../lib/sounds'

interface ChestOpenModalProps {
  open: boolean
  chestType: ChestType | null
  item: LootItemDef | null
  onClose: () => void
  nextAvailable?: boolean
  onOpenNext?: () => void
  chainMessage?: string | null
  animationSeed?: number
}

export function ChestOpenModal({
  open,
  chestType,
  item,
  onClose,
  nextAvailable = false,
  onOpenNext,
  chainMessage,
  animationSeed,
}: ChestOpenModalProps) {
  const chest = chestType ? CHEST_DEFS[chestType] : null
  const revealKey = `${chestType ?? 'none'}:${item?.id ?? 'none'}:${animationSeed ?? 0}`
  const rarityTheme = item
    ? item.rarity === 'legendary'
      ? {
        color: '#FACC15',
        border: 'rgba(250, 204, 21, 0.45)',
        glow: 'rgba(250, 204, 21, 0.3)',
        panel: 'radial-gradient(circle at 50% 18%, rgba(250,204,21,0.18) 0%, rgba(17,24,39,0.96) 62%)',
      }
      : item.rarity === 'epic'
        ? {
          color: '#C084FC',
          border: 'rgba(192, 132, 252, 0.45)',
          glow: 'rgba(192, 132, 252, 0.3)',
          panel: 'radial-gradient(circle at 50% 18%, rgba(192,132,252,0.18) 0%, rgba(17,24,39,0.96) 62%)',
        }
        : item.rarity === 'rare'
          ? {
            color: '#38BDF8',
            border: 'rgba(56, 189, 248, 0.45)',
            glow: 'rgba(56, 189, 248, 0.3)',
            panel: 'radial-gradient(circle at 50% 18%, rgba(56,189,248,0.18) 0%, rgba(17,24,39,0.96) 62%)',
          }
          : {
            color: '#9CA3AF',
            border: 'rgba(156, 163, 175, 0.35)',
            glow: 'rgba(156, 163, 175, 0.22)',
            panel: 'radial-gradient(circle at 50% 18%, rgba(156,163,175,0.16) 0%, rgba(17,24,39,0.96) 62%)',
          }
    : {
      color: '#9CA3AF',
      border: 'rgba(156, 163, 175, 0.35)',
      glow: 'rgba(156, 163, 175, 0.22)',
      panel: 'radial-gradient(circle at 50% 18%, rgba(156,163,175,0.16) 0%, rgba(17,24,39,0.96) 62%)',
    }

  useEffect(() => {
    if (open && item) playLootRaritySound(item.rarity)
  }, [open, item])

  return (
    <AnimatePresence>
      {open && chest && item && (
        <motion.div
          key={revealKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: MOTION.easing }}
          className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <PixelConfetti key={`confetti:${revealKey}`} originX={0.5} originY={0.42} accentColor={rarityTheme.color} duration={1.1} />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: MOTION.easing }}
            onClick={(e) => e.stopPropagation()}
            className="w-[300px] rounded-2xl border p-5 text-center space-y-3 relative overflow-hidden"
            style={{
              borderColor: rarityTheme.border,
              background: rarityTheme.panel,
              boxShadow: `0 0 28px ${rarityTheme.glow}`,
            }}
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 20%, ${rarityTheme.glow} 0%, transparent 58%)`,
              }}
              initial={{ opacity: 0.4, scale: 0.98 }}
              animate={{ opacity: [0.32, 0.55, 0.4], scale: [0.98, 1.02, 1] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: MOTION.easing }}
            />
            <motion.div
              initial={{ rotate: -4, scale: 0.92 }}
              animate={{ rotate: [0, -4, 4, 0], scale: [0.92, 1.08, 1.0] }}
              transition={{ duration: 0.9, ease: MOTION.easing }}
              className="mx-auto w-20 h-20 rounded-2xl bg-discord-darker border flex items-center justify-center text-4xl"
              style={{ borderColor: rarityTheme.border }}
            >
              {chest.image ? (
                <img src={chest.image} alt="" className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} draggable={false} />
              ) : chest.icon}
            </motion.div>
            <p className="text-[11px] font-mono uppercase tracking-wider" style={{ color: rarityTheme.color }}>Chest opened</p>
            <p className="text-sm text-white font-semibold">{chest.name}</p>
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: [0.92, 1.05, 1] }}
              transition={{ delay: 0.2, duration: MOTION.duration.base, ease: MOTION.easing }}
              className="rounded-xl border p-3 relative overflow-hidden"
              style={{ borderColor: rarityTheme.border, backgroundColor: `${rarityTheme.color}14` }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-xl"
                initial={{ opacity: 0.35 }}
                animate={{ opacity: [0.3, 0.6, 0.35] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: MOTION.easing }}
                style={{ boxShadow: `0 0 20px ${rarityTheme.glow}` }}
              />
              {item.image ? (
                <img src={item.image} alt="" className="w-14 h-14 object-contain mx-auto" style={{ imageRendering: 'pixelated' }} draggable={false} />
              ) : (
                <p className="text-3xl">{item.icon}</p>
              )}
              <p className="text-sm text-white font-semibold mt-1">{item.name}</p>
              <p className="text-[10px] font-mono uppercase mt-0.5" style={{ color: rarityTheme.color }}>
                {item.rarity}
              </p>
              <p className="text-[10px] text-gray-300">{item.perkDescription}</p>
            </motion.div>
            <button
              type="button"
              onClick={() => {
                playClickSound()
                if (nextAvailable && onOpenNext) {
                  onOpenNext()
                  return
                }
                onClose()
              }}
              className="w-full py-2 rounded-xl font-semibold transition-colors"
              style={{
                color: rarityTheme.color,
                border: `1px solid ${rarityTheme.border}`,
                backgroundColor: `${rarityTheme.color}20`,
              }}
            >
              {nextAvailable ? 'Open next' : 'Done'}
            </button>
            {chainMessage && (
              <p className="text-[10px] text-center text-orange-300/95 font-medium">{chainMessage}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
