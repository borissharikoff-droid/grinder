import { describe, expect, it } from 'vitest'
import { getAchievementProgress } from '../renderer/lib/xp'

describe('achievement progress resolver', () => {
  it('returns session progress counters', () => {
    const progress = getAchievementProgress('ten_sessions', {
      totalSessions: 7,
      streakCount: 0,
      friendCount: 0,
      skillLevels: {},
    })
    expect(progress).toBeTruthy()
    expect(progress?.current).toBe(7)
    expect(progress?.target).toBe(10)
  })

  it('returns polymath skill threshold progress', () => {
    const progress = getAchievementProgress('polymath', {
      totalSessions: 0,
      streakCount: 0,
      friendCount: 0,
      skillLevels: { developer: 25, designer: 26, gamer: 15, communicator: 27 },
    })
    expect(progress).toBeTruthy()
    expect(progress?.current).toBe(3)
    expect(progress?.target).toBe(3)
    expect(progress?.complete).toBe(true)
  })
})
