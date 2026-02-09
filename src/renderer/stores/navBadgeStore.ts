import { create } from 'zustand'

interface NavBadgeStore {
  /** Incoming friend requests (not yet accepted) */
  incomingRequestsCount: number
  /** Unread DM count */
  unreadMessagesCount: number
  setIncomingRequestsCount: (n: number) => void
  setUnreadMessagesCount: (n: number) => void
  addUnreadMessages: (n: number) => void
  clearUnreadMessages: () => void
}

export const useNavBadgeStore = create<NavBadgeStore>((set) => ({
  incomingRequestsCount: 0,
  unreadMessagesCount: 0,
  setIncomingRequestsCount: (n) => set({ incomingRequestsCount: n }),
  setUnreadMessagesCount: (n) => set({ unreadMessagesCount: n }),
  addUnreadMessages: (n) => set((s) => ({ unreadMessagesCount: s.unreadMessagesCount + n })),
  clearUnreadMessages: () => set({ unreadMessagesCount: 0 }),
}))
