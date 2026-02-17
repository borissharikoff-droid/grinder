import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { FriendProfile } from '../../hooks/useFriends'
import { SKILLS } from '../../lib/skills'
import { trackMetric } from '../../services/rolloutMetrics'

interface MiniCompetitionsProps {
  friends: FriendProfile[]
}

function formatMinutes(seconds: number): string {
  return `${Math.max(0, Math.floor(seconds / 60))}m`
}

function formatXp(xp: number): string {
  return `${Math.max(0, Math.floor(xp)).toLocaleString()} XP`
}

export function MiniCompetitions({ friends }: MiniCompetitionsProps) {
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<'24h' | '7d'>('24h')
  const [skillId, setSkillId] = useState<string>('developer')
  const [xpByUser, setXpByUser] = useState<Record<string, number>>({})
  const [todayByUser, setTodayByUser] = useState<Record<string, number>>({})

  useEffect(() => {
    trackMetric('competition_viewed')
  }, [])

  useEffect(() => {
    if (!supabase || !user) return
    const ids = [user.id, ...friends.map((f) => f.id)]
    if (ids.length === 0) return
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    ;(async () => {
      const { data } = await supabase
        .from('session_summaries')
        .select('user_id, duration_seconds')
        .in('user_id', ids)
        .gte('start_time', start.toISOString())
      const byUser: Record<string, number> = {}
      for (const row of data || []) {
        const userId = (row as { user_id: string }).user_id
        const sec = Number((row as { duration_seconds: number }).duration_seconds) || 0
        byUser[userId] = (byUser[userId] || 0) + sec
      }
      setTodayByUser(byUser)
    })()
  }, [friends, user])

  useEffect(() => {
    if (!supabase || !user) return
    const ids = [user.id, ...friends.map((f) => f.id)]
    if (ids.length === 0) return
    const since = new Date(Date.now() - (period === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000))

    ;(async () => {
      const { data } = await supabase
        .from('skill_xp_events')
        .select('user_id, xp_delta')
        .in('user_id', ids)
        .eq('skill_id', skillId)
        .gte('happened_at', since.toISOString())
      const byUser: Record<string, number> = {}
      for (const row of data || []) {
        const userId = (row as { user_id: string }).user_id
        const xp = Number((row as { xp_delta: number }).xp_delta) || 0
        byUser[userId] = (byUser[userId] || 0) + xp
      }
      setXpByUser(byUser)
    })()
  }, [friends, user, period, skillId])

  const focusRanking = useMemo(() => {
    if (!user) return []
    const rows = [
      { id: user.id, name: 'You', seconds: todayByUser[user.id] || 0 },
      ...friends.map((f) => ({ id: f.id, name: f.username || 'Anonymous', seconds: todayByUser[f.id] || 0 })),
    ]
    return rows.sort((a, b) => b.seconds - a.seconds).slice(0, 3)
  }, [friends, todayByUser, user])

  const noSocialStatus = useMemo(() => {
    const participants = friends.filter((f) => f.is_online)
    if (participants.length === 0) return { clear: 0, total: 0 }
    const clear = participants.filter((f) => {
      const a = (f.current_activity || '').toLowerCase()
      return !a.includes('communicator') && !a.includes('social')
    }).length
    return { clear, total: participants.length }
  }, [friends])

  const skillRace = useMemo(() => {
    if (!user) return []
    const rows = [
      { id: user.id, name: 'You', xp: xpByUser[user.id] || 0 },
      ...friends.map((f) => ({ id: f.id, name: f.username || 'Anonymous', xp: xpByUser[f.id] || 0 })),
    ]
    return rows.sort((a, b) => b.xp - a.xp).slice(0, 5)
  }, [friends, user, xpByUser])

  return (
    <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3 space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Mini competitions</p>

      <div className="rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/5 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-fuchsia-300 font-medium">Skill XP Race</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPeriod('24h')}
              className={`text-[10px] px-2 py-0.5 rounded border ${period === '24h' ? 'border-fuchsia-300/40 text-fuchsia-200 bg-fuchsia-300/10' : 'border-white/10 text-gray-400'}`}
            >
              24h
            </button>
            <button
              onClick={() => setPeriod('7d')}
              className={`text-[10px] px-2 py-0.5 rounded border ${period === '7d' ? 'border-fuchsia-300/40 text-fuchsia-200 bg-fuchsia-300/10' : 'border-white/10 text-gray-400'}`}
            >
              7d
            </button>
          </div>
        </div>
        <select
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          onInput={() => trackMetric('competition_skill_changed')}
          className="w-full text-[11px] rounded bg-discord-darker border border-white/10 px-2 py-1 text-gray-200"
        >
          {SKILLS.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.icon} {skill.name}
            </option>
          ))}
        </select>
        {skillRace.length > 0 ? (
          <div className="space-y-1">
            {skillRace.map((row, idx) => (
              <div key={row.id} className="flex items-center justify-between text-[11px]">
                <span className="text-gray-300">{idx + 1}. {row.name}</span>
                <span className={idx === 0 ? 'text-fuchsia-200 font-mono font-bold' : 'text-fuchsia-300 font-mono'}>
                  {formatXp(row.xp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-500">No XP entries for this skill yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-cyber-neon/20 bg-cyber-neon/5 p-2.5">
        <p className="text-[11px] text-cyber-neon font-medium">Most Focus Minutes Today</p>
        {focusRanking.length > 0 ? (
          <div className="mt-1.5 space-y-1">
            {focusRanking.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between text-[11px]">
                <span className="text-gray-300">{i + 1}. {r.name}</span>
                <span className="text-cyber-neon font-mono">{formatMinutes(r.seconds)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-500 mt-1">No data yet today.</p>
        )}
      </div>

      <div className="rounded-lg border border-orange-400/20 bg-orange-500/5 p-2.5">
        <p className="text-[11px] text-orange-300 font-medium">No Social Till 6 PM</p>
        <p className="text-[10px] text-gray-400 mt-1">
          {noSocialStatus.total > 0
            ? `${noSocialStatus.clear}/${noSocialStatus.total} online friends are still clear.`
            : 'No online participants right now.'}
        </p>
      </div>
    </div>
  )
}

