import { beforeEach, describe, expect, it } from 'vitest'
import { routeNotification } from '../renderer/services/notificationRouter'
import { useNotificationStore } from '../renderer/stores/notificationStore'

describe('notificationRouter', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear()
  })

  it('pushes progression events to in-app notifications', async () => {
    const ok = await routeNotification({
      type: 'progression_achievement',
      icon: '🏅',
      title: 'Achievement unlocked',
      body: 'Test achievement',
      dedupeKey: 'test:achievement',
    }, null)
    expect(ok).toBe(true)
    expect(useNotificationStore.getState().items.length).toBe(1)
    expect(useNotificationStore.getState().items[0].type).toBe('progression')
  })

  it('dedupes repeated events inside cooldown', async () => {
    await routeNotification({
      type: 'progression_info',
      icon: '🔔',
      title: 'Info',
      body: 'Body',
      dedupeKey: 'test:dedupe',
    }, null)
    const second = await routeNotification({
      type: 'progression_info',
      icon: '🔔',
      title: 'Info',
      body: 'Body',
      dedupeKey: 'test:dedupe',
    }, null)
    expect(second).toBe(false)
    expect(useNotificationStore.getState().items.length).toBe(1)
  })
})
