import { create } from 'zustand'

export type SkillSyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SkillSyncStore {
  lastSkillSyncAt: string | null
  lastSkillSyncStatus: SkillSyncStatus
  lastSkillSyncError: string | null
  setSyncState: (next: {
    status: SkillSyncStatus
    at?: string | null
    error?: string | null
  }) => void
}

export const useSkillSyncStore = create<SkillSyncStore>((set) => ({
  lastSkillSyncAt: null,
  lastSkillSyncStatus: 'idle',
  lastSkillSyncError: null,
  setSyncState: ({ status, at, error }) =>
    set((s) => ({
      lastSkillSyncStatus: status,
      lastSkillSyncAt: at ?? s.lastSkillSyncAt,
      lastSkillSyncError: error ?? null,
    })),
}))

