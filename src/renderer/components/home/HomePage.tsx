import { useEffect, useRef, useState } from 'react'
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
import { MOTION } from '../../lib/motion'
import { useNotificationStore } from '../../stores/notificationStore'

interface HomePageProps {
  onNavigateProfile: () => void
  onNavigateInventory: () => void
}

// Used to distinguish "previous run was interrupted" from active checkpoint of this app run.
const APP_LAUNCHED_AT = Date.now()

function formatRecoveryDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function HomePage({ onNavigateProfile, onNavigateInventory }: HomePageProps) {
  const { showComplete, status } = useSessionStore()
  const pushNotification = useNotificationStore((s) => s.push)
  const [showWelcome, setShowWelcome] = useState(false)
  const notifiedCheckpointUpdatedAtRef = useRef<number | null>(null)

  // Check for crash recovery checkpoint only when app is idle.
  // We only show checkpoints that were saved BEFORE current app launch.
  useEffect(() => {
    if (status !== 'idle') {
      return
    }
    const api = window.electronAPI
    if (!api?.db?.getCheckpoint) return
    api.db.getCheckpoint().then((cp) => {
      const belongsToPreviousRun = !!cp && cp.updated_at < (APP_LAUNCHED_AT - 5000)
      if (cp && cp.elapsed_seconds >= 60 && belongsToPreviousRun) {
        if (notifiedCheckpointUpdatedAtRef.current === cp.updated_at) return
        notifiedCheckpointUpdatedAtRef.current = cp.updated_at
        pushNotification({
          type: 'progression',
          icon: '⚠️',
          title: 'Session was interrupted',
          body: `Last session ran for ${formatRecoveryDuration(cp.elapsed_seconds)}. Progress is saved and ready to continue.`,
        })
        if (api.db.clearCheckpoint) {
          api.db.clearCheckpoint().catch(() => {})
        }
      }
    }).catch(() => {})
  }, [status, pushNotification])

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

  return (
    <motion.div
      initial={{ opacity: MOTION.page.initial.opacity }}
      animate={{ opacity: MOTION.page.animate.opacity }}
      exit={{ opacity: MOTION.page.exit.opacity }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="flex flex-col h-full"
    >
      <ProfileBar onNavigateProfile={onNavigateProfile} onNavigateInventory={onNavigateInventory} />

      <div className="flex-1 flex flex-col items-center justify-center pb-4 px-4 gap-6">
        {showWelcome && status === 'idle' ? (
          <WelcomeBanner onDismiss={handleDismissWelcome} />
        ) : (
          <MotivationBanner isRunning={status !== 'idle'} />
        )}

        {/* Timer */}
        <Timer />

        {/* Controls + activity */}
        <div className="flex flex-col items-center gap-5">
          <SessionControls glowPulse={showWelcome && status === 'idle'} />
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: MOTION.duration.slow, ease: MOTION.easing }}
                className="flex flex-col items-center gap-3"
              >
                <CurrentActivity />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Goal */}
        <div className="flex flex-col items-center w-full max-w-xs">
          <GoalWidget />
        </div>
      </div>

      <AnimatePresence>
        {showComplete && <SessionComplete />}
      </AnimatePresence>

    </motion.div>
  )
}
