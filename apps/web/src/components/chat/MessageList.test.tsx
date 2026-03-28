import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { useChatStore } from '@/stores/chatStore'
import MessageList from './MessageList'

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
  })

  describe('user messages', () => {
    it('should render user message text', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('Hello, DM!')

      render(<MessageList />)

      expect(screen.getByText('Hello, DM!')).toBeInTheDocument()
    })

    it('should render multiple user messages', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('First')
      addUserMessage('Second')
      addUserMessage('Third')

      render(<MessageList />)

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
      expect(screen.getByText('Third')).toBeInTheDocument()
    })
  })

  describe('DM messages', () => {
    it('should render DM message text', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('You see a dragon!')

      render(<MessageList />)

      expect(screen.getByText('You see a dragon!')).toBeInTheDocument()
    })

    it('should show Dungeon Master label', () => {
      const { addDMMessage } = useChatStore.getState()
      addDMMessage('A message')

      render(<MessageList />)

      expect(screen.getByText(/Dungeon Master/)).toBeInTheDocument()
    })
  })

  describe('system messages', () => {
    it('should render system message text', () => {
      const { addSystemMessage } = useChatStore.getState()
      addSystemMessage('Dice roll: 15')

      render(<MessageList />)

      expect(screen.getByText('Dice roll: 15')).toBeInTheDocument()
    })

    it('should handle multiple system messages', () => {
      const { addSystemMessage } = useChatStore.getState()
      addSystemMessage('Roll: 12')
      addSystemMessage('Roll: 18')

      render(<MessageList />)

      expect(screen.getByText('Roll: 12')).toBeInTheDocument()
      expect(screen.getByText('Roll: 18')).toBeInTheDocument()
    })
  })

  describe('mixed messages', () => {
    it('should render all message types in order', () => {
      const { addUserMessage, addDMMessage, addSystemMessage } = useChatStore.getState()

      addUserMessage('I attack!')
      addSystemMessage('Roll: 15 + 5 = 20')
      addDMMessage('You hit the goblin!')

      render(<MessageList />)

      expect(screen.getByText('I attack!')).toBeInTheDocument()
      expect(screen.getByText('Roll: 15 + 5 = 20')).toBeInTheDocument()
      expect(screen.getByText('You hit the goblin!')).toBeInTheDocument()
    })

    it('should hide welcome message when messages exist', () => {
      const { addUserMessage } = useChatStore.getState()
      addUserMessage('Not empty anymore')

      render(<MessageList />)

      expect(screen.queryByText(/Welcome, adventurer/)).not.toBeInTheDocument()
    })
  })

  describe('streaming behavior', () => {
    it('should not show streaming text as a visible message', () => {
      const { appendStreamText } = useChatStore.getState()
      appendStreamText('Streaming text')

      render(<MessageList />)

      expect(screen.queryByText('Streaming text')).not.toBeInTheDocument()
    })

    it('should only show finalized messages', () => {
      const { appendStreamText, addDMMessage } = useChatStore.getState()

      appendStreamText('Streaming')
      addDMMessage('Final message')

      render(<MessageList />)

      expect(screen.queryByText('Streaming')).not.toBeInTheDocument()
      expect(screen.getByText('Final message')).toBeInTheDocument()
    })
  })
})
