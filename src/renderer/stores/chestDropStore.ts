import { create } from 'zustand'
import type { ChestType } from '../lib/loot'

export interface ChestDropPopupItem {
  id: string
  rewardId: string
  chestType: ChestType
  createdAt: number
}

interface ChestDropStore {
  queue: ChestDropPopupItem[]
  enqueue: (rewardId: string, chestType: ChestType) => void
  shift: () => void
  clearByRewardId: (rewardId: string) => void
}

export const useChestDropStore = create<ChestDropStore>((set) => ({
  queue: [],
  enqueue(rewardId, chestType) {
    set((state) => ({
      queue: [
        ...state.queue,
        { id: crypto.randomUUID(), rewardId, chestType, createdAt: Date.now() },
      ],
    }))
  },
  shift() {
    set((state) => ({ queue: state.queue.slice(1) }))
  },
  clearByRewardId(rewardId) {
    set((state) => ({ queue: state.queue.filter((item) => item.rewardId !== rewardId) }))
  },
}))
