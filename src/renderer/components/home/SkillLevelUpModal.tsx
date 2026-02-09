import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'
import { getSkillById } from '../../lib/skills'
import { playSessionCompleteSound } from '../../lib/sounds'
import { useEffect } from 'react'

export function SkillLevelUpModal() {
  const { pendingSkillLevelUpSkill, dismissSkillLevelUp } = useSessionStore()

  useEffect(() => {
    if (pendingSkillLevelUpSkill) {
      playSessionCompleteSound()
    }
  }, [pendingSkillLevelUpSkill])

  if (!pendingSkillLevelUpSkill) return null

  const { skillId, level } = pendingSkillLevelUpSkill
  const skill = getSkillById(skillId)
  if (!skill) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={dismissSkillLevelUp}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[260px] rounded-2xl bg-discord-card border overflow-hidden"
          style={{ borderColor: `${skill.color}50`, boxShadow: `0 0 32px ${skill.color}20` }}
        >
          <div className="px-5 pt-5 pb-4 text-center">
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-1">Skill level up</p>
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2"
              style={{ backgroundColor: `${skill.color}20`, border: `2px solid ${skill.color}40` }}
            >
              {skill.icon}
            </div>
            <p className="text-white font-semibold text-sm mb-0.5">{skill.name}</p>
            <p className="text-2xl font-black font-mono" style={{ color: skill.color }}>
              Lv.{level}
            </p>
            <button
              type="button"
              onClick={dismissSkillLevelUp}
              className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: `${skill.color}25`, color: skill.color, border: `1px solid ${skill.color}40` }}
            >
              Continue
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
