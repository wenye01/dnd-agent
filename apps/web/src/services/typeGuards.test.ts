/**
 * Type guard unit tests for services/typeGuards.ts
 *
 * Tests the three type guards NOT covered by websocket.test.ts:
 *   - isGameStateData
 *   - isPartyData
 *   - isCombatData
 *
 * Also provides exhaustive coverage for isCombatEventPayload (all 20 event
 * types) and isStateUpdatePayload (all 5 state types) to catch regressions
 * if COMBAT_EVENT_TYPES or STATE_UPDATE_TYPES arrays are modified.
 */

import { describe, it, expect } from 'vitest'
import {
  isGameStateData,
  isPartyData,
  isCombatData,
  isCombatEventPayload,
  isStateUpdatePayload,
  isSpellCastPayload,
  isItemUsePayload,
  isEquipPayload,
  isUnequipPayload,
  isMapInteractPayload,
  isMapSwitchPayload,
} from './typeGuards'
import { COMBAT_EVENT_TYPES, STATE_UPDATE_TYPES, GAME_EVENT_TYPES } from '../config/constants'

// ---------------------------------------------------------------
// Shared: non-object inputs that should fail every type guard
// ---------------------------------------------------------------
const NON_OBJECTS: Array<{ name: string; value: unknown }> = [
  { name: 'null', value: null },
  { name: 'undefined', value: undefined },
  { name: 'string', value: 'str' },
  { name: 'number', value: 42 },
  { name: 'boolean', value: true },
]

// ---------------------------------------------------------------
// isGameStateData
// ---------------------------------------------------------------
describe('isGameStateData', () => {
  it('should accept objects with a string sessionId', () => {
    expect(isGameStateData({ sessionId: 'abc123' })).toBe(true)
    expect(isGameStateData({ sessionId: 's1', phase: 'combat', currentMapId: 'map-1' })).toBe(true)
  })

  it('should reject objects without sessionId', () => {
    expect(isGameStateData({})).toBe(false)
    expect(isGameStateData({ phase: 'combat' })).toBe(false)
  })

  it('should reject objects with wrong-type sessionId', () => {
    expect(isGameStateData({ sessionId: 123 })).toBe(false)
    expect(isGameStateData({ sessionId: null })).toBe(false)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isGameStateData(value)).toBe(false)
  })
})

// ---------------------------------------------------------------
// isPartyData
// ---------------------------------------------------------------
describe('isPartyData', () => {
  it('should accept valid character arrays', () => {
    expect(isPartyData([])).toBe(true)
    expect(isPartyData([{ id: 'c1', name: 'Hero', race: 'Human', class: 'Fighter', level: 1 }])).toBe(true)
    expect(isPartyData([
      { id: 'c1', name: 'A', race: 'Elf', class: 'Wizard', level: 3 },
      { id: 'c2', name: 'B', race: 'Dwarf', class: 'Cleric', level: 2 },
    ])).toBe(true)
  })

  it('should accept extra fields beyond the required ones', () => {
    expect(isPartyData([{ id: 'c1', name: 'Hero', race: 'Human', class: 'Fighter', level: 1, hp: 30 }])).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-array ($name)', ({ value }) => {
    expect(isPartyData(value)).toBe(false)
  })

  it('should reject arrays with elements missing required fields', () => {
    expect(isPartyData([{ name: 'Hero', race: 'Human', class: 'Fighter', level: 1 }])).toBe(false) // missing id
    expect(isPartyData([{ id: 'c1', race: 'Human', class: 'Fighter', level: 1 }])).toBe(false) // missing name
    expect(isPartyData([{ id: 'c1', name: 'Hero', class: 'Fighter', level: 1 }])).toBe(false) // missing race
    expect(isPartyData([{ id: 'c1', name: 'Hero', race: 'Human', level: 1 }])).toBe(false) // missing class
    expect(isPartyData([{ id: 'c1', name: 'Hero', race: 'Human', class: 'Fighter' }])).toBe(false) // missing level
  })

  it('should reject arrays with wrong-type fields', () => {
    expect(isPartyData([{ id: 123, name: 'Hero', race: 'Human', class: 'Fighter', level: 1 }])).toBe(false) // wrong id type
    expect(isPartyData([{ id: 'c1', name: 123, race: 'Human', class: 'Fighter', level: 1 }])).toBe(false) // wrong name type
  })

  it('should reject arrays with null/undefined elements', () => {
    expect(isPartyData([null])).toBe(false)
    expect(isPartyData([undefined])).toBe(false)
  })
})

// ---------------------------------------------------------------
// isCombatData
// ---------------------------------------------------------------
describe('isCombatData', () => {
  const validCombatData = {
    status: 'active',
    round: 1,
    turnIndex: 0,
    initiatives: [{ characterId: 'c1', initiative: 18, hasActed: false }],
    participants: [{ id: 'c1', name: 'Hero', type: 'player', maxHp: 30, currentHp: 25, temporaryHp: 0, ac: 15, speed: 30, dexScore: 14, action: 'available', bonusAction: 'available', reaction: 'available', conditions: [] }],
    activeEffects: [],
  }

  it('should accept valid combat data', () => {
    expect(isCombatData(validCombatData)).toBe(true)
  })

  it('should accept combat data with ended status', () => {
    expect(isCombatData({ ...validCombatData, status: 'ended' })).toBe(true)
  })

  it('should reject non-objects', () => {
    expect(isCombatData(null)).toBe(false)
    expect(isCombatData(undefined)).toBe(false)
    expect(isCombatData('string')).toBe(false)
    expect(isCombatData(42)).toBe(false)
  })

  it('should reject missing required fields', () => {
    expect(isCombatData({ ...validCombatData, round: undefined })).toBe(false)
    expect(isCombatData({ ...validCombatData, turnIndex: undefined })).toBe(false)
    expect(isCombatData({ ...validCombatData, initiatives: undefined })).toBe(false)
    expect(isCombatData({ ...validCombatData, participants: undefined })).toBe(false)
    expect(isCombatData({ ...validCombatData, activeEffects: undefined })).toBe(false)
    expect(isCombatData({ ...validCombatData, status: undefined })).toBe(false)
  })

  it('should reject wrong-type fields', () => {
    expect(isCombatData({ ...validCombatData, round: '1' })).toBe(false) // non-number round
    expect(isCombatData({ ...validCombatData, turnIndex: '0' })).toBe(false) // non-number turnIndex
    expect(isCombatData({ ...validCombatData, initiatives: 'not-array' })).toBe(false) // non-array initiatives
    expect(isCombatData({ ...validCombatData, participants: 'not-array' })).toBe(false) // non-array participants
    expect(isCombatData({ ...validCombatData, activeEffects: 'not-array' })).toBe(false) // non-array activeEffects
    expect(isCombatData({ ...validCombatData, status: 123 })).toBe(false) // non-string status
  })

  it('should reject when participants is not an array', () => {
    expect(isCombatData({ ...validCombatData, participants: null })).toBe(false)
    expect(isCombatData({ ...validCombatData, participants: {} })).toBe(false)
  })
})

// ---------------------------------------------------------------
// Exhaustive isCombatEventPayload — all 20 event types
// ---------------------------------------------------------------
describe('isCombatEventPayload (exhaustive)', () => {
  it('should accept every eventType in COMBAT_EVENT_TYPES', () => {
    for (const eventType of COMBAT_EVENT_TYPES) {
      expect(
        isCombatEventPayload({ eventType }),
        `Expected eventType "${eventType}" to be valid`,
      ).toBe(true)
    }
  })

  it('should accept payloads with extra optional fields', () => {
    expect(isCombatEventPayload({ eventType: 'attack', characterId: 'c1', target: 'goblin-1', damage: 12, damageType: 'slashing', isHit: true, isCrit: false })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'heal', characterId: 'c1', amount: 8 })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'condition_applied', characterId: 'c1', condition: 'poisoned' })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'move', characterId: 'c1', position: { x: 3, y: 5 } })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'initiative_rolled', initiatives: [{ characterId: 'c1', initiative: 18 }] })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'combat_start', data: { encounter: 'goblins' } })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'round_start', round: 2 })).toBe(true)
  })

  it('should reject invalid eventType values', () => {
    expect(isCombatEventPayload({ eventType: 'invalid' })).toBe(false)
    expect(isCombatEventPayload({ eventType: '' })).toBe(false)
    expect(isCombatEventPayload({ eventType: 'combat_started' })).toBe(false)
  })

  it('should reject payloads with missing or wrong-type eventType', () => {
    expect(isCombatEventPayload({})).toBe(false)
    expect(isCombatEventPayload({ eventType: 123 })).toBe(false)
    expect(isCombatEventPayload({ eventType: null })).toBe(false)
    expect(isCombatEventPayload(null)).toBe(false)
    expect(isCombatEventPayload(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------
// Exhaustive isStateUpdatePayload — all 5 state types
// ---------------------------------------------------------------
describe('isStateUpdatePayload (exhaustive)', () => {
  it('should accept every stateType in STATE_UPDATE_TYPES', () => {
    for (const stateType of STATE_UPDATE_TYPES) {
      expect(
        isStateUpdatePayload({ stateType, data: {} }),
        `Expected stateType "${stateType}" to be valid`,
      ).toBe(true)
    }
  })

  it('should reject invalid stateType values', () => {
    expect(isStateUpdatePayload({ stateType: 'invalid', data: {} })).toBe(false)
    expect(isStateUpdatePayload({ stateType: '', data: {} })).toBe(false)
    expect(isStateUpdatePayload({ stateType: 'characters', data: {} })).toBe(false)
  })

  it('should reject payloads with missing fields', () => {
    expect(isStateUpdatePayload({})).toBe(false)
    expect(isStateUpdatePayload({ stateType: 'game' })).toBe(false)
    expect(isStateUpdatePayload({ data: {} })).toBe(false)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isStateUpdatePayload(value)).toBe(false)
  })
})

// ---------------------------------------------------------------
// v0.4 Phase 4: Type guards for new game event payloads
// ---------------------------------------------------------------

describe('GAME_EVENT_TYPES', () => {
  it('should contain all 6 game event types', () => {
    expect(GAME_EVENT_TYPES).toHaveLength(6)
    expect(GAME_EVENT_TYPES).toContain('spell_cast')
    expect(GAME_EVENT_TYPES).toContain('item_use')
    expect(GAME_EVENT_TYPES).toContain('equip')
    expect(GAME_EVENT_TYPES).toContain('unequip')
    expect(GAME_EVENT_TYPES).toContain('map_interact')
    expect(GAME_EVENT_TYPES).toContain('map_switch')
  })

  it('should have no duplicates', () => {
    const unique = new Set(GAME_EVENT_TYPES)
    expect(unique.size).toBe(GAME_EVENT_TYPES.length)
  })
})

describe('isSpellCastPayload', () => {
  const validPayload = {
    eventId: 'spell-1',
    timestamp: Date.now(),
    characterId: 'wizard-1',
    targetId: 'goblin-1',
    spellId: 'magic_missile',
    spellName: 'Magic Missile',
    slotLevelUsed: 1,
    concentrating: false,
  }

  it('should accept a valid spell_cast payload', () => {
    expect(isSpellCastPayload(validPayload)).toBe(true)
  })

  it('should accept payload with optional damage and healing', () => {
    expect(isSpellCastPayload({ ...validPayload, damage: 10, damageType: 'force' })).toBe(true)
    expect(isSpellCastPayload({ ...validPayload, healing: 8 })).toBe(true)
    expect(isSpellCastPayload({ ...validPayload, damage: 10, healing: 0 })).toBe(true)
  })

  it('should accept payload without targetId', () => {
    const { targetId: _targetId, ...noTarget } = validPayload
    void _targetId
    expect(isSpellCastPayload(noTarget)).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isSpellCastPayload(value)).toBe(false)
  })

  it('should reject when required string fields are missing', () => {
    expect(isSpellCastPayload({ ...validPayload, eventId: undefined })).toBe(false)
    expect(isSpellCastPayload({ ...validPayload, characterId: undefined })).toBe(false)
    expect(isSpellCastPayload({ ...validPayload, spellId: undefined })).toBe(false)
    expect(isSpellCastPayload({ ...validPayload, spellName: undefined })).toBe(false)
  })

  it('should reject when required number fields are wrong type', () => {
    expect(isSpellCastPayload({ ...validPayload, slotLevelUsed: '1' })).toBe(false)
    expect(isSpellCastPayload({ ...validPayload, slotLevelUsed: undefined })).toBe(false)
  })

  it('should reject when concentrating is not boolean', () => {
    expect(isSpellCastPayload({ ...validPayload, concentrating: 'yes' })).toBe(false)
    expect(isSpellCastPayload({ ...validPayload, concentrating: 1 })).toBe(false)
    expect(isSpellCastPayload({ ...validPayload, concentrating: undefined })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isSpellCastPayload({})).toBe(false)
  })
})

describe('isItemUsePayload', () => {
  const validPayload = {
    eventId: 'item-1',
    timestamp: Date.now(),
    characterId: 'wizard-1',
    itemId: 'potion-heal-1',
    itemName: 'Healing Potion',
    itemType: 'consumable',
    consumed: true,
  }

  it('should accept a valid item_use payload', () => {
    expect(isItemUsePayload(validPayload)).toBe(true)
  })

  it('should accept payload with optional fields', () => {
    expect(isItemUsePayload({ ...validPayload, healing: 8, damage: 0, description: 'A red vial' })).toBe(true)
  })

  it('should accept payload when consumed is false', () => {
    expect(isItemUsePayload({ ...validPayload, consumed: false })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isItemUsePayload(value)).toBe(false)
  })

  it('should reject when required string fields are wrong type', () => {
    expect(isItemUsePayload({ ...validPayload, itemId: 123 })).toBe(false)
    expect(isItemUsePayload({ ...validPayload, itemName: null })).toBe(false)
    expect(isItemUsePayload({ ...validPayload, itemType: undefined })).toBe(false)
  })

  it('should reject when consumed is not boolean', () => {
    expect(isItemUsePayload({ ...validPayload, consumed: 'yes' })).toBe(false)
    expect(isItemUsePayload({ ...validPayload, consumed: 1 })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isItemUsePayload({})).toBe(false)
  })
})

describe('isEquipPayload', () => {
  const validPayload = {
    eventId: 'equip-1',
    timestamp: Date.now(),
    characterId: 'wizard-1',
    itemId: 'chain-mail-1',
    itemName: 'Chain Mail',
    slot: 'chest',
  }

  it('should accept a valid equip payload', () => {
    expect(isEquipPayload(validPayload)).toBe(true)
  })

  it('should accept payload with optional acBonus and oldItemId', () => {
    expect(isEquipPayload({ ...validPayload, acBonus: 5, oldItemId: 'leather-armor-1' })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isEquipPayload(value)).toBe(false)
  })

  it('should reject when slot is missing', () => {
    expect(isEquipPayload({ ...validPayload, slot: undefined })).toBe(false)
  })

  it('should reject when slot is wrong type', () => {
    expect(isEquipPayload({ ...validPayload, slot: 123 })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isEquipPayload({})).toBe(false)
  })
})

describe('isUnequipPayload', () => {
  const validPayload = {
    eventId: 'unequip-1',
    timestamp: Date.now(),
    characterId: 'wizard-1',
    itemId: 'longsword-1',
    itemName: 'Longsword',
    slot: 'main_hand',
  }

  it('should accept a valid unequip payload', () => {
    expect(isUnequipPayload(validPayload)).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isUnequipPayload(value)).toBe(false)
  })

  it('should reject when required fields are missing', () => {
    expect(isUnequipPayload({ ...validPayload, characterId: undefined })).toBe(false)
    expect(isUnequipPayload({ ...validPayload, itemId: undefined })).toBe(false)
    expect(isUnequipPayload({ ...validPayload, slot: undefined })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isUnequipPayload({})).toBe(false)
  })
})

describe('isMapInteractPayload', () => {
  const validPayload = {
    eventId: 'map-1',
    timestamp: Date.now(),
    characterId: 'wizard-1',
    interactableId: 'chest-1',
    interactableType: 'chest' as const,
    action: 'open',
    mapId: 'map-dungeon-1',
    position: { x: 5, y: 3 },
  }

  it('should accept a valid map_interact payload', () => {
    expect(isMapInteractPayload(validPayload)).toBe(true)
  })

  it('should accept all interactableType values', () => {
    for (const type of ['door', 'chest', 'npc', 'trigger'] as const) {
      expect(isMapInteractPayload({ ...validPayload, interactableType: type })).toBe(true)
    }
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isMapInteractPayload(value)).toBe(false)
  })

  it('should reject when position is null', () => {
    expect(isMapInteractPayload({ ...validPayload, position: null })).toBe(false)
  })

  it('should reject when position is missing', () => {
    const { position: _position, ...noPosition } = validPayload
    void _position
    expect(isMapInteractPayload(noPosition)).toBe(false)
  })

  it('should reject when required string fields are wrong type', () => {
    expect(isMapInteractPayload({ ...validPayload, interactableId: 123 })).toBe(false)
    expect(isMapInteractPayload({ ...validPayload, action: undefined })).toBe(false)
    expect(isMapInteractPayload({ ...validPayload, mapId: null })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isMapInteractPayload({})).toBe(false)
  })
})

describe('isMapSwitchPayload', () => {
  const validPayload = {
    eventId: 'mapswitch-1',
    timestamp: Date.now(),
    characterId: 'wizard-1',
    fromMapId: 'map-dungeon-1',
    toMapId: 'map-dungeon-2',
    entryPoint: 'south_entrance',
    position: { x: 0, y: 5 },
  }

  it('should accept a valid map_switch payload', () => {
    expect(isMapSwitchPayload(validPayload)).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isMapSwitchPayload(value)).toBe(false)
  })

  it('should reject when position is null', () => {
    expect(isMapSwitchPayload({ ...validPayload, position: null })).toBe(false)
  })

  it('should reject when required string fields are missing', () => {
    expect(isMapSwitchPayload({ ...validPayload, fromMapId: undefined })).toBe(false)
    expect(isMapSwitchPayload({ ...validPayload, toMapId: undefined })).toBe(false)
    expect(isMapSwitchPayload({ ...validPayload, entryPoint: undefined })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isMapSwitchPayload({})).toBe(false)
  })
})
