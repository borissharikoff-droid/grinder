/**
 * SkillXPService — computes skill XP from activity segments and persists to DB / localStorage.
 */

import { computeSessionSkillXP, skillLevelFromXP } from '../lib/skills'
import type { SkillXPGain } from '../stores/sessionStore'

interface SegmentForXP {
  category: string
  startTime: number
  endTime: number
}

/** Compute and save skill XP in Electron mode (SQLite). Returns gains list. */
export async function computeAndSaveSkillXPElectron(
  api: NonNullable<Window['electronAPI']>,
  segments: SegmentForXP[],
): Promise<SkillXPGain[]> {
  const gainsMap = computeSessionSkillXP(segments)
  const skillXPGains: SkillXPGain[] = []

  if (!api.db.addSkillXP || !api.db.getSkillXP) return skillXPGains

  for (const [skillId, xp] of Object.entries(gainsMap)) {
    if (xp <= 0) continue
    const before = await api.db.getSkillXP(skillId)
    const levelBefore = skillLevelFromXP(before)
    await api.db.addSkillXP(skillId, xp)
    const after = before + xp
    const levelAfter = skillLevelFromXP(after)
    skillXPGains.push({ skillId, xp, levelBefore, levelAfter })
    // Log to skill_xp_log for trends
    if (api.db.addSkillXPLog) {
      api.db.addSkillXPLog(skillId, xp).catch(() => {})
    }
  }

  return skillXPGains
}

/** Compute and save skill XP in Browser mode (localStorage). Returns gains list. */
export function computeAndSaveSkillXPBrowser(
  sessionStartTime: number,
  endTime: number,
): SkillXPGain[] {
  const segs: SegmentForXP[] = [{ category: 'browsing', startTime: sessionStartTime, endTime }]
  const gainsMap = computeSessionSkillXP(segs)
  const stored = JSON.parse(localStorage.getItem('grinder_skill_xp') || '{}') as Record<string, number>
  const gains: SkillXPGain[] = []

  for (const [skillId, xp] of Object.entries(gainsMap)) {
    if (xp <= 0) continue
    const before = stored[skillId] ?? 0
    const levelBefore = skillLevelFromXP(before)
    stored[skillId] = before + xp
    gains.push({ skillId, xp, levelBefore, levelAfter: skillLevelFromXP(stored[skillId]) })
  }

  localStorage.setItem('grinder_skill_xp', JSON.stringify(stored))
  return gains
}
