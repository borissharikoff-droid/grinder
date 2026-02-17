import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { getStreakMultiplier } from '../../lib/xp'
import { computeTotalSkillLevel, MAX_TOTAL_SKILL_LEVEL } from '../../lib/skills'
import { FRAMES, BADGES, getEquippedFrame, getEquippedBadges } from '../../lib/cosmetics'
import { playClickSound } from '../../lib/sounds'
import { useAlertStore } from '../../stores/alertStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { ensureInventoryHydrated, useInventoryStore } from '../../stores/inventoryStore'
import { AvatarWithFrame } from '../shared/AvatarWithFrame'

interface ProfileBarProps {
  onNavigateProfile?: () => void
  onNavigateInventory?: () => void
}

export function ProfileBar({ onNavigateProfile, onNavigateInventory }: ProfileBarProps) {
  const { user } = useAuthStore()
  const [username, setUsername] = useState('Idly')
  const [avatar, setAvatar] = useState('🤖')
  const [totalSkillLevel, setTotalSkillLevel] = useState(0)
  const [frameId, setFrameId] = useState<string | null>(null)
  const [badgeIds, setBadgeIds] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const activeFrame = FRAMES.find(f => f.id === frameId)
  const streakMult = getStreakMultiplier(streak)
  const lootCount = useAlertStore((s) => (s.currentAlert ? 1 : 0) + s.queue.length)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const inventoryItemCount = useInventoryStore((s) => Object.values(s.items).reduce((sum, qty) => sum + qty, 0))
  const chestCount = useInventoryStore((s) => Object.values(s.chests).reduce((sum, qty) => sum + qty, 0))
  const pendingCount = useInventoryStore((s) => s.pendingRewards.filter((r) => !r.claimed).length)
  const backpackCount = inventoryItemCount + chestCount + pendingCount
  const toggleBell = useCallback(() => {
    playClickSound()
    setBellOpen((o) => !o)
  }, [])

  useEffect(() => {
    if (user) {
      const cacheKey = `idly_profile_cache_${user.id}`
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}') as { username?: string; avatar?: string }
        if (cached.username) setUsername(cached.username)
        if (cached.avatar) setAvatar(cached.avatar)
      } catch {
        // ignore broken cache
      }
    }

    if (supabase && user) {
      supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          const nextUsername = data.username || 'Idly'
          const nextAvatar = data.avatar_url || '🤖'
          setUsername(nextUsername)
          setAvatar(nextAvatar)
          const cacheKey = `idly_profile_cache_${user.id}`
          localStorage.setItem(cacheKey, JSON.stringify({ username: nextUsername, avatar: nextAvatar }))
        }
      }).catch(() => {})
    }
    const api = window.electronAPI
    if (api?.db?.getAllSkillXP) {
      api.db.getAllSkillXP().then((rows: { skill_id: string; total_xp: number }[]) => {
        setTotalSkillLevel(computeTotalSkillLevel(rows || []))
      })
    }
    setFrameId(getEquippedFrame())
    setBadgeIds(getEquippedBadges())
    if (api?.db?.getStreak) {
      api.db.getStreak().then((s: number) => setStreak(s || 0))
    }
    ensureInventoryHydrated()
  }, [user])

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-4">
      {/* Top row: avatar + info + sign out — overflow hidden so tooltips don't expand window */}
      <div className="flex items-center gap-2.5 w-full max-w-[340px] min-w-0">
        {/* Avatar */}
        <button onClick={() => { playClickSound(); onNavigateProfile?.() }} className={`relative shrink-0 ${activeFrame ? `frame-style-${activeFrame.style}` : ''}`} title="Profile">
          <AvatarWithFrame
            avatar={avatar}
            frameId={frameId}
            sizeClass="w-9 h-9 frame-avatar hover:scale-105 transition-transform"
            textClass="text-lg"
            roundedClass="rounded-full"
            ringInsetClass="-inset-1"
          />
          {lootCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyber-neon text-discord-darker text-[9px] font-bold flex items-center justify-center shadow-[0_0_6px_rgba(0,255,136,0.5)]">
              {lootCount}
            </span>
          )}
        </button>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-medium text-sm leading-none truncate">{username}</span>

            <span className="text-cyber-neon font-mono text-[11px] leading-none cursor-default" title="Total skill level">
              {totalSkillLevel}/{MAX_TOTAL_SKILL_LEVEL}
            </span>

            {badgeIds.map(bId => {
              const badge = BADGES.find(b => b.id === bId)
              return badge ? (
                <span key={bId} className="text-[9px] leading-none px-1 py-0.5 rounded-md border font-medium"
                  style={{ borderColor: `${badge.color}30`, backgroundColor: `${badge.color}10`, color: badge.color }} title={badge.name}>
                  {badge.icon}
                </span>
              ) : null
            })}

          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => {
              playClickSound()
              setBellOpen(false)
              onNavigateInventory?.()
            }}
            className="w-8 h-8 mr-1 rounded-lg bg-discord-card/60 border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/10 transition-colors relative"
            title="Backpack"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7V6a4 4 0 0 1 8 0v1" />
              <path d="M6 7h12a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1z" />
              <path d="M9 12h6" />
            </svg>
            {backpackCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-cyber-neon text-discord-darker text-[8px] font-bold flex items-center justify-center">
                {backpackCount > 9 ? '9+' : backpackCount}
              </span>
            )}
          </button>
        </div>
        <div className="relative shrink-0">
          <button
            ref={bellRef}
            onClick={toggleBell}
            className="w-8 h-8 rounded-lg bg-discord-card/60 border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/10 transition-colors relative"
            title="Notifications"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel open={bellOpen} onClose={() => setBellOpen(false)} bellRef={bellRef} />
        </div>

      </div>

    </div>
  )
}
