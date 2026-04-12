import React from 'react'
import type { InventoryItem, ItemRarity } from '../../../types'
import { Button } from '../../ui'
import { Modal } from '../../ui'

export interface ItemDetailProps {
  item: InventoryItem | null
  isOpen: boolean
  onClose: () => void
  onEquip?: (item: InventoryItem) => void
  onUnequip?: (item: InventoryItem) => void
  onUse?: (item: InventoryItem) => void
  onDrop?: (item: InventoryItem) => void
  isEquipped?: boolean
}

const RARITY_STYLES: Record<ItemRarity, { text: string; border: string; glow: string }> = {
  common: {
    text: 'text-parchment',
    border: 'border-gold/20',
    glow: '',
  },
  uncommon: {
    text: 'text-heal',
    border: 'border-heal/30',
    glow: '0 0 8px rgba(74, 222, 128, 0.15)',
  },
  rare: {
    text: 'text-frost',
    border: 'border-frost/30',
    glow: '0 0 8px rgba(96, 165, 250, 0.15)',
  },
  'very-rare': {
    text: 'text-arcane',
    border: 'border-arcane/30',
    glow: '0 0 8px rgba(155, 109, 255, 0.15)',
  },
  legendary: {
    text: 'text-gold-light',
    border: 'border-gold/40',
    glow: '0 0 12px rgba(212, 168, 67, 0.25)',
  },
}

const TYPE_LABELS: Record<string, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  shield: 'Shield',
  potion: 'Potion',
  scroll: 'Scroll',
  wand: 'Wand',
  ring: 'Ring',
  amulet: 'Amulet',
  cloak: 'Cloak',
  tool: 'Tool',
  gear: 'Gear',
  treasure: 'Treasure',
  ammo: 'Ammunition',
}

export const ItemDetail = React.memo(function ItemDetail({
  item,
  isOpen,
  onClose,
  onEquip,
  onUnequip,
  onUse,
  onDrop,
  isEquipped = false,
}: ItemDetailProps) {
  if (!item) return null

  const rarity = item.rarity || 'common'
  const rarityStyle = RARITY_STYLES[rarity]
  const canEquip = !isEquipped && (item.type === 'weapon' || item.type === 'armor' || item.type === 'shield' || item.type === 'ring' || item.type === 'amulet' || item.type === 'cloak')
  const canUse = item.type === 'potion' || item.type === 'scroll' || item.type === 'wand'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name} size="md">
      <div className="space-y-4">
        {/* Rarity badge */}
        <div className="flex items-center gap-2">
          {item.type && (
            <span className="text-[10px] font-display font-semibold tracking-wider uppercase text-stone-text/60 bg-stone/40 px-2 py-0.5 rounded">
              {TYPE_LABELS[item.type] || item.type}
            </span>
          )}
          <span className={`text-[10px] font-display font-bold tracking-wider uppercase ${rarityStyle.text}`}>
            {rarity.replace('-', ' ')}
          </span>
          {isEquipped && (
            <span className="text-[10px] font-display font-bold tracking-wider uppercase text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
              Equipped
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div
            className="p-3 rounded border border-gold/10 bg-cave/50"
            style={{ boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)' }}
          >
            <p className="text-sm text-parchment/80 leading-relaxed italic font-body">
              {item.description}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {item.damage && (
            <div className="p-2 rounded bg-cave/40 border border-gold/8">
              <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Damage</span>
              <p className="text-sm text-blood font-mono font-semibold">{item.damage} {item.damageType || ''}</p>
            </div>
          )}
          {item.armorClass && (
            <div className="p-2 rounded bg-cave/40 border border-gold/8">
              <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Armor Class</span>
              <p className="text-sm text-frost font-mono font-semibold">+{item.armorClass}</p>
            </div>
          )}
          {item.weight !== undefined && (
            <div className="p-2 rounded bg-cave/40 border border-gold/8">
              <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Weight</span>
              <p className="text-sm text-parchment font-mono">{item.weight} lb</p>
            </div>
          )}
          {item.value !== undefined && (
            <div className="p-2 rounded bg-cave/40 border border-gold/8">
              <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Value</span>
              <p className="text-sm text-gold font-mono">{item.value} gp</p>
            </div>
          )}
          {item.quantity > 1 && (
            <div className="p-2 rounded bg-cave/40 border border-gold/8">
              <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Quantity</span>
              <p className="text-sm text-parchment font-mono">{item.quantity}</p>
            </div>
          )}
          {item.charges !== undefined && item.maxCharges !== undefined && (
            <div className="p-2 rounded bg-cave/40 border border-gold/8">
              <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Charges</span>
              <p className="text-sm text-arcane font-mono">{item.charges}/{item.maxCharges}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gold/10">
          {isEquipped && onUnequip && (
            <Button variant="secondary" size="sm" onClick={() => onUnequip(item)}>
              Unequip
            </Button>
          )}
          {canEquip && onEquip && (
            <Button variant="primary" size="sm" onClick={() => onEquip(item)}>
              Equip
            </Button>
          )}
          {canUse && onUse && (
            <Button variant="primary" size="sm" onClick={() => onUse(item)}>
              {item.type === 'potion' ? 'Drink' : item.type === 'scroll' ? 'Read' : 'Use'}
            </Button>
          )}
          {!isEquipped && onDrop && (
            <Button variant="danger" size="sm" onClick={() => onDrop(item)}>
              Drop
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
})

export default ItemDetail
