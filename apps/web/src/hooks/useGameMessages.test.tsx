import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useGameMessages } from '@/hooks/useGameMessages'
import { useGameStore } from '@/stores/gameStore'
import { useChatStore } from '@/stores/chatStore'
import { getWebSocketHandler, getWebSocketUnsubscribe, resetWebSocketHandler } from '@/test/setup'
import type { ServerMessage } from '@/types'

// Helper to reset all stores to initial state
function resetStores() {
  useGameStore.getState().reset()
  useChatStore.getState().clearMessages()
}

// Helper to set up a valid game state for state update tests
function setupGameState() {
  useGameStore.getState().setGameState({
    sessionId: 'session-123',
    phase: 'exploration',
    party: [],
    currentMapId: 'map-1',
    combat: null,
    scenario: null,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playTime: 0,
      scenarioId: 'test',
    },
  })
}

describe('useGameMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStores()
    resetWebSocketHandler()
  })

  afterEach(() => {
    cleanup()
    resetWebSocketHandler()
  })

  describe('WebSocket subscription', () => {
    it('should subscribe to WebSocket messages on mount', () => {
      renderHook(() => useGameMessages())

      const handler = getWebSocketHandler()
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should call unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useGameMessages())

      expect(getWebSocketHandler()).toBeDefined()
      const unsubscribe = getWebSocketUnsubscribe()
      expect(unsubscribe).toBeDefined()

      unmount()

      expect(unsubscribe).toHaveBeenCalledOnce()
    })
  })

  describe('narration message handling', () => {
    it('should add complete narration to chat store via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      const message: ServerMessage = {
        type: 'narration',
        payload: { text: 'You enter a dark room.', isStreaming: false },
        timestamp: Date.now(),
      }
      handler(message)

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('dm')
      expect(messages[0].content).toBe('You enter a dark room.')
    })

    it('should append streaming text via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'narration', payload: { text: 'You see a', isStreaming: true }, timestamp: Date.now() })
      handler({ type: 'narration', payload: { text: ' dragon!', isStreaming: true }, timestamp: Date.now() })

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('You see a dragon!')
      expect(state.isStreaming).toBe(true)
    })

    it('should finalize streaming when receiving complete message', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'narration', payload: { text: 'Partial', isStreaming: true }, timestamp: Date.now() })
      expect(useChatStore.getState().streamingText).toBe('Partial')

      handler({ type: 'narration', payload: { text: 'Complete text', isStreaming: false }, timestamp: Date.now() })

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('')
      expect(state.isStreaming).toBe(false)
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].type).toBe('dm')
      expect(state.messages[0].content).toBe('Complete text')
    })

    it('should skip empty text in complete narration', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'narration', payload: { text: '', isStreaming: false }, timestamp: Date.now() })

      expect(useChatStore.getState().messages).toHaveLength(0)
    })
  })

  describe('state update message handling', () => {
    beforeEach(() => {
      setupGameState()
    })

    it('should handle game state update via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'state_update',
        payload: { stateType: 'game', data: { sessionId: 'session-456', phase: 'combat' } },
        timestamp: Date.now(),
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState).not.toBeNull()
      expect(gameState!.sessionId).toBe('session-456')
      expect(gameState!.phase).toBe('combat')
    })

    it('should handle party update via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'state_update',
        payload: {
          stateType: 'party',
          data: [{ id: 'char-1', name: 'Hero', race: 'Human', class: 'Fighter', level: 1 }],
        },
        timestamp: Date.now(),
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState!.party).toHaveLength(1)
      expect(gameState!.party[0].name).toBe('Hero')
    })

    it('should handle combat state update via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'state_update',
        payload: {
          stateType: 'combat',
          data: { round: 1, turnIndex: 0, initiatives: [20, 15], participants: ['char-1', 'char-2'] },
        },
        timestamp: Date.now(),
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState!.combat).not.toBeNull()
      expect(gameState!.combat!.round).toBe(1)
    })

    it('should handle null combat data (combat end) via WebSocket', () => {
      useGameStore.getState().updateCombat({
        round: 2, turnIndex: 1, initiatives: [20, 15], participants: ['char-1', 'monster-1'], activeEffects: [],
      })

      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'state_update',
        payload: { stateType: 'combat', data: null },
        timestamp: Date.now(),
      })

      expect(useGameStore.getState().gameState!.combat).toBeNull()
    })
  })

  describe('dice result message handling', () => {
    it('should format dice result as system message via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'dice_result',
        payload: { formula: '1d20+5', dice: [15], modifier: 5, total: 20 },
        timestamp: Date.now(),
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('system')
      expect(messages[0].content).toContain('1d20+5')
      expect(messages[0].content).toContain('20')
    })

    it('should include CRITICAL HIT marker for crits', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'dice_result',
        payload: { formula: '1d20+5', dice: [20], modifier: 5, total: 25, isCrit: true },
        timestamp: Date.now(),
      })

      expect(useChatStore.getState().messages[0].content).toContain('CRITICAL HIT')
    })

    it('should include FUMBLE marker for fumbles', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'dice_result',
        payload: { formula: '1d20', dice: [1], modifier: 0, total: 1, isFumble: true },
        timestamp: Date.now(),
      })

      expect(useChatStore.getState().messages[0].content).toContain('FUMBLE')
    })

    it('should handle negative modifier', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'dice_result',
        payload: { formula: '1d20-3', dice: [10], modifier: -3, total: 7 },
        timestamp: Date.now(),
      })

      const content = useChatStore.getState().messages[0].content
      expect(content).toContain('1d20-3')
      expect(content).toContain('7')
    })

    it('should handle multiple dice', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'dice_result',
        payload: { formula: '2d6+3', dice: [4, 5], modifier: 3, total: 12 },
        timestamp: Date.now(),
      })

      const content = useChatStore.getState().messages[0].content
      expect(content).toContain('[4, 5]')
      expect(content).toContain('12')
    })
  })

  describe('error message handling', () => {
    it('should add error as system message via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'error',
        payload: { code: 'NOT_FOUND', message: 'The requested session could not be found' },
        timestamp: Date.now(),
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('system')
      expect(messages[0].content).toContain('Error:')
      expect(messages[0].content).toContain('could not be found')
    })

    it('should log server error details', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({
        type: 'error',
        payload: { code: 'BAD_REQUEST', message: 'Invalid input', details: { field: 'name' } },
        timestamp: Date.now(),
      })

      expect(consoleSpy).toHaveBeenCalledWith('Server error:', 'BAD_REQUEST', 'Invalid input', { field: 'name' })
      consoleSpy.mockRestore()
    })
  })

  describe('combat event message handling', () => {
    it('should handle combat_start event', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'combat_event', payload: { eventType: 'combat_start' }, timestamp: Date.now() })

      expect(useChatStore.getState().messages[0].content).toContain('Combat has started')
    })

    it('should handle combat_end event', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'combat_event', payload: { eventType: 'combat_end' }, timestamp: Date.now() })

      expect(useChatStore.getState().messages[0].content).toContain('Combat has ended')
    })

    it('should handle round_start with round number', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'combat_event', payload: { eventType: 'round_start', round: 2 }, timestamp: Date.now() })

      expect(useChatStore.getState().messages[0].content).toContain('Round 2')
    })

    it('should handle turn_start with character ID', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'combat_event', payload: { eventType: 'turn_start', characterId: 'char-1' }, timestamp: Date.now() })

      expect(useChatStore.getState().messages[0].content).toContain('char-1')
    })

    it('should handle turn_end event', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'combat_event', payload: { eventType: 'turn_end', characterId: 'char-2' }, timestamp: Date.now() })

      expect(useChatStore.getState().messages[0].content).toContain('char-2')
    })
  })

  describe('pong message handling', () => {
    it('should silently handle pong messages via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      const initialCount = useChatStore.getState().messages.length

      handler({ type: 'pong', payload: {}, timestamp: Date.now() })

      expect(useChatStore.getState().messages).toHaveLength(initialCount)
    })
  })

  describe('multiple message handling', () => {
    it('should handle multiple messages in sequence via WebSocket', () => {
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'narration', payload: { text: 'First message', isStreaming: false }, timestamp: Date.now() })
      handler({
        type: 'dice_result',
        payload: { formula: '1d20', dice: [15], modifier: 0, total: 15 },
        timestamp: Date.now(),
      })
      handler({ type: 'narration', payload: { text: 'Second message', isStreaming: false }, timestamp: Date.now() })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('First message')
      expect(messages[1].type).toBe('system')
      expect(messages[2].content).toBe('Second message')
    })
  })

  describe('invalid payload handling', () => {
    it('should log error for invalid narration payload', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'narration', payload: { invalidField: true }, timestamp: Date.now() })

      expect(consoleSpy).toHaveBeenCalledWith('Invalid narration payload:', expect.any(Object))
      consoleSpy.mockRestore()
    })

    it('should log error for invalid state update payload', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'state_update', payload: { invalidField: true }, timestamp: Date.now() })

      expect(consoleSpy).toHaveBeenCalledWith('Invalid state update payload:', expect.any(Object))
      consoleSpy.mockRestore()
    })

    it('should log error for invalid dice result payload', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'dice_result', payload: { invalidField: true }, timestamp: Date.now() })

      expect(consoleSpy).toHaveBeenCalledWith('Invalid dice result payload:', expect.any(Object))
      consoleSpy.mockRestore()
    })

    it('should warn about unknown message types', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      renderHook(() => useGameMessages())
      const handler = getWebSocketHandler()!

      handler({ type: 'unknown_type' as ServerMessage['type'], payload: {}, timestamp: Date.now() })

      expect(consoleSpy).toHaveBeenCalledWith('Unknown message type:', 'unknown_type')
      consoleSpy.mockRestore()
    })
  })
})
