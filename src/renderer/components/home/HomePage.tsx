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
import { useSessionStore } from '../../stores/sessionStore'
import mascotImg from '../../assets/mascot.png'

interface HomePageProps {
  onNavigateProfile: () => void
}

export function HomePage({ onNavigateProfile }: HomePageProps) {
  const { showComplete, setCurrentActivity, status } = useSessionStore()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const welcomed = localStorage.getItem('idly_welcomed')
    if (!welcomed) setShowWelcome(true)
  }, [])

  useEffect(() => {
    if (status === 'running' && showWelcome) {
      const t = setTimeout(() => {
        localStorage.setItem('idly_welcomed', '1')
        setShowWelcome(false)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [status, showWelcome])

  const handleDismissWelcome = () => {
    localStorage.setItem('idly_welcomed', '1')
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

      <div className="flex-1 flex flex-col items-center justify-start pt-4 pb-4 px-4 gap-8">
        {/* Top: mascot + banner */}
        <div className="flex flex-col items-center w-full px-2">
          {showWelcome && status === 'idle' ? (
            <WelcomeBanner onDismiss={handleDismissWelcome} />
          ) : (
            <>
              <img
                src={mascotImg}
                alt=""
                className="w-16 h-16 mb-3"
                draggable={false}
              />
              <MotivationBanner isRunning={status !== 'idle'} />
            </>
          )}
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <Timer />
        </div>

        {/* Controls + activity / Browser Mode */}
        <div className="flex flex-col items-center gap-5">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Goal */}
        <div className="flex flex-col items-center w-full max-w-xs mt-1">
          <GoalWidget />
        </div>
      </div>

      <AnimatePresence>
        {showComplete && <SessionComplete />}
      </AnimatePresence>

    </div>
  )
}
