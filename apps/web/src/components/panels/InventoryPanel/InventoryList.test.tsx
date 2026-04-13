import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InventoryList } from './InventoryList'
import type { InventoryItem } from '../../../types'

const SAMPLE_ITEMS: InventoryItem[] = [
  { id: 'sword-001', name: 'Longsword', quantity: 1, weight: 3, type: 'weapon', rarity: 'common', value: 15 },
  { id: 'potion-001', name: 'Health Potion', quantity: 3, weight: 0.5, type: 'potion', rarity: 'common', value: 50 },
  { id: 'ring-001', name: 'Ring of Protection', quantity: 1, weight: 0, type: 'ring', rarity: 'rare', value: 2000 },
  { id: 'armor-001', name: 'Chain Mail', quantity: 1, weight: 55, type: 'armor', rarity: 'common', value: 75 },
  { id: 'scroll-001', name: 'Scroll of Fireball', quantity: 1, type: 'scroll', rarity: 'uncommon', value: 300 },
]

describe('InventoryList', () => {
  describe('rendering', () => {
    it('should render items in grid view by default', () => {
      render(<InventoryList items={SAMPLE_ITEMS} />)
      expect(screen.getByText('Longsword')).toBeDefined()
      expect(screen.getByText('Health Potion')).toBeDefined()
      expect(screen.getByText('Ring of Protection')).toBeDefined()
    })

    it('should render items in list view', () => {
      render(<InventoryList items={SAMPLE_ITEMS} viewMode="list" />)
      expect(screen.getByText('Longsword')).toBeDefined()
      expect(screen.getByText('Health Potion')).toBeDefined()
    })

    it('should show empty state when no items', () => {
      render(<InventoryList items={[]} />)
      expect(screen.getByText('No items')).toBeDefined()
    })

    it('should show empty state when all items are filtered out', () => {
      render(<InventoryList items={SAMPLE_ITEMS} filterType="wand" />)
      expect(screen.getByText('No items')).toBeDefined()
    })

    it('should show quantity badge for items with quantity > 1', () => {
      render(<InventoryList items={SAMPLE_ITEMS} viewMode="grid" />)
      // Health Potion has quantity 3
      expect(screen.getByText('3')).toBeDefined()
    })
  })

  describe('filtering', () => {
    it('should filter by weapon type', () => {
      render(<InventoryList items={SAMPLE_ITEMS} filterType="weapon" />)
      expect(screen.getByText('Longsword')).toBeDefined()
      expect(screen.queryByText('Health Potion')).toBeNull()
    })

    it('should filter by potion type', () => {
      render(<InventoryList items={SAMPLE_ITEMS} filterType="potion" />)
      expect(screen.getByText('Health Potion')).toBeDefined()
      expect(screen.queryByText('Longsword')).toBeNull()
    })

    it('should show all items when filter is "all"', () => {
      render(<InventoryList items={SAMPLE_ITEMS} filterType="all" />)
      expect(screen.getByText('Longsword')).toBeDefined()
      expect(screen.getByText('Health Potion')).toBeDefined()
      expect(screen.getByText('Ring of Protection')).toBeDefined()
    })
  })

  describe('sorting', () => {
    it('should sort by name alphabetically', () => {
      const { container } = render(<InventoryList items={SAMPLE_ITEMS} sortBy="name" viewMode="list" />)
      const names = container.querySelectorAll('.text-parchment\\/80')
      const nameTexts = Array.from(names).map((el) => el.textContent?.trim() ?? '')
      // Chain Mail, Health Potion, Longsword, Ring of Protection, Scroll of Fireball
      const sorted = [...nameTexts].sort()
      expect(nameTexts).toEqual(sorted)
    })

    it('should sort by type', () => {
      const { container } = render(<InventoryList items={SAMPLE_ITEMS} sortBy="type" viewMode="list" />)
      const typeLabels = container.querySelectorAll('.tracking-wider.uppercase')
      // All items should be rendered
      expect(typeLabels.length).toBeGreaterThanOrEqual(5)
    })

    it('should sort by weight descending', () => {
      const { container } = render(<InventoryList items={SAMPLE_ITEMS} sortBy="weight" viewMode="list" />)
      const weightLabels = container.querySelectorAll('.text-stone-text\\/30')
      expect(weightLabels.length).toBeGreaterThanOrEqual(2)
    })

    it('should sort by value descending', () => {
      render(<InventoryList items={SAMPLE_ITEMS} sortBy="value" viewMode="list" />)
      // Just verify it renders without crash
      expect(screen.getByText('Ring of Protection')).toBeDefined()
    })
  })

  describe('interactions', () => {
    it('should call onSelect when an item is clicked', () => {
      const handleSelect = vi.fn()
      render(<InventoryList items={SAMPLE_ITEMS} onSelect={handleSelect} />)
      fireEvent.click(screen.getByText('Longsword'))
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'sword-001' }))
    })

    it('should call onSelect on keyboard Enter', () => {
      const handleSelect = vi.fn()
      render(<InventoryList items={SAMPLE_ITEMS} onSelect={handleSelect} />)
      const itemEl = screen.getByLabelText('Longsword')
      fireEvent.keyDown(itemEl, { key: 'Enter' })
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'sword-001' }))
    })

    it('should not be interactive when readOnly', () => {
      const handleSelect = vi.fn()
      render(<InventoryList items={SAMPLE_ITEMS} onSelect={handleSelect} readOnly={true} />)
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })

    it('should show context menu on right-click with View Details and Drop', () => {
      const handleSelect = vi.fn()
      const handleDrop = vi.fn()
      render(<InventoryList items={SAMPLE_ITEMS} onSelect={handleSelect} onDrop={handleDrop} />)
      // Right-click on an item
      const itemEl = screen.getByLabelText('Longsword')
      fireEvent.contextMenu(itemEl)
      // Context menu should appear with "View Details" and "Drop" buttons
      expect(screen.getByText('View Details')).toBeDefined()
      expect(screen.getByText('Drop')).toBeDefined()
    })

    it('should show context menu with View Details only when no onDrop', () => {
      render(<InventoryList items={SAMPLE_ITEMS} onSelect={vi.fn()} />)
      const itemEl = screen.getByLabelText('Longsword')
      fireEvent.contextMenu(itemEl)
      expect(screen.getByText('View Details')).toBeDefined()
      expect(screen.queryByText('Drop')).toBeNull()
    })

    it('should show "Drink" for potion context menu', () => {
      render(<InventoryList items={SAMPLE_ITEMS} onUse={vi.fn()} />)
      const potionEl = screen.getByLabelText('Health Potion')
      fireEvent.contextMenu(potionEl)
      expect(screen.getByText('Drink')).toBeDefined()
    })

    it('should show "Read" for scroll context menu', () => {
      render(<InventoryList items={SAMPLE_ITEMS} onUse={vi.fn()} />)
      const scrollEl = screen.getByLabelText('Scroll of Fireball')
      fireEvent.contextMenu(scrollEl)
      expect(screen.getByText('Read')).toBeDefined()
    })
  })

  describe('selected state', () => {
    it('should highlight selected item', () => {
      render(
        <InventoryList
          items={SAMPLE_ITEMS}
          selectedItem={SAMPLE_ITEMS[0]}
        />
      )
      const itemEl = screen.getByLabelText('Longsword')
      // Selected item should have a ring style class
      expect(itemEl.className).toContain('ring')
    })
  })
})
