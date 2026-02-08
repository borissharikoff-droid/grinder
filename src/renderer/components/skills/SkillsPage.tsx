import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SKILLS, skillLevelFromXP, skillXPProgress, skillHoursFromXP, categoryToSkillId } from '../../lib/skills'
import { useSessionStore } from '../../stores/sessionStore'

interface SkillRow {
  skill_id: string
  total_xp: number
}

function formatXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`
  return `${xp}`
}

export function SkillsPage() {
  const [skillData, setSkillData] = useState<SkillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { status, currentActivity } = useSessionStore()
  const levelingSkillId = status === 'running' && currentActivity ? categoryToSkillId(currentActivity.category) : null

  const load = async () => {
    setLoading(true)
    const api = window.electronAPI
    if (api?.db?.getAllSkillXP) {
      const rows = (await api.db.getAllSkillXP()) as SkillRow[]
      setSkillData(rows)
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem('grinder_skill_xp') || '{}') as Record<string, number>
        setSkillData(Object.entries(stored).map(([skill_id, total_xp]) => ({ skill_id, total_xp })))
      } catch {
        setSkillData([])
      }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const byId = new Map(skillData.map((r) => [r.skill_id, r.total_xp]))
  const totalLevel = SKILLS.reduce((sum, s) => sum + skillLevelFromXP(byId.get(s.id) ?? 0), 0)

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <span className="text-gray-600 text-sm font-mono animate-pulse">Loading skills...</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 pb-20 max-w-lg mx-auto overflow-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-neon/20 to-cyber-neon/5 border border-cyber-neon/30 flex items-center justify-center">
            <span className="text-cyber-neon text-sm">⚔</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Skills</h1>
            <p className="text-[10px] text-gray-500 font-mono">LEVEL UP YOUR CRAFT</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-cyber-neon font-mono text-lg font-bold leading-tight">{totalLevel}</p>
          <p className="text-[10px] text-gray-500 font-mono">TOTAL LV</p>
        </div>
      </div>

      {/* Skill cards — single column for clarity */}
      <div className="space-y-2.5">
        {SKILLS.map((skill, i) => {
          const xp = byId.get(skill.id) ?? 0
          const level = skillLevelFromXP(xp)
          const { current, needed } = skillXPProgress(xp)
          const pct = needed > 0 ? Math.min(100, (current / needed) * 100) : 100
          const hours = skillHoursFromXP(xp)
          const isExpanded = expandedId === skill.id
          const isLeveling = levelingSkillId === skill.id

          return (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              layout
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : skill.id)}
                className={`w-full rounded-xl border transition-all duration-200 text-left relative overflow-hidden group ${
                  isLeveling
                    ? 'bg-discord-card border-cyber-neon/40 shadow-[0_0_20px_rgba(0,255,136,0.08)]'
                    : 'bg-discord-card/80 border-white/[0.06] hover:border-white/10'
                }`}
              >
                {/* Subtle gradient accent on the left */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ backgroundColor: skill.color, opacity: level > 1 ? 0.8 : 0.2 }}
                />

                <div className="pl-4 pr-3 py-3 flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                    style={{ backgroundColor: `${skill.color}15`, border: `1px solid ${skill.color}30` }}
                  >
                    {skill.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-white truncate">{skill.name}</span>
                      {isLeveling && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0"
                          style={{ backgroundColor: `${skill.color}25`, color: skill.color, border: `1px solid ${skill.color}40` }}
                        >
                          active
                        </motion.span>
                      )}
                    </div>
                    {/* XP bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: skill.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500 font-mono">{formatXP(current)} / {formatXP(needed)} XP</span>
                      <span className="text-[10px] text-gray-600 font-mono">{hours}h played</span>
                    </div>
                  </div>

                  {/* Level badge */}
                  <div className="shrink-0 text-center ml-1">
                    <div
                      className="w-11 h-11 rounded-lg flex flex-col items-center justify-center"
                      style={{ backgroundColor: `${skill.color}10`, border: `1px solid ${skill.color}20` }}
                    >
                      <span className="text-[10px] text-gray-500 font-mono leading-none">LV</span>
                      <span className="text-base font-mono font-bold leading-tight" style={{ color: skill.color }}>{level}</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mx-1 px-3 py-2.5 rounded-b-xl bg-discord-card/50 border border-t-0 border-white/[0.04] space-y-2">
                      {/* Progress details */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Next level</span>
                        <span className="text-[11px] font-mono text-white">Lv.{level + 1}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">XP remaining</span>
                        <span className="text-[11px] font-mono" style={{ color: skill.color }}>{formatXP(needed - current)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Time to next</span>
                        <span className="text-[11px] font-mono text-gray-300">~{Math.ceil((needed - current) / 3600)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Total XP</span>
                        <span className="text-[11px] font-mono text-gray-300">{formatXP(xp)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
