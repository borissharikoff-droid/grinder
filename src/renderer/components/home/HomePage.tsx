import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileBar } from './ProfileBar'
import { Timer } from './Timer'
import { SessionControls } from './SessionControls'
import { CurrentActivity } from './CurrentActivity'
import { SessionComplete } from './SessionComplete'
import { MotivationBanner } from './MotivationBanner'
import { WelcomeBanner } from './WelcomeBanner'
import { GoalWidget } from './GoalWidget'
import { useSessionStore } from '../../stores/sessionStore'
import { usePresenceSync } from '../../hooks/useProfileSync'
import { categoryToSkillId, getSkillById } from '../../lib/skills'

interface HomePageProps {
  onShowStreak: (count: number) => void
  onNavigateProfile: () => void
}

export function HomePage({ onShowStreak, onNavigateProfile }: HomePageProps) {
  const { showComplete, checkStreakOnMount, setCurrentActivity, status, currentActivity } = useSessionStore()
  const [showWelcome, setShowWelcome] = useState(false)

  // Check if user is new (never started a grind)
  useEffect(() => {
    const welcomed = localStorage.getItem('grinder_welcomed')
    if (!welcomed) {
      setShowWelcome(true)
    }
  }, [])

  // Dismiss welcome after first grind — delay so exit animation runs smoothly
  useEffect(() => {
    if (status === 'running' && showWelcome) {
      const t = setTimeout(() => {
        localStorage.setItem('grinder_welcomed', '1')
        setShowWelcome(false)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [status, showWelcome])

  const handleDismissWelcome = () => {
    localStorage.setItem('grinder_welcomed', '1')
    setShowWelcome(false)
  }

  // Sync "Leveling X" so friends see skill being leveled
  const presenceLabel = currentActivity && status === 'running'
    ? (() => {
        const skill = getSkillById(categoryToSkillId(currentActivity.category))
        return skill ? `Leveling ${skill.name}` : null
      })()
    : null
  usePresenceSync(presenceLabel, status === 'running')

  // Show streak overlay exactly once per app session (survives tab switches & remounts)
  useEffect(() => {
    if (sessionStorage.getItem('grinder_streak_shown')) return
    let cancelled = false
    checkStreakOnMount().then((streak) => {
      if (!cancelled && streak >= 2) {
        sessionStorage.setItem('grinder_streak_shown', '1')
        onShowStreak(streak)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.tracker?.onActivityUpdate) return
    const unsub = window.electronAPI.tracker.onActivityUpdate((a) => {
      setCurrentActivity(a as Parameters<typeof setCurrentActivity>[0])
    })
    return unsub
  }, [setCurrentActivity])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full"
    >
      <ProfileBar onNavigateProfile={onNavigateProfile} />
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
        {/* Motivation / Welcome banner */}
        <div className="flex justify-center w-full px-4">
          <AnimatePresence mode="wait">
            {showWelcome && status === 'idle' ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.94, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex justify-center"
              >
                <WelcomeBanner onDismiss={handleDismissWelcome} />
              </motion.div>
            ) : (
              <motion.div
                key="motivation"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex justify-center"
              >
                <MotivationBanner isRunning={status !== 'idle'} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timer + Controls — centered */}
        <div className="flex flex-col items-center gap-5">
          <Timer />
          <SessionControls glowPulse={showWelcome && status === 'idle'} />
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <CurrentActivity />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Goal progress below timer */}
          <GoalWidget />
        </div>
      </div>
      <AnimatePresence>
        {showComplete && <SessionComplete />}
      </AnimatePresence>
    </motion.div>
  )
}
