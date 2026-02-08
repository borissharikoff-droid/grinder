import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { levelFromTotalXP, xpProgressInLevel, getStreakMultiplier, getTitleForLevel } from '../../lib/xp'
import { detectPersona } from '../../lib/persona'
import { FRAMES, BADGES, getEquippedFrame, getEquippedBadges } from '../../lib/cosmetics'

interface ProfileBarProps {
  onNavigateProfile?: () => void
}

export function ProfileBar({ onNavigateProfile }: ProfileBarProps) {
  const { user, signOut } = useAuthStore()
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('🤖')
  const [totalXP, setTotalXP] = useState(0)
  const [persona, setPersona] = useState<{ emoji: string; label: string; description: string } | null>(null)
  const [showXPTooltip, setShowXPTooltip] = useState(false)
  const [showPersonaTooltip, setShowPersonaTooltip] = useState(false)
  const [frameId, setFrameId] = useState<string | null>(null)
  const [badgeIds, setBadgeIds] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const activeFrame = FRAMES.find(f => f.id === frameId)
  const streakMult = getStreakMultiplier(streak)

  useEffect(() => {
    if (supabase && user) {
      supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setUsername(data.username || 'Grinder')
          setAvatar(data.avatar_url || '🤖')
        }
        setLoaded(true)
      }).catch(() => setLoaded(true))
    } else {
      setLoaded(true)
    }
    const api = window.electronAPI
    if (api?.db?.getLocalStat) {
      api.db.getLocalStat('total_xp').then((v) => setTotalXP(parseInt(v || '0', 10)))
    }
    setFrameId(getEquippedFrame())
    setBadgeIds(getEquippedBadges())
    if (api?.db?.getStreak) {
      api.db.getStreak().then((s: number) => setStreak(s || 0))
    }
    if (api?.db?.getCategoryStats) {
      api.db.getCategoryStats().then((cats) => {
        if (cats && cats.length > 0) {
          const p = detectPersona(cats as { category: string; total_ms: number }[])
          setPersona(p)
        }
      })
    }
  }, [user])

  const level = levelFromTotalXP(totalXP)
  const { current, needed } = xpProgressInLevel(totalXP)
  const pct = Math.min(100, (current / needed) * 100)

  if (!supabase || !user) return null

  return (
    <div className={`flex flex-col items-center px-4 pt-3 pb-4 transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Top row: avatar + info + sign out */}
      <div className="flex items-center gap-2.5 w-full max-w-[260px]">
        {/* Avatar */}
        <button onClick={onNavigateProfile} className={`relative shrink-0 ${activeFrame ? `frame-style-${activeFrame.style}` : ''}`} title="Profile">
          {activeFrame && (
            <div className="frame-ring absolute -inset-1 rounded-full" style={{ background: activeFrame.gradient, opacity: 0.7, color: activeFrame.color, borderColor: activeFrame.color }} />
          )}
          <div
            className={`frame-avatar relative w-9 h-9 rounded-full bg-discord-card flex items-center justify-center text-lg hover:scale-105 transition-transform ${
              activeFrame ? 'border-2' : 'border border-white/10'
            }`}
            style={activeFrame ? { borderColor: activeFrame.color } : undefined}
          >
            {avatar}
          </div>
        </button>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-medium text-sm leading-none truncate">{username}</span>

            <div className="relative" onMouseEnter={() => setShowXPTooltip(true)} onMouseLeave={() => setShowXPTooltip(false)}>
              <span className="text-cyber-neon font-mono text-[11px] leading-none cursor-default">Lv.{level}</span>
              <span className="text-gray-400 text-[10px] font-medium ml-0.5">{getTitleForLevel(level)}</span>
              {showXPTooltip && (
                <div className="absolute top-full left-0 mt-1 px-2 py-1 rounded-lg bg-discord-card border border-white/10 text-[10px] text-gray-300 font-mono whitespace-nowrap z-20 shadow-lg">
                  {current}/{needed} XP to Lv.{level + 1} · Total: {totalXP} XP
                </div>
              )}
            </div>

            {badgeIds.map(bId => {
              const badge = BADGES.find(b => b.id === bId)
              return badge ? (
                <span key={bId} className="text-[9px] leading-none px-1 py-0.5 rounded-md border font-medium"
                  style={{ borderColor: `${badge.color}30`, backgroundColor: `${badge.color}10`, color: badge.color }} title={badge.name}>
                  {badge.icon}
                </span>
              ) : null
            })}

            {persona && (
              <div className="relative" onMouseEnter={() => setShowPersonaTooltip(true)} onMouseLeave={() => setShowPersonaTooltip(false)}>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-discord-card/80 border border-white/5 text-gray-400 cursor-default">
                  {persona.emoji}
                </span>
                {showPersonaTooltip && (
                  <div className="absolute left-0 top-full mt-1.5 w-48 px-2.5 py-2 rounded-lg bg-discord-card border border-white/10 text-[10px] text-gray-300 z-20 shadow-xl">
                    <p className="font-medium text-white">{persona.emoji} {persona.label}</p>
                    <p className="text-gray-500 mt-1 leading-relaxed break-words">
                      By activity. We analyze what you do and show your focus profile.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Sign out */}
        <button onClick={() => signOut()} className="text-gray-600 hover:text-discord-red transition-colors shrink-0" title="Sign out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* XP bar — same width as top row */}
      <div className="w-full max-w-[260px] h-1 rounded-full bg-discord-dark overflow-hidden mt-2">
        <div className="h-full bg-gradient-to-r from-cyber-neon to-discord-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
