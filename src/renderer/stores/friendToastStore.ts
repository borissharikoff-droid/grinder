import { create } from 'zustand'

export type FriendToastType = 'online' | 'leveling'

export interface FriendToast {
  id: string
  type: FriendToastType
  friendName: string
  /** For leveling: skill name e.g. "Developer" */
  skillName?: string
  createdAt: number
}

const TOAST_TTL_MS = 4500
const MAX_TOASTS = 3

interface FriendToastStore {
  toasts: FriendToast[]
  push: (payload: { type: FriendToastType; friendName: string; skillName?: string }) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

export const useFriendToastStore = create<FriendToastStore>((set, get) => ({
  toasts: [],

  push(payload) {
    const id = crypto.randomUUID()
    const toast: FriendToast = {
      id,
      ...payload,
      createdAt: Date.now(),
    }
    set((s) => ({
      toasts: [...s.toasts, toast].slice(-MAX_TOASTS),
    }))
    setTimeout(() => {
      get().dismiss(id)
    }, TOAST_TTL_MS)
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  dismissAll() {
    set({ toasts: [] })
  },
}))
