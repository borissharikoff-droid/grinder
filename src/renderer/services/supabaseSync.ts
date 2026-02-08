/**
 * SupabaseSync — syncs session and skill data to Supabase using the singleton client.
 */

import { supabase } from '../lib/supabase'
import { skillLevelFromXP } from '../lib/skills'

/** Sync skill XP data to Supabase user_skills table. */
export async function syncSkillsToSupabase(
  api: NonNullable<Window['electronAPI']>,
): Promise<void> {
  if (!supabase) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const allRows = (await api.db.getAllSkillXP()) as { skill_id: string; total_xp: number }[]
    for (const row of allRows) {
      const level = skillLevelFromXP(row.total_xp)
      await supabase.from('user_skills').upsert({
        user_id: user.id,
        skill_id: row.skill_id,
        level,
        total_xp: row.total_xp,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,skill_id' })
    }
  } catch (err) {
    console.warn('[supabaseSync] Failed to sync skills:', err)
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
