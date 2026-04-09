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
} from './typeGuards'
import { COMBAT_EVENT_TYPES, STATE_UPDATE_TYPES } from '../config/constants'

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
