import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../../../apps/web/src/stores/chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { clearMessages } = useChatStore.getState()
    clearMessages()
  })

  describe('initial state', () => {
    it('should have empty messages array', () => {
      const { messages } = useChatStore.getState()
      expect(messages).toEqual([])
    })

    it('should have empty streaming text', () => {
      const { streamingText } = useChatStore.getState()
      expect(streamingText).toBe('')
    })

    it('should not be streaming', () => {
      const { isStreaming } = useChatStore.getState()
      expect(isStreaming).toBe(false)
    })
  })

  describe('addUserMessage', () => {
    it('should add a user message', () => {
      const { addUserMessage } = useChatStore.getState()

      addUserMessage('Hello, world!')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0]).toMatchObject({
        type: 'user',
        content: 'Hello, world!',
      })
      expect(state.messages[0].id).toBeTruthy()
      expect(state.messages[0].timestamp).toBeGreaterThan(0)
    })

    it('should add multiple user messages', () => {
      const { addUserMessage } = useChatStore.getState()

      addUserMessage('First message')
      addUserMessage('Second message')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[0].content).toBe('First message')
      expect(state.messages[1].content).toBe('Second message')
    })

    it('should preserve existing messages', () => {
      const { addUserMessage, addDMMessage } = useChatStore.getState()

      addDMMessage('DM message')
      addUserMessage('User message')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[0].type).toBe('dm')
      expect(state.messages[1].type).toBe('user')
    })
  })

  describe('addDMMessage', () => {
    it('should add a DM message', () => {
      const { addDMMessage } = useChatStore.getState()

      addDMMessage('You see a dragon!')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0]).toMatchObject({
        type: 'dm',
        content: 'You see a dragon!',
      })
      expect(state.messages[0].id).toBeTruthy()
      expect(state.messages[0].timestamp).toBeGreaterThan(0)
    })

    it('should add multiple DM messages', () => {
      const { addDMMessage } = useChatStore.getState()

      addDMMessage('First DM message')
      addDMMessage('Second DM message')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages.every((m) => m.type === 'dm')).toBe(true)
    })
  })

  describe('addSystemMessage', () => {
    it('should add a system message', () => {
      const { addSystemMessage } = useChatStore.getState()

      addSystemMessage('Dice roll: 15')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0]).toMatchObject({
        type: 'system',
        content: 'Dice roll: 15',
      })
    })

    it('should add system message after user message', () => {
      const { addUserMessage, addSystemMessage } = useChatStore.getState()

      addUserMessage('I attack!')
      addSystemMessage('Roll: 18 + 5 = 23')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[0].type).toBe('user')
      expect(state.messages[1].type).toBe('system')
    })
  })

  describe('appendStreamText', () => {
    it('should append text to streaming text', () => {
      const { appendStreamText } = useChatStore.getState()

      appendStreamText('Hello')
      appendStreamText(' world')
      appendStreamText('!')

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('Hello world!')
    })

    it('should set isStreaming to true', () => {
      const { appendStreamText } = useChatStore.getState()

      appendStreamText('Streaming')

      const state = useChatStore.getState()
      expect(state.isStreaming).toBe(true)
    })

    it('should append to existing streaming text', () => {
      const { appendStreamText } = useChatStore.getState()

      appendStreamText('First')
      appendStreamText(' Second')

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('First Second')
    })
  })

  describe('finalizeStreamText', () => {
    it('should convert streaming text to DM message', () => {
      const { appendStreamText, finalizeStreamText } = useChatStore.getState()

      appendStreamText('Streaming message')
      finalizeStreamText()

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('')
      expect(state.isStreaming).toBe(false)
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0]).toMatchObject({
        type: 'dm',
        content: 'Streaming message',
      })
    })

    it('should clear isStreaming flag', () => {
      const { appendStreamText, finalizeStreamText } = useChatStore.getState()

      appendStreamText('Text')
      finalizeStreamText()

      const state = useChatStore.getState()
      expect(state.isStreaming).toBe(false)
    })

    it('should handle empty streaming text', () => {
      const { finalizeStreamText, addDMMessage } = useChatStore.getState()

      finalizeStreamText()

      addDMMessage('Regular message')

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('')
      expect(state.isStreaming).toBe(false)
      expect(state.messages).toHaveLength(1)
    })

    it('should preserve existing messages', () => {
      const { addUserMessage, appendStreamText, finalizeStreamText } = useChatStore.getState()

      addUserMessage('User message')
      appendStreamText('DM response')
      finalizeStreamText()

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[0].type).toBe('user')
      expect(state.messages[1].type).toBe('dm')
    })
  })

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const { addUserMessage, addDMMessage, clearMessages } = useChatStore.getState()

      addUserMessage('User message')
      addDMMessage('DM message')
      clearMessages()

      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
    })

    it('should clear streaming text', () => {
      const { appendStreamText, clearMessages } = useChatStore.getState()

      appendStreamText('Streaming')
      clearMessages()

      const state = useChatStore.getState()
      expect(state.streamingText).toBe('')
    })

    it('should reset isStreaming flag', () => {
      const { appendStreamText, clearMessages } = useChatStore.getState()

      appendStreamText('Streaming')
      clearMessages()

      const state = useChatStore.getState()
      expect(state.isStreaming).toBe(false)
    })

    it('should reset all state', () => {
      const { addUserMessage, appendStreamText, clearMessages } = useChatStore.getState()

      addUserMessage('User message')
      appendStreamText('Streaming text')
      clearMessages()

      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.streamingText).toBe('')
      expect(state.isStreaming).toBe(false)
    })
  })

  describe('message structure', () => {
    it('should create messages with unique IDs', () => {
      const { addUserMessage } = useChatStore.getState()

      addUserMessage('Message 1')
      addUserMessage('Message 2')

      const state = useChatStore.getState()
      expect(state.messages[0].id).not.toBe(state.messages[1].id)
    })

    it('should create messages with timestamps', () => {
      const { addUserMessage } = useChatStore.getState()

      const beforeTime = Date.now()
      addUserMessage('Test message')
      const afterTime = Date.now()

      const state = useChatStore.getState()
      expect(state.messages[0].timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(state.messages[0].timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('should create messages in correct order', () => {
      const { addUserMessage, addDMMessage, addSystemMessage } = useChatStore.getState()

      addUserMessage('User')
      addDMMessage('DM')
      addSystemMessage('System')

      const state = useChatStore.getState()
      expect(state.messages[0].type).toBe('user')
      expect(state.messages[1].type).toBe('dm')
      expect(state.messages[2].type).toBe('system')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string messages', () => {
      const { addUserMessage } = useChatStore.getState()

      addUserMessage('')

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('')
    })

    it('should handle special characters in messages', () => {
      const { addUserMessage } = useChatStore.getState()

      addUserMessage('Special chars: <>&"\'\n\t')

      const state = useChatStore.getState()
      expect(state.messages[0].content).toContain('Special chars:')
    })

    it('should handle very long messages', () => {
      const { addUserMessage } = useChatStore.getState()

      const longText = 'A'.repeat(10000)
      addUserMessage(longText)

      const state = useChatStore.getState()
      expect(state.messages[0].content).toHaveLength(10000)
    })
  })
})
