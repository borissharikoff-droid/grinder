import { describe, expect, it } from 'vitest'
import { getAchievementById } from '../renderer/lib/xp'
import { mapAchievementToRewardPayloads } from '../renderer/services/rewardGrant'
import { SKILL_BOOST_SECONDS } from '../renderer/lib/rewardConfig'

describe('rewardGrant payload mapping', () => {
  it('maps skill achievements to skill xp destination', () => {
    const def = getAchievementById('skill_developer_10')
    expect(def).toBeDefined()
    const payloads = mapAchievementToRewardPayloads(def!)
    expect(payloads.some((p) => p.destination === 'skill')).toBe(true)
  })

  it('maps non-skill achievement xp to skill destination', () => {
    const def = getAchievementById('first_session')
    expect(def).toBeDefined()
    const payloads = mapAchievementToRewardPayloads(def!)
    const xpPayload = payloads.find((p) => p.amount && p.amount > 0)
    expect(xpPayload?.destination).toBe('skill')
    expect(xpPayload?.skillId).toBeTruthy()
  })

  it('uses centralized skill boost amount', () => {
    const def = getAchievementById('skill_developer_10')
    expect(def).toBeDefined()
    const payloads = mapAchievementToRewardPayloads(def!)
    const skillBoost = payloads.find((p) => p.label.includes('+30 min'))
    expect(skillBoost?.amount).toBe(SKILL_BOOST_SECONDS)
  })
})
