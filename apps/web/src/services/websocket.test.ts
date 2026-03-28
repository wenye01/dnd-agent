/**
 * WebSocket Service Unit Tests
 *
 * Tests type guards, WebSocketClient constructor,
 * and message queueing behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  WebSocketClient,
  isNarrationPayload,
  isStateUpdatePayload,
  isDiceResultPayload,
  isErrorPayload,
  isCombatEventPayload,
  isUserInputPayload,
  isPartialGameState,
  isCharacterArray,
  isCombatState,
} from './websocket'
import type { StateUpdatePayload } from './websocket'

// Shared: non-object inputs that should fail every type guard
const NON_OBJECTS: Array<{ name: string; value: unknown }> = [
  { name: 'null', value: null },
  { name: 'undefined', value: undefined },
  { name: 'string', value: 'str' },
  { name: 'number', value: 42 },
]

// ---------------------------------------------------------------
// Type guard tests (compact: valid, non-object baseline, field-specific)
// ---------------------------------------------------------------

describe('isNarrationPayload', () => {
  it('should accept valid payloads', () => {
    expect(isNarrationPayload({ text: 'Hello', isStreaming: false })).toBe(true)
    expect(isNarrationPayload({ text: '', isStreaming: true })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isNarrationPayload(value)).toBe(false)
  })

  it('should reject missing or wrong-type fields', () => {
    expect(isNarrationPayload({})).toBe(false)
    expect(isNarrationPayload({ isStreaming: false })).toBe(false) // missing text
    expect(isNarrationPayload({ text: 'Hi' })).toBe(false) // missing isStreaming
    expect(isNarrationPayload({ text: 123, isStreaming: false })).toBe(false) // wrong text type
    expect(isNarrationPayload({ text: 'Hi', isStreaming: 'yes' })).toBe(false) // wrong isStreaming type
  })
})

describe('isStateUpdatePayload', () => {
  it('should accept all valid stateType values', () => {
    expect(isStateUpdatePayload({ stateType: 'game', data: { sessionId: '123' } })).toBe(true)
    expect(isStateUpdatePayload({ stateType: 'party', data: [] })).toBe(true)
    expect(isStateUpdatePayload({ stateType: 'combat', data: { round: 1 } })).toBe(true)
    expect(isStateUpdatePayload({ stateType: 'map', data: {} })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isStateUpdatePayload(value)).toBe(false)
  })

  it('should reject missing or invalid fields', () => {
    expect(isStateUpdatePayload({})).toBe(false)
    expect(isStateUpdatePayload({ data: {} })).toBe(false) // missing stateType
    expect(isStateUpdatePayload({ stateType: 'game' })).toBe(false) // missing data
    expect(isStateUpdatePayload({ stateType: 'invalid', data: {} })).toBe(false) // bad stateType
    expect(isStateUpdatePayload({ stateType: 123, data: {} })).toBe(false) // non-string stateType
  })
})

describe('isDiceResultPayload', () => {
  it('should accept valid dice results', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: [15], modifier: 0, total: 15 })).toBe(true)
    expect(isDiceResultPayload({ formula: '2d6+3', dice: [4, 5], modifier: 3, total: 12 })).toBe(true)
    expect(isDiceResultPayload({ formula: '1d20-3', dice: [10], modifier: -3, total: 7 })).toBe(true)
  })

  it('should accept optional isCrit/isFumble fields', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: [20], modifier: 0, total: 20, isCrit: true })).toBe(true)
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0, total: 1, isFumble: true })).toBe(true)
    expect(isDiceResultPayload({ formula: '1d20', dice: [10], modifier: 0, total: 10 })).toBe(true) // absent is valid
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isDiceResultPayload(value)).toBe(false)
  })

  it('should reject missing or wrong-type required fields', () => {
    expect(isDiceResultPayload({ dice: [1], modifier: 0, total: 1 })).toBe(false) // missing formula
    expect(isDiceResultPayload({ formula: '1d20', modifier: 0, total: 1 })).toBe(false) // missing dice
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], total: 1 })).toBe(false) // missing modifier
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0 })).toBe(false) // missing total
    expect(isDiceResultPayload({ formula: 123, dice: [1], modifier: 0, total: 1 })).toBe(false) // wrong formula type
    expect(isDiceResultPayload({ formula: '1d20', dice: '1', modifier: 0, total: 1 })).toBe(false) // non-array dice
    expect(isDiceResultPayload({ formula: '1d20', dice: ['a'], modifier: 0, total: 1 })).toBe(false) // non-number in dice
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0, total: 1, isCrit: 'yes' })).toBe(false) // wrong isCrit type
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0, total: 1, isFumble: 1 })).toBe(false) // wrong isFumble type
  })
})

describe('isErrorPayload', () => {
  it('should accept valid error payloads', () => {
    expect(isErrorPayload({ code: 'NOT_FOUND', message: 'Session not found' })).toBe(true)
    expect(isErrorPayload({ code: 'BAD_REQUEST', message: 'Invalid input', details: { field: 'name' } })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isErrorPayload(value)).toBe(false)
  })

  it('should reject missing or wrong-type fields', () => {
    expect(isErrorPayload({})).toBe(false)
    expect(isErrorPayload({ message: 'Error' })).toBe(false) // missing code
    expect(isErrorPayload({ code: 'ERROR' })).toBe(false) // missing message
    expect(isErrorPayload({ code: 500, message: 'Error' })).toBe(false) // wrong code type
    expect(isErrorPayload({ code: 'ERROR', message: 123 })).toBe(false) // wrong message type
  })
})

describe('isCombatEventPayload', () => {
  it('should accept all valid event types', () => {
    expect(isCombatEventPayload({ eventType: 'combat_start' })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'combat_end' })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'round_start', round: 2 })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'turn_start', characterId: 'char-1' })).toBe(true)
    expect(isCombatEventPayload({ eventType: 'combat_start', data: { encounter: 'goblins' } })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isCombatEventPayload(value)).toBe(false)
  })

  it('should reject invalid eventType', () => {
    expect(isCombatEventPayload({})).toBe(false) // missing eventType
    expect(isCombatEventPayload({ eventType: 'invalid_event' })).toBe(false) // bad eventType
    expect(isCombatEventPayload({ eventType: 123 })).toBe(false) // non-string eventType
  })
})

describe('isUserInputPayload', () => {
  it('should accept valid user input', () => {
    expect(isUserInputPayload({ text: 'I attack the goblin' })).toBe(true)
    expect(isUserInputPayload({ text: 'I attack', characterId: 'char-1' })).toBe(true)
    expect(isUserInputPayload({ text: '' })).toBe(true)
  })

  it.each(NON_OBJECTS)('should reject non-object ($name)', ({ value }) => {
    expect(isUserInputPayload(value)).toBe(false)
  })

  it('should reject missing or wrong-type fields', () => {
    expect(isUserInputPayload({})).toBe(false) // missing text
    expect(isUserInputPayload({ characterId: 'char-1' })).toBe(false) // missing text
    expect(isUserInputPayload({ text: 123 })).toBe(false) // wrong text type
    expect(isUserInputPayload({ text: 'Hi', characterId: 123 })).toBe(false) // wrong characterId type
  })
})

describe('isPartialGameState', () => {
  it('should accept objects with valid optional fields', () => {
    // Empty object is valid — all fields are optional (partial update with no changes)
    expect(isPartialGameState({})).toBe(true)
    expect(isPartialGameState({ sessionId: 'sess_123' })).toBe(true)
    expect(isPartialGameState({ phase: 'combat' })).toBe(true)
    expect(isPartialGameState({ sessionId: 's1', phase: 'exploring', currentMapId: 'map-1' })).toBe(true)
  })

  it('should reject non-object inputs', () => {
    expect(isPartialGameState(null)).toBe(false)
    expect(isPartialGameState(undefined)).toBe(false)
    expect(isPartialGameState('str')).toBe(false)
    expect(isPartialGameState(42)).toBe(false)
  })

  it('should reject wrong-type fields', () => {
    expect(isPartialGameState({ sessionId: 123 })).toBe(false)
    expect(isPartialGameState({ phase: 123 })).toBe(false)
    expect(isPartialGameState({ currentMapId: 123 })).toBe(false)
  })
})

describe('isCharacterArray', () => {
  it('should accept valid character arrays', () => {
    expect(isCharacterArray([])).toBe(true)
    expect(isCharacterArray([{ id: 'char-1', name: 'Hero' }])).toBe(true)
    expect(isCharacterArray([{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }])).toBe(true)
    expect(isCharacterArray([{ id: 'c1', name: 'Hero', race: 'Human', class: 'Fighter' }])).toBe(true) // extra fields ok
  })

  it('should reject non-array and null', () => {
    expect(isCharacterArray(null)).toBe(false)
    expect(isCharacterArray({ id: 'c1', name: 'Hero' })).toBe(false) // object, not array
  })

  it('should reject elements missing or with wrong-type id/name', () => {
    expect(isCharacterArray([null])).toBe(false)
    expect(isCharacterArray([{ name: 'Hero' }])).toBe(false) // missing id
    expect(isCharacterArray([{ id: 'c1' }])).toBe(false) // missing name
    expect(isCharacterArray([{ id: 123, name: 'Hero' }])).toBe(false) // wrong id type
    expect(isCharacterArray([{ id: 'c1', name: 123 }])).toBe(false) // wrong name type
  })
})

describe('isCombatState', () => {
  it('should accept valid combat states', () => {
    expect(isCombatState({
      round: 1, turnIndex: 0, initiatives: [], participants: ['char-1'], activeEffects: [],
    })).toBe(true)
    expect(isCombatState({
      round: 2, turnIndex: 1,
      initiatives: [{ characterId: 'c1', initiative: 18 }],
      participants: ['c1', 'c2'],
      activeEffects: [{ id: 'eff-1', name: 'Bless' }],
    })).toBe(true)
  })

  it('should reject non-object inputs', () => {
    expect(isCombatState(null)).toBe(false)
    expect(isCombatState(undefined)).toBe(false)
  })

  it('should reject missing or wrong-type required fields', () => {
    expect(isCombatState({ turnIndex: 0, initiatives: [], participants: [], activeEffects: [] })).toBe(false) // missing round
    expect(isCombatState({ round: '1', turnIndex: 0, initiatives: [], participants: [], activeEffects: [] })).toBe(false) // non-number round
    expect(isCombatState({ round: 1, turnIndex: 0, initiatives: [], participants: 'char-1', activeEffects: [] })).toBe(false) // non-array participants
    expect(isCombatState({ round: 1, turnIndex: 0, initiatives: [], participants: [123], activeEffects: [] })).toBe(false) // non-string in participants
    expect(isCombatState({ round: 1, turnIndex: 0, initiatives: [], participants: [], activeEffects: 'x' })).toBe(false) // non-array effects
  })
})

// ---------------------------------------------------------------
// WebSocketClient tests
// ---------------------------------------------------------------

describe('WebSocketClient', () => {
  let client: WebSocketClient

  beforeEach(() => {
    client = new WebSocketClient({ url: 'ws://localhost:8080/ws' })
  })

  afterEach(() => {
    client.disconnect()
  })

  describe('constructor', () => {
    it('should create client with default and custom options', () => {
      const defaultClient = new WebSocketClient()
      expect(defaultClient).toBeDefined()
      defaultClient.disconnect()

      const customClient = new WebSocketClient({
        url: 'ws://custom:9090/ws',
        reconnectInterval: 5000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 15000,
      })
      expect(customClient).toBeDefined()
      customClient.disconnect()
    })
  })

  describe('message handlers', () => {
    it('should register and unsubscribe handlers', () => {
      const handler = vi.fn()
      const unsubscribe = client.onMessage(handler)

      expect(typeof unsubscribe).toBe('function')

      // Unsubscribe should be idempotent
      unsubscribe()
      unsubscribe()
    })

    it('should support multiple handlers', () => {
      const unsub1 = client.onMessage(vi.fn())
      const unsub2 = client.onMessage(vi.fn())

      unsub1()
      unsub2()
    })
  })

  describe('connection handlers', () => {
    it('should register and unsubscribe handlers', () => {
      const unsubscribe = client.onConnection(vi.fn())

      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
      unsubscribe()
    })

    it('should support multiple handlers', () => {
      const unsub1 = client.onConnection(vi.fn())
      const unsub2 = client.onConnection(vi.fn())

      unsub1()
      unsub2()
    })
  })

  describe('send (queueing)', () => {
    it('should queue messages when not connected', () => {
      const message = { type: 'user_input' as const, payload: { text: 'Hello' } }
      expect(() => client.send(message)).not.toThrow()
    })

    it('should queue sendMessage when not connected', () => {
      expect(() => client.sendMessage('Hello world')).not.toThrow()
      expect(() => client.sendMessage('Hello', 'char-1')).not.toThrow()
    })

    it('should reject empty and whitespace-only messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      client.sendMessage('')
      client.sendMessage('   ')
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      expect(consoleSpy).toHaveBeenCalledWith('Cannot send empty message')
      consoleSpy.mockRestore()
    })
  })

  describe('disconnect', () => {
    it('should be safe to call multiple times', () => {
      client.disconnect()
      client.disconnect()
      client.disconnect()
    })
  })
})
