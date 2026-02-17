import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { computeTotalSkillLevel } from '../lib/skills'
import { getEquippedBadges, getEquippedFrame } from '../lib/cosmetics'
import { detectPersona } from '../lib/persona'
import { syncCosmeticsToSupabase, syncSkillsToSupabase } from '../services/supabaseSync'
import { useSkillSyncStore } from '../stores/skillSyncStore'
import { buildPresenceActivity } from '../lib/friendPresence'
import { ensureInventoryHydrated, useInventoryStore } from '../stores/inventoryStore'
import { getEquippedPerkRuntime } from '../lib/loot'

export function useProfileSync() {
  const { user } = useAuthStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const lastSkillSyncAttemptRef = useRef(0)
  const setSyncState = useSkillSyncStore((s) => s.setSyncState)

  useEffect(() => {
    if (!supabase || !user) return

    const sync = async () => {
      if (!supabase || !user) return
      if (!window.electronAPI?.db?.getStreak) return
      const api = window.electronAPI
      let totalSkillLevel = 0
      if (api?.db?.getAllSkillXP) {
        const rows = (await api.db.getAllSkillXP()) as { skill_id: string; total_xp: number }[]
        totalSkillLevel = computeTotalSkillLevel(rows || [])
      }
      const [streak] = await Promise.all([
        api.db.getStreak(),
      ])
      const equippedBadges = getEquippedBadges()
      const equippedFrame = getEquippedFrame()

      // Persona from category stats (so friends see your status: Developer, Gamer, Scholar, etc.)
      let personaId: string | null = null
      if (api?.db?.getCategoryStats) {
        const cats = (await api.db.getCategoryStats()) as { category: string; total_ms: number }[] | undefined
        personaId = detectPersona(cats || []).id
      }

      // Sync required profile fields first. Optional columns should never block this.
      const { error: baseProfileError } = await supabase.from('profiles').update({
        level: totalSkillLevel,
        streak_count: streak,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (baseProfileError) {
        console.warn('[useProfileSync] profiles base sync failed:', baseProfileError.message)
      }

      // Optional persona sync (column may not exist in older schema)
      if (personaId != null) {
        const { error: personaError } = await supabase
          .from('profiles')
          .update({ persona_id: personaId, updated_at: new Date().toISOString() })
          .eq('id', user.id)
        if (personaError) {
          // Optional field in some deployments
        }
      }

      // Cosmetics sync — columns may not exist yet in Supabase, so try separately
      ensureInventoryHydrated()
      const equippedLoot = useInventoryStore.getState().equippedBySlot
      const perk = getEquippedPerkRuntime(equippedLoot)
      syncCosmeticsToSupabase(equippedBadges, equippedFrame, {
        equippedLoot: equippedLoot as Record<string, string>,
        statusTitle: perk.statusTitle,
      }).catch(() => {})

      // Periodic safety sync for per-skill levels (keeps friends view correct even
      // if a previous sync failed due to temporary network/schema mismatch).
      if (api?.db?.getAllSkillXP) {
        const now = Date.now()
        const RETRY_EVERY_MS = 5 * 60 * 1000
        if (now - lastSkillSyncAttemptRef.current >= RETRY_EVERY_MS) {
          lastSkillSyncAttemptRef.current = now
          setSyncState({ status: 'syncing' })
          syncSkillsToSupabase(api, { maxAttempts: 3 })
            .then((result) => {
              if (result.ok) {
                setSyncState({ status: 'success', at: result.lastSkillSyncAt })
                return
              }
              setSyncState({ status: 'error', error: result.error ?? 'Skill sync failed' })
            })
            .catch((err) => {
              setSyncState({
                status: 'error',
                error: err instanceof Error ? err.message : String(err),
              })
            })
        }
      }
    }

    sync()
    // Sync local skill XP to user_skills so friends/leaderboard show real levels
    if (window.electronAPI?.db?.getAllSkillXP) {
      setSyncState({ status: 'syncing' })
      syncSkillsToSupabase(window.electronAPI, { maxAttempts: 3 })
        .then((result) => {
          if (result.ok) {
            setSyncState({ status: 'success', at: result.lastSkillSyncAt })
            return
          }
          setSyncState({ status: 'error', error: result.error ?? 'Skill sync failed' })
        })
        .catch((err) => {
          setSyncState({
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
        })
    }
    intervalRef.current = setInterval(sync, 60000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, setSyncState])
}

export function usePresenceSync(
  presenceLabel: string | null,
  isSessionActive: boolean,
  appName: string | null,
  sessionStartTime: number | null,
) {
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

  // Update current activity with optional session start metadata.
  useEffect(() => {
    if (!supabase || !user) return
    const activity = buildPresenceActivity(presenceLabel, isSessionActive, appName, sessionStartTime)
    supabase.from('profiles').update({
      current_activity: activity,
      is_online: true,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).then(() => {})
  }, [user, presenceLabel, isSessionActive, appName, sessionStartTime])
}
