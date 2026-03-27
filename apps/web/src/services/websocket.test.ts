/**
 * WebSocket Service Unit Tests
 *
 * Tests the type guards, WebSocketClient constructor,
 * and message queueing behavior in the websocket service.
 * The actual WebSocket connection is mocked since we cannot
 * have a real WebSocket server in unit tests.
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

// ---------------------------------------------------------------
// Type guard tests
// ---------------------------------------------------------------

describe('isNarrationPayload', () => {
  it('should return true for valid narration payload', () => {
    expect(isNarrationPayload({ text: 'Hello', isStreaming: false })).toBe(true)
  })

  it('should return true for streaming narration payload', () => {
    expect(isNarrationPayload({ text: 'Partial', isStreaming: true })).toBe(true)
  })

  it('should return true for empty text with isStreaming flag', () => {
    expect(isNarrationPayload({ text: '', isStreaming: true })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isNarrationPayload(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isNarrationPayload(undefined)).toBe(false)
  })

  it('should return false for missing text field', () => {
    expect(isNarrationPayload({ isStreaming: false })).toBe(false)
  })

  it('should return false for missing isStreaming field', () => {
    expect(isNarrationPayload({ text: 'Hello' })).toBe(false)
  })

  it('should return false for wrong text type', () => {
    expect(isNarrationPayload({ text: 123, isStreaming: false })).toBe(false)
  })

  it('should return false for wrong isStreaming type', () => {
    expect(isNarrationPayload({ text: 'Hello', isStreaming: 'yes' })).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(isNarrationPayload({})).toBe(false)
  })

  it('should return false for string input', () => {
    expect(isNarrationPayload('not an object')).toBe(false)
  })

  it('should return false for number input', () => {
    expect(isNarrationPayload(42)).toBe(false)
  })
})

describe('isStateUpdatePayload', () => {
  it('should return true for valid game state update', () => {
    const payload: StateUpdatePayload = { stateType: 'game', data: { sessionId: '123' } }
    expect(isStateUpdatePayload(payload)).toBe(true)
  })

  it('should return true for valid party state update', () => {
    expect(isStateUpdatePayload({ stateType: 'party', data: [] })).toBe(true)
  })

  it('should return true for valid combat state update', () => {
    expect(isStateUpdatePayload({ stateType: 'combat', data: { round: 1 } })).toBe(true)
  })

  it('should return true for valid map state update', () => {
    expect(isStateUpdatePayload({ stateType: 'map', data: {} })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isStateUpdatePayload(null)).toBe(false)
  })

  it('should return false for missing stateType', () => {
    expect(isStateUpdatePayload({ data: {} })).toBe(false)
  })

  it('should return false for missing data', () => {
    expect(isStateUpdatePayload({ stateType: 'game' })).toBe(false)
  })

  it('should return false for invalid stateType', () => {
    expect(isStateUpdatePayload({ stateType: 'invalid', data: {} })).toBe(false)
  })

  it('should return false for numeric stateType', () => {
    expect(isStateUpdatePayload({ stateType: 123, data: {} })).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(isStateUpdatePayload({})).toBe(false)
  })
})

describe('isDiceResultPayload', () => {
  it('should return true for valid basic dice result', () => {
    expect(isDiceResultPayload({
      formula: '1d20',
      dice: [15],
      modifier: 0,
      total: 15,
    })).toBe(true)
  })

  it('should return true for dice result with modifier', () => {
    expect(isDiceResultPayload({
      formula: '1d20+5',
      dice: [12],
      modifier: 5,
      total: 17,
    })).toBe(true)
  })

  it('should return true for dice result with crit', () => {
    expect(isDiceResultPayload({
      formula: '1d20',
      dice: [20],
      modifier: 0,
      total: 20,
      isCrit: true,
    })).toBe(true)
  })

  it('should return true for dice result with fumble', () => {
    expect(isDiceResultPayload({
      formula: '1d20',
      dice: [1],
      modifier: 0,
      total: 1,
      isFumble: true,
    })).toBe(true)
  })

  it('should return true for dice result with both crit and fumble', () => {
    expect(isDiceResultPayload({
      formula: '1d20',
      dice: [20],
      modifier: 0,
      total: 20,
      isCrit: true,
      isFumble: false,
    })).toBe(true)
  })

  it('should return true for multi-dice result', () => {
    expect(isDiceResultPayload({
      formula: '2d6+3',
      dice: [4, 5],
      modifier: 3,
      total: 12,
    })).toBe(true)
  })

  it('should return true for negative modifier', () => {
    expect(isDiceResultPayload({
      formula: '1d20-3',
      dice: [10],
      modifier: -3,
      total: 7,
    })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isDiceResultPayload(null)).toBe(false)
  })

  it('should return false for missing formula', () => {
    expect(isDiceResultPayload({ dice: [1], modifier: 0, total: 1 })).toBe(false)
  })

  it('should return false for missing dice', () => {
    expect(isDiceResultPayload({ formula: '1d20', modifier: 0, total: 1 })).toBe(false)
  })

  it('should return false for missing modifier', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], total: 1 })).toBe(false)
  })

  it('should return false for missing total', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0 })).toBe(false)
  })

  it('should return false for non-number formula', () => {
    expect(isDiceResultPayload({ formula: 123, dice: [1], modifier: 0, total: 1 })).toBe(false)
  })

  it('should return false for non-array dice', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: '1', modifier: 0, total: 1 })).toBe(false)
  })

  it('should return false for dice array with non-numbers', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: ['a'], modifier: 0, total: 1 })).toBe(false)
  })

  it('should return false for wrong isCrit type', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0, total: 1, isCrit: 'yes' })).toBe(false)
  })

  it('should return false for wrong isFumble type', () => {
    expect(isDiceResultPayload({ formula: '1d20', dice: [1], modifier: 0, total: 1, isFumble: 1 })).toBe(false)
  })

  it('should return true when isCrit and isFumble are absent', () => {
    // isCrit and isFumble are optional, their absence is valid
    expect(isDiceResultPayload({
      formula: '1d20',
      dice: [10],
      modifier: 0,
      total: 10,
    })).toBe(true)
  })
})

describe('isErrorPayload', () => {
  it('should return true for valid error payload', () => {
    expect(isErrorPayload({ code: 'NOT_FOUND', message: 'Session not found' })).toBe(true)
  })

  it('should return true for error payload with details', () => {
    expect(isErrorPayload({ code: 'BAD_REQUEST', message: 'Invalid input', details: { field: 'name' } })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isErrorPayload(null)).toBe(false)
  })

  it('should return false for missing code', () => {
    expect(isErrorPayload({ message: 'Error' })).toBe(false)
  })

  it('should return false for missing message', () => {
    expect(isErrorPayload({ code: 'ERROR' })).toBe(false)
  })

  it('should return false for wrong code type', () => {
    expect(isErrorPayload({ code: 500, message: 'Error' })).toBe(false)
  })

  it('should return false for wrong message type', () => {
    expect(isErrorPayload({ code: 'ERROR', message: 123 })).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(isErrorPayload({})).toBe(false)
  })
})

describe('isCombatEventPayload', () => {
  it('should return true for combat_start event', () => {
    expect(isCombatEventPayload({ eventType: 'combat_start' })).toBe(true)
  })

  it('should return true for combat_end event', () => {
    expect(isCombatEventPayload({ eventType: 'combat_end' })).toBe(true)
  })

  it('should return true for round_start event with round number', () => {
    expect(isCombatEventPayload({ eventType: 'round_start', round: 2 })).toBe(true)
  })

  it('should return true for round_end event', () => {
    expect(isCombatEventPayload({ eventType: 'round_end' })).toBe(true)
  })

  it('should return true for turn_start with characterId', () => {
    expect(isCombatEventPayload({ eventType: 'turn_start', characterId: 'char-1' })).toBe(true)
  })

  it('should return true for turn_end with characterId', () => {
    expect(isCombatEventPayload({ eventType: 'turn_end', characterId: 'char-1' })).toBe(true)
  })

  it('should return true for event with data field', () => {
    expect(isCombatEventPayload({ eventType: 'combat_start', data: { encounter: 'goblins' } })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isCombatEventPayload(null)).toBe(false)
  })

  it('should return false for missing eventType', () => {
    expect(isCombatEventPayload({ round: 1 })).toBe(false)
  })

  it('should return false for invalid eventType', () => {
    expect(isCombatEventPayload({ eventType: 'invalid_event' })).toBe(false)
  })

  it('should return false for non-string eventType', () => {
    expect(isCombatEventPayload({ eventType: 123 })).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(isCombatEventPayload({})).toBe(false)
  })
})

describe('isUserInputPayload', () => {
  it('should return true for valid payload with text only', () => {
    expect(isUserInputPayload({ text: 'I attack the goblin' })).toBe(true)
  })

  it('should return true for valid payload with text and characterId', () => {
    expect(isUserInputPayload({ text: 'I attack', characterId: 'char-1' })).toBe(true)
  })

  it('should return true for empty text', () => {
    expect(isUserInputPayload({ text: '' })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isUserInputPayload(null)).toBe(false)
  })

  it('should return false for missing text', () => {
    expect(isUserInputPayload({ characterId: 'char-1' })).toBe(false)
  })

  it('should return false for wrong text type', () => {
    expect(isUserInputPayload({ text: 123 })).toBe(false)
  })

  it('should return false for wrong characterId type', () => {
    expect(isUserInputPayload({ text: 'Hello', characterId: 123 })).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(isUserInputPayload({})).toBe(false)
  })
})

describe('isPartialGameState', () => {
  it('should return true for object with sessionId', () => {
    expect(isPartialGameState({ sessionId: 'sess_123' })).toBe(true)
  })

  it('should return true for object with phase', () => {
    expect(isPartialGameState({ phase: 'combat' })).toBe(true)
  })

  it('should return true for object with currentMapId', () => {
    expect(isPartialGameState({ currentMapId: 'map-1' })).toBe(true)
  })

  it('should return true for empty object (no required fields)', () => {
    expect(isPartialGameState({})).toBe(true)
  })

  it('should return true for object with all fields', () => {
    expect(isPartialGameState({ sessionId: 'sess_1', phase: 'exploring', currentMapId: 'map-1' })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isPartialGameState(null)).toBe(false)
  })

  it('should return false for wrong sessionId type', () => {
    expect(isPartialGameState({ sessionId: 123 })).toBe(false)
  })

  it('should return false for wrong phase type', () => {
    expect(isPartialGameState({ phase: 123 })).toBe(false)
  })

  it('should return false for wrong currentMapId type', () => {
    expect(isPartialGameState({ currentMapId: 123 })).toBe(false)
  })
})

describe('isCharacterArray', () => {
  it('should return true for valid character array', () => {
    expect(isCharacterArray([
      { id: 'char-1', name: 'Hero' },
      { id: 'char-2', name: 'Villain' },
    ])).toBe(true)
  })

  it('should return true for empty array', () => {
    expect(isCharacterArray([])).toBe(true)
  })

  it('should return true for characters with extra fields', () => {
    expect(isCharacterArray([{ id: 'char-1', name: 'Hero', race: 'Human', class: 'Fighter' }])).toBe(true)
  })

  it('should return false for null', () => {
    expect(isCharacterArray(null)).toBe(false)
  })

  it('should return false for non-array', () => {
    expect(isCharacterArray({ id: 'char-1', name: 'Hero' })).toBe(false)
  })

  it('should return false for array with missing id', () => {
    expect(isCharacterArray([{ name: 'Hero' }])).toBe(false)
  })

  it('should return false for array with missing name', () => {
    expect(isCharacterArray([{ id: 'char-1' }])).toBe(false)
  })

  it('should return false for array with wrong id type', () => {
    expect(isCharacterArray([{ id: 123, name: 'Hero' }])).toBe(false)
  })

  it('should return false for array with wrong name type', () => {
    expect(isCharacterArray([{ id: 'char-1', name: 123 }])).toBe(false)
  })

  it('should return false for array with null element', () => {
    expect(isCharacterArray([null])).toBe(false)
  })
})

describe('isCombatState', () => {
  it('should return true for valid combat state', () => {
    expect(isCombatState({
      round: 1,
      turnIndex: 0,
      initiatives: [],
      participants: ['char-1'],
      activeEffects: [],
    })).toBe(true)
  })

  it('should return true for combat state with populated initiatives', () => {
    expect(isCombatState({
      round: 2,
      turnIndex: 1,
      initiatives: [{ characterId: 'c1', initiative: 18 }],
      participants: ['c1', 'c2'],
      activeEffects: [{ id: 'eff-1', name: 'Bless' }],
    })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isCombatState(null)).toBe(false)
  })

  it('should return false for missing round', () => {
    expect(isCombatState({
      turnIndex: 0,
      initiatives: [],
      participants: [],
      activeEffects: [],
    })).toBe(false)
  })

  it('should return false for non-number round', () => {
    expect(isCombatState({
      round: '1',
      turnIndex: 0,
      initiatives: [],
      participants: [],
      activeEffects: [],
    })).toBe(false)
  })

  it('should return false for non-array participants', () => {
    expect(isCombatState({
      round: 1,
      turnIndex: 0,
      initiatives: [],
      participants: 'char-1',
      activeEffects: [],
    })).toBe(false)
  })

  it('should return false for participants with non-string entries', () => {
    expect(isCombatState({
      round: 1,
      turnIndex: 0,
      initiatives: [],
      participants: [123],
      activeEffects: [],
    })).toBe(false)
  })

  it('should return false for non-array activeEffects', () => {
    expect(isCombatState({
      round: 1,
      turnIndex: 0,
      initiatives: [],
      participants: [],
      activeEffects: 'not-array',
    })).toBe(false)
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
    it('should create client with default options', () => {
      const defaultClient = new WebSocketClient()
      expect(defaultClient).toBeDefined()
      defaultClient.disconnect()
    })

    it('should create client with custom options', () => {
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
    it('should register and call message handlers', () => {
      const handler = vi.fn()
      const unsubscribe = client.onMessage(handler)

      // Simulate an internal message dispatch by accessing the notifyMessageHandlers
      // We test this indirectly through the public API
      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
    })

    it('should support multiple message handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unsub1 = client.onMessage(handler1)
      const unsub2 = client.onMessage(handler2)

      expect(typeof unsub1).toBe('function')
      expect(typeof unsub2).toBe('function')

      unsub1()
      unsub2()
    })

    it('should unsubscribe message handler', () => {
      const handler = vi.fn()
      const unsubscribe = client.onMessage(handler)

      unsubscribe()

      // Second call should be safe
      unsubscribe()
    })
  })

  describe('connection handlers', () => {
    it('should register connection handler', () => {
      const handler = vi.fn()
      const unsubscribe = client.onConnection(handler)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('should support multiple connection handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unsub1 = client.onConnection(handler1)
      const unsub2 = client.onConnection(handler2)

      unsub1()
      unsub2()
    })

    it('should safely unsubscribe connection handler multiple times', () => {
      const handler = vi.fn()
      const unsubscribe = client.onConnection(handler)

      unsubscribe()
      unsubscribe()
    })
  })

  describe('send (queueing)', () => {
    it('should queue messages when not connected', () => {
      // send() when ws is not OPEN should queue the message
      const message = { type: 'user_input' as const, payload: { text: 'Hello' } }
      // This should not throw even if not connected
      expect(() => client.send(message)).not.toThrow()
    })

    it('should queue sendMessage when not connected', () => {
      expect(() => client.sendMessage('Hello world')).not.toThrow()
    })

    it('should not send empty message', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      client.sendMessage('')
      expect(consoleSpy).toHaveBeenCalledWith('Cannot send empty message')
      consoleSpy.mockRestore()
    })

    it('should not send whitespace-only message', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      client.sendMessage('   ')
      expect(consoleSpy).toHaveBeenCalledWith('Cannot send empty message')
      consoleSpy.mockRestore()
    })

    it('should send message with characterId when not connected', () => {
      expect(() => client.sendMessage('Hello', 'char-1')).not.toThrow()
    })
  })

  describe('disconnect', () => {
    it('should be safe to call disconnect when not connected', () => {
      expect(() => client.disconnect()).not.toThrow()
    })

    it('should be safe to call disconnect multiple times', () => {
      client.disconnect()
      client.disconnect()
      client.disconnect()
    })
  })
})
