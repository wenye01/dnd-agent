import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useGameMessages } from '../../../apps/web/src/hooks/useGameMessages'
import { useGameStore } from '../../../apps/web/src/stores/gameStore'
import { useChatStore } from '../../../apps/web/src/stores/chatStore'
import type { ServerMessage } from '../../../apps/web/src/types'

// Mock the WebSocketContext
const mockSubscribe = vi.fn()
const mockSend = vi.fn()

vi.mock('../../../apps/web/src/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
    send: mockSend,
    connected: true,
    client: null,
  }),
}))

// Helper to reset all stores to initial state
function resetStores() {
  useGameStore.getState().reset()
  useChatStore.getState().clearMessages()
}

// Helper to create a wrapper component that provides the necessary context
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }
}

describe('useGameMessages', () => {
  let messageHandler: ((message: ServerMessage) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    resetStores()

    // Capture the message handler when subscribe is called
    mockSubscribe.mockImplementation((handler: (message: ServerMessage) => void) => {
      messageHandler = handler
      return () => {
        messageHandler = null
      }
    })
  })

  afterEach(() => {
    messageHandler = null
  })

  describe('hook initialization', () => {
    it('should subscribe to WebSocket messages on mount', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(mockSubscribe).toHaveBeenCalledTimes(1)
      expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should unsubscribe from WebSocket messages on unmount', () => {
      const { unmount } = renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(mockSubscribe).toHaveBeenCalled()
      const unsubscribe = mockSubscribe.mock.results[0].value

      unmount()

      // The returned unsubscribe function should be called on unmount
      expect(unsubscribe).toBeInstanceOf(Function)
    })
  })

  describe('narration message handling', () => {
    it('should add complete narration message to chat store', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'narration',
          payload: {
            text: 'You enter a dark room.',
            isStreaming: false,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('dm')
      expect(messages[0].content).toBe('You enter a dark room.')
    })

    it('should append streaming text to chat store', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'narration',
          payload: {
            text: 'You see a',
            isStreaming: true,
          },
          timestamp: Date.now(),
        })
      })

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('You see a')
      expect(state.isStreaming).toBe(true)
    })

    it('should handle multiple streaming chunks', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'narration',
          payload: { text: 'You see a ', isStreaming: true },
          timestamp: Date.now(),
        })
        messageHandler!({
          type: 'narration',
          payload: { text: 'dragon!', isStreaming: true },
          timestamp: Date.now(),
        })
      })

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('You see a dragon!')
      expect(state.isStreaming).toBe(true)
    })

    it('should finalize streaming text when receiving complete message', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      // Start streaming
      act(() => {
        messageHandler!({
          type: 'narration',
          payload: { text: 'Partial text', isStreaming: true },
          timestamp: Date.now(),
        })
      })

      expect(useChatStore.getState().streamingText).toBe('Partial text')

      // Complete message
      act(() => {
        messageHandler!({
          type: 'narration',
          payload: { text: 'Complete text', isStreaming: false },
          timestamp: Date.now(),
        })
      })

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('')
      expect(state.isStreaming).toBe(false)
      // The complete message should be added
      expect(state.messages.some(m => m.content === 'Complete text')).toBe(true)
    })

    it('should not add empty text as a message', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'narration',
          payload: { text: '', isStreaming: false },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(0)
    })
  })

  describe('state update message handling', () => {
    it('should handle game state updates', () => {
      // First set an initial game state
      useGameStore.getState().setGameState({
        sessionId: 'initial-session',
        phase: 'exploration',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      })

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'state_update',
          payload: {
            stateType: 'game',
            data: {
              sessionId: 'session-123',
              phase: 'combat',
            },
          },
          timestamp: Date.now(),
        })
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState).not.toBeNull()
      expect(gameState!.sessionId).toBe('session-123')
      expect(gameState!.phase).toBe('combat')
    })

    it('should handle party updates', () => {
      // First set an initial game state
      useGameStore.getState().setGameState({
        sessionId: 'session-123',
        phase: 'exploration',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      })

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'state_update',
          payload: {
            stateType: 'party',
            data: [
              {
                id: 'char-1',
                name: 'Hero',
                race: 'Human',
                class: 'Fighter',
                level: 1,
              },
            ],
          },
          timestamp: Date.now(),
        })
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState).not.toBeNull()
      expect(gameState!.party).toHaveLength(1)
      expect(gameState!.party[0].name).toBe('Hero')
    })

    it('should handle combat state updates', () => {
      // First set an initial game state
      useGameStore.getState().setGameState({
        sessionId: 'session-123',
        phase: 'combat',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      })

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'state_update',
          payload: {
            stateType: 'combat',
            data: {
              round: 1,
              turnIndex: 0,
              initiatives: [20, 15, 10],
              participants: ['char-1', 'char-2', 'monster-1'],
              activeEffects: [],
            },
          },
          timestamp: Date.now(),
        })
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState).not.toBeNull()
      expect(gameState!.combat).not.toBeNull()
      expect(gameState!.combat!.round).toBe(1)
      expect(gameState!.combat!.turnIndex).toBe(0)
    })

    it('should handle null combat data (combat end)', () => {
      // First set an initial game state with combat
      useGameStore.getState().setGameState({
        sessionId: 'session-123',
        phase: 'combat',
        party: [],
        combat: {
          round: 2,
          turnIndex: 1,
          initiatives: [20, 15],
          participants: ['char-1', 'monster-1'],
          activeEffects: [],
        },
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      })

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'state_update',
          payload: {
            stateType: 'combat',
            data: null,
          },
          timestamp: Date.now(),
        })
      })

      const gameState = useGameStore.getState().gameState
      expect(gameState).not.toBeNull()
      expect(gameState!.combat).toBeNull()
    })
  })

  describe('dice result message handling', () => {
    it('should add dice result as system message', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'dice_result',
          payload: {
            formula: '1d20+5',
            dice: [15],
            modifier: 5,
            total: 20,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('system')
      expect(messages[0].content).toContain('1d20+5')
      expect(messages[0].content).toContain('20')
    })

    it('should handle dice result with crit', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'dice_result',
          payload: {
            formula: '1d20+5',
            dice: [20],
            modifier: 5,
            total: 25,
            isCrit: true,
            isFumble: false,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('CRITICAL HIT')
    })

    it('should handle dice result with fumble', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'dice_result',
          payload: {
            formula: '1d20',
            dice: [1],
            modifier: 0,
            total: 1,
            isCrit: false,
            isFumble: true,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('FUMBLE')
    })

    it('should handle dice result with negative modifier', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'dice_result',
          payload: {
            formula: '1d20-3',
            dice: [10],
            modifier: -3,
            total: 7,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('1d20-3')
      expect(messages[0].content).toContain('7')
    })

    it('should handle multiple dice in result', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'dice_result',
          payload: {
            formula: '2d6+3',
            dice: [4, 5],
            modifier: 3,
            total: 12,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('[4, 5]')
      expect(messages[0].content).toContain('12')
    })
  })

  describe('error message handling', () => {
    it('should add error as system message', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'error',
          payload: {
            code: 'SESSION_NOT_FOUND',
            message: 'The requested session could not be found',
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('system')
      expect(messages[0].content).toContain('Error:')
      expect(messages[0].content).toContain('could not be found')
    })

    it('should handle error with details', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'error',
          payload: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: { field: 'name', reason: 'required' },
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('Invalid input')

      consoleSpy.mockRestore()
    })
  })

  describe('combat event message handling', () => {
    it('should handle combat_start event', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'combat_event',
          payload: {
            eventType: 'combat_start',
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('Combat has started')
    })

    it('should handle combat_end event', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'combat_event',
          payload: {
            eventType: 'combat_end',
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('Combat has ended')
    })

    it('should handle round_start event with round number', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'combat_event',
          payload: {
            eventType: 'round_start',
            round: 2,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('Round 2')
    })

    it('should handle turn_start event with character ID', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'combat_event',
          payload: {
            eventType: 'turn_start',
            characterId: 'char-1',
            round: 1,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('char-1')
    })

    it('should handle turn_end event', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'combat_event',
          payload: {
            eventType: 'turn_end',
            characterId: 'char-2',
            round: 1,
          },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('char-2')
    })
  })

  describe('pong message handling', () => {
    it('should silently handle pong messages', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'pong',
          payload: null,
          timestamp: Date.now(),
        })
      })

      // Pong should not add any messages
      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(0)
    })
  })

  describe('multiple message handling', () => {
    it('should handle multiple messages in sequence', () => {
      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'narration',
          payload: { text: 'First message', isStreaming: false },
          timestamp: Date.now(),
        })
        messageHandler!({
          type: 'dice_result',
          payload: {
            formula: '1d20',
            dice: [15],
            modifier: 0,
            total: 15,
          },
          timestamp: Date.now(),
        })
        messageHandler!({
          type: 'narration',
          payload: { text: 'Second message', isStreaming: false },
          timestamp: Date.now(),
        })
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('First message')
      expect(messages[1].type).toBe('system')
      expect(messages[2].content).toBe('Second message')
    })
  })

  describe('invalid payload handling', () => {
    it('should handle invalid narration payload gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'narration',
          payload: { invalidField: true }, // Missing required fields
          timestamp: Date.now(),
        })
      })

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid narration payload:',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should handle invalid state update payload gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'state_update',
          payload: { invalidField: true }, // Missing required fields
          timestamp: Date.now(),
        })
      })

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid state update payload:',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should handle invalid dice result payload gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'dice_result',
          payload: { invalidField: true }, // Missing required fields
          timestamp: Date.now(),
        })
      })

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid dice result payload:',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should warn about unknown message types', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      renderHook(() => useGameMessages(), {
        wrapper: createWrapper(),
      })

      expect(messageHandler).not.toBeNull()

      act(() => {
        messageHandler!({
          type: 'unknown_type' as ServerMessage['type'],
          payload: {},
          timestamp: Date.now(),
        })
      })

      // Should log warning
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown message type:',
        'unknown_type'
      )

      consoleSpy.mockRestore()
    })
  })
})
