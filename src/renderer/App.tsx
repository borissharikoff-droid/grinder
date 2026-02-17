import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { AuthGate } from './components/auth/AuthGate'
import { useProfileSync, usePresenceSync } from './hooks/useProfileSync'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { BottomNav } from './components/layout/BottomNav'
import { HomePage } from './components/home/HomePage'
import { StatsPage } from './components/stats/StatsPage'
import { FriendsPage } from './components/friends/FriendsPage'
import { ProfilePage } from './components/profile/ProfilePage'
import { SettingsPage } from './components/settings/SettingsPage'
import { SkillsPage } from './components/skills/SkillsPage'
import { StreakOverlay } from './components/animations/StreakOverlay'
import { LootDrop } from './components/alerts/LootDrop'
import { ChestDrop } from './components/alerts/ChestDrop'
import { FriendToasts } from './components/alerts/FriendToasts'
import { MessageBanner } from './components/alerts/MessageBanner'
import { SkillLevelUpModal } from './components/home/SkillLevelUpModal'
import { InventoryPage } from './components/inventory/InventoryPage'
import { useFriends } from './hooks/useFriends'
import { useMessageNotifier } from './hooks/useMessageNotifier'
import { UpdateBanner } from './components/UpdateBanner'
import { useSessionStore } from './stores/sessionStore'
import { useChatTargetStore } from './stores/chatTargetStore'
import { categoryToSkillId, getSkillById } from './lib/skills'
import { warmUpAudio } from './lib/sounds'
import { runSupabaseHealthCheck } from './services/supabaseHealth'
import { routeNotification } from './services/notificationRouter'
import { MOTION } from './lib/motion'

export type TabId = 'home' | 'inventory' | 'skills' | 'stats' | 'profile' | 'friends' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showStreak, setShowStreak] = useState(false)
  const [streakCount, setStreakCount] = useState(0)
  const [healthIssues, setHealthIssues] = useState<string[]>([])
  const [isBackground, setIsBackground] = useState(false)
  const lastHiddenActivityPushRef = useRef(0)
  const handleEscapeToHome = useCallback(() => {
    if (activeTab !== 'home') setActiveTab('home')
  }, [activeTab])

  // Global presence: always is_online while app is open
  const { status, currentActivity, sessionStartTime } = useSessionStore()
  const presenceLabel = currentActivity && status === 'running'
    ? (() => {
      const cats = (currentActivity.categories || [currentActivity.category]).filter((c: string) => c !== 'idle')
      const names = cats.map((c: string) => getSkillById(categoryToSkillId(c))?.name).filter(Boolean)
      return names.length > 0 ? `Leveling ${names.join(' + ')}` : null
    })()
    : null
  usePresenceSync(presenceLabel, status === 'running', currentActivity?.appName ?? null, sessionStartTime)

  useProfileSync()
  useKeyboardShortcuts({ onEscapeToHome: handleEscapeToHome })
  const friendsModel = useFriends() // single orchestrator for friends/presence/notifications
  useMessageNotifier() // sound, taskbar badge, toasts on new messages

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }
    const isMouseBack = (button: number) => button === 3 || button === 4

    const onMouseBack = (e: MouseEvent) => {
      if (!isMouseBack(e.button)) return
      if (isEditableTarget(e.target)) return
      if (activeTab === 'home') return
      e.preventDefault()
      setActiveTab('home')
    }

    window.addEventListener('mousedown', onMouseBack)
    window.addEventListener('auxclick', onMouseBack)
    return () => {
      window.removeEventListener('mousedown', onMouseBack)
      window.removeEventListener('auxclick', onMouseBack)
    }
  }, [activeTab])

  // Pre-warm audio context on first user gesture
  useEffect(() => {
    const handler = () => {
      warmUpAudio()
      window.removeEventListener('pointerdown', handler)
    }
    window.addEventListener('pointerdown', handler, { once: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    runSupabaseHealthCheck().then((result) => {
      if (result.ok) {
        setHealthIssues([])
        return
      }
      const issues = result.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`)
      setHealthIssues(issues)
    }).catch((err) => {
      setHealthIssues([err instanceof Error ? err.message : 'Health check failed'])
    })
  }, [])

  // Check streak once on app startup
  useEffect(() => {
    if (useSessionStore.getState().isStreakDone()) return
    useSessionStore.getState().markStreakDone()

    const checkStreak = async () => {
      const api = window.electronAPI
      if (!api?.db?.getStreak || !api?.db?.getLocalStat || !api?.db?.setLocalStat) return

      const today = new Date().toLocaleDateString('sv-SE')

      try {
        const savedDate = await api.db.getLocalStat('streak_shown_date')
        if (savedDate === today) return

        const streak = await api.db.getStreak()
        if (streak >= 2) {
          await api.db.setLocalStat('streak_shown_date', today)
          setStreakCount(streak)
          setShowStreak(true)
        }
      } catch (e) {
        console.error('Failed to check streak:', e)
      }
    }

    checkStreak()
  }, [])

  const handleNavigateProfile = useCallback(() => setActiveTab('profile'), [])
  const handleNavigateInventory = useCallback(() => setActiveTab('inventory'), [])

  const handleNavigateToChat = useCallback((friendId: string) => {
    useChatTargetStore.getState().setFriendId(friendId)
    setActiveTab('friends')
  }, [])

  // Activity update listener — must live at App level so it works on ALL tabs
  const setCurrentActivity = useSessionStore((s) => s.setCurrentActivity)
  useEffect(() => {
    const onVisibility = () => setIsBackground(typeof document !== 'undefined' ? document.hidden : false)
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.electronAPI : null
    if (!api?.tracker?.onActivityUpdate) return
    const unsub = api.tracker.onActivityUpdate((a) => {
      if (isBackground) {
        const now = Date.now()
        // Eco mode: throttle foreground-window UI updates while app is hidden.
        if (now - lastHiddenActivityPushRef.current < 5000) return
        lastHiddenActivityPushRef.current = now
      }
      setCurrentActivity(a as Parameters<typeof setCurrentActivity>[0])
    })
    api.tracker.getCurrentActivity?.().then((a) => {
      if (a) setCurrentActivity(a as Parameters<typeof setCurrentActivity>[0])
    }).catch(() => {})
    return unsub
  }, [setCurrentActivity, isBackground])

  useEffect(() => {
    // Allow grind/XP/drop ticks on any foreground tab (home, inventory, friends, etc.).
    useSessionStore.getState().setGrindPageActive(!isBackground)
  }, [isBackground])

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.notify?.onSmart) return
    const unsub = api.notify.onSmart((payload) => {
      routeNotification({
        type: 'progression_info',
        icon: '🔔',
        title: payload.title,
        body: payload.body,
        dedupeKey: `smart:${payload.title}:${payload.body}`,
      }, api).catch(() => {})
    })
    return unsub
  }, [])

  return (
    <AuthGate>
      <MotionConfig reducedMotion="user" transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}>
        <div className="flex flex-col h-full bg-discord-darker overflow-x-hidden">
          <UpdateBanner />
          {healthIssues.length > 0 && (
            <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30 text-[11px] text-red-300 flex items-center justify-between gap-3">
              <span className="truncate">Supabase health issue: {healthIssues[0]}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-2 py-1 rounded border border-red-300/40 hover:bg-red-300/10 transition-colors"
                >
                  Open logs
                </button>
                <button
                  onClick={() => setHealthIssues([])}
                  className="px-2 py-1 rounded border border-white/20 text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <HomePage
                  key="home"
                  onNavigateProfile={handleNavigateProfile}
                  onNavigateInventory={handleNavigateInventory}
                />
              )}
              {activeTab === 'inventory' && <InventoryPage key="inventory" onBack={() => setActiveTab('home')} />}
              {activeTab === 'skills' && <SkillsPage key="skills" />}
              {activeTab === 'stats' && <StatsPage key="stats" />}
              {activeTab === 'profile' && <ProfilePage key="profile" onBack={() => setActiveTab('home')} />}
              {activeTab === 'friends' && <FriendsPage key="friends" friendsModel={friendsModel} />}
              {activeTab === 'settings' && <SettingsPage key="settings" />}
            </AnimatePresence>
          </main>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          <AnimatePresence>
            {showStreak && streakCount >= 2 && (
              <StreakOverlay streak={streakCount} onClose={() => setShowStreak(false)} />
            )}
          </AnimatePresence>
          <LootDrop />
          <ChestDrop />
          <FriendToasts />
          <MessageBanner onNavigateToChat={handleNavigateToChat} />
          <SkillLevelUpModal />
          </div>
      </MotionConfig>
    </AuthGate>
  )
}
