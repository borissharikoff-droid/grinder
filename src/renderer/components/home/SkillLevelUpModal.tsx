import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '../../stores/sessionStore'
import { getSkillById } from '../../lib/skills'
import { playSessionCompleteSound, playClickSound } from '../../lib/sounds'
import { getSkillQuote } from '../../lib/levelUpQuotes'
import { getSkillMilestoneReward } from '../../lib/xp'
import { PixelConfetti } from './PixelConfetti'
import { useEffect } from 'react'
import { MOTION } from '../../lib/motion'

const PARTICLES = [
  { x: '16%', y: '22%', delay: 0.05, dur: 2.4, size: 5 },
  { x: '84%', y: '18%', delay: 0.15, dur: 2.1, size: 4 },
  { x: '26%', y: '76%', delay: 0.2, dur: 2.6, size: 6 },
  { x: '76%', y: '72%', delay: 0.28, dur: 2.2, size: 5 },
  { x: '50%', y: '14%', delay: 0.35, dur: 2.8, size: 4 },
  { x: '50%', y: '84%', delay: 0.4, dur: 2.5, size: 5 },
] as const

export function SkillLevelUpModal() {
  const { pendingSkillLevelUpSkill, dismissSkillLevelUp, currentActivity, progressionEvents } = useSessionStore()

  useEffect(() => {
    if (pendingSkillLevelUpSkill) {
      playSessionCompleteSound()
    }
  }, [pendingSkillLevelUpSkill])

  if (!pendingSkillLevelUpSkill) return null

  const { skillId, level } = pendingSkillLevelUpSkill
  const skill = getSkillById(skillId)
  if (!skill) return null

  const quote = getSkillQuote(skillId)
  const milestoneLoot = getSkillMilestoneReward(skillId, level)
  const appName = currentActivity?.appName || null
  const reason = progressionEvents.find((e) => e.reasonCode === 'focus_tick' && e.skillXpDelta[skillId] && e.skillXpDelta[skillId] > 0)

  const handleContinue = () => {
    playClickSound()
    dismissSkillLevelUp()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={handleContinue}
      >
        <PixelConfetti originX={0.5} originY={0.45} accentColor={skill.color} duration={2.2} />
        <motion.div
          initial={{ scale: 0.78, opacity: 0, y: 20, rotateX: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 6 }}
          transition={MOTION.spring.soft}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[286px] rounded-2xl bg-discord-card border overflow-hidden relative"
          style={{ borderColor: `${skill.color}50`, boxShadow: `0 0 32px ${skill.color}20` }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                `radial-gradient(circle at 50% 28%, ${skill.color}30 0%, transparent 56%)`,
                `radial-gradient(circle at 50% 28%, ${skill.color}18 0%, transparent 62%)`,
                `radial-gradient(circle at 50% 28%, ${skill.color}30 0%, transparent 56%)`,
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: MOTION.easing }}
          />
          {PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{ left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: `${skill.color}AA` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.95, 0], y: [0, -8, 0], scale: [0.6, 1.2, 0.7] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: MOTION.easing }}
            />
          ))}
          <div className="px-5 pt-5 pb-4 text-center">
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-1"
            >
              Skill level up
            </motion.p>
            <motion.div
              initial={{ scale: 0.75, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ ...MOTION.spring.soft, delay: 0.14 }}
              whileHover={{ scale: 1.08, rotate: -2 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 relative"
              style={{ backgroundColor: `${skill.color}20`, border: `2px solid ${skill.color}40` }}
            >
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ boxShadow: [`0 0 0 ${skill.color}00`, `0 0 18px ${skill.color}88`, `0 0 0 ${skill.color}00`] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: MOTION.easing }}
              />
              {skill.icon}
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white font-semibold text-sm mb-0.5"
            >
              {skill.name}
            </motion.p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.92, 1.06, 1], opacity: 1 }}
              transition={{ delay: 0.24, duration: MOTION.duration.slow, ease: MOTION.easing }}
              className="text-3xl font-black font-mono mb-1"
              style={{ color: skill.color, textShadow: `0 0 16px ${skill.color}66` }}
            >
              Lv.{level}
            </motion.p>
            {appName && appName !== 'Idly' && (
              <p className="text-[10px] text-gray-500 font-mono mb-2">via {appName}</p>
            )}
            {reason && (
              <p className="text-[10px] text-cyber-neon/80 font-mono mb-2">
                Reason: {reason.description}
              </p>
            )}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 text-xs italic mb-3"
            >
              &ldquo;{quote}&rdquo;
            </motion.p>
            {milestoneLoot && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10"
              >
                Unlocked: {milestoneLoot}
              </motion.p>
            )}
            <motion.button
              type="button"
              onClick={handleContinue}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              whileHover={{ ...MOTION.interactive.hover, boxShadow: `0 0 16px ${skill.color}66` }}
              whileTap={MOTION.interactive.tap}
              className="mt-3 px-7 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ backgroundColor: `${skill.color}25`, color: skill.color, border: `1px solid ${skill.color}40` }}
            >
              Continue
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
