import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { readProgressionHistory } from '../../lib/progressionHistory'
import type { ProgressionEvent, ProgressionReasonCode } from '../../lib/progressionContract'
import { getSkillById } from '../../lib/skills'
import { PageHeader } from '../shared/PageHeader'
import { MOTION } from '../../lib/motion'
import { trackMetric } from '../../services/rolloutMetrics'

const reasonLabels: Record<ProgressionReasonCode, string> = {
  focus_tick: 'Focus Tick',
  session_complete: 'Session Complete',
  achievement_unlock: 'Achievement Unlock',
  streak_bonus: 'Streak Bonus',
  skill_milestone: 'Skill Milestone',
  reward_claim: 'Reward Claim',
}

function formatWhen(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'just now'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function getSkillDeltaTotal(event: ProgressionEvent): number {
  return Object.values(event.skillXpDelta).reduce((sum, v) => sum + v, 0)
}

export function ProgressTimelinePage() {
  const [reasonFilter, setReasonFilter] = useState<'all' | ProgressionReasonCode>('all')
  const [skillFilter, setSkillFilter] = useState<'all' | string>('all')
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | 'all'>('7d')
  const [events, setEvents] = useState<ProgressionEvent[]>(() => readProgressionHistory())

  useEffect(() => {
    trackMetric('progress_timeline_open')
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const minTs =
      timeFilter === '24h' ? now - 24 * 60 * 60 * 1000 :
      timeFilter === '7d' ? now - 7 * 24 * 60 * 60 * 1000 : 0

    return events.filter((event) => {
      if (minTs > 0 && event.createdAt < minTs) return false
      if (reasonFilter !== 'all' && event.reasonCode !== reasonFilter) return false
      if (skillFilter !== 'all') {
        const hasSkill = event.sourceSkill === skillFilter || Object.keys(event.skillXpDelta).includes(skillFilter)
        if (!hasSkill) return false
      }
      return true
    })
  }, [events, reasonFilter, skillFilter, timeFilter])

  const skillOptions = useMemo(() => {
    const set = new Set<string>()
    for (const event of events) {
      if (event.sourceSkill) set.add(event.sourceSkill)
      for (const skillId of Object.keys(event.skillXpDelta)) set.add(skillId)
    }
    return Array.from(set.values()).sort()
  }, [events])

  return (
    <motion.div
      initial={{ opacity: MOTION.page.initial.opacity }}
      animate={{ opacity: MOTION.page.animate.opacity }}
      exit={{ opacity: MOTION.page.exit.opacity }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="p-4 pb-2 space-y-3"
    >
      <PageHeader title="Progress Timeline" />

      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Filters</p>
          <button
            onClick={() => setEvents(readProgressionHistory())}
            className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value as typeof reasonFilter)}
            onInput={() => trackMetric('progress_filter_changed')}
            className="text-xs rounded-lg bg-discord-darker border border-white/10 px-2 py-1.5 text-gray-200"
          >
            <option value="all">All reasons</option>
            {Object.entries(reasonLabels).map(([reason, label]) => (
              <option key={reason} value={reason}>{label}</option>
            ))}
          </select>
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            onInput={() => trackMetric('progress_filter_changed')}
            className="text-xs rounded-lg bg-discord-darker border border-white/10 px-2 py-1.5 text-gray-200"
          >
            <option value="all">All skills</option>
            {skillOptions.map((skillId) => (
              <option key={skillId} value={skillId}>{getSkillById(skillId)?.name || skillId}</option>
            ))}
          </select>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            onInput={() => trackMetric('progress_filter_changed')}
            className="text-xs rounded-lg bg-discord-darker border border-white/10 px-2 py-1.5 text-gray-200"
          >
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-discord-card/70 border border-white/10 p-4 text-center text-xs text-gray-500">
            No progression events for current filters.
          </div>
        ) : (
          filtered.map((event) => {
            const skillTotal = getSkillDeltaTotal(event)
            return (
              <div key={event.id} className="rounded-xl bg-discord-card/70 border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white font-medium">{event.title}</p>
                  <span className="text-[10px] text-gray-500 font-mono">{formatWhen(event.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyber-neon/25 bg-cyber-neon/10 text-cyber-neon">
                    {reasonLabels[event.reasonCode]}
                  </span>
                  {event.multiplierApplied && event.multiplierApplied > 1 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-500/25 bg-orange-500/10 text-orange-300">
                      x{event.multiplierApplied} multiplier
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.03] text-gray-300">
                    +{skillTotal} skill XP
                  </span>
                </div>
                {Object.keys(event.skillXpDelta).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {Object.entries(event.skillXpDelta).map(([skillId, delta]) => (
                      <div key={skillId} className="text-[11px] rounded-lg bg-discord-darker/60 border border-white/10 px-2 py-1 flex items-center justify-between">
                        <span className="text-gray-300 truncate">{getSkillById(skillId)?.name || skillId}</span>
                        <span className="font-mono text-cyber-neon">+{delta}</span>
                      </div>
                    ))}
                  </div>
                )}
                {event.rewards.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-500 font-mono mb-1">Rewards</p>
                    <div className="flex flex-wrap gap-1.5">
                      {event.rewards.map((reward, idx) => (
                        <span key={`${event.id}-reward-${idx}`} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-gray-300">
                          {reward.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
