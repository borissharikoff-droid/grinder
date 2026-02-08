import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { levelFromTotalXP } from '../lib/xp'
import { getEquippedBadges, getEquippedFrame } from '../lib/cosmetics'

export function useProfileSync() {
  const { user } = useAuthStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!supabase || !user) return

    const sync = async () => {
      if (!supabase || !user) return
      if (!window.electronAPI?.db?.getLocalStat || !window.electronAPI?.db?.getStreak) return
      const [xpStr, streak] = await Promise.all([
        window.electronAPI.db.getLocalStat('total_xp'),
        window.electronAPI.db.getStreak(),
      ])
      const totalXP = parseInt(xpStr || '0', 10) || 0
      const level = levelFromTotalXP(totalXP)
      const equippedBadges = getEquippedBadges()
      const equippedFrame = getEquippedFrame()

      // Core profile fields (always exist)
      await supabase.from('profiles').update({
        xp: totalXP,
        level,
        streak_count: streak,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      // Cosmetics sync — columns may not exist yet in Supabase, so try separately
      try {
        await supabase.from('profiles').update({
          equipped_badges: equippedBadges,
          equipped_frame: equippedFrame,
        }).eq('id', user.id)
      } catch {
        // Columns may not exist yet — safe to ignore
      }
    }

    sync()
    intervalRef.current = setInterval(sync, 60000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user])
}

export function usePresenceSync(currentActivity: string | null, isSessionActive: boolean) {
  const { user } = useAuthStore()

  // Set online on mount, offline on unmount
  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('profiles').update({ is_online: true, updated_at: new Date().toISOString() }).eq('id', user.id).then(() => {})

    const handleBeforeUnload = () => {
      if (supabase && user) {
        // Use sendBeacon-style: can't await but fire it
        supabase.from('profiles').update({ is_online: false, current_activity: null, updated_at: new Date().toISOString() }).eq('id', user.id).then(() => {})
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      handleBeforeUnload()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user])

  // Update current activity
  useEffect(() => {
    if (!supabase || !user) return
    const activity = isSessionActive && currentActivity ? currentActivity : null
    supabase.from('profiles').update({
      current_activity: activity,
      is_online: true,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).then(() => {})
  }, [user, currentActivity, isSessionActive])
}
