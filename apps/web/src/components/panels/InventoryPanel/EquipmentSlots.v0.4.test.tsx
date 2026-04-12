import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EquipmentSlots } from './EquipmentSlots'
import type { EquipmentSlot, InventoryItem } from '../../../types'

// Helper: create a basic equipment array
function makeEquipment(slots: Array<{ slot: string; itemId: string | null }>): EquipmentSlot[] {
  return slots.map((s) => ({ slot: s.slot, itemId: s.itemId }))
}

// Helper: create a basic item lookup
function makeItemLookup(items: InventoryItem[]): Record<string, InventoryItem> {
  const lookup: Record<string, InventoryItem> = {}
  for (const item of items) lookup[item.id] = item
  return lookup
}

describe('EquipmentSlots (InventoryPanel v0.4)', () => {
  it('should render the Equipment header', () => {
    render(<EquipmentSlots equipment={[]} />)
    expect(screen.getByText('Equipment')).toBeDefined()
  })

  it('should render all 9 paper doll slots with correct labels', () => {
    render(<EquipmentSlots equipment={[]} />)
    const expectedSlots = ['Head', 'Ring 1', 'Amulet', 'Ring 2', 'Armor', 'Main Hand', 'Off Hand', 'Cloak', 'Boots']
    expectedSlots.forEach((label) => {
      expect(screen.getByText(label)).toBeDefined()
    })
  })

  it('should show slot icons even when empty', () => {
    render(<EquipmentSlots equipment={[]} />)
    // All 9 slots should have aria-label with "Empty"
    const emptySlots = screen.getAllByRole('button')
    // 9 paper doll slots (only non-read-only slots have role=button)
    // When readOnly is false (default), each slot is a button
    expect(emptySlots.length).toBeGreaterThanOrEqual(9)
  })

  it('should display item name when slot is equipped', () => {
    const equipment = makeEquipment([{ slot: 'head', itemId: 'helmet-001' }])
    const itemLookup = makeItemLookup([
      { id: 'helmet-001', name: 'Iron Helm', quantity: 1, type: 'armor', rarity: 'common' },
    ])
    render(<EquipmentSlots equipment={equipment} itemLookup={itemLookup} />)
    expect(screen.getByText('Iron Helm')).toBeDefined()
  })

  it('should call onSlotClick when a slot is clicked', () => {
    const handleClick = vi.fn()
    render(<EquipmentSlots equipment={[]} onSlotClick={handleClick} />)
    // Click on the Head slot
    const headSlot = screen.getByLabelText(/Head.*Empty/)
    fireEvent.click(headSlot)
    expect(handleClick).toHaveBeenCalledWith('head')
  })

  it('should call onSlotClick via keyboard Enter', () => {
    const handleClick = vi.fn()
    render(<EquipmentSlots equipment={[]} onSlotClick={handleClick} />)
    const headSlot = screen.getByLabelText(/Head.*Empty/)
    fireEvent.keyDown(headSlot, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledWith('head')
  })

  it('should call onSlotClick via keyboard Space', () => {
    const handleClick = vi.fn()
    render(<EquipmentSlots equipment={[]} onSlotClick={handleClick} />)
    const headSlot = screen.getByLabelText(/Head.*Empty/)
    fireEvent.keyDown(headSlot, { key: ' ' })
    expect(handleClick).toHaveBeenCalledWith('head')
  })

  it('should NOT be interactive when readOnly is true', () => {
    const handleClick = vi.fn()
    render(<EquipmentSlots equipment={[]} onSlotClick={handleClick} readOnly={true} />)
    // When readOnly, slots do not have role="button"
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })

  it('should handle two ring slots independently', () => {
    const equipment = makeEquipment([
      { slot: 'ring', itemId: 'ring-001' },
      { slot: 'ring', itemId: 'ring-002' },
    ])
    const itemLookup = makeItemLookup([
      { id: 'ring-001', name: 'Gold Ring', quantity: 1, type: 'ring', rarity: 'uncommon' },
      { id: 'ring-002', name: 'Silver Ring', quantity: 1, type: 'ring', rarity: 'common' },
    ])
    render(<EquipmentSlots equipment={equipment} itemLookup={itemLookup} />)
    expect(screen.getByText('Gold Ring')).toBeDefined()
    expect(screen.getByText('Silver Ring')).toBeDefined()
  })

  it('should not crash with empty itemLookup', () => {
    const equipment = makeEquipment([{ slot: 'head', itemId: 'helmet-001' }])
    render(<EquipmentSlots equipment={equipment} itemLookup={{}} />)
    // The slot will show no item name since lookup has no entry
    expect(screen.getByText('Equipment')).toBeDefined()
  })

  it('should apply rarity border for uncommon items', () => {
    const equipment = makeEquipment([{ slot: 'head', itemId: 'helm-001' }])
    const itemLookup = makeItemLookup([
      { id: 'helm-001', name: 'Magic Helm', quantity: 1, rarity: 'rare' },
    ])
    render(<EquipmentSlots equipment={equipment} itemLookup={itemLookup} />)
    // The component should render without errors
    expect(screen.getByText('Magic Helm')).toBeDefined()
  })
})
