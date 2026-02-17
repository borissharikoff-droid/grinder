export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type LootSlot = 'head' | 'top' | 'accessory' | 'aura'
export type LootSource = 'skill_grind' | 'achievement_claim' | 'goal_complete' | 'daily_activity' | 'session_complete'
export type LootPerkType = 'cosmetic' | 'xp_skill_boost' | 'chest_drop_boost' | 'status_title'
export type ChestType = 'common_chest' | 'rare_chest' | 'epic_chest'

export interface LootItemDef {
  id: string
  name: string
  slot: LootSlot
  rarity: LootRarity
  icon: string
  image?: string
  renderScale?: number
  description: string
  perkType: LootPerkType
  perkValue: number | string
  perkDescription: string
}

export interface LootPerkRuntime {
  skillXpMultiplierBySkill: Record<string, number>
  chestDropChanceBonusByCategory: Record<string, number>
  statusTitle: string | null
}

export interface ChestDef {
  id: ChestType
  name: string
  icon: string
  image?: string
  rarity: LootRarity
  itemWeights: Array<{ itemId: string; weight: number }>
}

export interface LootDropContext {
  source: LootSource
  focusCategory?: string | null
}

export interface LootRollPity {
  rollsSinceRareChest: number
  rollsSinceEpicChest: number
}

export interface ChestRollResult {
  chestType: ChestType
  estimatedDropRate: number
}

export interface ChestOpenResult {
  item: LootItemDef
  estimatedDropRate: number
}

export const LOOT_ITEMS: LootItemDef[] = [
  {
    id: 'focus_cap',
    name: 'Focus Cap',
    slot: 'head',
    rarity: 'common',
    icon: '🧢',
    image: 'loot/focus_cap_bw_user.png',
    description: 'Starter cap that marks consistent focus.',
    perkType: 'cosmetic',
    perkValue: 0,
    perkDescription: 'Cosmetic only.',
  },
  {
    id: 'grind_hoodie',
    name: 'Grind Hoodie',
    slot: 'top',
    rarity: 'rare',
    icon: '👕',
    image: 'loot/grind_hoodie_bw_user.png',
    description: 'Daily uniform for coding sessions.',
    perkType: 'xp_skill_boost',
    perkValue: 0.05,
    perkDescription: '+5% XP to Developer skill.',
  },
  {
    id: 'geek_glasses',
    name: 'Geek Glasses',
    slot: 'accessory',
    rarity: 'legendary',
    icon: '🤓',
    image: 'loot/geek_glasses_bw_user.png',
    renderScale: 1.9,
    description: 'Ultra-rare coding trophy.',
    perkType: 'chest_drop_boost',
    perkValue: 0.12,
    perkDescription: '+12% chest drop chance while grinding coding category.',
  },
  {
    id: 'pulse_aura',
    name: 'Pulse Aura',
    slot: 'aura',
    rarity: 'epic',
    icon: '✨',
    image: 'loot/pulse_aura_bw_user.png',
    description: 'Visible social aura around your profile.',
    perkType: 'status_title',
    perkValue: 'Pulse Wielder',
    perkDescription: 'Sets social status title.',
  },
  {
    id: 'focus_hat',
    name: 'Focus Hat',
    slot: 'head',
    rarity: 'rare',
    icon: '🎩',
    image: 'loot/focus_hat_bw_user.png',
    description: 'Tight visor for deep concentration.',
    perkType: 'xp_skill_boost',
    perkValue: 0.04,
    perkDescription: '+4% XP to Developer skill.',
  },
  {
    id: 'speed_shorts',
    name: 'Speed Shorts',
    slot: 'accessory',
    rarity: 'rare',
    icon: '🩳',
    image: 'loot/speed_shorts_bw_user.png',
    description: 'Lightweight shorts for relentless sprints.',
    perkType: 'chest_drop_boost',
    perkValue: 0.08,
    perkDescription: '+8% chest drop chance while grinding coding category.',
  },
  {
    id: 'aegis_aura',
    name: 'Aegis Aura',
    slot: 'aura',
    rarity: 'epic',
    icon: '🛡️',
    image: 'loot/aegis_aura_bw_user.png',
    description: 'A protective field that signals resilience.',
    perkType: 'status_title',
    perkValue: 'Aegis Guard',
    perkDescription: 'Sets social status title.',
  },
]

export const CHEST_DEFS: Record<ChestType, ChestDef> = {
  common_chest: {
    id: 'common_chest',
    name: 'Common Chest',
    icon: '📦',
    image: 'loot/chest_t1_user.png',
    rarity: 'common',
    itemWeights: [
      { itemId: 'focus_cap', weight: 70 },
      { itemId: 'grind_hoodie', weight: 20 },
      { itemId: 'pulse_aura', weight: 9 },
      { itemId: 'geek_glasses', weight: 1 },
      { itemId: 'focus_hat', weight: 18 },
      { itemId: 'speed_shorts', weight: 14 },
      { itemId: 'aegis_aura', weight: 5 },
    ],
  },
  rare_chest: {
    id: 'rare_chest',
    name: 'Rare Chest',
    icon: '🎁',
    image: 'loot/chest_t2_user.png',
    rarity: 'rare',
    itemWeights: [
      { itemId: 'focus_cap', weight: 25 },
      { itemId: 'grind_hoodie', weight: 45 },
      { itemId: 'pulse_aura', weight: 24 },
      { itemId: 'geek_glasses', weight: 6 },
      { itemId: 'focus_hat', weight: 32 },
      { itemId: 'speed_shorts', weight: 28 },
      { itemId: 'aegis_aura', weight: 14 },
    ],
  },
  epic_chest: {
    id: 'epic_chest',
    name: 'Epic Chest',
    icon: '🪙',
    image: 'loot/chest_bw_test.png',
    rarity: 'epic',
    itemWeights: [
      { itemId: 'focus_cap', weight: 10 },
      { itemId: 'grind_hoodie', weight: 25 },
      { itemId: 'pulse_aura', weight: 45 },
      { itemId: 'geek_glasses', weight: 20 },
      { itemId: 'focus_hat', weight: 18 },
      { itemId: 'speed_shorts', weight: 24 },
      { itemId: 'aegis_aura', weight: 34 },
    ],
  },
}

function randomPickByWeight<T>(entries: Array<{ value: T; weight: number }>): T | null {
  const safe = entries.filter((e) => e.weight > 0)
  const total = safe.reduce((sum, e) => sum + e.weight, 0)
  if (total <= 0 || safe.length === 0) return null
  let roll = Math.random() * total
  for (const e of safe) {
    roll -= e.weight
    if (roll <= 0) return e.value
  }
  return safe[safe.length - 1].value
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalizeRates(common: number, rare: number, epic: number): Record<ChestType, number> {
  const sum = common + rare + epic
  if (sum <= 0) return { common_chest: 0.86, rare_chest: 0.12, epic_chest: 0.02 }
  return {
    common_chest: clampRate(common / sum),
    rare_chest: clampRate(rare / sum),
    epic_chest: clampRate(epic / sum),
  }
}

function chestRatesForContext(context: LootDropContext): Record<ChestType, number> {
  let common = 0.86
  let rare = 0.12
  let epic = 0.02
  if (context.source === 'daily_activity') {
    common -= 0.2
    rare += 0.14
    epic += 0.06
  } else if (context.source === 'goal_complete') {
    common -= 0.08
    rare += 0.06
    epic += 0.02
  } else if (context.source === 'skill_grind' && context.focusCategory === 'coding') {
    common -= 0.03
    rare += 0.02
    epic += 0.01
  }
  return normalizeRates(common, rare, epic)
}

export function estimateChestDropRate(chestType: ChestType, context: LootDropContext): number {
  return Number((chestRatesForContext(context)[chestType] * 100).toFixed(2))
}

export function estimateLootDropRate(itemId: string, context: LootDropContext): number {
  const item = LOOT_ITEMS.find((x) => x.id === itemId)
  if (!item) return 0
  // Approximation: expected chance from weighted mix over all chest types.
  const rates = chestRatesForContext(context)
  let total = 0
  for (const chest of Object.values(CHEST_DEFS)) {
    const entry = chest.itemWeights.find((x) => x.itemId === item.id)
    const weightSum = chest.itemWeights.reduce((sum, x) => sum + x.weight, 0)
    if (!entry || weightSum <= 0) continue
    const withinChest = entry.weight / weightSum
    total += rates[chest.id] * withinChest
  }
  return Number((total * 100).toFixed(2))
}

export function rollChestDrop(
  context: LootDropContext,
  pity: LootRollPity,
): ChestRollResult {
  if (pity.rollsSinceEpicChest >= 18) {
    return { chestType: 'epic_chest', estimatedDropRate: 100 }
  }
  const rates = chestRatesForContext(context)
  let chestType = randomPickByWeight<ChestType>([
    { value: 'common_chest', weight: rates.common_chest },
    { value: 'rare_chest', weight: rates.rare_chest },
    { value: 'epic_chest', weight: rates.epic_chest },
  ]) ?? 'common_chest'
  if (pity.rollsSinceRareChest >= 7 && chestType === 'common_chest') {
    chestType = 'rare_chest'
  }
  return {
    chestType,
    estimatedDropRate: Number((rates[chestType] * 100).toFixed(2)),
  }
}

export function nextPityAfterChestRoll(chestType: ChestType, pity: LootRollPity): LootRollPity {
  return {
    rollsSinceRareChest: chestType === 'common_chest' ? pity.rollsSinceRareChest + 1 : 0,
    rollsSinceEpicChest: chestType === 'epic_chest' ? 0 : pity.rollsSinceEpicChest + 1,
  }
}

export function openChest(chestType: ChestType, context: LootDropContext): ChestOpenResult | null {
  const chest = CHEST_DEFS[chestType]
  const itemId = randomPickByWeight(chest.itemWeights.map((entry) => ({ value: entry.itemId, weight: entry.weight })))
  const item = LOOT_ITEMS.find((x) => x.id === itemId)
  if (!item) return null
  return {
    item,
    estimatedDropRate: estimateLootDropRate(item.id, context),
  }
}

export function getEquippedPerkRuntime(equippedBySlot: Partial<Record<LootSlot, string>>): LootPerkRuntime {
  const out: LootPerkRuntime = {
    skillXpMultiplierBySkill: {},
    chestDropChanceBonusByCategory: {},
    statusTitle: null,
  }

  const equippedItems = Object.values(equippedBySlot)
    .map((id) => LOOT_ITEMS.find((x) => x.id === id))
    .filter((item): item is LootItemDef => Boolean(item))

  for (const item of equippedItems) {
    if (item.perkType === 'xp_skill_boost') {
      out.skillXpMultiplierBySkill.developer = Math.max(
        out.skillXpMultiplierBySkill.developer ?? 1,
        1 + Number(item.perkValue || 0),
      )
    } else if (item.perkType === 'chest_drop_boost') {
      out.chestDropChanceBonusByCategory.coding = Math.max(
        out.chestDropChanceBonusByCategory.coding ?? 0,
        Number(item.perkValue || 0),
      )
    } else if (item.perkType === 'status_title') {
      out.statusTitle = String(item.perkValue || '')
    }
  }

  return out
}
