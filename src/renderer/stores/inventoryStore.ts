import { create } from 'zustand'
import {
  CHEST_DEFS,
  LOOT_ITEMS,
  estimateLootDropRate,
  getEquippedPerkRuntime,
  nextPityAfterChestRoll,
  openChest,
  rollChestDrop,
  type ChestType,
  type LootDropContext,
  type LootRollPity,
  type LootSlot,
} from '../lib/loot'

export interface PendingReward {
  id: string
  createdAt: number
  source: LootDropContext['source']
  chestType: ChestType
  estimatedDropRate: number
  claimed: boolean
}

interface ChestCounts {
  common_chest: number
  rare_chest: number
  epic_chest: number
}

interface InventoryState {
  items: Record<string, number>
  chests: ChestCounts
  equippedBySlot: Partial<Record<LootSlot, string>>
  pendingRewards: PendingReward[]
  pity: LootRollPity
  lastSkillDropAt: number
  hydrate: () => void
  addChest: (chestType: ChestType, source: LootDropContext['source'], estimatedDropRate?: number) => void
  claimPendingReward: (rewardId: string) => void
  deletePendingReward: (rewardId: string) => void
  claimAllPendingRewards: () => void
  rollSkillGrindDrop: (context: LootDropContext, elapsedSeconds: number) => PendingReward | null
  openChestAndGrantItem: (chestType: ChestType, context: LootDropContext) => { itemId: string; estimatedDropRate: number } | null
  deleteChest: (chestType: ChestType, amount?: number) => void
  equipItem: (itemId: string) => void
  deleteItem: (itemId: string, amount?: number) => void
  unequipSlot: (slot: LootSlot) => void
  grantItemForTesting: (itemId: string, quantity?: number) => void
  grantChestForTesting: (chestType: ChestType, quantity?: number) => void
}

const STORAGE_KEY = 'idly_inventory_state_v1'
const SKILL_DROP_COOLDOWN_MS = 90_000
const BASE_DROP_PER_MINUTE = 0.045
const FORCE_DROP_EVERY_COOLDOWN_FOR_TESTS = false

const initialState: Omit<InventoryState, 'hydrate' | 'addChest' | 'claimPendingReward' | 'claimAllPendingRewards' | 'rollSkillGrindDrop' | 'openChestAndGrantItem' | 'equipItem' | 'unequipSlot'> = {
  items: {},
  chests: {
    common_chest: 0,
    rare_chest: 0,
    epic_chest: 0,
  },
  equippedBySlot: {},
  pendingRewards: [],
  pity: {
    rollsSinceRareChest: 0,
    rollsSinceEpicChest: 0,
  },
  lastSkillDropAt: 0,
}

function saveSnapshot(state: InventoryState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: state.items,
        chests: state.chests,
        equippedBySlot: state.equippedBySlot,
        pendingRewards: state.pendingRewards,
        pity: state.pity,
        lastSkillDropAt: state.lastSkillDropAt,
      }),
    )
  } catch {
    // ignore storage failures
  }
}

function readSnapshot(): Partial<typeof initialState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<typeof initialState>
  } catch {
    return null
  }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ...initialState,

  hydrate() {
    const snapshot = readSnapshot()
    if (!snapshot) return
    set((state) => ({
      ...state,
      items: snapshot.items ?? state.items,
      chests: snapshot.chests ?? state.chests,
      equippedBySlot: snapshot.equippedBySlot ?? state.equippedBySlot,
      pendingRewards: snapshot.pendingRewards ?? state.pendingRewards,
      pity: snapshot.pity ?? state.pity,
      lastSkillDropAt: snapshot.lastSkillDropAt ?? state.lastSkillDropAt,
    }))
  },

  addChest(chestType, source, estimatedDropRate = 0) {
    set((state) => {
      const next: InventoryState = {
        ...state,
        pendingRewards: [
          ...state.pendingRewards,
          {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            source,
            chestType,
            estimatedDropRate,
            claimed: false,
          },
        ],
      }
      saveSnapshot(next)
      return next
    })
  },

  claimPendingReward(rewardId) {
    set((state) => {
      const reward = state.pendingRewards.find((r) => r.id === rewardId && !r.claimed)
      if (!reward) return state
      const nextChests = { ...state.chests, [reward.chestType]: (state.chests[reward.chestType] ?? 0) + 1 }
      const nextRewards = state.pendingRewards.map((r) => (r.id === rewardId ? { ...r, claimed: true } : r))
      const next: InventoryState = {
        ...state,
        chests: nextChests,
        pendingRewards: nextRewards,
      }
      saveSnapshot(next)
      return next
    })
  },

  deletePendingReward(rewardId) {
    set((state) => {
      const next: InventoryState = {
        ...state,
        pendingRewards: state.pendingRewards.filter((reward) => reward.id !== rewardId),
      }
      saveSnapshot(next)
      return next
    })
  },

  claimAllPendingRewards() {
    set((state) => {
      const nextChests = { ...state.chests }
      const nextRewards = state.pendingRewards.map((reward) => {
        if (!reward.claimed) nextChests[reward.chestType] += 1
        return reward.claimed ? reward : { ...reward, claimed: true }
      })
      const next: InventoryState = {
        ...state,
        chests: nextChests,
        pendingRewards: nextRewards,
      }
      saveSnapshot(next)
      return next
    })
  },

  rollSkillGrindDrop(context, elapsedSeconds) {
    const now = Date.now()
    const state = get()
    const lastDropAt = state.lastSkillDropAt > now ? 0 : state.lastSkillDropAt
    if (now - lastDropAt < SKILL_DROP_COOLDOWN_MS) return null
    if (elapsedSeconds <= 0) return null
    if (!FORCE_DROP_EVERY_COOLDOWN_FOR_TESTS) {
      const perk = getEquippedPerkRuntime(state.equippedBySlot)
      const categoryBonus = context.focusCategory ? (perk.chestDropChanceBonusByCategory[context.focusCategory] ?? 0) : 0
      const effectivePerMinute = BASE_DROP_PER_MINUTE * (1 + categoryBonus)
      const perSecond = effectivePerMinute / 60
      // Use the larger window between tick duration and cooldown wait, so chance remains fair after cooldown gates.
      const elapsedForChance = Math.max(elapsedSeconds, Math.floor((now - lastDropAt) / 1000))
      const chance = 1 - Math.pow(1 - perSecond, Math.max(1, elapsedForChance))
      if (Math.random() > chance) return null
    }

    const chestRoll = rollChestDrop(context, state.pity)
    const reward: PendingReward = {
      id: crypto.randomUUID(),
      createdAt: now,
      source: context.source,
      chestType: chestRoll.chestType,
      estimatedDropRate: chestRoll.estimatedDropRate,
      claimed: false,
    }
    const nextState: InventoryState = {
      ...state,
      pity: nextPityAfterChestRoll(chestRoll.chestType, state.pity),
      pendingRewards: [...state.pendingRewards, reward],
      lastSkillDropAt: now,
    }
    set(nextState)
    saveSnapshot(nextState)
    return reward
  },

  openChestAndGrantItem(chestType, context) {
    const state = get()
    if ((state.chests[chestType] ?? 0) <= 0) return null
    const result = openChest(chestType, context)
    if (!result) return null
    const nextChests = { ...state.chests, [chestType]: Math.max(0, state.chests[chestType] - 1) }
    const nextItems = { ...state.items, [result.item.id]: (state.items[result.item.id] ?? 0) + 1 }
    const nextState: InventoryState = {
      ...state,
      chests: nextChests,
      items: nextItems,
    }
    set(nextState)
    saveSnapshot(nextState)
    return { itemId: result.item.id, estimatedDropRate: estimateLootDropRate(result.item.id, context) }
  },

  deleteChest(chestType, amount = 1) {
    const qty = Math.max(1, Math.floor(amount))
    set((state) => {
      const next: InventoryState = {
        ...state,
        chests: {
          ...state.chests,
          [chestType]: Math.max(0, (state.chests[chestType] ?? 0) - qty),
        },
      }
      saveSnapshot(next)
      return next
    })
  },

  equipItem(itemId) {
    const state = get()
    const qty = state.items[itemId] ?? 0
    if (qty <= 0) return
    const item = LOOT_ITEMS.find((x) => x.id === itemId)
    if (!item) return
    set((prev) => {
      const next: InventoryState = {
        ...prev,
        equippedBySlot: { ...prev.equippedBySlot, [item.slot]: item.id },
      }
      saveSnapshot(next)
      return next
    })
  },

  deleteItem(itemId, amount = 1) {
    const qty = Math.max(1, Math.floor(amount))
    set((state) => {
      const current = state.items[itemId] ?? 0
      if (current <= 0) return state
      const nextItems = { ...state.items, [itemId]: Math.max(0, current - qty) }
      if (nextItems[itemId] === 0) delete nextItems[itemId]
      const nextEquipped = { ...state.equippedBySlot }
      for (const [slot, equippedId] of Object.entries(nextEquipped) as Array<[LootSlot, string]>) {
        if (equippedId === itemId && !nextItems[itemId]) {
          delete nextEquipped[slot]
        }
      }
      const next: InventoryState = {
        ...state,
        items: nextItems,
        equippedBySlot: nextEquipped,
      }
      saveSnapshot(next)
      return next
    })
  },

  unequipSlot(slot) {
    set((state) => {
      const nextEquipped = { ...state.equippedBySlot }
      delete nextEquipped[slot]
      const next: InventoryState = {
        ...state,
        equippedBySlot: nextEquipped,
      }
      saveSnapshot(next)
      return next
    })
  },

  grantItemForTesting(itemId, quantity = 1) {
    const safeQty = Math.max(1, Math.floor(quantity))
    set((state) => {
      const next: InventoryState = {
        ...state,
        items: {
          ...state.items,
          [itemId]: (state.items[itemId] ?? 0) + safeQty,
        },
      }
      saveSnapshot(next)
      return next
    })
  },

  grantChestForTesting(chestType, quantity = 1) {
    const safeQty = Math.max(1, Math.floor(quantity))
    set((state) => {
      const next: InventoryState = {
        ...state,
        chests: {
          ...state.chests,
          [chestType]: (state.chests[chestType] ?? 0) + safeQty,
        },
      }
      saveSnapshot(next)
      return next
    })
  },
}))

// The store uses lazy hydrate so callers can control when localStorage is read.
export function ensureInventoryHydrated(): void {
  useInventoryStore.getState().hydrate()
}
