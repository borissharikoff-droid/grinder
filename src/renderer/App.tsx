import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AuthGate } from './components/auth/AuthGate'
import { useProfileSync } from './hooks/useProfileSync'
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
import { UpdateBanner } from './components/UpdateBanner'

export type TabId = 'home' | 'skills' | 'stats' | 'profile' | 'friends' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showStreak, setShowStreak] = useState(false)
  const [streakCount, setStreakCount] = useState(0)
  useProfileSync()
  useKeyboardShortcuts()

  const handleShowStreak = useCallback((count: number) => {
    setStreakCount(count)
    setShowStreak(true)
  }, [])

  const handleNavigateProfile = useCallback(() => setActiveTab('profile'), [])

  return (
    <AuthGate>
      <div className="flex flex-col h-full bg-discord-darker">
        <UpdateBanner />
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <HomePage
                key="home"
                onShowStreak={handleShowStreak}
                onNavigateProfile={handleNavigateProfile}
              />
            )}
            {activeTab === 'skills' && <SkillsPage key="skills" />}
            {activeTab === 'stats' && <StatsPage key="stats" />}
            {activeTab === 'profile' && <ProfilePage key="profile" onBack={() => setActiveTab('home')} />}
            {activeTab === 'friends' && <FriendsPage key="friends" />}
            {activeTab === 'settings' && <SettingsPage key="settings" />}
          </AnimatePresence>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        <AnimatePresence>
          {showStreak && streakCount >= 2 && (
            <StreakOverlay streak={streakCount} onClose={() => setShowStreak(false)} />
          )}
        </AnimatePresence>
        {/* Global loot drop overlay */}
        <LootDrop />
      </div>
    </AuthGate>
  )
}
