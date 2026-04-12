import { useState, useMemo, useCallback } from 'react'
import { useGameStore } from '../../../stores/gameStore'
import { eventBus } from '../../../events/eventBus'
import { GameEvents } from '../../../events/gameEvents'
import type { InventoryItem, ItemType, EquipmentSlot } from '../../../types'
import { Panel } from '../../ui'
import { EquipmentSlots } from './EquipmentSlots'
import { InventoryList } from './InventoryList'
import { ItemDetail } from './ItemDetail'
import { WeightBar } from './WeightBar'

const FILTER_OPTIONS: { value: ItemType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'weapon', label: 'Weapons' },
  { value: 'armor', label: 'Armor' },
  { value: 'potion', label: 'Potions' },
  { value: 'scroll', label: 'Scrolls' },
  { value: 'ring', label: 'Rings' },
  { value: 'amulet', label: 'Amulets' },
  { value: 'cloak', label: 'Cloaks' },
  { value: 'gear', label: 'Gear' },
]

export default function InventoryPanel() {
  const party = useGameStore((s) => s.gameState?.party)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'weight' | 'value'>('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Use first character if none selected
  const characterId = selectedCharacterId || party?.[0]?.id || null
  const character = party?.find((c) => c.id === characterId)

  // Build item lookup from inventory
  const itemLookup = useMemo(() => {
    const lookup: Record<string, InventoryItem> = {}
    if (character?.inventory) {
      for (const item of character.inventory) {
        lookup[item.id] = item
      }
    }
    return lookup
  }, [character])

  // Calculate total weight
  const { currentWeight, maxWeight } = useMemo(() => {
    if (!character) return { currentWeight: 0, maxWeight: 0 }
    const weight = character.inventory.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0)
    // Strength score determines carrying capacity (Str * 15)
    const capacity = (character.abilityScores.strength || 10) * 15
    return { currentWeight: weight, maxWeight: capacity }
  }, [character])

  // Check if an item is equipped
  const isItemEquipped = useCallback(
    (item: InventoryItem): boolean => {
      if (!character?.equipment) return false
      return character.equipment.some((slot: EquipmentSlot) => slot.itemId === item.id)
    },
    [character]
  )

  // Handlers
  const handleItemSelected = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  const handleSlotClick = (slotName: string) => {
    if (!character?.equipment) return
    const slot = character.equipment.find((e: EquipmentSlot) => e.slot === slotName)
    if (slot?.itemId) {
      const item = itemLookup[slot.itemId]
      if (item) {
        setSelectedItem(item)
        setIsDetailOpen(true)
      }
    }
  }

  const handleEquip = (item: InventoryItem) => {
    eventBus.emit(GameEvents.INVENTORY_EQUIP, {
      characterId,
      itemId: item.id,
      slot: item.equipSlot,
    })
    setIsDetailOpen(false)
  }

  const handleUnequip = (item: InventoryItem) => {
    eventBus.emit(GameEvents.INVENTORY_UNEQUIP, {
      characterId,
      itemId: item.id,
    })
    setIsDetailOpen(false)
  }

  const handleUse = (item: InventoryItem) => {
    eventBus.emit(GameEvents.INVENTORY_USE, {
      characterId,
      itemId: item.id,
    })
    setIsDetailOpen(false)
  }

  const handleDrop = (item: InventoryItem) => {
    eventBus.emit(GameEvents.INVENTORY_DROP, {
      characterId,
      itemId: item.id,
    })
    setIsDetailOpen(false)
    setSelectedItem(null)
  }

  if (!party || party.length === 0) {
    return (
      <Panel title="Inventory" variant="parchment">
        <div className="flex flex-col items-center justify-center py-8 text-stone-text/40">
          <div className="text-2xl mb-2 opacity-30">{'\u{1F392}'}</div>
          <p className="text-xs font-display tracking-wider uppercase">No party members</p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel title="Inventory" variant="parchment">
      <div className="p-3 space-y-3">
        {/* Character selector */}
        {party.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {party.map((char) => (
              <button
                key={char.id}
                className={`
                  px-2 py-1 rounded text-[10px] font-display tracking-wider uppercase transition-all duration-200 cursor-pointer
                  ${char.id === characterId
                    ? 'bg-gold/15 text-gold border border-gold/25'
                    : 'text-stone-text/50 hover:text-parchment hover:bg-cave/50 border border-transparent'
                  }
                `}
                onClick={() => setSelectedCharacterId(char.id)}
              >
                {char.name}
              </button>
            ))}
          </div>
        )}

        {character && (
          <>
            {/* Equipment slots */}
            <EquipmentSlots
              equipment={character.equipment}
              itemLookup={itemLookup}
              onSlotClick={handleSlotClick}
            />

            {/* Weight bar */}
            <WeightBar currentWeight={currentWeight} maxWeight={maxWeight} />

            {/* Filter & sort controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View mode toggle */}
              <div className="flex gap-0.5 bg-cave/30 rounded p-0.5">
                <button
                  className={`px-1.5 py-0.5 rounded text-[9px] font-display tracking-wider transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-gold/15 text-gold' : 'text-stone-text/40 hover:text-parchment'
                  }`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  {'\u{25A6}'}
                </button>
                <button
                  className={`px-1.5 py-0.5 rounded text-[9px] font-display tracking-wider transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-gold/15 text-gold' : 'text-stone-text/40 hover:text-parchment'
                  }`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  {'\u{2630}'}
                </button>
              </div>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ItemType | 'all')}
                className="bg-cave/50 border border-gold/10 rounded px-1.5 py-0.5 text-[9px] font-display text-parchment/70 tracking-wider uppercase cursor-pointer"
                style={{ background: 'rgba(26, 24, 38, 0.6)' }}
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'weight' | 'value')}
                className="bg-cave/50 border border-gold/10 rounded px-1.5 py-0.5 text-[9px] font-display text-parchment/70 tracking-wider uppercase cursor-pointer"
                style={{ background: 'rgba(26, 24, 38, 0.6)' }}
              >
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="weight">Weight</option>
                <option value="value">Value</option>
              </select>
            </div>

            {/* Item count */}
            <div className="text-[9px] text-stone-text/30 font-mono">
              {character.inventory.length} item{character.inventory.length !== 1 ? 's' : ''}
            </div>

            {/* Inventory list */}
            <InventoryList
              items={character.inventory}
              selectedItem={selectedItem}
              onSelect={handleItemSelected}
              onUse={handleUse}
              onDrop={handleDrop}
              filterType={filterType}
              sortBy={sortBy}
              viewMode={viewMode}
            />
          </>
        )}
      </div>

      {/* Item detail modal */}
      <ItemDetail
        item={selectedItem}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        onUse={handleUse}
        onDrop={handleDrop}
        isEquipped={selectedItem ? isItemEquipped(selectedItem) : false}
      />
    </Panel>
  )
}

export { EquipmentSlots as EquipmentSlotsPanel } from './EquipmentSlots'
export { InventoryList } from './InventoryList'
export { ItemDetail } from './ItemDetail'
export { WeightBar } from './WeightBar'
