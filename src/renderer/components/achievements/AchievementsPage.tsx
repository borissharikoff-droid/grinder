import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ACHIEVEMENTS, levelFromTotalXP, xpProgressInLevel } from '../../lib/xp'
import type { AchievementDef } from '../../lib/xp'
import { useAlertStore } from '../../stores/alertStore'
import { playClickSound } from '../../lib/sounds'

const CATEGORY_LABELS: Record<string, string> = {
  grind: '⚡ Grind',
  streak: '🔥 Streak',
  social: '🤝 Social',
  special: '✨ Special',
  skill: '⚡ Skills',
}

export function AchievementsPage() {
  const [totalXP, setTotalXP] = useState(0)
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const pushAlert = useAlertStore((s) => s.push)

  useEffect(() => {
    // Load from Electron or localStorage
    const api = window.electronAPI
    if (api?.db) {
      api.db.getLocalStat('total_xp').then((v) => setTotalXP(parseInt(v || '0', 10)))
      api.db.getUnlockedAchievements().then(setUnlockedIds)
    } else {
      const xp = parseInt(localStorage.getItem('grinder_total_xp') || '0', 10)
      setTotalXP(xp)
      const unlocked = JSON.parse(localStorage.getItem('grinder_unlocked_achievements') || '[]')
      setUnlockedIds(unlocked)
    }
    const claimed = JSON.parse(localStorage.getItem('grinder_claimed_achievements') || '[]')
    setClaimedIds(claimed)
  }, [])

  const handleClaim = (def: AchievementDef) => {
    playClickSound()
    // Mark as claimed
    const updated = [...claimedIds, def.id]
    setClaimedIds(updated)
    localStorage.setItem('grinder_claimed_achievements', JSON.stringify(updated))
    // Show loot drop
    pushAlert(def)
  }

  const level = levelFromTotalXP(totalXP)
  const { current, needed } = xpProgressInLevel(totalXP)
  const pct = Math.min(100, (current / needed) * 100)

  // Group by category
  const categories = ['grind', 'streak', 'social', 'special', 'skill']

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="p-4 pb-2"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Achievements</h2>
        <div className="text-right">
          <span className="font-mono text-cyber-neon text-sm font-bold">Lv.{level}</span>
          <span className="text-gray-500 text-xs ml-2">{totalXP} XP</span>
        </div>
      </div>

      <div className="h-2 rounded-full bg-discord-dark overflow-hidden mb-5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full bg-gradient-to-r from-cyber-neon to-discord-accent rounded-full"
        />
      </div>

      <div className="space-y-5">
        {categories.map((cat) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === cat)
          if (items.length === 0) return null
          const unlockedCount = items.filter((a) => unlockedIds.includes(a.id)).length
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <span className="text-[10px] text-gray-600 font-mono">{unlockedCount}/{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((a, i) => {
                  const unlocked = unlockedIds.includes(a.id)
                  const claimed = claimedIds.includes(a.id)
                  const canClaim = unlocked && !claimed && a.reward
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 rounded-xl p-3 border ${
                        unlocked
                          ? 'border-cyber-neon/20 bg-cyber-neon/5'
                          : 'border-white/5 bg-discord-dark/50 opacity-40'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                        unlocked ? 'bg-cyber-neon/15' : 'bg-discord-dark'
                      }`}>
                        {unlocked ? a.icon : '🔒'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${unlocked ? 'text-white' : 'text-gray-400'}`}>
                          {a.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{a.description}</p>
                        {a.reward && unlocked && claimed && (
                          <p className="text-[10px] text-cyber-neon/60 font-mono mt-0.5">
                            {a.reward.value} {a.reward.label}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-xs font-mono ${unlocked ? 'text-cyber-neon' : 'text-gray-600'}`}>
                          +{a.xpReward}
                        </span>
                        {canClaim && (
                          <button
                            onClick={() => handleClaim(a)}
                            className="px-2.5 py-1 rounded-lg bg-cyber-neon text-discord-darker text-[10px] font-bold active:scale-95 transition-all hover:shadow-glow-sm animate-pulse"
                          >
                            CLAIM
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
