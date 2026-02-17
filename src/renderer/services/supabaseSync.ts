/**
 * SupabaseSync — syncs session and skill data to Supabase using the singleton client.
 * user_skills is the source for per-skill breakdown; profiles.level is updated by useProfileSync.
 * Sync runs on session end AND on app load so existing local XP appears in user_skills.
 */

import { supabase } from '../lib/supabase'
import { skillLevelFromXP, SKILLS, normalizeSkillId } from '../lib/skills'

export interface SkillSyncResult {
  ok: boolean
  attempts: number
  syncedSkills: number
  lastSkillSyncAt: string | null
  error?: string
}

export interface AchievementSyncResult {
  ok: boolean
  synced: number
  error?: string
}

export interface SkillXpEventSyncInput {
  skillId: string
  xpDelta: number
  source: string
  happenedAt?: string
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

type SkillPayloadFull = {
  user_id: string
  skill_id: string
  level: number
  total_xp: number
  updated_at: string
}

type SkillPayloadLevelOnly = {
  user_id: string
  skill_id: string
  level: number
  updated_at: string
}

async function manualSyncWithoutConflict(
  userId: string,
  fullPayload: SkillPayloadFull[],
  levelOnlyPayload: SkillPayloadLevelOnly[],
): Promise<void> {
  if (!supabase) return

  const existingRes = await withTimeout(
    supabase
      .from('user_skills')
      .select('id, skill_id')
      .eq('user_id', userId),
    10000,
    'user_skills select existing',
  )
  if (existingRes.error) throw existingRes.error

  const existingBySkill = new Map<string, string>()
  for (const row of existingRes.data || []) {
    const skillId = normalizeSkillId((row as { skill_id: string }).skill_id)
    const id = (row as { id: string }).id
    if (id) existingBySkill.set(skillId, id)
  }

  for (const row of fullPayload) {
    const existingId = existingBySkill.get(row.skill_id)
    if (existingId) {
      const updateRes = await withTimeout(
        supabase
          .from('user_skills')
          .update({
            level: row.level,
            total_xp: row.total_xp,
            updated_at: row.updated_at,
          })
          .eq('id', existingId),
        10000,
        'user_skills update full',
      )
      if (updateRes.error) {
        // Fallback for schemas without total_xp.
        const updateLevelOnlyRes = await withTimeout(
          supabase
            .from('user_skills')
            .update({
              level: row.level,
              updated_at: row.updated_at,
            })
            .eq('id', existingId),
          10000,
          'user_skills update level-only',
        )
        if (updateLevelOnlyRes.error) throw updateLevelOnlyRes.error
      }
      continue
    }

    const insertRes = await withTimeout(
      supabase.from('user_skills').insert(row),
      10000,
      'user_skills insert full',
    )
    if (insertRes.error) {
      const fallbackInsert = levelOnlyPayload.find((x) => x.skill_id === row.skill_id)
      if (!fallbackInsert) throw insertRes.error
      const insertLevelOnlyRes = await withTimeout(
        supabase.from('user_skills').insert(fallbackInsert),
        10000,
        'user_skills insert level-only',
      )
      if (insertLevelOnlyRes.error) throw insertLevelOnlyRes.error
    }
  }
}

/** Sync skill XP data to Supabase user_skills table. */
export async function syncSkillsToSupabase(
  api: NonNullable<Window['electronAPI']>,
  options: { maxAttempts?: number } = {},
): Promise<SkillSyncResult> {
  if (!supabase) {
    return {
      ok: false,
      attempts: 1,
      syncedSkills: 0,
      lastSkillSyncAt: null,
      error: 'Supabase not configured',
    }
  }

  const maxAttempts = Math.max(1, options.maxAttempts ?? 3)
  let attempts = 0
  let lastError = 'Unknown sync failure'

  while (attempts < maxAttempts) {
    attempts += 1
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), 10000, 'auth.getUser')
      if (!user) {
        return {
          ok: false,
          attempts,
          syncedSkills: 0,
          lastSkillSyncAt: null,
          error: 'No authenticated user',
        }
      }

      const allRows = (await api.db.getAllSkillXP()) as { skill_id: string; total_xp: number }[]
      const xpMap = new Map<string, number>()
      for (const row of allRows) {
        const id = normalizeSkillId(row.skill_id)
        xpMap.set(id, (xpMap.get(id) ?? 0) + (row.total_xp ?? 0))
      }

      const syncAt = new Date().toISOString()
      const payload = SKILLS.map((skill) => {
        const total_xp = xpMap.get(skill.id) ?? 0
        const level = skillLevelFromXP(total_xp)
        return {
          user_id: user.id,
          skill_id: skill.id,
          level,
          total_xp,
          updated_at: syncAt,
        }
      })

      const primaryRes = await withTimeout(
        supabase
          .from('user_skills')
          .upsert(payload, { onConflict: 'user_id,skill_id' }),
        10000,
        'user_skills upsert',
      )
      if (primaryRes.error) {
        // Backward-compatible fallback: some deployments may not have total_xp yet.
        const levelOnlyPayload = payload.map(({ user_id, skill_id, level, updated_at }) => ({
          user_id,
          skill_id,
          level,
          updated_at,
        }))
        const fallbackRes = await withTimeout(
          supabase
            .from('user_skills')
            .upsert(levelOnlyPayload, { onConflict: 'user_id,skill_id' }),
          10000,
          'user_skills upsert level-only',
        )
        if (fallbackRes.error) {
          // Last-resort compatibility path for schemas without unique constraint
          // on (user_id, skill_id) or with partial migrations.
          await manualSyncWithoutConflict(user.id, payload, levelOnlyPayload)
        }
      }

      return {
        ok: true,
        attempts,
        syncedSkills: payload.length,
        lastSkillSyncAt: syncAt,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempts < maxAttempts) {
        const backoffMs = 400 * Math.pow(2, attempts - 1)
        await wait(backoffMs)
      }
    }
  }

  console.warn('[supabaseSync] Failed to sync skills:', lastError)
  return {
    ok: false,
    attempts,
    syncedSkills: 0,
    lastSkillSyncAt: null,
    error: lastError,
  }
}

/** Sync a session summary to Supabase session_summaries table. */
export async function syncSessionToSupabase(
  sessionStartTime: number,
  endTime: number,
  elapsedSeconds: number,
): Promise<void> {
  if (!supabase) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('session_summaries').insert({
      user_id: user.id,
      start_time: new Date(sessionStartTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_seconds: elapsedSeconds,
    })
  } catch (err) {
    console.warn('[supabaseSync] Failed to sync session:', err)
  }
}

export async function syncAchievementsToSupabase(achievementIds: string[]): Promise<AchievementSyncResult> {
  if (!supabase || achievementIds.length === 0) return { ok: false, synced: 0, error: 'Supabase not configured or no achievements' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, synced: 0, error: 'No authenticated user' }
    const payload = achievementIds.map((achievementId) => ({
      user_id: user.id,
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
    }))
    const { error } = await supabase
      .from('user_achievements')
      .upsert(payload, { onConflict: 'user_id,achievement_id' })
    if (error) return { ok: false, synced: 0, error: error.message }
    return { ok: true, synced: payload.length }
  } catch (err) {
    return { ok: false, synced: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function syncCosmeticsToSupabase(
  equippedBadges: string[],
  equippedFrame: string | null,
  options: {
    equippedLoot?: Record<string, string>
    statusTitle?: string | null
  } = {},
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No authenticated user' }
    const payload: Record<string, unknown> = {
      equipped_badges: equippedBadges,
      equipped_frame: equippedFrame,
      updated_at: new Date().toISOString(),
    }
    if (options.equippedLoot) payload.equipped_loot = options.equippedLoot
    if (options.statusTitle !== undefined) payload.status_title = options.statusTitle
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    if (error) {
      // Backward compatibility: older schemas may not have equipped_loot/status_title.
      const fallback = await supabase
        .from('profiles')
        .update({
          equipped_badges: equippedBadges,
          equipped_frame: equippedFrame,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (fallback.error) return { ok: false, error: fallback.error.message }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function syncSkillXpEventsToSupabase(
  entries: SkillXpEventSyncInput[],
): Promise<{ ok: boolean; synced: number; error?: string }> {
  if (!supabase) return { ok: false, synced: 0, error: 'Supabase not configured' }
  const valid = entries.filter((entry) => entry.skillId && entry.xpDelta > 0)
  if (valid.length === 0) return { ok: true, synced: 0 }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, synced: 0, error: 'No authenticated user' }

    const payload = valid.map((entry) => ({
      user_id: user.id,
      skill_id: entry.skillId,
      xp_delta: Math.floor(entry.xpDelta),
      source: entry.source,
      happened_at: entry.happenedAt ?? new Date().toISOString(),
      created_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('skill_xp_events').insert(payload)
    if (error) return { ok: false, synced: 0, error: error.message }
    return { ok: true, synced: payload.length }
  } catch (err) {
    return { ok: false, synced: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
