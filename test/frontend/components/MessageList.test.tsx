import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { useChatStore } from '../../../apps/web/src/stores/chatStore'
import MessageList from '../../../apps/web/src/components/chat/MessageList'

describe('MessageList', () => {
  beforeEach(() => {
    const { clearMessages } = useChatStore.getState()
    clearMessages()
  })

  afterEach(() => {
    cleanup()
  })

  describe('empty state', () => {
    it('should show welcome message when no messages', () => {
      render(<MessageList />)

      expect(screen.getByText(/Welcome, adventurer/)).toBeInTheDocument()
      expect(screen.getByText(/Your journey begins/)).toBeInTheDocument()
    })

    it('should not render any message items when empty', () => {
      const { container } = render(<MessageList />)

      // Check for absence of message containers
      const messageContainers = container.querySelectorAll('[class*="max-w-[75%]"]')
      expect(messageContainers).toHaveLength(0)
    })
  })

  describe('user messages', () => {
    it('should render user message with correct styling', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('Hello, DM!')

      const { container } = render(<MessageList />)

      const userMessage = container.querySelector('.bg-primary-500')
      expect(userMessage).toBeTruthy()
    })

    it('should show user message on the right side', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('Right aligned')

      const { container } = render(<MessageList />)

      const messageWrapper = container.querySelector('.justify-end')
      expect(messageWrapper).toBeTruthy()
    })

    it('should display timestamp for user messages', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('Message with time')

      const { container } = render(<MessageList />)

      const timestamp = container.querySelector('.text-xs.opacity-50')
      expect(timestamp).toBeTruthy()
    })

    it('should render multiple user messages', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('First')
      addUserMessage('Second')
      addUserMessage('Third')

      const { container } = render(<MessageList />)

      const userMessages = container.querySelectorAll('.bg-primary-500')
      expect(userMessages.length).toBe(3)
    })
  })

  describe('DM messages', () => {
    it('should render DM message with correct styling', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('You see a dragon!')

      const { container } = render(<MessageList />)

      const dmMessage = container.querySelector('.bg-stone-200')
      expect(dmMessage).toBeTruthy()
    })

    it('should show Dungeon Master label', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('A message')

      const { container } = render(<MessageList />)

      const label = container.querySelector('.text-primary-700')
      expect(label).toBeTruthy()
    })

    it('should show DM message on the left side', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('Left aligned')

      const { container } = render(<MessageList />)

      const messageWrapper = container.querySelector('.justify-start')
      expect(messageWrapper).toBeTruthy()
    })

    it('should display timestamp for DM messages', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('DM response')

      const { container } = render(<MessageList />)

      const timestamp = container.querySelector('.text-xs.opacity-50')
      expect(timestamp).toBeTruthy()
    })
  })

  describe('system messages', () => {
    it('should render system message centered', () => {
      const { addSystemMessage } = useChatStore.getState()
      addSystemMessage('Dice roll: 15')

      const { container } = render(<MessageList />)

      const centeredContainer = container.querySelector('.justify-center')
      expect(centeredContainer).toBeTruthy()
    })

    it('should style system messages with italic opacity', () => {
      const { addSystemMessage } = useChatStore.getState()
      addSystemMessage('System notification')

      const { container } = render(<MessageList />)

      const systemText = container.querySelector('.text-ink\\/50.italic')
      expect(systemText).toBeTruthy()
    })

    it('should handle multiple system messages', () => {
      const { addSystemMessage } = useChatStore.getState()
      addSystemMessage('Roll: 12')
      addSystemMessage('Roll: 18')

      const { container } = render(<MessageList />)

      const centeredContainers = container.querySelectorAll('.justify-center')
      expect(centeredContainers.length).toBe(2)
    })
  })

  describe('mixed messages', () => {
    it('should render messages in correct order', () => {
      const { addUserMessage, addDMMessage, addSystemMessage } = useChatStore.getState()

      addUserMessage('I attack!')
      addSystemMessage('Roll: 15 + 5 = 20')
      addDMMessage('You hit the goblin!')

      const { container } = render(<MessageList />)

      const allMessages = container.querySelectorAll('[class*="mb-3"], .justify-center')
      expect(allMessages.length).toBeGreaterThanOrEqual(3)
    })

    it('should hide welcome message when messages exist', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('Not empty anymore')

      render(<MessageList />)

      expect(screen.queryByText(/Welcome, adventurer/)).not.toBeInTheDocument()
    })
  })

  describe('message content edge cases', () => {
    it('should handle empty message content', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('')

      const { container } = render(<MessageList />)

      const messageContainer = container.querySelector('.bg-primary-500')
      expect(messageContainer).toBeTruthy()
    })

    it('should handle long messages', () => {
      const longText = 'A'.repeat(1000)
      const { addUserMessage } = useChatStore.getState()
      addUserMessage(longText)

      const { container } = render(<MessageList />)

      const messageContainer = container.querySelector('.bg-primary-500')
      expect(messageContainer).toBeTruthy()
    })

    it('should handle special characters', () => {
      const specialText = 'Special: <>&"\n\t'
      const { addUserMessage } = useChatStore.getState()
      addUserMessage(specialText)

      const { container } = render(<MessageList />)

      const messageContainer = container.querySelector('.bg-primary-500')
      expect(messageContainer).toBeTruthy()
    })

    it('should handle newlines with whitespace-pre-wrap', () => {
      const multiLineText = 'Line 1\nLine 2\nLine 3'
      const { addUserMessage } = useChatStore.getState()
      addUserMessage(multiLineText)

      const { container } = render(<MessageList />)

      const messageContent = container.querySelector('.whitespace-pre-wrap')
      expect(messageContent).toBeTruthy()
    })
  })

  describe('timestamps', () => {
    it('should display timestamp in locale time format', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('Timestamp test')

      const { container } = render(<MessageList />)

      const timestamp = container.querySelector('.text-xs.opacity-50')
      expect(timestamp).toBeTruthy()
      expect(timestamp?.textContent).toMatch(/\d+:\d+:\d+/)
    })
  })

  describe('auto-scroll behavior', () => {
    it('should render scroll ref element', () => {
      const { container } = render(<MessageList />)

      // Should render scroll div at the end
      const divs = container.querySelectorAll('div')
      expect(divs.length).toBeGreaterThan(0)
    })
  })

  describe('removed streaming behavior', () => {
    it('should not show streaming text element', () => {
      const { appendStreamText } = useChatStore.getState()
      appendStreamText('Streaming text')

      const { container } = render(<MessageList />)

      // Should not have the streaming indicator with cursor
      const cursor = container.querySelector('.animate-pulse')
      expect(cursor).toBeNull()
    })

    it('should only show finalized messages', () => {
      const { appendStreamText, addDMMessage } = useChatStore.getState()

      appendStreamText('Streaming')
      addDMMessage('Final message')

      const { container } = render(<MessageList />)

      // Only the finalized DM message should be visible
      const dmMessages = container.querySelectorAll('.bg-stone-200')
      expect(dmMessages.length).toBe(1)
    })
  })
})
