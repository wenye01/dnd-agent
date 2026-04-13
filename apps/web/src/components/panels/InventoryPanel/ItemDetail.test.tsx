import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemDetail } from './ItemDetail'
import type { InventoryItem } from '../../../types'

const WEAPON_ITEM: InventoryItem = {
  id: 'sword-001',
  name: 'Longsword +1',
  quantity: 1,
  weight: 3,
  description: 'A finely crafted longsword.',
  type: 'weapon',
  rarity: 'uncommon',
  value: 500,
  damage: '1d8+1',
  damageType: 'slashing',
  equipSlot: 'main_hand',
}

const POTION_ITEM: InventoryItem = {
  id: 'potion-healing-001',
  name: 'Potion of Healing',
  quantity: 3,
  weight: 0.5,
  type: 'potion',
  rarity: 'common',
  value: 50,
  charges: 1,
  maxCharges: 1,
}

const ARMOR_ITEM: InventoryItem = {
  id: 'chainmail-001',
  name: 'Chain Mail',
  quantity: 1,
  weight: 55,
  type: 'armor',
  rarity: 'common',
  armorClass: 16,
  equipSlot: 'body',
}

const SCROLL_ITEM: InventoryItem = {
  id: 'scroll-fireball',
  name: 'Scroll of Fireball',
  quantity: 1,
  type: 'scroll',
  rarity: 'uncommon',
  value: 300,
  spellLevel: 3,
  spellId: 'fireball',
}

const WAND_ITEM: InventoryItem = {
  id: 'wand-magic-missile',
  name: 'Wand of Magic Missile',
  quantity: 1,
  type: 'wand',
  rarity: 'rare',
  charges: 5,
  maxCharges: 7,
}

describe('ItemDetail', () => {
  it('should return null when item is null', () => {
    const { container } = render(
      <ItemDetail item={null} isOpen={true} onClose={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  describe('Weapon item', () => {
    it('should display item name', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Longsword +1')).toBeDefined()
    })

    it('should display type label', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Weapon')).toBeDefined()
    })

    it('should display rarity', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('uncommon')).toBeDefined()
    })

    it('should display description', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('A finely crafted longsword.')).toBeDefined()
    })

    it('should display damage', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(/1d8\+1/)).toBeDefined()
    })

    it('should display weight', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(/3 lb/)).toBeDefined()
    })

    it('should display value', () => {
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(/500 gp/)).toBeDefined()
    })

    it('should show Equip button when not equipped', () => {
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onEquip={vi.fn()}
          isEquipped={false}
        />
      )
      expect(screen.getByText('Equip')).toBeDefined()
    })

    it('should show Unequip button when equipped', () => {
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUnequip={vi.fn()}
          isEquipped={true}
        />
      )
      expect(screen.getByText('Unequip')).toBeDefined()
    })

    it('should show Equipped badge when equipped', () => {
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          isEquipped={true}
        />
      )
      expect(screen.getByText('Equipped')).toBeDefined()
    })

    it('should NOT show Use button for weapons', () => {
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUse={vi.fn()}
        />
      )
      expect(screen.queryByText('Drink')).toBeNull()
      expect(screen.queryByText('Read')).toBeNull()
      expect(screen.queryByText('Use')).toBeNull()
    })

    it('should show Drop button when not equipped', () => {
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onDrop={vi.fn()}
          isEquipped={false}
        />
      )
      expect(screen.getByText('Drop')).toBeDefined()
    })

    it('should NOT show Drop button when equipped', () => {
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onDrop={vi.fn()}
          isEquipped={true}
        />
      )
      expect(screen.queryByText('Drop')).toBeNull()
    })
  })

  describe('Armor item', () => {
    it('should display armor class', () => {
      render(<ItemDetail item={ARMOR_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('+16')).toBeDefined()
    })

    it('should display type label Armor', () => {
      render(<ItemDetail item={ARMOR_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Armor')).toBeDefined()
    })
  })

  describe('Potion item', () => {
    it('should display quantity when > 1', () => {
      render(<ItemDetail item={POTION_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('3')).toBeDefined()
    })

    it('should show Drink button when onUse provided', () => {
      render(
        <ItemDetail
          item={POTION_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUse={vi.fn()}
        />
      )
      expect(screen.getByText('Drink')).toBeDefined()
    })

    it('should show charges info', () => {
      render(<ItemDetail item={POTION_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('1/1')).toBeDefined()
    })
  })

  describe('Scroll item', () => {
    it('should show Read button when onUse provided', () => {
      render(
        <ItemDetail
          item={SCROLL_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUse={vi.fn()}
        />
      )
      expect(screen.getByText('Read')).toBeDefined()
    })
  })

  describe('Wand item', () => {
    it('should show Use button when onUse provided', () => {
      render(
        <ItemDetail
          item={WAND_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUse={vi.fn()}
        />
      )
      expect(screen.getByText('Use')).toBeDefined()
    })

    it('should display charges', () => {
      render(<ItemDetail item={WAND_ITEM} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('5/7')).toBeDefined()
    })
  })

  describe('Rarity styles', () => {
    it('should display common rarity', () => {
      const item: InventoryItem = { id: 'i1', name: 'Item', quantity: 1, rarity: 'common' }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('common')).toBeDefined()
    })

    it('should display rare rarity', () => {
      const item: InventoryItem = { id: 'i1', name: 'Item', quantity: 1, rarity: 'rare' }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('rare')).toBeDefined()
    })

    it('should display very-rare rarity with space', () => {
      const item: InventoryItem = { id: 'i1', name: 'Item', quantity: 1, rarity: 'very-rare' }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('very rare')).toBeDefined()
    })

    it('should display legendary rarity', () => {
      const item: InventoryItem = { id: 'i1', name: 'Item', quantity: 1, rarity: 'legendary' }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('legendary')).toBeDefined()
    })

    it('should default to common when no rarity', () => {
      const item: InventoryItem = { id: 'i1', name: 'Item', quantity: 1 }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('common')).toBeDefined()
    })
  })

  describe('Interactions', () => {
    it('should call onEquip when Equip is clicked', () => {
      const handleEquip = vi.fn()
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onEquip={handleEquip}
          isEquipped={false}
        />
      )
      fireEvent.click(screen.getByText('Equip'))
      expect(handleEquip).toHaveBeenCalledWith(expect.objectContaining({ id: 'sword-001' }))
    })

    it('should call onUnequip when Unequip is clicked', () => {
      const handleUnequip = vi.fn()
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUnequip={handleUnequip}
          isEquipped={true}
        />
      )
      fireEvent.click(screen.getByText('Unequip'))
      expect(handleUnequip).toHaveBeenCalledWith(expect.objectContaining({ id: 'sword-001' }))
    })

    it('should call onUse when Drink is clicked for potion', () => {
      const handleUse = vi.fn()
      render(
        <ItemDetail
          item={POTION_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onUse={handleUse}
        />
      )
      fireEvent.click(screen.getByText('Drink'))
      expect(handleUse).toHaveBeenCalledWith(expect.objectContaining({ id: 'potion-healing-001' }))
    })

    it('should call onDrop when Drop is clicked', () => {
      const handleDrop = vi.fn()
      render(
        <ItemDetail
          item={WEAPON_ITEM}
          isOpen={true}
          onClose={vi.fn()}
          onDrop={handleDrop}
          isEquipped={false}
        />
      )
      fireEvent.click(screen.getByText('Drop'))
      expect(handleDrop).toHaveBeenCalledWith(expect.objectContaining({ id: 'sword-001' }))
    })

    it('should call onClose when Close is clicked', () => {
      const handleClose = vi.fn()
      render(<ItemDetail item={WEAPON_ITEM} isOpen={true} onClose={handleClose} />)
      fireEvent.click(screen.getByText('Close'))
      expect(handleClose).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle item without description', () => {
      const item: InventoryItem = { id: 'i1', name: 'Basic Item', quantity: 1 }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Basic Item')).toBeDefined()
    })

    it('should handle item without type', () => {
      const item: InventoryItem = { id: 'i1', name: 'Mystery Item', quantity: 1 }
      render(<ItemDetail item={item} isOpen={true} onClose={vi.fn()} />)
      // No type label should appear
      expect(screen.queryByText('Weapon')).toBeNull()
    })
  })
})
