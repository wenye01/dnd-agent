import React, { useState } from 'react'
import type { InventoryItem, ItemType, ItemRarity } from '../../../types'
import { Tooltip } from '../../ui'

export interface InventoryListProps {
  items: InventoryItem[]
  selectedItem?: InventoryItem | null
  onSelect?: (item: InventoryItem) => void
  onUse?: (item: InventoryItem) => void
  onDrop?: (item: InventoryItem) => void
  filterType?: ItemType | 'all'
  sortBy?: 'name' | 'type' | 'weight' | 'value'
  viewMode?: 'grid' | 'list'
  readOnly?: boolean
}

const RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-gold/12',
  uncommon: 'border-heal/25',
  rare: 'border-frost/25',
  'very-rare': 'border-arcane/25',
  legendary: 'border-gold/40',
}

const TYPE_ICONS: Record<string, string> = {
  weapon: '\u{2694}',
  armor: '\u{1F6E1}',
  shield: '\u{1F6E1}',
  potion: '\u{1F9EA}',
  scroll: '\u{1F4DC}',
  wand: '\u{2728}',
  ring: '\u{1F48D}',
  amulet: '\u{1F4FF}',
  cloak: '\u{1FA98}',
  tool: '\u{1F527}',
  gear: '\u{2699}',
  treasure: '\u{1F4B0}',
  ammo: '\u{1F3F9}',
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
  ammo: 'Ammo',
}

export const InventoryList = React.memo(function InventoryList({
  items,
  selectedItem,
  onSelect,
  onUse,
  onDrop,
  filterType = 'all',
  sortBy = 'name',
  viewMode = 'grid',
  readOnly = false,
}: InventoryListProps) {
  const [contextMenu, setContextMenu] = useState<{ item: InventoryItem; x: number; y: number } | null>(null)

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true
    return item.type === filterType
  })

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'type':
        return (a.type || '').localeCompare(b.type || '')
      case 'weight':
        return (b.weight || 0) - (a.weight || 0)
      case 'value':
        return (b.value || 0) - (a.value || 0)
      default:
        return 0
    }
  })

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
    if (readOnly) return
    e.preventDefault()
    setContextMenu({ item, x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => setContextMenu(null)

  if (sortedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-stone-text/40">
        <div className="text-2xl mb-2 opacity-30">{'\u{1F392}'}</div>
        <p className="text-xs font-display tracking-wider uppercase">No items</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-5 gap-1.5">
          {sortedItems.map((item) => {
            const isSelected = selectedItem?.id === item.id
            const rarity = item.rarity || 'common'
            const icon = item.icon || TYPE_ICONS[item.type || ''] || '\u{1F4E6}'

            return (
              <Tooltip key={item.id} content={item.name}>
                <div
                  className={`
                    relative flex flex-col items-center justify-center p-1.5 rounded border transition-all duration-200
                    ${RARITY_BORDER[rarity]}
                    ${isSelected
                      ? 'bg-gold/15 ring-1 ring-gold/40'
                      : 'bg-cave/40 hover:bg-cave/60 hover:border-gold/20'
                    }
                    ${!readOnly ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onSelect?.(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  role={readOnly ? undefined : 'button'}
                  tabIndex={readOnly ? undefined : 0}
                  aria-label={item.name}
                  onKeyDown={(e) => {
                    if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelect?.(item)
                    }
                  }}
                >
                  {/* Item icon */}
                  <div className="text-base leading-none">{icon}</div>

                  {/* Item name (truncated) */}
                  <span className="text-[8px] text-parchment/60 truncate max-w-full mt-0.5 leading-tight">
                    {item.name}
                  </span>

                  {/* Quantity badge */}
                  {item.quantity > 1 && (
                    <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-arcane/80 rounded-full flex items-center justify-center">
                      <span className="text-[7px] text-parchment font-mono font-bold">{item.quantity}</span>
                    </div>
                  )}
                </div>
              </Tooltip>
            )
          })}
        </div>
      ) : (
        <div className="space-y-0.5">
          {sortedItems.map((item) => {
            const isSelected = selectedItem?.id === item.id
            const rarity = item.rarity || 'common'
            const icon = item.icon || TYPE_ICONS[item.type || ''] || '\u{1F4E6}'

            return (
              <div
                key={item.id}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded border transition-all duration-200
                  ${RARITY_BORDER[rarity]}
                  ${isSelected
                    ? 'bg-gold/12'
                    : 'hover:bg-cave/50 hover:border-gold/15'
                  }
                  ${!readOnly ? 'cursor-pointer' : ''}
                `}
                onClick={() => onSelect?.(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                role={readOnly ? undefined : 'button'}
                tabIndex={readOnly ? undefined : 0}
                aria-label={item.name}
                onKeyDown={(e) => {
                  if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelect?.(item)
                  }
                }}
              >
                <div className="text-sm">{icon}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-parchment/80 truncate block">{item.name}</span>
                  {item.type && (
                    <span className="text-[8px] text-stone-text/40 font-display tracking-wider uppercase">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                  )}
                </div>
                {item.quantity > 1 && (
                  <span className="text-[10px] font-mono text-arcane/60">{item.quantity}x</span>
                )}
                {item.weight !== undefined && (
                  <span className="text-[9px] font-mono text-stone-text/30">{item.weight}lb</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          {/* Backdrop to close context menu */}
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            className="fixed z-50 rounded-lg border border-gold/20 py-1 min-w-[140px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: 'linear-gradient(180deg, rgba(26, 24, 38, 0.98) 0%, rgba(22, 20, 36, 0.99) 100%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 12px rgba(212,168,67,0.08)',
            }}
          >
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-parchment/80 hover:bg-gold/10 font-body"
              onClick={() => {
                onSelect?.(contextMenu.item)
                closeContextMenu()
              }}
            >
              View Details
            </button>
            {(contextMenu.item.type === 'potion' || contextMenu.item.type === 'scroll' || contextMenu.item.type === 'wand') && onUse && (
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-heal hover:bg-heal/10 font-body"
                onClick={() => {
                  onUse(contextMenu.item)
                  closeContextMenu()
                }}
              >
                {contextMenu.item.type === 'potion' ? 'Drink' : contextMenu.item.type === 'scroll' ? 'Read' : 'Use'}
              </button>
            )}
            {onDrop && (
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-blood hover:bg-blood/10 font-body"
                onClick={() => {
                  onDrop(contextMenu.item)
                  closeContextMenu()
                }}
              >
                Drop
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
})

export default InventoryList
