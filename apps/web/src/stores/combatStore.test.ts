import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCombatStore, type TargetMode } from './combatStore'
import type { Combatant, CombatState } from '@/types'
import { eventBus } from '@/events'
import { GameEvents } from '@/events/gameEvents'

function createMockCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'fighter-1',
    name: 'Hero',
    type: 'player',
    maxHp: 30,
    currentHp: 30,
    temporaryHp: 0,
    ac: 16,
    speed: 30,
    dexScore: 14,
    action: 'available',
    bonusAction: 'available',
    reaction: 'available',
    conditions: [],
    ...overrides,
  }
}

function createMockCombatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    status: 'active',
    round: 1,
    turnIndex: 0,
    initiatives: [
      { characterId: 'fighter-1', initiative: 18, hasActed: false },
      { characterId: 'goblin-1', initiative: 12, hasActed: false },
    ],
    participants: [
      createMockCombatant({ id: 'fighter-1', name: 'Hero', type: 'player' }),
      createMockCombatant({
        id: 'goblin-1',
        name: 'Goblin',
        type: 'enemy',
        cr: 0.25,
      }),
    ],
    activeEffects: [],
    ...overrides,
  }
}

describe('combatStore', () => {
  beforeEach(() => {
    useCombatStore.getState().reset()
    eventBus.clear()
  })

  describe('initial state', () => {
    it('should have null combat', () => {
      expect(useCombatStore.getState().combat).toBeNull()
    })

    it('should not be combat active', () => {
      expect(useCombatStore.getState().isCombatActive).toBe(false)
    })

    it('should have no current unit', () => {
      expect(useCombatStore.getState().currentUnitId).toBeNull()
    })

    it('should have target mode none', () => {
      expect(useCombatStore.getState().targetMode).toBe('none')
    })

    it('should have empty valid targets', () => {
      expect(useCombatStore.getState().validTargetIds).toEqual([])
    })

    it('should have no selected target', () => {
      expect(useCombatStore.getState().selectedTargetId).toBeNull()
    })

    it('should have empty move range', () => {
      expect(useCombatStore.getState().moveRange).toEqual([])
    })

    it('should have empty log entries', () => {
      expect(useCombatStore.getState().logEntries).toEqual([])
    })
  })

  describe('setCombat', () => {
    it('should set combat state', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      expect(useCombatStore.getState().combat).toEqual(combat)
    })

    it('should set isCombatActive to true when status is active', () => {
      const combat = createMockCombatState({ status: 'active' })
      useCombatStore.getState().setCombat(combat)

      expect(useCombatStore.getState().isCombatActive).toBe(true)
    })

    it('should set isCombatActive to false when status is idle', () => {
      const combat = createMockCombatState({ status: 'idle' })
      useCombatStore.getState().setCombat(combat)

      expect(useCombatStore.getState().isCombatActive).toBe(false)
    })

    it('should set isCombatActive to false when status is ended', () => {
      const combat = createMockCombatState({ status: 'ended' })
      useCombatStore.getState().setCombat(combat)

      expect(useCombatStore.getState().isCombatActive).toBe(false)
    })

    it('should set combat to null', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)
      useCombatStore.getState().setCombat(null)

      expect(useCombatStore.getState().combat).toBeNull()
      expect(useCombatStore.getState().isCombatActive).toBe(false)
    })
  })

  describe('setCurrentUnit', () => {
    it('should set current unit id', () => {
      useCombatStore.getState().setCurrentUnit('fighter-1')
      expect(useCombatStore.getState().currentUnitId).toBe('fighter-1')
    })

    it('should clear current unit with null', () => {
      useCombatStore.getState().setCurrentUnit('fighter-1')
      useCombatStore.getState().setCurrentUnit(null)
      expect(useCombatStore.getState().currentUnitId).toBeNull()
    })
  })

  describe('setTargetMode', () => {
    it('should set target mode', () => {
      useCombatStore.getState().setTargetMode('attack')
      expect(useCombatStore.getState().targetMode).toBe('attack')
    })

    it('should accept all valid target modes', () => {
      const modes: TargetMode[] = ['none', 'attack', 'spell', 'item']
      for (const mode of modes) {
        useCombatStore.getState().setTargetMode(mode)
        expect(useCombatStore.getState().targetMode).toBe(mode)
      }
    })
  })

  describe('setValidTargets', () => {
    it('should set valid target ids', () => {
      useCombatStore.getState().setValidTargets(['goblin-1', 'goblin-2'])
      expect(useCombatStore.getState().validTargetIds).toEqual(['goblin-1', 'goblin-2'])
    })
  })

  describe('setSelectedTarget', () => {
    it('should set selected target id', () => {
      useCombatStore.getState().setSelectedTarget('goblin-1')
      expect(useCombatStore.getState().selectedTargetId).toBe('goblin-1')
    })
  })

  describe('setMoveRange', () => {
    it('should set move range cells', () => {
      const cells = [{ x: 1, y: 0 }, { x: 2, y: 0 }]
      useCombatStore.getState().setMoveRange(cells)
      expect(useCombatStore.getState().moveRange).toEqual(cells)
    })
  })

  describe('addLogEntry', () => {
    it('should add a log entry with text and type', () => {
      useCombatStore.getState().addLogEntry('Combat has started!', 'system')
      const entries = useCombatStore.getState().logEntries

      expect(entries).toHaveLength(1)
      expect(entries[0].text).toBe('Combat has started!')
      expect(entries[0].type).toBe('system')
      expect(entries[0].id).toBeDefined()
      expect(entries[0].timestamp).toBeTypeOf('number')
    })

    it('should append entries preserving order', () => {
      useCombatStore.getState().addLogEntry('First', 'info')
      useCombatStore.getState().addLogEntry('Second', 'damage')

      const entries = useCombatStore.getState().logEntries
      expect(entries).toHaveLength(2)
      expect(entries[0].text).toBe('First')
      expect(entries[1].text).toBe('Second')
    })

    it('should support all log entry types', () => {
      const types = ['info', 'damage', 'heal', 'status', 'turn', 'system'] as const
      for (const type of types) {
        useCombatStore.getState().addLogEntry(`Entry ${type}`, type)
      }
      const entries = useCombatStore.getState().logEntries
      expect(entries).toHaveLength(types.length)
      types.forEach((type, i) => {
        expect(entries[i].type).toBe(type)
      })
    })
  })

  describe('getCombatant', () => {
    it('should return undefined when no combat state', () => {
      expect(useCombatStore.getState().getCombatant('fighter-1')).toBeUndefined()
    })

    it('should find combatant by id', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      const found = useCombatStore.getState().getCombatant('fighter-1')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Hero')
    })

    it('should return undefined for non-existent id', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      expect(useCombatStore.getState().getCombatant('nonexistent')).toBeUndefined()
    })
  })

  describe('updateCombatant', () => {
    it('should update specific fields on a combatant', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().updateCombatant('fighter-1', { currentHp: 20 })

      const updated = useCombatStore.getState().getCombatant('fighter-1')
      expect(updated?.currentHp).toBe(20)
    })

    it('should not modify other combatants', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().updateCombatant('fighter-1', { currentHp: 20 })

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(30)
    })

    it('should do nothing when combat is null', () => {
      useCombatStore.getState().updateCombatant('fighter-1', { currentHp: 20 })
      expect(useCombatStore.getState().combat).toBeNull()
    })

    it('should not add a new combatant for unknown id', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().updateCombatant('unknown', { currentHp: 10 })

      // map() creates a new entry for unknown id (it maps all elements, matching none)
      // So the unknown id is NOT found by map and the array remains unchanged
      const participants = useCombatStore.getState().combat?.participants
      expect(participants).toHaveLength(2)
      expect(useCombatStore.getState().getCombatant('unknown')).toBeUndefined()
    })

    it('should update multiple fields at once', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().updateCombatant('fighter-1', {
        currentHp: 10,
        conditions: [{ condition: 'poisoned', duration: 0, remaining: 0 }],
        action: 'used',
      })

      const updated = useCombatStore.getState().getCombatant('fighter-1')
      expect(updated?.currentHp).toBe(10)
      expect(updated?.conditions).toEqual([{ condition: 'poisoned', duration: 0, remaining: 0 }])
      expect(updated?.action).toBe('used')
    })
  })

  describe('requestMove', () => {
    it('should emit COMBAT_MOVE_CONFIRM event with current unit and position', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.COMBAT_MOVE_CONFIRM, handler)

      useCombatStore.getState().setCurrentUnit('fighter-1')
      useCombatStore.getState().requestMove({ x: 3, y: 2 })

      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith({
        unitId: 'fighter-1',
        position: { x: 3, y: 2 },
      })
    })

    it('should not emit event when no current unit', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.COMBAT_MOVE_CONFIRM, handler)

      useCombatStore.getState().requestMove({ x: 3, y: 2 })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('requestAttack', () => {
    it('should emit COMBAT_TARGET_SELECT event with source and target ids', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.COMBAT_TARGET_SELECT, handler)

      useCombatStore.getState().setCurrentUnit('fighter-1')
      useCombatStore.getState().requestAttack('goblin-1')

      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith({
        sourceId: 'fighter-1',
        targetId: 'goblin-1',
      })
    })

    it('should not emit event when no current unit', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.COMBAT_TARGET_SELECT, handler)

      useCombatStore.getState().requestAttack('goblin-1')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('requestAction', () => {
    it('should emit COMBAT_UNIT_SELECT event with action and data', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.COMBAT_UNIT_SELECT, handler)

      useCombatStore.getState().requestAction('dodge')
      expect(handler).toHaveBeenCalledWith({ action: 'dodge' })
    })

    it('should spread additional data into the event payload', () => {
      const handler = vi.fn()
      eventBus.on(GameEvents.COMBAT_UNIT_SELECT, handler)

      useCombatStore.getState().requestAction('spell', { spellId: 'fireball', level: 3 })

      expect(handler).toHaveBeenCalledWith({
        action: 'spell',
        spellId: 'fireball',
        level: 3,
      })
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const combat = createMockCombatState()
      const store = useCombatStore.getState()

      store.setCombat(combat)
      store.setCurrentUnit('fighter-1')
      store.setTargetMode('attack')
      store.setValidTargets(['goblin-1'])
      store.setSelectedTarget('goblin-1')
      store.setMoveRange([{ x: 1, y: 0 }])
      store.addLogEntry('Test', 'info')

      store.reset()

      const state = useCombatStore.getState()
      expect(state.combat).toBeNull()
      expect(state.isCombatActive).toBe(false)
      expect(state.currentUnitId).toBeNull()
      expect(state.targetMode).toBe('none')
      expect(state.validTargetIds).toEqual([])
      expect(state.selectedTargetId).toBeNull()
      expect(state.moveRange).toEqual([])
      expect(state.logEntries).toEqual([])
    })
  })

  // ---------------------------------------------------------------
  // v0.4 Phase 4: handleCombatSpellCast tests
  // ---------------------------------------------------------------
  describe('handleCombatSpellCast', () => {
    it('should apply damage to target combatant', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-1',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
        damage: 10,
        damageType: 'force',
      })

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(20) // 30 - 10 = 20
    })

    it('should not reduce HP below 0 from spell damage', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-2',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'disintegrate',
        spellName: 'Disintegrate',
        slotLevelUsed: 6,
        concentrating: false,
        damage: 999,
        damageType: 'force',
      })

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(0)
    })

    it('should apply healing to caster combatant', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 15 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-3',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        spellId: 'cure_wounds',
        spellName: 'Cure Wounds',
        slotLevelUsed: 1,
        concentrating: false,
        healing: 10,
      })

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(25) // 15 + 10 = 25
    })

    it('should cap healing at maxHp', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 28, maxHp: 30 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-4',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        spellId: 'cure_wounds',
        spellName: 'Cure Wounds',
        slotLevelUsed: 1,
        concentrating: false,
        healing: 10,
      })

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(30)
    })

    it('should add damage log entry when damage is dealt', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-5',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'fireball',
        spellName: 'Fireball',
        slotLevelUsed: 3,
        concentrating: false,
        damage: 28,
        damageType: 'fire',
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries.length).toBeGreaterThan(0)
      expect(entries[entries.length - 1].text).toContain('Fireball')
      expect(entries[entries.length - 1].text).toContain('28')
      expect(entries[entries.length - 1].type).toBe('damage')
    })

    it('should add heal log entry when healing is applied', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 10 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-6',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        spellId: 'cure_wounds',
        spellName: 'Cure Wounds',
        slotLevelUsed: 1,
        concentrating: false,
        healing: 8,
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries[entries.length - 1].text).toContain('Cure Wounds')
      expect(entries[entries.length - 1].text).toContain('8')
      expect(entries[entries.length - 1].type).toBe('heal')
    })

    it('should add info log entry when spell has no damage or healing', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-7',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        spellId: 'shield',
        spellName: 'Shield',
        slotLevelUsed: 1,
        concentrating: false,
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries[entries.length - 1].text).toContain('Shield')
      expect(entries[entries.length - 1].type).toBe('info')
    })

    it('should emit SPELL_CAST event on eventBus', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)
      const handler = vi.fn()
      eventBus.on(GameEvents.SPELL_CAST, handler)

      const payload = {
        eventId: 'spell-8',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
        damage: 5,
        damageType: 'force',
      }

      useCombatStore.getState().handleCombatSpellCast(payload)
      expect(handler).toHaveBeenCalledWith(payload)
    })

    it('should emit EFFECT_DAMAGE event when damage is dealt', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)
      const handler = vi.fn()
      eventBus.on(GameEvents.EFFECT_DAMAGE, handler)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-9',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
        damage: 10,
        damageType: 'force',
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'damage',
          target: 'goblin-1',
          damage: 10,
          damageType: 'force',
        }),
      )
    })

    it('should emit EFFECT_HEAL event when healing is applied', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 10 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)
      const handler = vi.fn()
      eventBus.on(GameEvents.EFFECT_HEAL, handler)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-10',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        spellId: 'cure_wounds',
        spellName: 'Cure Wounds',
        slotLevelUsed: 1,
        concentrating: false,
        healing: 8,
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'heal',
          characterId: 'fighter-1',
          amount: 8,
        }),
      )
    })

    it('should do nothing when combat is null', () => {
      expect(useCombatStore.getState().combat).toBeNull()

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-11',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
        damage: 10,
        damageType: 'force',
      })

      expect(useCombatStore.getState().combat).toBeNull()
      expect(useCombatStore.getState().logEntries).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------
  // v0.4 Phase 4: handleCombatItemUse tests
  // ---------------------------------------------------------------
  describe('handleCombatItemUse', () => {
    it('should apply healing to the character using the item', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 15 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-1',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(23) // 15 + 8 = 23
    })

    it('should cap item healing at maxHp', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 28, maxHp: 30 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-2',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 10,
      })

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(30)
    })

    it('should apply damage to target combatant', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-3',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        itemId: 'alchemist-fire-1',
        itemName: 'Alchemist\'s Fire',
        itemType: 'consumable',
        consumed: true,
        damage: 7,
      })

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(23) // 30 - 7 = 23
    })

    it('should not reduce target HP below 0 from item damage', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-4',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        itemId: 'bomb-1',
        itemName: 'Bomb',
        itemType: 'consumable',
        consumed: true,
        damage: 999,
      })

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(0)
    })

    it('should add heal log entry when healing is applied', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 10 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-5',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries[entries.length - 1].text).toContain('Healing Potion')
      expect(entries[entries.length - 1].text).toContain('8')
      expect(entries[entries.length - 1].type).toBe('heal')
    })

    it('should add damage log entry when damage is dealt', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-6',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        itemId: 'alchemist-fire-1',
        itemName: 'Alchemist\'s Fire',
        itemType: 'consumable',
        consumed: true,
        damage: 7,
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries[entries.length - 1].text).toContain('Alchemist\'s Fire')
      expect(entries[entries.length - 1].text).toContain('7')
      expect(entries[entries.length - 1].type).toBe('damage')
    })

    it('should emit ITEM_USE event on eventBus', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)
      const handler = vi.fn()
      eventBus.on(GameEvents.ITEM_USE, handler)

      const payload = {
        eventId: 'item-7',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      }

      useCombatStore.getState().handleCombatItemUse(payload)
      expect(handler).toHaveBeenCalledWith(payload)
    })

    it('should emit EFFECT_HEAL event when healing is applied', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 10 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)
      const handler = vi.fn()
      eventBus.on(GameEvents.EFFECT_HEAL, handler)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-8',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'heal',
          characterId: 'fighter-1',
          amount: 8,
        }),
      )
    })

    it('should add info log entry for items with no damage or healing', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-9',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'torch-1',
        itemName: 'Torch',
        itemType: 'tool',
        consumed: false,
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries[entries.length - 1].text).toContain('Torch')
      expect(entries[entries.length - 1].type).toBe('info')
    })

    it('should do nothing when combat is null', () => {
      expect(useCombatStore.getState().combat).toBeNull()

      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-10',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      expect(useCombatStore.getState().combat).toBeNull()
      expect(useCombatStore.getState().logEntries).toHaveLength(0)
    })
  })

  describe('applyDamage', () => {
    it('should reduce currentHp by damage amount', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyDamage('fighter-1', 5)

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(25)
    })

    it('should not reduce currentHp below 0', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyDamage('fighter-1', 100)

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(0)
    })

    it('should absorb damage with temporaryHp first', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', temporaryHp: 5, currentHp: 20 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      // 7 damage: 5 absorbed by temp, 2 hits currentHp
      useCombatStore.getState().applyDamage('fighter-1', 7)

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.temporaryHp).toBe(0)
      expect(fighter?.currentHp).toBe(18)
    })

    it('should fully absorb damage when tempHp >= damage', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', temporaryHp: 10, currentHp: 20 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyDamage('fighter-1', 5)

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.temporaryHp).toBe(5)
      expect(fighter?.currentHp).toBe(20)
    })

    it('should not modify other combatants', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyDamage('fighter-1', 5)

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(30)
      expect(goblin?.temporaryHp).toBe(0)
    })

    it('should do nothing when combat is null', () => {
      useCombatStore.getState().applyDamage('fighter-1', 5)
      expect(useCombatStore.getState().combat).toBeNull()
    })
  })

  describe('applyHeal', () => {
    it('should increase currentHp by heal amount', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 10 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy' }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyHeal('fighter-1', 5)

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(15)
    })

    it('should cap healing at maxHp', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyHeal('fighter-1', 100)

      const fighter = useCombatStore.getState().getCombatant('fighter-1')
      expect(fighter?.currentHp).toBe(30)
    })

    it('should not modify other combatants', () => {
      const combat = createMockCombatState({
        participants: [
          createMockCombatant({ id: 'fighter-1', name: 'Hero', currentHp: 10 }),
          createMockCombatant({ id: 'goblin-1', name: 'Goblin', type: 'enemy', currentHp: 5 }),
        ],
      })
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().applyHeal('fighter-1', 5)

      const goblin = useCombatStore.getState().getCombatant('goblin-1')
      expect(goblin?.currentHp).toBe(5)
    })

    it('should do nothing when combat is null', () => {
      useCombatStore.getState().applyHeal('fighter-1', 5)
      expect(useCombatStore.getState().combat).toBeNull()
    })
  })

  // Additional edge-case tests for improved coverage
  describe('handleCombatSpellCast - log truncation', () => {
    it('should truncate log entries when exceeding 100 entries', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      // Add 100 log entries via addLogEntry first
      for (let i = 0; i < 100; i++) {
        useCombatStore.getState().addLogEntry(`Entry ${i}`, 'info')
      }
      expect(useCombatStore.getState().logEntries).toHaveLength(100)

      // Now cast a spell which adds one more entry, triggering truncation
      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-trunc-1',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
        damage: 5,
        damageType: 'force',
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries).toHaveLength(100)
      // The oldest entry should have been removed
      expect(entries[0].text).toBe('Entry 1')
      // The newest entry should be the spell cast
      expect(entries[99].text).toContain('Magic Missile')
    })

    it('should format damage log without damageType when not provided', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      useCombatStore.getState().handleCombatSpellCast({
        eventId: 'spell-nodtype-1',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        targetId: 'goblin-1',
        spellId: 'eldritch_blast',
        spellName: 'Eldritch Blast',
        slotLevelUsed: 0,
        concentrating: false,
        damage: 8,
        // damageType intentionally omitted
      })

      const entries = useCombatStore.getState().logEntries
      const lastEntry = entries[entries.length - 1]
      expect(lastEntry.text).toContain('Eldritch Blast')
      expect(lastEntry.text).toContain('8')
      expect(lastEntry.type).toBe('damage')
    })
  })

  describe('handleCombatItemUse - log truncation', () => {
    it('should truncate log entries when exceeding 100 entries', () => {
      const combat = createMockCombatState()
      useCombatStore.getState().setCombat(combat)

      // Add 100 log entries first
      for (let i = 0; i < 100; i++) {
        useCombatStore.getState().addLogEntry(`Entry ${i}`, 'info')
      }
      expect(useCombatStore.getState().logEntries).toHaveLength(100)

      // Now use an item which triggers truncation
      useCombatStore.getState().handleCombatItemUse({
        eventId: 'item-trunc-1',
        timestamp: Date.now(),
        characterId: 'fighter-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      const entries = useCombatStore.getState().logEntries
      expect(entries).toHaveLength(100)
      expect(entries[99].text).toContain('Healing Potion')
    })
  })
})
