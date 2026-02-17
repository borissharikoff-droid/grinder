import { describe, it, expect } from 'vitest'
import { buildFocusTickEvent, buildSessionCompleteEvent, computeSkillXpForCategories } from '../renderer/lib/progressionContract'

describe('progressionContract', () => {
  it('splits 1s skill XP across simultaneous categories', () => {
    const delta = computeSkillXpForCategories(['coding', 'music'], 1)
    const total = Object.values(delta).reduce((sum, v) => sum + v, 0)
    expect(total).toBeLessThanOrEqual(1)
  })

  it('focus tick carries a reason code and deltas', () => {
    const event = buildFocusTickEvent(['coding'], 60)
    expect(event.reasonCode).toBe('focus_tick')
    expect(event.globalXpDelta).toBe(0)
    expect(event.skillXpDelta.developer).toBeGreaterThan(0)
  })

  it('session complete keeps skill deltas in skill-only mode', () => {
    const base = buildSessionCompleteEvent(['coding'], 600, 0)
    const boosted = buildSessionCompleteEvent(['coding'], 600, 14)
    expect(boosted.multiplierApplied).toBe(1.4)
    expect(boosted.globalXpDelta).toBe(0)
    expect(boosted.skillXpDelta.developer).toBeGreaterThan(0)
    expect(base.skillXpDelta.developer).toBeGreaterThan(0)
  })
})
