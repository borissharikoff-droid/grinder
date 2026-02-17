import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHEST_DEFS, LOOT_ITEMS, type ChestType } from '../../lib/loot'
import { ensureInventoryHydrated, useInventoryStore } from '../../stores/inventoryStore'
import { ChestOpenModal } from '../animations/ChestOpenModal'

interface BackpackPanelProps {
  open: boolean
  onClose: () => void
  backpackRef?: React.RefObject<HTMLButtonElement | null>
}

export function BackpackPanel({ open, onClose, backpackRef }: BackpackPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const items = useInventoryStore((s) => s.items)
  const chests = useInventoryStore((s) => s.chests)
  const pendingRewards = useInventoryStore((s) => s.pendingRewards)
  const equippedBySlot = useInventoryStore((s) => s.equippedBySlot)
  const claimPendingReward = useInventoryStore((s) => s.claimPendingReward)
  const deletePendingReward = useInventoryStore((s) => s.deletePendingReward)
  const openChestAndGrantItem = useInventoryStore((s) => s.openChestAndGrantItem)
  const deleteChest = useInventoryStore((s) => s.deleteChest)
  const equipItem = useInventoryStore((s) => s.equipItem)
  const deleteItem = useInventoryStore((s) => s.deleteItem)

  const [openChestModal, setOpenChestModal] = useState<{ chestType: ChestType; itemId: string } | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slotId: string } | null>(null)

  type SlotEntry =
    | { id: string; kind: 'pending'; icon: string; title: string; subtitle: string; quantity: number; rewardId: string; chestType: ChestType }
    | { id: string; kind: 'chest'; icon: string; title: string; subtitle: string; quantity: number; chestType: ChestType }
    | { id: string; kind: 'item'; icon: string; title: string; subtitle: string; quantity: number; itemId: string; equipped: boolean }

  const slots = useMemo<SlotEntry[]>(() => {
    const out: SlotEntry[] = []
    for (const reward of pendingRewards.filter((r) => !r.claimed)) {
      const chest = CHEST_DEFS[reward.chestType]
      out.push({
        id: `pending:${reward.id}`,
        kind: 'pending',
        icon: chest.icon,
        title: chest.name,
        subtitle: `Inbox drop · ${reward.source}`,
        quantity: 1,
        rewardId: reward.id,
        chestType: reward.chestType,
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
        title: item.name,
        subtitle: item.perkDescription,
        quantity: qty,
        itemId: item.id,
        equipped: equippedBySlot[item.slot] === item.id,
      })
    }
    return out
  }, [pendingRewards, chests, items, equippedBySlot])

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  )

  useEffect(() => {
    if (open) ensureInventoryHydrated()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!selectedSlotId && slots.length > 0) setSelectedSlotId(slots[0].id)
    if (selectedSlotId && !slots.some((slot) => slot.id === selectedSlotId)) {
      setSelectedSlotId(slots[0]?.id ?? null)
    }
  }, [open, slots, selectedSlotId])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (backpackRef?.current?.contains(e.target as Node)) return
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
      setContextMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, backpackRef])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const openChest = (chestType: ChestType) => {
    const result = openChestAndGrantItem(chestType, { source: 'session_complete' })
    if (!result) return
    setOpenChestModal({ chestType, itemId: result.itemId })
  }

  const runPrimaryAction = (slot: SlotEntry) => {
    if (slot.kind === 'pending') {
      claimPendingReward(slot.rewardId)
      return
    }
    if (slot.kind === 'chest') {
      openChest(slot.chestType)
      return
    }
    if (slot.kind === 'item') {
      equipItem(slot.itemId)
    }
  }

  const runDeleteAction = (slot: SlotEntry) => {
    if (slot.kind === 'pending') {
      deletePendingReward(slot.rewardId)
      return
    }
    if (slot.kind === 'chest') {
      deleteChest(slot.chestType)
      return
    }
    if (slot.kind === 'item') {
      deleteItem(slot.itemId)
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-1.5 w-[min(340px,calc(100vw-16px))] max-h-[450px] rounded-xl bg-discord-card border border-white/10 shadow-xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white">Backpack</span>
              <span className="text-[10px] text-gray-500 font-mono">{slots.length} slots</span>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              {slots.length === 0 ? (
                <div className="h-full rounded-lg border border-white/10 bg-discord-darker/40 flex items-center justify-center">
                  <p className="text-[11px] text-gray-500">No loot yet.</p>
                </div>
              ) : (
                <div className="h-full grid grid-cols-1 gap-2">
                  <div className="rounded-lg border border-white/10 bg-discord-darker/40 p-2 overflow-auto">
                    <div className="grid grid-cols-4 gap-1.5">
                      {slots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlotId(slot.id)
                            setContextMenu(null)
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setSelectedSlotId(slot.id)
                            setContextMenu({ x: e.clientX, y: e.clientY, slotId: slot.id })
                          }}
                          className={`relative h-12 rounded-md border text-center transition-colors ${
                            selectedSlotId === slot.id
                              ? 'border-cyber-neon/50 bg-cyber-neon/10'
                              : 'border-white/10 bg-discord-card/70 hover:border-white/20'
                          }`}
                          title={slot.title}
                        >
                          <span className="text-lg leading-none">{slot.icon}</span>
                          <span className="absolute top-0.5 right-1 text-[8px] text-gray-400 font-mono">x{slot.quantity}</span>
                          {slot.kind === 'item' && slot.equipped && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] px-1 rounded border border-cyber-neon/40 text-cyber-neon bg-cyber-neon/10">eq</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-discord-darker/40 p-2 flex flex-col">
                    {selectedSlot ? (
                      <>
                        <div className="rounded-md border border-white/10 bg-discord-card/60 p-2 mb-2">
                          <p className="text-2xl leading-none">{selectedSlot.icon}</p>
                          <p className="text-[11px] text-white font-semibold mt-1">{selectedSlot.title}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">{selectedSlot.subtitle}</p>
                          <p className="text-[9px] text-gray-500 font-mono mt-1">qty x{selectedSlot.quantity}</p>
                        </div>
                        <div className="space-y-1.5 mt-auto">
                          <button
                            type="button"
                            onClick={() => runPrimaryAction(selectedSlot)}
                            className="w-full text-[10px] py-1.5 rounded border border-cyber-neon/35 text-cyber-neon bg-cyber-neon/10 hover:bg-cyber-neon/20 transition-colors"
                          >
                            {selectedSlot.kind === 'pending' ? 'claim' : selectedSlot.kind === 'chest' ? 'open' : selectedSlot.equipped ? 'equipped' : 'equip'}
                          </button>
                          <button
                            type="button"
                            onClick={() => runDeleteAction(selectedSlot)}
                            className="w-full text-[10px] py-1.5 rounded border border-red-400/35 text-red-300 hover:bg-red-400/10 transition-colors"
                          >
                            delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] text-gray-500">Select a slot</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                runPrimaryAction(slot)
                setContextMenu(null)
              }}
              className="block w-full text-left text-[11px] px-2 py-1 rounded text-cyber-neon hover:bg-cyber-neon/15 transition-colors"
            >
              {slot.kind === 'pending' ? 'claim' : slot.kind === 'chest' ? 'open' : slot.equipped ? 'equip (refresh)' : 'equip'}
            </button>
            <button
              type="button"
              onClick={() => {
                runDeleteAction(slot)
                setContextMenu(null)
              }}
              className="block w-full text-left text-[11px] px-2 py-1 rounded text-red-300 hover:bg-red-400/10 transition-colors"
            >
              delete
            </button>
          </div>
        )
      })()}
      <ChestOpenModal
        open={Boolean(openChestModal)}
        chestType={openChestModal?.chestType ?? null}
        item={openChestModal ? (LOOT_ITEMS.find((x) => x.id === openChestModal.itemId) ?? null) : null}
        onClose={() => setOpenChestModal(null)}
      />
    </>
  )
}
