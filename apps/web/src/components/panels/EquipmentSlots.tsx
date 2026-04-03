import type { EquipmentSlot } from '../../types'

const SLOT_LABELS: Record<string, string> = {
  head: 'Head',
  body: 'Chest',
  hands: 'Hands',
  feet: 'Feet',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
  ring: 'Ring',
  amulet: 'Amulet',
  cloak: 'Cloak',
  quiver: 'Quiver',
}

const SLOT_ORDER = [
  'head', 'body', 'hands', 'feet',
  'main_hand', 'off_hand', 'ring',
  'amulet', 'cloak', 'quiver',
]

interface EquipmentSlotsProps {
  equipment: EquipmentSlot[]
  inventory?: Array<{ id: string; name: string }>
}

function getEquippedName(equipment: EquipmentSlot[], slotName: string, inventory?: Array<{ id: string; name: string }>): string | null {
  const slot = equipment.find((e) => e.slot === slotName)
  if (!slot || !slot.itemId) return null
  if (inventory) {
    const item = inventory.find((i) => i.id === slot.itemId)
    if (item) return item.name
  }
  return slot.itemId
}

export function EquipmentSlots({ equipment, inventory }: EquipmentSlotsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        <span className="text-[10px] font-display font-bold text-gold/50 tracking-[0.15em] uppercase">
          Equipment
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SLOT_ORDER.map((slotName) => {
          const itemName = getEquippedName(equipment, slotName, inventory)
          const isFilled = itemName !== null
          return (
            <div
              key={slotName}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition-all duration-200 ${
                isFilled
                  ? 'border-gold/20 bg-gold/6'
                  : 'border-gold/8 border-dashed bg-cave/30'
              }`}
            >
              <span className="text-[9px] font-display font-semibold text-gold/50 uppercase tracking-wider w-[52px] flex-shrink-0">
                {SLOT_LABELS[slotName] || slotName}
              </span>
              <span
                className={`text-[10px] truncate ${
                  isFilled
                    ? 'text-parchment font-medium'
                    : 'text-stone-text/30 italic'
                }`}
              >
                {isFilled ? itemName : '--'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}


