/**
 * AchievementService — checks for new achievements after a session,
 * unlocks cosmetics, and computes XP with streak multiplier.
 */

import { computeSessionXP, checkNewAchievements, checkSkillAchievements, getStreakMultiplier, type AchievementDef } from '../lib/xp'
import { skillLevelFromXP } from '../lib/skills'
import { unlockCosmeticsFromAchievement } from '../lib/cosmetics'

export interface AchievementResult {
  totalXP: number
  streakMultiplier: number
  sessionXPEarned: number
  newAchievements: { id: string; def: AchievementDef }[]
}

/**
 * Check achievements, compute XP with streak multiplier, unlock cosmetics.
 * Returns the result with updated XP and new achievements.
 */
export async function processAchievementsElectron(
  api: NonNullable<Window['electronAPI']>,
  sessionId: string,
): Promise<AchievementResult | null> {
  const [sessionRow, activitiesRows, streak, userStats, unlocked] = await Promise.all([
    api.db.getSessionById(sessionId),
    api.db.getActivitiesBySessionId(sessionId),
    api.db.getStreak(),
    api.db.getUserStats(),
    api.db.getUnlockedAchievements(),
  ])

  const session = sessionRow as { duration_seconds: number; start_time: number } | null
  const acts = (activitiesRows || []) as { category: string | null; start_time: number; end_time: number }[]

  if (!session || !api.db.getLocalStat || !api.db.setLocalStat || !api.db.unlockAchievement) {
    return null
  }

  // Compute XP with streak multiplier
  const saved = await api.db.getLocalStat('total_xp')
  let totalXP = parseInt(saved || '0', 10) || 0
  const baseXP = computeSessionXP(session.duration_seconds, acts)
  const streakMult = getStreakMultiplier(streak)
  const sessionXP = Math.round(baseXP * streakMult)
  totalXP += sessionXP

  // Check session-based achievements
  const newAchievementList = checkNewAchievements(session, acts, streak, userStats.totalSessions, unlocked)
  for (const { id, def } of newAchievementList) {
    api.db.unlockAchievement(id)
    totalXP += def.xpReward
    unlockCosmeticsFromAchievement(id)
  }

  // Check skill-based achievements
  const updatedUnlocked = [...unlocked, ...newAchievementList.map(({ id }) => id)]
  if (api.db.getAllSkillXP) {
    const allRows = (await api.db.getAllSkillXP()) as { skill_id: string; total_xp: number }[]
    const skillLevels: Record<string, number> = {}
    for (const row of allRows) {
      skillLevels[row.skill_id] = skillLevelFromXP(row.total_xp)
    }
    const skillAch = checkSkillAchievements(skillLevels, updatedUnlocked)
    for (const { id, def } of skillAch) {
      api.db.unlockAchievement(id)
      totalXP += def.xpReward
      unlockCosmeticsFromAchievement(id)
    }
    newAchievementList.push(...skillAch)
  }

  // Persist total XP
  api.db.setLocalStat('total_xp', String(totalXP))

  return {
    totalXP,
    streakMultiplier: streakMult,
    sessionXPEarned: sessionXP,
    newAchievements: newAchievementList,
  }
}
