import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import QuickActions from './QuickActions'
import { useGameStore } from '../../stores/gameStore'
import type { GameState } from '../../types'

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

function setGameState(overrides: Partial<GameState> = {}) {
  useGameStore.getState().setGameState({
    sessionId: 'session-1',
    phase: 'exploring',
    party: [],
    currentMapId: 'map-1',
    combat: null,
    scenario: null,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playTime: 0,
      scenarioId: 'scenario-1',
    },
    ...overrides,
  })
}

describe('QuickActions', () => {
  beforeEach(() => {
    sendMock.mockReset()
    subscribedHandler = null
    useGameStore.getState().reset()
  })

  it('should enable spells button for lowercase spellcaster classes', () => {
    setGameState({
      party: [
        {
          id: 'char-1',
          name: '法师测试',
          race: 'human',
          class: 'wizard',
          level: 1,
          background: 'sage',
          alignment: 'neutral',
          abilityScores: {
            strength: 8,
            dexterity: 14,
            constitution: 12,
            intelligence: 16,
            wisdom: 10,
            charisma: 10,
          },
          maxHitPoints: 8,
          currentHitPoints: 8,
          temporaryHitPoints: 0,
          armorClass: 12,
          speed: 30,
          initiative: 2,
          proficiencyBonus: 2,
          skills: {},
          savingThrows: [],
          conditions: [],
          deathSaves: { successes: 0, failures: 0 },
          equipment: [],
          inventory: [],
          spellSlots: {
            1: { max: 2, used: 0 },
          },
        },
      ],
    })

    render(<QuickActions />)

    expect(screen.getByRole('button', { name: /spells/i })).toBeEnabled()
  })

  it('should send management save action and show success feedback', () => {
    render(<QuickActions />)

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(sendMock).toHaveBeenCalledWith({
      type: 'management',
      payload: { action: 'save' },
    })
    expect(screen.getByText('Saving adventure...')).toBeInTheDocument()

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
})
