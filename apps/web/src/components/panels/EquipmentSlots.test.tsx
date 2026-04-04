import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquipmentSlots } from './EquipmentSlots'
import type { EquipmentSlot } from '../../types'

describe('EquipmentSlots', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render the Equipment header', () => {
    render(<EquipmentSlots equipment={[]} />)
    expect(screen.getByText('Equipment')).toBeDefined()
  })

  it('should render all 10 equipment slots when empty', () => {
    render(<EquipmentSlots equipment={[]} />)
    const expectedSlots = ['Head', 'Chest', 'Hands', 'Feet', 'Main Hand', 'Off Hand', 'Ring', 'Amulet', 'Cloak', 'Quiver']
    expectedSlots.forEach((label) => {
      expect(screen.getByText(label)).toBeDefined()
    })
  })

  it('should show "--" for empty slots', () => {
    render(<EquipmentSlots equipment={[]} />)
    const dashes = screen.getAllByText('--')
    expect(dashes.length).toBe(10)
  })

  it('should show "Equipped" for occupied slots', () => {
    const equipment: EquipmentSlot[] = [
      { slot: 'head', itemId: 'helmet-001' },
      { slot: 'body', itemId: 'chainmail-001' },
    ]
    render(<EquipmentSlots equipment={equipment} />)
    const equippedLabels = screen.getAllByText('Equipped')
    expect(equippedLabels.length).toBe(2)
  })

  it('should show "--" for slots with null itemId', () => {
    const equipment: EquipmentSlot[] = [
      { slot: 'head', itemId: null },
    ]
    render(<EquipmentSlots equipment={equipment} />)
    // Head slot should still show "--" since itemId is null
    const dashes = screen.getAllByText('--')
    expect(dashes.length).toBe(10)
  })

  it('should render slots in the correct order', () => {
    // Verify the order by checking the grid container
    const { container } = render(<EquipmentSlots equipment={[]} />)
    const gridItems = container.querySelectorAll('.grid-cols-2 > div')
    const texts = Array.from(gridItems).map((el) => {
      const labelEl = el.querySelector('.tracking-wider')
      return labelEl?.textContent?.trim() ?? ''
    })
    expect(texts).toEqual([
      'Head', 'Chest', 'Hands', 'Feet',
      'Main Hand', 'Off Hand', 'Ring',
      'Amulet', 'Cloak', 'Quiver',
    ])
  })

  it('should handle mixed equipped and empty slots', () => {
    const equipment: EquipmentSlot[] = [
      { slot: 'main_hand', itemId: 'sword-001' },
      { slot: 'ring', itemId: 'ring-001' },
    ]
    render(<EquipmentSlots equipment={equipment} />)
    const equippedLabels = screen.getAllByText('Equipped')
    const dashes = screen.getAllByText('--')
    expect(equippedLabels.length).toBe(2)
    expect(dashes.length).toBe(8)
  })

  it('should handle all slots equipped', () => {
    const equipment: EquipmentSlot[] = [
      { slot: 'head', itemId: 'h1' },
      { slot: 'body', itemId: 'b1' },
      { slot: 'hands', itemId: 'g1' },
      { slot: 'feet', itemId: 'b1' },
      { slot: 'main_hand', itemId: 's1' },
      { slot: 'off_hand', itemId: 'sh1' },
      { slot: 'ring', itemId: 'r1' },
      { slot: 'amulet', itemId: 'a1' },
      { slot: 'cloak', itemId: 'c1' },
      { slot: 'quiver', itemId: 'q1' },
    ]
    render(<EquipmentSlots equipment={equipment} />)
    const equippedLabels = screen.getAllByText('Equipped')
    expect(equippedLabels.length).toBe(10)
    expect(screen.queryByText('--')).toBeNull()
  })

  it('should handle unknown slot name gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const equipment: EquipmentSlot[] = [
      { slot: 'unknown_slot', itemId: 'item-001' },
    ]
    render(<EquipmentSlots equipment={equipment} />)
    // The unknown slot is not in SLOT_ORDER so it won't be rendered
    // Only the 10 standard slots are rendered
    const dashes = screen.getAllByText('--')
    expect(dashes.length).toBe(10)
    expect(warnSpy).toHaveBeenCalledWith(
      '[EquipmentSlots] Unknown equipment slots ignored: unknown_slot'
    )
  })
})
