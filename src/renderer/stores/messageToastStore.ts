import { create } from 'zustand'

export interface MessageToast {
  senderId: string
  senderName: string
  senderAvatar: string
  preview: string
}

interface MessageToastStore {
  queue: MessageToast[]
  push: (toast: MessageToast) => void
  shift: () => MessageToast | undefined
}

export const useMessageToastStore = create<MessageToastStore>((set) => ({
  queue: [],
  push: (toast) => set((s) => ({ queue: [...s.queue, toast] })),
  shift: () => {
    let item: MessageToast | undefined
    set((s) => {
      item = s.queue[0]
      return { queue: s.queue.slice(1) }
    })
    return item
  },
}))
