import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useGameStore } from '../../stores/gameStore'
import { useChatStore } from '../../stores/chatStore'
import QuickActions from './QuickActions'
import type { Character } from '../../types'

const sendMock = vi.fn()
let subscribedHandler: ((message: unknown) => void) | null = null

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    client: null,
    connected: true,
    send: sendMock,
    subscribe: (handler: (message: unknown) => void) => {
      subscribedHandler = handler
      return () => {
        subscribedHandler = null
      }
    },
  }),
}))

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: 'TestHero',
    race: 'Human',
    class: 'Wizard',
    level: 1,
    background: 'Sage',
    alignment: 'Neutral Good',
    abilityScores: { strength: 10, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 13, charisma: 8 },
    maxHitPoints: 28,
    currentHitPoints: 28,
    temporaryHitPoints: 0,
    armorClass: 12,
    speed: 30,
    initiative: 2,
    proficiencyBonus: 2,
    inventory: [],
    equipment: {},
    spellSlots: {},
    conditions: [],
    experiencePoints: 0,
    hitDice: '1d6',
    deathSaves: { successes: 0, failures: 0 },
    ...overrides,
  }
}

function setupGameStateWithParty(party: Character[]) {
  useGameStore.getState().setGameState({
    sessionId: 'session-123',
    phase: 'exploration',
    party,
    currentMapId: 'map-1',
    combat: null,
    scenario: null,
    metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
  })
}

describe('QuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscribedHandler = null
    useGameStore.getState().reset()
    useChatStore.getState().clearMessages()
  })

  describe('Spellcaster class detection (case-insensitive)', () => {
    it('should enable Spells button for "Wizard" (PascalCase)', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'Wizard' })])
      render(<QuickActions />)

      const spellsButton = screen.getByTitle('Spells')
      expect(spellsButton).not.toBeDisabled()
    })

    it('should enable Spells button for "wizard" (lowercase)', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'wizard' })])
      render(<QuickActions />)

      const spellsButton = screen.getByTitle('Spells')
      expect(spellsButton).not.toBeDisabled()
    })

    it('should enable Spells button for "WIZARD" (uppercase)', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'WIZARD' })])
      render(<QuickActions />)

      const spellsButton = screen.getByTitle('Spells')
      expect(spellsButton).not.toBeDisabled()
    })

    it('should enable Spells button for Sorcerer', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'Sorcerer' })])
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).not.toBeDisabled()
    })

    it('should enable Spells button for Cleric', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'Cleric' })])
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).not.toBeDisabled()
    })

    it('should enable Spells button for Paladin', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'Paladin' })])
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).not.toBeDisabled()
    })

    it('should enable Spells button for Ranger', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'Ranger' })])
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).not.toBeDisabled()
    })

    it('should disable Spells button for non-spellcaster class (Fighter)', () => {
      setupGameStateWithParty([createMockCharacter({ class: 'Fighter', id: 'char-f1' })])
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).toBeDisabled()
    })

    it('should disable Spells button when no party exists', () => {
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).toBeDisabled()
    })

    it('should enable Spells button if any party member is a spellcaster', () => {
      setupGameStateWithParty([
        createMockCharacter({ class: 'Fighter', id: 'char-f1' }),
        createMockCharacter({ class: 'Cleric', id: 'char-c1' }),
      ])
      render(<QuickActions />)

      expect(screen.getByTitle('Spells')).not.toBeDisabled()
    })
  })

  describe('Save button feedback', () => {
    it('should send management save action when clicked', () => {
      setupGameStateWithParty([createMockCharacter()])
      render(<QuickActions />)

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      expect(sendMock).toHaveBeenCalledWith({
        type: 'management',
        payload: { action: 'save' },
      })
    })

    it('should add system message when Save is clicked with metadata', () => {
      setupGameStateWithParty([createMockCharacter()])
      render(<QuickActions />)

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      const messages = useChatStore.getState().messages
      expect(messages.some((m) => m.content.includes('Game saved successfully'))).toBe(true)
    })

    it('should show saving state while waiting for server response', () => {
      setupGameStateWithParty([createMockCharacter()])
      render(<QuickActions />)

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      expect(screen.getByText('Saving adventure...')).toBeInTheDocument()
    })

    it('should show success feedback when server confirms save', () => {
      setupGameStateWithParty([createMockCharacter()])
      render(<QuickActions />)

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      act(() => {
        subscribedHandler?.({
          type: 'state_update',
          payload: {
            stateType: 'notification',
            data: { status: 'game_saved' },
          },
          timestamp: Date.now(),
        })
      })

      expect(screen.getByText('Save complete')).toBeInTheDocument()
    })

    it('should not crash when metadata is undefined', () => {
      useGameStore.getState().setGameState({
        sessionId: 's1',
        phase: 'exploration',
        party: [createMockCharacter()],
        currentMapId: 'map-1',
        combat: null,
        scenario: null,
        metadata: undefined as any,
      })

      render(<QuickActions />)

      const saveButton = screen.getByTitle('Save')
      expect(() => fireEvent.click(saveButton)).not.toThrow()
    })
  })
})
