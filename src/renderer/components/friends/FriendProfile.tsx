import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import type { FriendProfile as FriendProfileType } from '../../hooks/useFriends'
import { FRAMES, BADGES } from '../../lib/cosmetics'
import { LOOT_ITEMS, type LootSlot } from '../../lib/loot'
import { getSkillByName, SKILLS, computeTotalSkillLevelFromLevels, MAX_TOTAL_SKILL_LEVEL, normalizeSkillId, skillLevelFromXP, skillXPProgress } from '../../lib/skills'
import { getPersonaById } from '../../lib/persona'
import { ACHIEVEMENTS, checkSkillAchievements } from '../../lib/xp'
import { MOTION } from '../../lib/motion'
import { formatSessionDurationCompact, parseFriendPresence } from '../../lib/friendPresence'
import { PageHeader } from '../shared/PageHeader'
import { fetchUserPublicProgressHistory, type SocialFeedEvent } from '../../services/socialFeed'
import { AvatarWithFrame } from '../shared/AvatarWithFrame'

interface FriendProfileProps {
  profile: FriendProfileType
  onBack: () => void
  onCompare?: () => void
  onMessage?: () => void
  onRemove?: () => void
  onRetrySync?: () => void
}

interface SessionSummary {
  id: string
  duration_seconds: number
  start_time: string
}

interface FriendSkillRow {
  skill_id: string
  level: number
  total_xp: number
}

const FRIEND_LOOT_SLOT_META: Record<LootSlot, { label: string; icon: string }> = {
  head: { label: 'Head', icon: '🧢' },
  top: { label: 'Body', icon: '👕' },
  accessory: { label: 'Legs', icon: '🦵' },
  aura: { label: 'Aura', icon: '✨' },
}

function LootVisual({ icon, image, className }: { icon: string; image?: string; className?: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={className ?? 'w-7 h-7 object-contain'}
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
    )
  }
  return <span className={className}>{icon}</span>
}

function formatXp(xp: number): string {
  return Math.max(0, Math.floor(xp)).toLocaleString()
}

function mapAllSkillsToRows(profile: FriendProfileType): FriendSkillRow[] {
  const byId = new Map((profile.all_skills || []).map((s) => [s.skill_id, s]))
  return SKILLS.map((skill) => {
    const row = byId.get(skill.id)
    return {
      skill_id: skill.id,
      level: Math.max(0, row?.level ?? 0),
      total_xp: row?.total_xp ?? 0,
    }
  })
}

export function FriendProfile({ profile, onBack, onMessage, onRetrySync }: FriendProfileProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [totalGrindSeconds, setTotalGrindSeconds] = useState(0)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [achievements, setAchievements] = useState<string[]>([])
  const [totalSessionsCount, setTotalSessionsCount] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [hasMarathonSession, setHasMarathonSession] = useState(false)
  const [publicProgressEvents, setPublicProgressEvents] = useState<SocialFeedEvent[]>([])
  const [allSkills, setAllSkills] = useState<FriendSkillRow[]>(() => {
    if (profile.all_skills && profile.all_skills.some((s) => s.level > 0)) {
      return mapAllSkillsToRows(profile)
    }
    return []
  })

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    setLoadingProfile(true)

    ;(async () => {
      try {
        const [
          sessionsRes,
          totalsRes,
          achievementsRes,
          sessionsCountRes,
          maxDurationRes,
          friendsRes,
          skillsRes,
        ] = await Promise.all([
          supabase
            .from('session_summaries')
            .select('id, duration_seconds, start_time')
            .eq('user_id', profile.id)
            .order('start_time', { ascending: false })
            .limit(3),
          supabase.from('session_summaries').select('duration_seconds').eq('user_id', profile.id),
          supabase.from('user_achievements').select('achievement_id').eq('user_id', profile.id),
          supabase.from('session_summaries').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase
            .from('session_summaries')
            .select('duration_seconds')
            .eq('user_id', profile.id)
            .order('duration_seconds', { ascending: false })
            .limit(1),
          supabase
            .from('friendships')
            .select('id')
            .eq('status', 'accepted')
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`),
          supabase.from('user_skills').select('skill_id, level, total_xp').eq('user_id', profile.id),
        ])

        if (cancelled) return

        setSessions((sessionsRes.data as SessionSummary[]) || [])
        const total = ((totalsRes.data as { duration_seconds: number }[]) || []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0)
        setTotalGrindSeconds(total)
        setAchievements(((achievementsRes.data || []) as { achievement_id: string }[]).map((r) => r.achievement_id))
        setTotalSessionsCount(sessionsCountRes.count || 0)
        const maxDur = (maxDurationRes.data?.[0] as { duration_seconds?: number } | undefined)?.duration_seconds ?? 0
        setHasMarathonSession(maxDur >= 7200)
        setFriendCount((friendsRes.data || []).length)

        let rows = (skillsRes.data as FriendSkillRow[]) || []
        if (((skillsRes as { error?: { message?: string } }).error) && rows.length === 0) {
          // Backward-compatible fallback for deployments where total_xp is absent.
          const fallbackSkillsRes = await supabase
            .from('user_skills')
            .select('skill_id, level')
            .eq('user_id', profile.id)
          rows = ((fallbackSkillsRes.data as Array<{ skill_id: string; level: number }>) || []).map((r) => ({
            skill_id: r.skill_id,
            level: r.level ?? 0,
            total_xp: 0,
          }))
        }
        if (rows.length > 0) {
          const merged = new Map<string, FriendSkillRow>()
          for (const raw of rows) {
            const skill_id = normalizeSkillId(raw.skill_id)
            const total_xp = raw.total_xp ?? 0
            const levelFromXp = skillLevelFromXP(total_xp)
            const level = Math.max(raw.level ?? 0, levelFromXp)
            const prev = merged.get(skill_id)
            if (!prev) {
              merged.set(skill_id, { skill_id, level, total_xp })
            } else {
              merged.set(skill_id, {
                skill_id,
                level: Math.max(prev.level, level),
                total_xp: Math.max(prev.total_xp ?? 0, total_xp),
              })
            }
          }
          setAllSkills(Array.from(merged.values()))
        }
      } catch {
        if (!cancelled) setAchievements([])
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [profile.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await fetchUserPublicProgressHistory(profile.id, 12)
      if (!cancelled) setPublicProgressEvents(rows)
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${sec}s`
  }
  const frame = FRAMES.find(fr => fr.id === profile.equipped_frame)
  const badges = (profile.equipped_badges || [])
    .map(bId => BADGES.find(b => b.id === bId))
    .filter(Boolean)
  const equippedLootBySlot = profile.equipped_loot || {}
  const equippedLoot = Object.values(profile.equipped_loot || {})
    .map((itemId) => LOOT_ITEMS.find((item) => item.id === itemId))
    .filter(Boolean)
  const topLoadout = useMemo(
    () =>
      (Object.keys(FRIEND_LOOT_SLOT_META) as LootSlot[]).map((slot) => {
        const itemId = equippedLootBySlot[slot]
        const item = itemId ? LOOT_ITEMS.find((x) => x.id === itemId) ?? null : null
        return { slot, item }
      }),
    [equippedLootBySlot],
  )
  const activeBuffs = useMemo(
    () =>
      topLoadout
        .filter((entry) => Boolean(entry.item))
        .map((entry) => ({
          slot: FRIEND_LOOT_SLOT_META[entry.slot].label,
          itemName: entry.item!.name,
          description: entry.item!.perkDescription,
          isGameplay: entry.item!.perkType !== 'cosmetic',
        })),
    [topLoadout],
  )
  const { activityLabel, appName, sessionStartMs } = parseFriendPresence(profile.current_activity ?? null)
  const isLeveling = profile.is_online && activityLabel.startsWith('Leveling ')
  const levelingSkill = isLeveling ? activityLabel.replace('Leveling ', '') : null
  const liveDuration = profile.is_online && sessionStartMs ? formatSessionDurationCompact(sessionStartMs) : null
  const totalSkillLevel = allSkills.length > 0
    ? computeTotalSkillLevelFromLevels(allSkills.map(s => ({ skill_id: s.skill_id, level: s.level })))
    : (profile.total_skill_level ?? 0)
  const hasConfirmedSkillRows = allSkills.length > 0
  const hasProfileSkillRows = !!profile.all_skills && profile.all_skills.some((s) => s.level > 0)
  const isSkillBreakdownPending = !hasConfirmedSkillRows && !hasProfileSkillRows
  const mergedSkillRows: FriendSkillRow[] = hasConfirmedSkillRows
    ? allSkills
    : (hasProfileSkillRows
      ? mapAllSkillsToRows(profile)
      : SKILLS.map((skillDef) => ({ skill_id: skillDef.id, level: 0, total_xp: 0 })))
  const persona = getPersonaById(profile.persona_id ?? null)

  const fallbackAchievementIds = useMemo(() => {
    const ids = new Set<string>()
    if (totalSessionsCount >= 1) ids.add('first_session')
    if (totalSessionsCount >= 10) ids.add('ten_sessions')
    if (totalSessionsCount >= 50) ids.add('fifty_sessions')
    if (hasMarathonSession) ids.add('marathon')
    if ((profile.streak_count || 0) >= 2) ids.add('streak_2')
    if ((profile.streak_count || 0) >= 7) ids.add('streak_7')
    if ((profile.streak_count || 0) >= 14) ids.add('streak_14')
    if ((profile.streak_count || 0) >= 30) ids.add('streak_30')
    if (friendCount >= 1) ids.add('first_friend')
    if (friendCount >= 5) ids.add('five_friends')
    if (friendCount >= 10) ids.add('social_butterfly')

    const skillLevels: Record<string, number> = {}
    for (const row of mergedSkillRows) skillLevels[row.skill_id] = row.level
    const skillAch = checkSkillAchievements(skillLevels, Array.from(ids))
    for (const a of skillAch) ids.add(a.id)
    return Array.from(ids)
  }, [totalSessionsCount, hasMarathonSession, profile.streak_count, friendCount, mergedSkillRows])

  const unlockedIdsForDisplay = achievements.length > 0 ? achievements : fallbackAchievementIds
  const unlockedAchievements = ACHIEVEMENTS.filter(a => unlockedIdsForDisplay.includes(a.id))
  if (loadingProfile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }} className="space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-14 rounded bg-white/10" />
          <div className="h-8 w-52 rounded-full bg-white/10" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-discord-card/70 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-3 w-20 rounded bg-white/10" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 rounded-xl bg-white/10 border border-white/5" />
          <div className="h-16 rounded-xl bg-white/10 border border-white/5" />
          <div className="h-16 rounded-xl bg-white/10 border border-white/5" />
        </div>
        <div className="h-56 rounded-xl bg-white/10 border border-white/5" />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={MOTION.subPage.initial}
      animate={MOTION.subPage.animate}
      exit={MOTION.subPage.exit}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="space-y-4 pb-2"
    >
      <PageHeader
        title={profile.username || 'Friend'}
        onBack={onBack}
        rightSlot={(
          <span className={`idly-badge ${profile.is_online ? 'text-cyber-neon border-cyber-neon/30 bg-cyber-neon/10' : 'text-gray-400 border-white/15 bg-white/5'}`}>
            {profile.is_online ? 'Online' : 'Offline'}
          </span>
        )}
      />
      {/* Profile Hero */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-discord-card to-discord-card/70 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              <AvatarWithFrame
                avatar={profile.avatar_url || '🤖'}
                frameId={profile.equipped_frame}
                sizeClass="w-16 h-16"
                textClass="text-3xl"
                roundedClass="rounded-xl"
                ringInsetClass="-inset-1.5"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-discord-card ${profile.is_online ? 'bg-cyber-neon' : 'bg-gray-600'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-lg truncate">{profile.username || 'Anonymous'}</h3>
                <span className="idly-badge text-cyber-neon border-cyber-neon/30 bg-cyber-neon/10" title="Total skill level">
                  Lv {totalSkillLevel}/{MAX_TOTAL_SKILL_LEVEL}
                </span>
              </div>
              {persona && (
                <p className="text-xs text-gray-400 mt-1" title={persona.description}>
                  {persona.emoji} {persona.label}
                </p>
              )}
              {profile.status_title && (
                <p className="text-[11px] text-cyber-neon mt-1 font-mono">
                  {profile.status_title}
                </p>
              )}
              <p className="text-sm mt-1.5 text-gray-300">
                {profile.is_online
                  ? (isLeveling
                    ? `Leveling ${levelingSkill}${liveDuration ? ` • ${liveDuration}` : ''}`
                    : activityLabel || 'Online')
                  : 'Offline'}
              </p>
              {profile.is_online && appName && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {appName}{liveDuration ? ` • session ${liveDuration}` : ''}
                </p>
              )}
            </div>
          </div>
          {onMessage && (
            <motion.button
              type="button"
              onClick={onMessage}
              whileTap={MOTION.interactive.tap}
              className="shrink-0 p-2 rounded-lg border border-cyber-neon/30 text-cyber-neon bg-cyber-neon/10 hover:bg-cyber-neon/20 transition-colors"
              title="Message"
              aria-label="Message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </motion.button>
          )}
          </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => badge && (
              <span
                key={badge.id}
                className="idly-badge font-medium"
                style={{ borderColor: `${badge.color}40`, backgroundColor: `${badge.color}12`, color: badge.color }}
              >
                {badge.icon} {badge.label}
              </span>
            ))}
          </div>
        )}
        {equippedLoot.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {equippedLoot.map((item) => item && (
              <span
                key={item.id}
                className="idly-badge font-medium border-cyber-neon/20 bg-cyber-neon/10 text-cyber-neon"
              >
                {item.icon} {item.name}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-discord-darker/35 p-2.5 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Loadout & Buffs</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FRIEND_LOOT_SLOT_META) as LootSlot[]).map((slot) => {
              const meta = FRIEND_LOOT_SLOT_META[slot]
              const itemId = equippedLootBySlot[slot]
              const item = itemId ? LOOT_ITEMS.find((x) => x.id === itemId) ?? null : null
              return (
                <div key={slot} className="rounded-lg border border-white/10 bg-discord-card/55 p-1.5">
                  <p className="text-[9px] font-mono text-gray-400 uppercase">{meta.icon} {meta.label}</p>
                  {item ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded border border-cyber-neon/25 bg-discord-darker/50 flex items-center justify-center shrink-0">
                        <LootVisual icon={item.icon} image={item.image} className="w-5 h-5 object-contain" />
                      </div>
                      <p className="text-[10px] text-white truncate">{item.name}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-600 mt-1">Empty</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="rounded-lg border border-white/10 bg-discord-card/45 p-2 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Buffs</p>
            {activeBuffs.length > 0 ? (
              activeBuffs.map((buff) => (
                <div key={`${buff.slot}-${buff.itemName}`} className="rounded-md border border-white/10 bg-discord-darker/45 p-1.5">
                  <p className={`text-[9px] font-mono ${buff.isGameplay ? 'text-cyber-neon' : 'text-gray-400'}`}>
                    {buff.slot} · {buff.itemName}
                  </p>
                  <p className="text-[10px] text-gray-200 leading-tight">{buff.description}</p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-gray-600">No active buffs.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="idly-card-soft p-3">
          <p className="text-xs text-gray-500 font-mono uppercase">Skill level</p>
          <p className="text-xl font-mono font-bold text-cyber-neon mt-1">{totalSkillLevel}</p>
        </div>
        <div className="idly-card-soft p-3">
          <p className="text-xs text-gray-500 font-mono uppercase">Streak</p>
          <p className="text-xl font-mono font-bold text-orange-400 mt-1">
            {profile.streak_count > 0 ? `🔥 ${profile.streak_count}` : '—'}
          </p>
        </div>
        <div className="idly-card-soft p-3">
          <p className="text-xs text-gray-500 font-mono uppercase">Grind time</p>
          <p className="text-xl font-mono font-bold text-white mt-1">{formatDuration(totalGrindSeconds)}</p>
        </div>
        <div className="idly-card-soft p-3">
          <p className="text-xs text-gray-500 font-mono uppercase">Sessions</p>
          <p className="text-xl font-mono font-bold text-white mt-1">{totalSessionsCount}</p>
        </div>
      </div>

      {/* All Skills */}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-mono">Skills</p>
          <div className="flex items-center gap-2">
            {!hasConfirmedSkillRows && !hasProfileSkillRows && (
              <span className="text-xs text-amber-400/90 font-mono">Sync pending</span>
            )}
            {!hasConfirmedSkillRows && onRetrySync && (
              <button
                type="button"
                onClick={onRetrySync}
                className="text-xs px-2 py-1 rounded-md border border-white/15 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
        {isSkillBreakdownPending && (
          <p className="text-xs text-gray-500 font-mono">
            Waiting for this friend's real per-skill sync...
          </p>
        )}
        {(() => {
          const skillMap = new Map(mergedSkillRows.map((s) => [s.skill_id, s]))
          return SKILLS.map((skillDef) => {
            const data = skillMap.get(skillDef.id)
            const level = Math.max(0, data?.level ?? 0)
            const totalXp = data?.total_xp ?? 0
            const hasRealXp = hasConfirmedSkillRows && totalXp > 0
            const unknownSkill = isSkillBreakdownPending
            const xpProg = hasRealXp ? skillXPProgress(totalXp) : null
            const pct = unknownSkill ? 0 : xpProg && xpProg.needed > 0
              ? Math.min(100, (xpProg.current / xpProg.needed) * 100)
              : (hasConfirmedSkillRows ? Math.min(100, (level / 99) * 100) : 0)
            const xpTitle = hasRealXp
              ? `${skillDef.name}: ${formatXp(totalXp)} XP`
              : unknownSkill
                ? `${skillDef.name}: pending sync`
                : `${skillDef.name}: LV ${level}`
            const isActive = levelingSkill === skillDef.name
            return (
              <div key={skillDef.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isActive ? 'bg-cyber-neon/5 border-cyber-neon/20' : 'border-white/5 bg-discord-darker/30'}`}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: `${skillDef.color}15`, border: `1px solid ${skillDef.color}30` }}
                >
                  {skillDef.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{skillDef.name}</span>
                    {isActive && (
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: `${skillDef.color}20`, color: skillDef.color }}
                      >
                        active
                      </span>
                    )}
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden" title={xpTitle}>
                    <div className="h-full rounded-full" style={{ backgroundColor: skillDef.color, width: `${pct}%` }} />
                  </div>
                </div>
                <div
                  className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0"
                  style={{ backgroundColor: unknownSkill ? 'rgba(255,255,255,0.04)' : `${skillDef.color}10`, border: unknownSkill ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${skillDef.color}20` }}
                >
                  <span className="text-[9px] text-gray-500 font-mono leading-none">LV</span>
                  <span className="text-xs font-mono font-bold leading-tight" style={{ color: unknownSkill ? '#9ca3af' : skillDef.color }}>
                    {unknownSkill ? '--/99' : `${level}/99`}
                  </span>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Achievements */}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-mono">Achievements</p>
          <span className="text-xs text-gray-600 font-mono">{unlockedIdsForDisplay.length}/{ACHIEVEMENTS.length}</span>
        </div>
        {unlockedAchievements.length > 0 ? (
          <div className="grid grid-cols-8 gap-1.5">
            {unlockedAchievements.map(a => (
              <span
                key={a.id}
                className="h-8 rounded-lg bg-cyber-neon/10 border border-cyber-neon/20 flex items-center justify-center text-sm"
                title={`${a.name}: ${a.description}`}
              >
                {a.icon}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No achievements yet</p>
        )}
      </div>

      {/* Frame showcase */}
      {frame && (
        <div className="rounded-xl bg-discord-card/80 border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-2">Equipped Frame</p>
          <div className="flex items-center gap-3">
            <AvatarWithFrame
              avatar={profile.avatar_url || '🤖'}
              frameId={profile.equipped_frame}
              sizeClass="w-12 h-12"
              textClass="text-xl"
              roundedClass="rounded-lg"
              ringInsetClass="-inset-1"
              ringOpacity={0.8}
            />
            <div>
              <p className="text-xs font-semibold text-white">{frame.name}</p>
              <p className="text-xs font-mono" style={{ color: frame.color }}>{frame.rarity}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-mono">Recent Sessions</p>
        {sessions.length > 0 ? (
          <div className="space-y-1.5">
            {sessions.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-discord-darker/40 border border-white/5">
                <span className="text-sm text-gray-400">
                  {new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                  {new Date(s.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span className="text-sm text-cyber-neon font-mono font-medium">{formatDuration(s.duration_seconds)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No sessions yet</p>
        )}
      </div>

      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-mono">Public progression history</p>
        {publicProgressEvents.length > 0 ? (
          <div className="space-y-1.5">
            {publicProgressEvents.map((event) => (
              <div key={event.id} className="rounded-lg bg-discord-darker/40 border border-white/5 px-2 py-1.5">
                <p className="text-[11px] text-white">{event.event_type.replaceAll('_', ' ')}</p>
                <p className="text-[10px] text-gray-400 truncate">{JSON.stringify(event.payload)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No public progression events yet</p>
        )}
      </div>
    </motion.div>
  )
}
