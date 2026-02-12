import { create } from 'zustand'

export interface MessageToast {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  preview: string
  timestamp: number
}

const TOAST_TTL_MS = 3000
const MAX_QUEUE = 5

interface MessageToastStore {
  queue: MessageToast[]
  current: MessageToast | null
  push: (payload: Omit<MessageToast, 'id' | 'timestamp'>) => void
  dismiss: () => void
}

export const useMessageToastStore = create<MessageToastStore>((set, get) => ({
  queue: [],
  current: null,

  push(payload) {
    const toast: MessageToast = {
      ...payload,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    const state = get()
    if (!state.current) {
      // Show immediately
      set({ current: toast })
      setTimeout(() => get().dismiss(), TOAST_TTL_MS)
    } else {
      // Queue it (max 5)
      set((s) => ({ queue: [...s.queue, toast].slice(-MAX_QUEUE) }))
    }
  },

  dismiss() {
    const state = get()
    const next = state.queue[0] || null
    if (next) {
      set({ current: next, queue: state.queue.slice(1) })
      setTimeout(() => get().dismiss(), TOAST_TTL_MS)
    } else {
      set({ current: null })
    }
  },
}))
