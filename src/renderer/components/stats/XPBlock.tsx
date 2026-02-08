import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { levelFromTotalXP, xpProgressInLevel } from '../../lib/xp'

export function XPBlock() {
  const [totalXP, setTotalXP] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.db?.getLocalStat) {
      window.electronAPI.db.getLocalStat('total_xp').then((v) => setTotalXP(parseInt(v || '0', 10)))
    }
  }, [])

  const level = levelFromTotalXP(totalXP)
  const { current, needed } = xpProgressInLevel(totalXP)
  const pct = Math.min(100, (current / needed) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-discord-card/80 border border-white/10 p-4"
    >
      <p className="text-xs uppercase tracking-wider text-gray-400 font-mono mb-2">[ level & XP ]</p>
      <div className="flex items-center gap-4">
        <div className="font-mono text-3xl font-bold text-cyber-neon">Lv.{level}</div>
        <div className="flex-1">
          <div className="h-3 rounded-full bg-discord-darker overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-cyber-neon rounded-full"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {current} / {needed} XP to next level
          </p>
        </div>
      </div>
    </motion.div>
  )
}
