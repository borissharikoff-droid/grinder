import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ACHIEVEMENTS } from '../../lib/xp'

export function Achievements() {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.db?.getUnlockedAchievements) {
      window.electronAPI.db.getUnlockedAchievements().then(setUnlockedIds)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-discord-card/80 border border-white/10 p-4"
    >
      <p className="text-xs uppercase tracking-wider text-gray-400 font-mono mb-3">[ achievements ]</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedIds.includes(a.id)
          return (
            <motion.div
              key={a.id}
              whileHover={{ scale: 1.02 }}
              className={`rounded-lg border p-3 ${
                unlocked
                  ? 'border-cyber-neon/50 bg-cyber-glow/10'
                  : 'border-white/10 bg-discord-darker/50 opacity-70'
              }`}
              title={a.description}
            >
              <div className="font-semibold text-sm text-white">{a.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{a.description}</div>
              {unlocked && <span className="text-cyber-neon text-xs">+{a.xpReward} XP</span>}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
