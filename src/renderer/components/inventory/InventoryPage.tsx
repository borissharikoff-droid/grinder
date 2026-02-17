import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHEST_DEFS, LOOT_ITEMS, estimateLootDropRate, type ChestType, type LootSlot } from '../../lib/loot'
import { ensureInventoryHydrated, useInventoryStore } from '../../stores/inventoryStore'
import { ChestOpenModal } from '../animations/ChestOpenModal'
import { PageHeader } from '../shared/PageHeader'
import { playClickSound } from '../../lib/sounds'

const SLOT_META: Record<LootSlot, { label: string; icon: string }> = {
  head: { label: 'Head', icon: '🧢' },
  top: { label: 'Body', icon: '👕' },
  accessory: { label: 'Legs', icon: '🦵' },
  aura: { label: 'Aura', icon: '✨' },
}

const SLOT_LABEL: Record<LootSlot, string> = {
  head: 'Head',
  top: 'Body',
  accessory: 'Legs',
  aura: 'Aura',
}

type InspectRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical'

const RARITY_THEME: Record<InspectRarity, { color: string; border: string; glow: string; panel: string }> = {
  common: {
    color: '#9CA3AF',
    border: 'rgba(156, 163, 175, 0.38)',
    glow: 'rgba(156, 163, 175, 0.22)',
    panel: 'radial-gradient(circle at 50% 14%, rgba(156,163,175,0.16) 0%, rgba(31,41,55,0.92) 62%)',
  },
  rare: {
    color: '#38BDF8',
    border: 'rgba(56, 189, 248, 0.45)',
    glow: 'rgba(56, 189, 248, 0.28)',
    panel: 'radial-gradient(circle at 50% 14%, rgba(56,189,248,0.18) 0%, rgba(31,41,55,0.92) 62%)',
  },
  epic: {
    color: '#C084FC',
    border: 'rgba(192, 132, 252, 0.45)',
    glow: 'rgba(192, 132, 252, 0.28)',
    panel: 'radial-gradient(circle at 50% 14%, rgba(192,132,252,0.2) 0%, rgba(31,41,55,0.92) 62%)',
  },
  legendary: {
    color: '#FACC15',
    border: 'rgba(250, 204, 21, 0.48)',
    glow: 'rgba(250, 204, 21, 0.3)',
    panel: 'radial-gradient(circle at 50% 14%, rgba(250,204,21,0.2) 0%, rgba(31,41,55,0.92) 62%)',
  },
  mythical: {
    color: '#A855F7',
    border: 'rgba(168, 85, 247, 0.5)',
    glow: 'rgba(168, 85, 247, 0.34)',
    panel: 'radial-gradient(circle at 50% 14%, rgba(168,85,247,0.24) 0%, rgba(31,41,55,0.92) 62%)',
  },
}

function normalizeRarity(value: string | null | undefined): InspectRarity {
  const rarity = String(value || '').toLowerCase()
  if (rarity === 'mythical') return 'mythical'
  if (rarity === 'legendary') return 'legendary'
  if (rarity === 'epic') return 'epic'
  if (rarity === 'rare') return 'rare'
  return 'common'
}

function LootVisual({ icon, image, className, scale = 1 }: { icon: string; image?: string; className?: string; scale?: number }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={className ?? 'w-7 h-7 object-contain'}
        style={{ imageRendering: 'pixelated', transform: `scale(${scale})`, transformOrigin: 'center center' }}
        draggable={false}
      />
    )
  }
  return <span className={className}>{icon}</span>
}

type SlotEntry =
  | { id: string; kind: 'pending'; icon: string; image?: string; title: string; subtitle: string; quantity: number; rewardIds: string[]; chestType: ChestType }
  | { id: string; kind: 'chest'; icon: string; image?: string; title: string; subtitle: string; quantity: number; chestType: ChestType }
  | { id: string; kind: 'item'; icon: string; image?: string; title: string; subtitle: string; quantity: number; itemId: string; equipped: boolean }

export function InventoryPage({ onBack }: { onBack: () => void }) {
  const items = useInventoryStore((s) => s.items)
  const chests = useInventoryStore((s) => s.chests)
  const pendingRewards = useInventoryStore((s) => s.pendingRewards)
  const equippedBySlot = useInventoryStore((s) => s.equippedBySlot)
  const claimPendingReward = useInventoryStore((s) => s.claimPendingReward)
  const deletePendingReward = useInventoryStore((s) => s.deletePendingReward)
  const openChestAndGrantItem = useInventoryStore((s) => s.openChestAndGrantItem)
  const deleteChest = useInventoryStore((s) => s.deleteChest)
  const equipItem = useInventoryStore((s) => s.equipItem)
  const unequipSlot = useInventoryStore((s) => s.unequipSlot)
  const deleteItem = useInventoryStore((s) => s.deleteItem)
  const [inspectSlotId, setInspectSlotId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slotId: string } | null>(null)
  const [openChestModal, setOpenChestModal] = useState<{ chestType: ChestType; itemId: string } | null>(null)
  const [chestModalAnimSeed, setChestModalAnimSeed] = useState(0)
  const [chestChainMessage, setChestChainMessage] = useState<string | null>(null)

  const slots = useMemo<SlotEntry[]>(() => {
    const out: SlotEntry[] = []
    const pendingByChest = new Map<ChestType, { rewardIds: string[]; sources: Set<string> }>()
    for (const reward of pendingRewards.filter((r) => !r.claimed)) {
      const current = pendingByChest.get(reward.chestType) ?? { rewardIds: [], sources: new Set<string>() }
      current.rewardIds.push(reward.id)
      current.sources.add(reward.source)
      pendingByChest.set(reward.chestType, current)
    }
    for (const [chestType, grouped] of pendingByChest) {
      const chest = CHEST_DEFS[chestType]
      out.push({
        id: `pending:${chestType}`,
        kind: 'pending',
        icon: chest.icon,
        image: chest.image,
        title: chest.name,
        subtitle: `Inbox drops · ${grouped.sources.size > 1 ? 'mixed sources' : Array.from(grouped.sources)[0] ?? 'grind'}`,
        quantity: grouped.rewardIds.length,
        rewardIds: grouped.rewardIds,
        chestType,
      })
    }
    for (const chestType of Object.keys(CHEST_DEFS) as ChestType[]) {
      const qty = chests[chestType] ?? 0
      if (qty <= 0) continue
      const chest = CHEST_DEFS[chestType]
      out.push({
        id: `chest:${chestType}`,
        kind: 'chest',
        icon: chest.icon,
        image: chest.image,
        title: chest.name,
        subtitle: `${chest.rarity.toUpperCase()} chest`,
        quantity: qty,
        chestType,
      })
    }
    for (const item of LOOT_ITEMS) {
      const qty = items[item.id] ?? 0
      if (qty <= 0) continue
      out.push({
        id: `item:${item.id}`,
        kind: 'item',
        icon: item.icon,
        image: item.image,
        title: item.name,
        subtitle: item.perkDescription,
        quantity: qty,
        itemId: item.id,
        equipped: equippedBySlot[item.slot] === item.id,
      })
    }
    return out
  }, [pendingRewards, chests, items, equippedBySlot])

  const inspectSlot = useMemo(
    () => slots.find((slot) => slot.id === inspectSlotId) ?? null,
    [slots, inspectSlotId],
  )
  const inspectItem = useMemo(
    () => (inspectSlot?.kind === 'item' ? (LOOT_ITEMS.find((x) => x.id === inspectSlot.itemId) ?? null) : null),
    [inspectSlot],
  )
  const inspectRarity = useMemo(() => {
    if (inspectItem) return normalizeRarity(inspectItem.rarity)
    if (inspectSlot?.kind === 'chest' || inspectSlot?.kind === 'pending') {
      return normalizeRarity(CHEST_DEFS[inspectSlot.chestType].rarity)
    }
    return 'common'
  }, [inspectItem, inspectSlot])
  const inspectTheme = RARITY_THEME[inspectRarity]
  const equippedItems = useMemo(
    () =>
      (Object.keys(SLOT_META) as LootSlot[])
        .map((slot) => {
          const id = equippedBySlot[slot]
          if (!id) return null
          const item = LOOT_ITEMS.find((x) => x.id === id)
          if (!item) return null
          return { slot, item }
        })
        .filter((entry): entry is { slot: LootSlot; item: (typeof LOOT_ITEMS)[number] } => Boolean(entry)),
    [equippedBySlot],
  )
  const activeBuffs = useMemo(
    () =>
      equippedItems.map(({ slot, item }) => ({
        key: `${slot}:${item.id}`,
        slotLabel: SLOT_LABEL[slot],
        name: item.name,
        description: item.perkDescription,
        isGameplay: item.perkType !== 'cosmetic',
      })),
    [equippedItems],
  )

  useEffect(() => {
    ensureInventoryHydrated()
  }, [])

  useEffect(() => {
    if (inspectSlotId && !slots.some((slot) => slot.id === inspectSlotId)) setInspectSlotId(null)
  }, [slots, inspectSlotId])

  useEffect(() => {
    if (!openChestModal) return
    const hasMore =
      pendingRewards.some((r) => !r.claimed && r.chestType === openChestModal.chestType) || (chests[openChestModal.chestType] ?? 0) > 0
    if (chestModalAnimSeed > 1 && !hasMore) {
      setChestChainMessage('Oops, your chests are over')
      return
    }
    setChestChainMessage(null)
  }, [openChestModal, chestModalAnimSeed, pendingRewards, chests])

  useEffect(() => {
    const closeContext = () => setContextMenu(null)
    window.addEventListener('click', closeContext)
    return () => window.removeEventListener('click', closeContext)
  }, [])

  const openChest = (chestType: ChestType) => {
    const result = openChestAndGrantItem(chestType, { source: 'session_complete' })
    if (!result) return
    setInspectSlotId(null)
    setContextMenu(null)
    setChestChainMessage(null)
    setChestModalAnimSeed((v) => v + 1)
    setOpenChestModal({ chestType, itemId: result.itemId })
  }

  const runPrimaryAction = (slot: SlotEntry) => {
    if (slot.kind === 'pending') {
      const rewardId = slot.rewardIds[0]
      if (!rewardId) return
      claimPendingReward(rewardId)
      return openChest(slot.chestType)
    }
    if (slot.kind === 'chest') return openChest(slot.chestType)
    if (slot.kind === 'item') {
      const item = LOOT_ITEMS.find((x) => x.id === slot.itemId)
      if (!item) return
      if (slot.equipped) return unequipSlot(item.slot)
      return equipItem(slot.itemId)
    }
  }

  const runDeleteAction = (slot: SlotEntry) => {
    if (slot.kind === 'pending') {
      const rewardId = slot.rewardIds[0]
      if (!rewardId) return
      return deletePendingReward(rewardId)
    }
    if (slot.kind === 'chest') return deleteChest(slot.chestType)
    if (slot.kind === 'item') return deleteItem(slot.itemId)
  }

  const getPrimaryActionLabel = (slot: SlotEntry) => {
    if (slot.kind === 'pending') return 'Open'
    if (slot.kind === 'chest') return 'Open'
    return slot.equipped ? 'Unequip' : 'Equip'
  }

  const hasNextChestToOpen = (chestType: ChestType) =>
    pendingRewards.some((r) => !r.claimed && r.chestType === chestType) || (chests[chestType] ?? 0) > 0

  const openNextChest = (chestType: ChestType) => {
    setChestChainMessage(null)
    const pending = pendingRewards.find((r) => !r.claimed && r.chestType === chestType)
    if (pending) {
      claimPendingReward(pending.id)
      const result = openChestAndGrantItem(chestType, { source: 'session_complete' })
      if (!result) return false
      setChestModalAnimSeed((v) => v + 1)
      setOpenChestModal({ chestType, itemId: result.itemId })
      return true
    }
    if ((chests[chestType] ?? 0) > 0) {
      const result = openChestAndGrantItem(chestType, { source: 'session_complete' })
      if (!result) return false
      setChestModalAnimSeed((v) => v + 1)
      setOpenChestModal({ chestType, itemId: result.itemId })
      return true
    }
    return false
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 pb-20 space-y-3"
    >
      <PageHeader title="Inventory" onBack={onBack} />

      <div className="rounded-xl border border-white/10 bg-discord-card/80 p-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">Equipped</p>
        <div className="grid grid-cols-[1.5fr_1fr] gap-2">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SLOT_META) as LootSlot[]).map((slot) => {
              const meta = SLOT_META[slot]
              const equippedItem = LOOT_ITEMS.find((item) => item.id === equippedBySlot[slot])
              const equippedTheme = equippedItem ? RARITY_THEME[normalizeRarity(equippedItem.rarity)] : null
              return (
                <div
                  key={slot}
                  className="rounded-lg border border-white/10 bg-discord-darker/40 p-2"
                  style={equippedTheme ? { borderColor: equippedTheme.border, boxShadow: `0 0 14px ${equippedTheme.glow}` } : undefined}
                  onContextMenu={(e) => {
                    if (!equippedItem) return
                    e.preventDefault()
                    unequipSlot(slot)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-mono uppercase">{meta.icon} {meta.label}</span>
                  </div>
                  {equippedItem ? (
                    <button
                      type="button"
                    onClick={() => {
                      playClickSound()
                      setInspectSlotId(`item:${equippedItem.id}`)
                    }}
                      className="mt-1 w-full text-left"
                    >
                      <div
                        className="w-[72px] aspect-square mx-auto rounded-md border bg-discord-card/70 flex items-center justify-center"
                        style={equippedTheme ? { borderColor: equippedTheme.border, boxShadow: `inset 0 0 10px ${equippedTheme.glow}` } : { borderColor: 'rgba(255,255,255,0.15)' }}
                      >
                        <LootVisual icon={equippedItem.icon} image={equippedItem.image} className="w-11 h-11 object-contain" scale={equippedItem.renderScale ?? 1} />
                      </div>
                      <p className="text-[10px] text-white mt-1.5 truncate">{equippedItem.name}</p>
                    </button>
                  ) : (
                    <p className="text-[10px] text-gray-600 mt-1">Empty slot</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="rounded-lg border border-white/10 bg-discord-darker/40 p-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-mono mb-1.5">Buffs</p>
            {activeBuffs.length === 0 ? (
              <p className="text-[10px] text-gray-600">No active buffs.</p>
            ) : (
              <div className="space-y-1.5">
                {activeBuffs.map((buff) => (
                  <div key={buff.key} className="rounded-md border border-white/10 bg-discord-card/60 p-1.5">
                    <p className={`text-[9px] font-mono ${buff.isGameplay ? 'text-cyber-neon' : 'text-gray-400'}`}>{buff.slotLabel} · {buff.name}</p>
                    <p className="text-[9px] text-gray-300 leading-snug">{buff.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-discord-card/80 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Inventory slots</p>
          <p className="text-[10px] text-gray-600 font-mono">{slots.length} slots</p>
        </div>

        {slots.length === 0 ? (
          <p className="text-[11px] text-gray-500">No loot yet.</p>
        ) : (
          <div className="rounded-lg border border-white/10 bg-discord-darker/40 p-2">
            <div className="grid grid-cols-5 gap-1.5">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setInspectSlotId(slot.id)
                    setContextMenu(null)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, slotId: slot.id })
                  }}
                  className="relative w-full aspect-square rounded-md border text-center border-white/10 bg-discord-card/70 hover:border-cyber-neon/30 transition-colors"
                >
                  <span className="absolute inset-0 flex items-center justify-center">
                    <LootVisual
                      icon={slot.icon}
                      image={slot.image}
                      className="w-10 h-10 object-contain"
                      scale={slot.kind === 'item' ? (LOOT_ITEMS.find((x) => x.id === slot.itemId)?.renderScale ?? 1) : 1}
                    />
                  </span>
                  <span className="absolute top-0.5 right-1 text-[8px] text-gray-400 font-mono">x{slot.quantity}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {inspectSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectSlotId(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              className="w-[320px] rounded-xl border p-4 relative overflow-hidden"
              style={{
                borderColor: inspectTheme.border,
                background: inspectTheme.panel,
                boxShadow: `0 0 24px ${inspectTheme.glow}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 18%, ${inspectTheme.glow} 0%, transparent 58%)` }}
                initial={{ opacity: 0.35, scale: 0.98 }}
                animate={{ opacity: [0.3, 0.55, 0.35], scale: [0.98, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="h-10 flex items-center">
                    <LootVisual
                      icon={inspectSlot.icon}
                      image={inspectSlot.image}
                      className="w-12 h-12 object-contain"
                      scale={inspectItem?.renderScale ?? 1}
                    />
                  </div>
                  <p className="text-sm text-white font-semibold mt-1">{inspectSlot.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{inspectSlot.subtitle}</p>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">qty x{inspectSlot.quantity}</p>
              </div>
              {inspectSlot.kind === 'item' && inspectItem && (
                <div className="mt-2">
                  <span
                    className="inline-flex text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wide"
                    style={{
                      color: inspectTheme.color,
                      borderColor: inspectTheme.border,
                      backgroundColor: `${inspectTheme.color}1A`,
                    }}
                  >
                    {inspectRarity}
                  </span>
                </div>
              )}
              <div className="mt-3 rounded-lg border border-white/10 bg-discord-darker/40 p-2.5 space-y-1">
                {inspectSlot.kind === 'item' && (() => {
                  if (!inspectItem) return <p className="text-[10px] text-gray-500">Unknown item.</p>
                  const rate = estimateLootDropRate(inspectItem.id, { source: 'skill_grind', focusCategory: 'coding' })
                  return (
                    <>
                      <p className="text-[10px] text-gray-300"><span className="text-gray-500">Slot:</span> {SLOT_LABEL[inspectItem.slot]}</p>
                      <p className="text-[10px]" style={{ color: inspectTheme.color }}>
                        <span className="text-gray-500">Rarity:</span> {inspectRarity.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-gray-300"><span className="text-gray-500">Drop rate:</span> ~{rate}%</p>
                      <p className="text-[10px] text-gray-300"><span className="text-gray-500">Effect:</span> {inspectItem.perkDescription}</p>
                    </>
                  )
                })()}
                {inspectSlot.kind === 'chest' && (
                  <p className="text-[10px] text-gray-300">Chest can be opened to roll a random item.</p>
                )}
                {inspectSlot.kind === 'pending' && (
                  <p className="text-[10px] text-gray-300">Pending drop from activity. Claim it first.</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound()
                    runPrimaryAction(inspectSlot)
                  }}
                  className="flex-1 text-[10px] py-1.5 rounded border font-semibold transition-colors"
                  style={{
                    color: inspectTheme.color,
                    borderColor: inspectTheme.border,
                    backgroundColor: `${inspectTheme.color}22`,
                  }}
                >
                  {getPrimaryActionLabel(inspectSlot)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound()
                    runDeleteAction(inspectSlot)
                  }}
                  className="flex-1 text-[10px] py-1.5 rounded border border-red-400/35 text-red-300 hover:bg-red-400/10"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (() => {
          const slot = slots.find((x) => x.id === contextMenu.slotId)
          if (!slot) return null
          return (
            <div
              className="fixed z-[90] rounded-lg border border-white/15 bg-discord-card px-2 py-1.5"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  runPrimaryAction(slot)
                  setContextMenu(null)
                }}
                className="block w-full text-left text-[11px] px-2 py-1 rounded text-cyber-neon hover:bg-cyber-neon/15"
              >
                {getPrimaryActionLabel(slot)}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  runDeleteAction(slot)
                  setContextMenu(null)
                }}
                className="block w-full text-left text-[11px] px-2 py-1 rounded text-red-300 hover:bg-red-400/10"
              >
                Delete
              </button>
            </div>
          )
        })()}
      </AnimatePresence>

      <ChestOpenModal
        open={Boolean(openChestModal)}
        chestType={openChestModal?.chestType ?? null}
        item={openChestModal ? (LOOT_ITEMS.find((x) => x.id === openChestModal.itemId) ?? null) : null}
        onClose={() => {
          setOpenChestModal(null)
          setChestChainMessage(null)
        }}
        nextAvailable={openChestModal ? hasNextChestToOpen(openChestModal.chestType) : false}
        chainMessage={chestChainMessage}
        animationSeed={chestModalAnimSeed}
        onOpenNext={() => {
          if (!openChestModal) return
          const opened = openNextChest(openChestModal.chestType)
          if (!opened) {
            setChestChainMessage('Oops, your chests are over')
          }
        }}
      />
    </motion.div>
  )
}
