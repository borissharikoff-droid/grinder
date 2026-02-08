import { create } from 'zustand'
import type { AchievementDef } from '../lib/xp'

export interface AlertItem {
  id: string
  type: 'achievement' | 'social' | 'loot'
  achievement: AchievementDef
  claimed: boolean
}

interface AlertStore {
  queue: AlertItem[]
  currentAlert: AlertItem | null
  push: (achievement: AchievementDef) => void
  showNext: () => void
  claimCurrent: () => void
  dismissCurrent: () => void
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  queue: [],
  currentAlert: null,

  push(achievement) {
    const item: AlertItem = {
      id: crypto.randomUUID(),
      type: achievement.category === 'social' ? 'social' : 'achievement',
      achievement,
      claimed: false,
    }
    const { currentAlert } = get()
    if (!currentAlert) {
      set({ currentAlert: item })
    } else {
      set((s) => ({ queue: [...s.queue, item] }))
    }
  },

  showNext() {
    const { queue } = get()
    if (queue.length > 0) {
      const [next, ...rest] = queue
      set({ currentAlert: next, queue: rest })
    } else {
      set({ currentAlert: null })
    }
  },

  claimCurrent() {
    const { currentAlert } = get()
    if (currentAlert?.achievement.reward) {
      // Save unlocked reward to localStorage
      try {
        const rewards = JSON.parse(localStorage.getItem('grinder_rewards') || '[]') as string[]
        const key = `${currentAlert.achievement.reward.type}:${currentAlert.achievement.reward.value}`
        if (!rewards.includes(key)) {
          rewards.push(key)
          localStorage.setItem('grinder_rewards', JSON.stringify(rewards))
        }
        // If avatar reward, add to unlocked avatars
        if (currentAlert.achievement.reward.type === 'avatar') {
          const avatars = JSON.parse(localStorage.getItem('grinder_unlocked_avatars') || '[]') as string[]
          if (!avatars.includes(currentAlert.achievement.reward.value)) {
            avatars.push(currentAlert.achievement.reward.value)
            localStorage.setItem('grinder_unlocked_avatars', JSON.stringify(avatars))
          }
        }
        if (currentAlert.achievement.reward.type === 'skill_boost') {
          const xp = 1800
          if (window.electronAPI?.db?.addSkillXP) {
            window.electronAPI.db.addSkillXP(currentAlert.achievement.reward.value, xp)
          } else {
            const stored = JSON.parse(localStorage.getItem('grinder_skill_xp') || '{}') as Record<string, number>
            stored[currentAlert.achievement.reward.value] = (stored[currentAlert.achievement.reward.value] ?? 0) + xp
            localStorage.setItem('grinder_skill_xp', JSON.stringify(stored))
          }
        }
        if (currentAlert.achievement.reward.type === 'profile_frame') {
          const frames = JSON.parse(localStorage.getItem('grinder_unlocked_frames') || '[]') as string[]
          if (!frames.includes(currentAlert.achievement.reward.value)) {
            frames.push(currentAlert.achievement.reward.value)
            localStorage.setItem('grinder_unlocked_frames', JSON.stringify(frames))
          }
        }
      } catch { /* ignore */ }
    }
    set((s) => ({
      currentAlert: s.currentAlert ? { ...s.currentAlert, claimed: true } : null,
    }))
  },

  dismissCurrent() {
    get().showNext()
  },
}))
