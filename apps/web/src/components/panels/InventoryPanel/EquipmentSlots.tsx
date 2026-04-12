import React from 'react'
import type { EquipmentSlot as EquipmentSlotType, InventoryItem, ItemRarity } from '../../../types'
import { Tooltip } from '../../ui'

export interface EquipmentSlotsProps {
  equipment: EquipmentSlotType[]
  itemLookup?: Record<string, InventoryItem>
  onSlotClick?: (slotName: string) => void
  readOnly?: boolean
}

// 9-slot paper doll layout per PRD
const PAPER_DOLL_LAYOUT = [
  // Row 1: Head
  { slot: 'head', label: 'Head', colStart: 2, colEnd: 3 },
  // Row 2: Ring1, Neck/Amulet, Ring2
  { slot: 'ring', label: 'Ring 1', colStart: 1, colEnd: 2, index: 0 },
  { slot: 'amulet', label: 'Amulet', colStart: 2, colEnd: 3 },
  { slot: 'ring', label: 'Ring 2', colStart: 3, colEnd: 4, index: 1 },
  // Row 3: Armor/Body
  { slot: 'body', label: 'Armor', colStart: 2, colEnd: 3 },
  // Row 4: Main Hand, Off Hand / Shield
  { slot: 'main_hand', label: 'Main Hand', colStart: 1, colEnd: 2 },
  { slot: 'off_hand', label: 'Off Hand', colStart: 2, colEnd: 3 },
  { slot: 'cloak', label: 'Cloak', colStart: 3, colEnd: 4 },
  // Row 5: Feet
  { slot: 'feet', label: 'Boots', colStart: 2, colEnd: 3 },
]

const SLOT_ICONS: Record<string, string> = {
  head: '\u{1F3F9}',
  body: '\u{1F6E1}',
  hands: '\u{1F9E4}',
  feet: '\u{1F97F}',
  main_hand: '\u{2694}',
  off_hand: '\u{1F6E1}',
  ring: '\u{1F48D}',
  amulet: '\u{1F4FF}',
  cloak: '\u{1FA98}',
  quiver: '\u{1F3F9}',
}

const RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-gold/15',
  uncommon: 'border-heal/30',
  rare: 'border-frost/30',
  'very-rare': 'border-arcane/30',
  legendary: 'border-gold/50',
}

export const EquipmentSlots = React.memo(function EquipmentSlots({
  equipment,
  itemLookup = {},
  onSlotClick,
  readOnly = false,
}: EquipmentSlotsProps) {
  // Get item name for a slot
  const getItemForSlot = (slotName: string, slotIndex?: number): InventoryItem | null => {
    const slot = equipment.find((e) => {
      if (e.slot === slotName) {
        if (slotIndex !== undefined) {
          // For duplicate slot names (like ring), use index-based matching
          const matching = equipment.filter(eq => eq.slot === slotName)
          return matching.indexOf(e) === slotIndex
        }
        return true
      }
      return false
    })
    if (!slot || !slot.itemId) return null
    return itemLookup[slot.itemId] || null
  }

  const renderSlot = (slotDef: typeof PAPER_DOLL_LAYOUT[number]) => {
    const item = getItemForSlot(slotDef.slot, slotDef.index)
    const isFilled = item !== null
    const rarity = item?.rarity || 'common'

    const slotElement = (
      <div
        key={`${slotDef.slot}-${slotDef.index ?? ''}`}
        className={`
          relative flex flex-col items-center justify-center p-2 rounded border transition-all duration-200
          ${isFilled
            ? `bg-gold/8 ${RARITY_BORDER[rarity]}`
            : 'border-gold/8 border-dashed bg-cave/30'
          }
          ${!readOnly ? 'cursor-pointer hover:bg-gold/12 hover:border-gold/25' : ''}
        `}
        style={isFilled && item?.rarity && item.rarity !== 'common' ? {
          boxShadow: item.rarity === 'legendary' ? '0 0 10px rgba(212, 168, 67, 0.15)' :
                     item.rarity === 'very-rare' ? '0 0 8px rgba(155, 109, 255, 0.1)' :
                     'none',
        } : undefined}
        onClick={() => !readOnly && onSlotClick?.(slotDef.slot)}
        role={readOnly ? undefined : 'button'}
        tabIndex={readOnly ? undefined : 0}
        onKeyDown={(e) => {
          if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onSlotClick?.(slotDef.slot)
          }
        }}
        aria-label={`${slotDef.label}${isFilled ? `: ${item.name}` : ': Empty'}`}
      >
        {/* Slot icon */}
        <div className={`text-lg mb-0.5 ${isFilled ? 'opacity-90' : 'opacity-20'}`}>
          {SLOT_ICONS[slotDef.slot] || '\u{1F4E6}'}
        </div>

        {/* Slot label */}
        <span className="text-[8px] font-display font-semibold text-gold/40 uppercase tracking-wider whitespace-nowrap">
          {slotDef.label}
        </span>

        {/* Item name (if equipped) */}
        {isFilled && (
          <span className="text-[9px] text-parchment/70 truncate max-w-full mt-0.5">
            {item.name}
          </span>
        )}
      </div>
    )

    if (isFilled && !readOnly) {
      return (
        <Tooltip key={`${slotDef.slot}-${slotDef.index ?? ''}`} content={item.name}>
          {slotElement}
        </Tooltip>
      )
    }

    return slotElement
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        <span className="text-[10px] font-display font-bold text-gold/50 tracking-[0.15em] uppercase">
          Equipment
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
      </div>

      {/* Paper doll grid */}
      <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto">
        {PAPER_DOLL_LAYOUT.map((slotDef) => (
          <div
            key={`${slotDef.slot}-${slotDef.index ?? 'default'}`}
            style={{
              gridColumn: `${slotDef.colStart} / ${slotDef.colEnd}`,
            }}
          >
            {renderSlot(slotDef)}
          </div>
        ))}
      </div>
    </div>
  )
})

export default EquipmentSlots
