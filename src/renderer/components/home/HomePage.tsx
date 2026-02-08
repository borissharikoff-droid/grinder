import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProfileBar } from './ProfileBar'
import { Timer } from './Timer'
import { SessionControls } from './SessionControls'
import { CurrentActivity } from './CurrentActivity'
import { SessionComplete } from './SessionComplete'
import { MotivationBanner } from './MotivationBanner'
import { WelcomeBanner } from './WelcomeBanner'
import { GoalWidget } from './GoalWidget'
import { XPPopup } from './XPPopup'
import { LevelUpModal } from './LevelUpModal'
import { useSessionStore } from '../../stores/sessionStore'
import mascotImg from '../../assets/mascot.png'

interface HomePageProps {
  onNavigateProfile: () => void
}

export function HomePage({ onNavigateProfile }: HomePageProps) {
  const { showComplete, setCurrentActivity, status, liveXP, pendingLevelUp } = useSessionStore()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const welcomed = localStorage.getItem('grinder_welcomed')
    if (!welcomed) setShowWelcome(true)
  }, [])

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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.tracker?.onActivityUpdate) return
    const unsub = window.electronAPI.tracker.onActivityUpdate((a) => {
      setCurrentActivity(a as Parameters<typeof setCurrentActivity>[0])
    })
    return unsub
  }, [setCurrentActivity])

  return (
    <div className="flex flex-col h-full">
      <ProfileBar onNavigateProfile={onNavigateProfile} />

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Top: mascot + banner — no AnimatePresence on running transition */}
        <div className="flex flex-col items-center w-full px-4 mb-8">
          {showWelcome && status === 'idle' ? (
            <WelcomeBanner onDismiss={handleDismissWelcome} />
          ) : (
            <>
              <img
                src={mascotImg}
                alt=""
                className="w-16 h-16 mb-4"
                draggable={false}
              />
              <MotivationBanner isRunning={status !== 'idle'} />
            </>
          )}
        </div>

        {/* Timer */}
        <div className="mb-8">
          <Timer />
        </div>

        {/* Controls */}
        <div className="mb-8">
          <SessionControls glowPulse={showWelcome && status === 'idle'} />
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-3"
              >
                <CurrentActivity />
                {liveXP > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-cyber-neon text-xs font-mono"
                  >
                    +{liveXP} XP this session
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-5 w-full max-w-xs">
          <GoalWidget />
        </div>
      </div>

      <AnimatePresence>
        {showComplete && <SessionComplete />}
      </AnimatePresence>

      {status !== 'idle' && <XPPopup />}
      {pendingLevelUp && <LevelUpModal />}
    </div>
  )
}
