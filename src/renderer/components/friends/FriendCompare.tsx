import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { levelFromTotalXP } from '../../lib/xp'
import { FRAMES } from '../../lib/cosmetics'
import type { FriendProfile } from '../../hooks/useFriends'

interface CompareProps {
  friend: FriendProfile
  onBack: () => void
}

interface UserStats {
  level: number
  xp: number
  streak: number
  totalGrindSeconds: number
  totalSessions: number
  achievementCount: number
  avatar: string
  username: string
  frameId: string | null
}

function StatRow({ label, myVal, theirVal, suffix, higherIsBetter = true }: {
  label: string
  myVal: number
  theirVal: number
  suffix?: string
  higherIsBetter?: boolean
}) {
  const iWin = higherIsBetter ? myVal > theirVal : myVal < theirVal
  const theyWin = higherIsBetter ? theirVal > myVal : theirVal < myVal
  const tie = myVal === theirVal

  return (
    <div className="flex items-center gap-2 py-2">
      <div className={`flex-1 text-right font-mono text-sm font-bold ${iWin ? 'text-cyber-neon' : tie ? 'text-white' : 'text-gray-500'}`}>
        {myVal.toLocaleString()}{suffix || ''}
        {iWin && <span className="ml-1 text-[9px]">✓</span>}
      </div>
      <div className="w-24 text-center">
        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className={`flex-1 text-left font-mono text-sm font-bold ${theyWin ? 'text-cyber-neon' : tie ? 'text-white' : 'text-gray-500'}`}>
        {theyWin && <span className="mr-1 text-[9px]">✓</span>}
        {theirVal.toLocaleString()}{suffix || ''}
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function FriendCompare({ friend, onBack }: CompareProps) {
  const { user } = useAuthStore()
  const [me, setMe] = useState<UserStats | null>(null)
  const [them, setThem] = useState<UserStats | null>(null)

  useEffect(() => {
    loadStats()
  }, [friend.id])

  async function loadStats() {
    if (!supabase || !user) return

    // Load my profile from Supabase
    const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    // My sessions
    const { data: mySessions } = await supabase.from('session_summaries')
      .select('duration_seconds')
      .eq('user_id', user.id)
    // My achievements
    const { data: myAch } = await supabase.from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)

    // Also get local stats for more accurate data
    const api = window.electronAPI
    let localXP = 0
    let localStreak = 0
    if (api?.db) {
      const xpStr = await api.db.getLocalStat('total_xp')
      localXP = parseInt(xpStr || '0', 10) || 0
      localStreak = await api.db.getStreak()
    }

    const myTotalSeconds = (mySessions || []).reduce((s, r) => s + (r as { duration_seconds: number }).duration_seconds, 0)

    setMe({
      level: levelFromTotalXP(localXP || myProfile?.xp || 0),
      xp: localXP || myProfile?.xp || 0,
      streak: localStreak || myProfile?.streak_count || 0,
      totalGrindSeconds: myTotalSeconds,
      totalSessions: (mySessions || []).length,
      achievementCount: (myAch || []).length,
      avatar: myProfile?.avatar_url || '🤖',
      username: myProfile?.username || 'You',
      frameId: myProfile?.equipped_frame || null,
    })

    // Friend sessions
    const { data: friendSessions } = await supabase.from('session_summaries')
      .select('duration_seconds')
      .eq('user_id', friend.id)
    // Friend achievements
    const { data: friendAch } = await supabase.from('user_achievements')
      .select('achievement_id')
      .eq('user_id', friend.id)

    const friendTotalSeconds = (friendSessions || []).reduce((s, r) => s + (r as { duration_seconds: number }).duration_seconds, 0)

    setThem({
      level: friend.level || 1,
      xp: friend.xp || 0,
      streak: friend.streak_count || 0,
      totalGrindSeconds: friendTotalSeconds,
      totalSessions: (friendSessions || []).length,
      achievementCount: (friendAch || []).length,
      avatar: friend.avatar_url || '🤖',
      username: friend.username || 'Friend',
      frameId: friend.equipped_frame || null,
    })
  }

  if (!me || !them) {
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          <span className="font-mono text-xs">Back</span>
        </button>
        <p className="text-gray-500 text-sm text-center py-8">Loading comparison...</p>
      </div>
    )
  }

  // Score: who wins more categories
  const comparisons = [
    { my: me.level, their: them.level },
    { my: me.xp, their: them.xp },
    { my: me.streak, their: them.streak },
    { my: me.totalGrindSeconds, their: them.totalGrindSeconds },
    { my: me.totalSessions, their: them.totalSessions },
    { my: me.achievementCount, their: them.achievementCount },
  ]
  const myScore = comparisons.filter(c => c.my > c.their).length
  const theirScore = comparisons.filter(c => c.their > c.my).length

  const myFrame = FRAMES.find(f => f.id === me.frameId)
  const theirFrame = FRAMES.find(f => f.id === them.frameId)

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-3"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span className="font-mono text-xs">Back</span>
      </button>

      {/* Header: You vs Friend */}
      <div className="rounded-2xl bg-discord-card/80 border border-white/10 p-4">
        <div className="flex items-center justify-between">
          {/* My avatar */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              {myFrame && (
                <div className="absolute -inset-1 rounded-xl" style={{ background: myFrame.gradient, opacity: 0.7 }} />
              )}
              <div className={`relative w-12 h-12 rounded-lg bg-discord-darker flex items-center justify-center text-2xl ${myFrame ? 'border-2' : 'border border-white/10'}`}
                style={myFrame ? { borderColor: myFrame.color } : undefined}
              >
                {me.avatar}
              </div>
            </div>
            <span className="text-xs text-white font-medium truncate max-w-[80px]">{me.username}</span>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-mono font-bold ${myScore > theirScore ? 'text-cyber-neon' : 'text-gray-500'}`}>{myScore}</span>
              <span className="text-gray-600 text-xs">vs</span>
              <span className={`text-2xl font-mono font-bold ${theirScore > myScore ? 'text-cyber-neon' : 'text-gray-500'}`}>{theirScore}</span>
            </div>
            <p className="text-[9px] text-gray-600 font-mono mt-0.5">CATEGORIES WON</p>
          </div>

          {/* Friend avatar */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              {theirFrame && (
                <div className="absolute -inset-1 rounded-xl" style={{ background: theirFrame.gradient, opacity: 0.7 }} />
              )}
              <div className={`relative w-12 h-12 rounded-lg bg-discord-darker flex items-center justify-center text-2xl ${theirFrame ? 'border-2' : 'border border-white/10'}`}
                style={theirFrame ? { borderColor: theirFrame.color } : undefined}
              >
                {them.avatar}
              </div>
            </div>
            <span className="text-xs text-white font-medium truncate max-w-[80px]">{them.username}</span>
          </div>
        </div>
      </div>

      {/* Detailed comparisons */}
      <div className="rounded-2xl bg-discord-card/80 border border-white/10 p-4 divide-y divide-white/5">
        <StatRow label="Level" myVal={me.level} theirVal={them.level} />
        <StatRow label="Total XP" myVal={me.xp} theirVal={them.xp} />
        <StatRow label="Streak" myVal={me.streak} theirVal={them.streak} suffix="d" />
        <div className="flex items-center gap-2 py-2">
          <div className={`flex-1 text-right font-mono text-sm font-bold ${me.totalGrindSeconds > them.totalGrindSeconds ? 'text-cyber-neon' : me.totalGrindSeconds === them.totalGrindSeconds ? 'text-white' : 'text-gray-500'}`}>
            {formatDuration(me.totalGrindSeconds)}
            {me.totalGrindSeconds > them.totalGrindSeconds && <span className="ml-1 text-[9px]">✓</span>}
          </div>
          <div className="w-24 text-center">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Grind Time</span>
          </div>
          <div className={`flex-1 text-left font-mono text-sm font-bold ${them.totalGrindSeconds > me.totalGrindSeconds ? 'text-cyber-neon' : me.totalGrindSeconds === them.totalGrindSeconds ? 'text-white' : 'text-gray-500'}`}>
            {them.totalGrindSeconds > me.totalGrindSeconds && <span className="mr-1 text-[9px]">✓</span>}
            {formatDuration(them.totalGrindSeconds)}
          </div>
        </div>
        <StatRow label="Sessions" myVal={me.totalSessions} theirVal={them.totalSessions} />
        <StatRow label="Achievements" myVal={me.achievementCount} theirVal={them.achievementCount} />
      </div>

      {/* Verdict */}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3 text-center">
        {myScore > theirScore ? (
          <p className="text-sm text-cyber-neon font-bold">🏆 You're ahead! Keep grinding!</p>
        ) : theirScore > myScore ? (
          <p className="text-sm text-orange-400 font-bold">💪 Time to catch up! Grind harder!</p>
        ) : (
          <p className="text-sm text-white font-bold">⚔️ Perfectly matched! Who grinds next?</p>
        )}
      </div>
    </motion.div>
  )
}
