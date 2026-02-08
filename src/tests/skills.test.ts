import { describe, it, expect } from 'vitest'
import {
  skillLevelFromXP,
  skillXPProgress,
  skillHoursFromXP,
  computeSessionSkillXP,
  categoryToSkillId,
  getSkillById,
  SKILLS,
} from '../renderer/lib/skills'

describe('skillLevelFromXP', () => {
  it('returns 1 for 0 XP', () => {
    expect(skillLevelFromXP(0)).toBe(1)
  })

  it('returns 1 for negative XP', () => {
    expect(skillLevelFromXP(-100)).toBe(1)
  })

  it('returns 99 for max XP (3600000)', () => {
    expect(skillLevelFromXP(3600000)).toBe(99)
  })

  it('returns 99 for beyond max XP', () => {
    expect(skillLevelFromXP(10000000)).toBe(99)
  })

  it('increases monotonically with XP', () => {
    let prevLevel = 0
    for (let xp = 0; xp <= 3600000; xp += 36000) {
      const level = skillLevelFromXP(xp)
      expect(level).toBeGreaterThanOrEqual(prevLevel)
      prevLevel = level
    }
  })
})

describe('skillXPProgress', () => {
  it('returns {current: 0, needed: >0} for 0 XP', () => {
    const { current, needed } = skillXPProgress(0)
    expect(current).toBe(0)
    expect(needed).toBeGreaterThan(0)
  })

  it('current is always less than needed', () => {
    for (const xp of [0, 100, 1000, 50000, 1000000]) {
      const { current, needed } = skillXPProgress(xp)
      expect(current).toBeLessThan(needed)
    }
  })
})

describe('skillHoursFromXP', () => {
  it('returns 0 for 0 XP', () => {
    expect(skillHoursFromXP(0)).toBe(0)
  })

  it('returns ~1 for 3600 XP (1 hour of seconds)', () => {
    expect(skillHoursFromXP(3600)).toBeCloseTo(1, 0)
  })

  it('returns ~1000 for 3600000 XP', () => {
    expect(skillHoursFromXP(3600000)).toBeCloseTo(1000, 0)
  })
})

describe('categoryToSkillId', () => {
  it('maps coding to developer', () => {
    expect(categoryToSkillId('coding')).toBe('developer')
  })

  it('maps design to designer', () => {
    expect(categoryToSkillId('design')).toBe('designer')
  })

  it('maps games to gamer', () => {
    expect(categoryToSkillId('games')).toBe('gamer')
  })

  it('maps unknown to researcher (fallback)', () => {
    expect(categoryToSkillId('unknown_category')).toBe('researcher')
  })

  it('maps other to researcher', () => {
    expect(categoryToSkillId('other')).toBe('researcher')
  })
})

describe('getSkillById', () => {
  it('returns developer for id developer', () => {
    const skill = getSkillById('developer')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('Developer')
    expect(skill!.category).toBe('coding')
  })

  it('returns undefined for invalid id', () => {
    expect(getSkillById('nonexistent')).toBeUndefined()
  })

  it('all SKILLS have unique ids', () => {
    const ids = SKILLS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('computeSessionSkillXP', () => {
  it('returns XP by skill for single coding segment', () => {
    const now = Date.now()
    const result = computeSessionSkillXP([
      { category: 'coding', startTime: now, endTime: now + 60000 }, // 60 seconds
    ])
    expect(result.developer).toBe(60)
  })

  it('returns XP for multiple categories', () => {
    const now = Date.now()
    const result = computeSessionSkillXP([
      { category: 'coding', startTime: now, endTime: now + 30000 },
      { category: 'design', startTime: now + 30000, endTime: now + 60000 },
    ])
    expect(result.developer).toBe(30)
    expect(result.designer).toBe(30)
  })

  it('returns empty object for empty activities', () => {
    const result = computeSessionSkillXP([])
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('ignores segments with 0 or negative duration', () => {
    const now = Date.now()
    const result = computeSessionSkillXP([
      { category: 'coding', startTime: now, endTime: now }, // 0 duration
    ])
    expect(result.developer ?? 0).toBe(0)
  })
})
