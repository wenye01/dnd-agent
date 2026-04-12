/**
 * Integration test for v0.4 Phase 3 event system.
 * Tests that EventBus correctly routes inventory and spell events.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { eventBus } from './eventBus'
import { GameEvents } from './gameEvents'

describe('v0.4 EventBus Integration', () => {
  beforeEach(() => {
    eventBus.clear()
  })

  afterEach(() => {
    eventBus.clear()
  })

  describe('Inventory events', () => {
    it('should emit and receive INVENTORY_EQUIP events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.INVENTORY_EQUIP, handler)
      eventBus.emit(GameEvents.INVENTORY_EQUIP, {
        characterId: 'char-001',
        itemId: 'sword-001',
        slot: 'main_hand',
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'char-001',
        itemId: 'sword-001',
        slot: 'main_hand',
      })
    })

    it('should emit and receive INVENTORY_UNEQUIP events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.INVENTORY_UNEQUIP, handler)
      eventBus.emit(GameEvents.INVENTORY_UNEQUIP, {
        characterId: 'char-001',
        itemId: 'sword-001',
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'char-001',
        itemId: 'sword-001',
      })
    })

    it('should emit and receive INVENTORY_USE events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.INVENTORY_USE, handler)
      eventBus.emit(GameEvents.INVENTORY_USE, {
        characterId: 'char-001',
        itemId: 'potion-001',
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'char-001',
        itemId: 'potion-001',
      })
    })

    it('should emit and receive INVENTORY_DROP events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.INVENTORY_DROP, handler)
      eventBus.emit(GameEvents.INVENTORY_DROP, {
        characterId: 'char-001',
        itemId: 'ring-001',
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'char-001',
        itemId: 'ring-001',
      })
    })
  })

  describe('Spell events', () => {
    it('should emit and receive SPELL_CAST events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.SPELL_CAST, handler)
      eventBus.emit(GameEvents.SPELL_CAST, {
        characterId: 'wizard-001',
        spellId: 'fireball',
        level: 3,
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'wizard-001',
        spellId: 'fireball',
        level: 3,
      })
    })

    it('should emit and receive SPELL_PREPARE events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.SPELL_PREPARE, handler)
      eventBus.emit(GameEvents.SPELL_PREPARE, {
        characterId: 'wizard-001',
        spellId: 'magic_missile',
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'wizard-001',
        spellId: 'magic_missile',
      })
    })

    it('should emit and receive SPELL_UNPREPARE events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.SPELL_UNPREPARE, handler)
      eventBus.emit(GameEvents.SPELL_UNPREPARE, {
        characterId: 'wizard-001',
        spellId: 'magic_missile',
      })
      expect(handler).toHaveBeenCalledWith({
        characterId: 'wizard-001',
        spellId: 'magic_missile',
      })
    })
  })

  describe('Scene map events', () => {
    it('should emit and receive SCENEMAP_TILE_CLICK events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.SCENEMAP_TILE_CLICK, handler)
      eventBus.emit(GameEvents.SCENEMAP_TILE_CLICK, {
        x: 5,
        y: 3,
        mapId: 'tavern',
        walkable: true,
      })
      expect(handler).toHaveBeenCalledWith({
        x: 5,
        y: 3,
        mapId: 'tavern',
        walkable: true,
      })
    })

    it('should emit and receive SCENEMAP_INTERACT events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.SCENEMAP_INTERACT, handler)
      eventBus.emit(GameEvents.SCENEMAP_INTERACT, {
        id: 'door_exit',
        type: 'door',
        name: 'Front Door',
        mapId: 'tavern',
      })
      expect(handler).toHaveBeenCalledWith({
        id: 'door_exit',
        type: 'door',
        name: 'Front Door',
        mapId: 'tavern',
      })
    })

    it('should emit and receive SCENEMAP_TRANSITION_START events', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.SCENEMAP_TRANSITION_START, handler)
      eventBus.emit(GameEvents.SCENEMAP_TRANSITION_START, {
        mapId: 'village',
        entryPoint: { x: 10, y: 14 },
      })
      expect(handler).toHaveBeenCalledWith({
        mapId: 'village',
        entryPoint: { x: 10, y: 14 },
      })
    })
  })

  describe('event isolation', () => {
    it('should not cross-contaminate inventory and spell events', () => {
      const inventoryHandler = vi.fn()
      const spellHandler = vi.fn()
      eventBus.on(GameEvents.INVENTORY_EQUIP, inventoryHandler)
      eventBus.on(GameEvents.SPELL_CAST, spellHandler)

      eventBus.emit(GameEvents.INVENTORY_EQUIP, { itemId: 'sword' })
      expect(inventoryHandler).toHaveBeenCalledTimes(1)
      expect(spellHandler).not.toHaveBeenCalled()

      eventBus.emit(GameEvents.SPELL_CAST, { spellId: 'fireball' })
      expect(spellHandler).toHaveBeenCalledTimes(1)
      expect(inventoryHandler).toHaveBeenCalledTimes(1)
    })

    it('should properly unsubscribe from events', () => {
      const handler = vi.fn()
      const unsub = eventBus.on(GameEvents.INVENTORY_DROP, handler)

      eventBus.emit(GameEvents.INVENTORY_DROP, { itemId: 'ring' })
      expect(handler).toHaveBeenCalledTimes(1)

      unsub()

      eventBus.emit(GameEvents.INVENTORY_DROP, { itemId: 'potion' })
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })
})
