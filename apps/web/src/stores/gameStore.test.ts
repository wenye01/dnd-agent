import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import type { GameState, Character, CombatState } from '../types'

describe('gameStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { reset } = useGameStore.getState()
    reset()
  })

  describe('initial state', () => {
    it('should have null game state', () => {
      const { gameState } = useGameStore.getState()
      expect(gameState).toBeNull()
    })

    it('should not be loading', () => {
      const { isLoading } = useGameStore.getState()
      expect(isLoading).toBe(false)
    })

    it('should have no error', () => {
      const { error } = useGameStore.getState()
      expect(error).toBeNull()
    })
  })

  describe('setGameState', () => {
    it('should set the game state', () => {
      const { setGameState } = useGameStore.getState()

      const mockState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        currentMapId: 'map-1',
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(mockState)

      const state = useGameStore.getState()
      expect(state.gameState).toEqual(mockState)
      expect(state.error).toBeNull()
    })

    it('should clear error when setting new state', () => {
      const { setError, setGameState } = useGameStore.getState()

      setError('Previous error')

      const mockState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(mockState)

      const state = useGameStore.getState()
      expect(state.error).toBeNull()
    })

    it('should replace existing game state', () => {
      const { setGameState } = useGameStore.getState()

      const firstState: GameState = {
        sessionId: 'session-1',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      const secondState: GameState = {
        sessionId: 'session-2',
        phase: 'combat',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(firstState)
      setGameState(secondState)

      const state = useGameStore.getState()
      expect(state.gameState.sessionId).toBe('session-2')
      expect(state.gameState.phase).toBe('combat')
    })
  })

  describe('updateGameState', () => {
    it('should update existing game state', () => {
      const { setGameState, updateGameState } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        currentMapId: 'map-1',
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(initialState)
      updateGameState({ phase: 'combat', currentMapId: 'map-2' })

      const state = useGameStore.getState()
      expect(state.gameState?.phase).toBe('combat')
      expect(state.gameState?.currentMapId).toBe('map-2')
      expect(state.gameState?.sessionId).toBe('session-123') // Unchanged
    })

    it('should not update when game state is null', () => {
      const { updateGameState } = useGameStore.getState()

      updateGameState({ phase: 'combat' })

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
    })

    it('should merge nested properties', () => {
      const { setGameState, updateGameState } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: 1000,
          updatedAt: 2000,
          lastActivity: 2000,
        },
      }

      setGameState(initialState)
      updateGameState({
        metadata: {
          createdAt: 1000,
          updatedAt: 3000,
          lastActivity: 3000,
        } as any,
      })

      const state = useGameStore.getState()
      expect(state.gameState?.metadata.updatedAt).toBe(3000)
    })
  })

  describe('updateParty', () => {
    it('should update party members', () => {
      const { setGameState, updateParty } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(initialState)

      const party: Character[] = [
        {
          id: 'char-1',
          name: 'Hero',
          race: 'Human',
          class: 'Fighter',
          level: 1,
          hp: 10,
          maxHp: 10,
          ac: 15,
          stats: {
            strength: 16,
            dexterity: 12,
            constitution: 14,
            intelligence: 10,
            wisdom: 8,
            charisma: 13,
          },
          skills: {},
          inventory: [],
        },
      ]

      updateParty(party)

      const state = useGameStore.getState()
      expect(state.gameState?.party).toEqual(party)
      expect(state.gameState?.party).toHaveLength(1)
    })

    it('should not update when game state is null', () => {
      const { updateParty } = useGameStore.getState()

      const party: Character[] = []
      updateParty(party)

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
    })

    it('should replace existing party', () => {
      const { setGameState, updateParty } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [
          {
            id: 'char-1',
            name: 'Old Character',
            race: 'Elf',
            class: 'Wizard',
            level: 1,
            hp: 6,
            maxHp: 6,
            ac: 10,
            stats: {
              strength: 8,
              dexterity: 14,
              constitution: 12,
              intelligence: 16,
              wisdom: 12,
              charisma: 10,
            },
            skills: {},
            inventory: [],
          },
        ],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(initialState)

      const newParty: Character[] = [
        {
          id: 'char-2',
          name: 'New Character',
          race: 'Dwarf',
          class: 'Cleric',
          level: 1,
          hp: 8,
          maxHp: 8,
          ac: 16,
          stats: {
            strength: 14,
            dexterity: 8,
            constitution: 16,
            intelligence: 10,
            wisdom: 14,
            charisma: 12,
          },
          skills: {},
          inventory: [],
        },
      ]

      updateParty(newParty)

      const state = useGameStore.getState()
      expect(state.gameState?.party).toHaveLength(1)
      expect(state.gameState?.party[0].id).toBe('char-2')
    })
  })

  describe('updateCombat', () => {
    it('should set combat state', () => {
      const { setGameState, updateCombat } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(initialState)

      const combat: CombatState = {
        round: 1,
        turnIndex: 0,
        initiatives: [],
        participants: [],
        activeEffects: [],
      }

      updateCombat(combat)

      const state = useGameStore.getState()
      expect(state.gameState?.combat).toEqual(combat)
    })

    it('should clear combat state when null is passed', () => {
      const { setGameState, updateCombat } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'combat',
        party: [],
        combat: {
          round: 1,
          turnIndex: 0,
          initiatives: [],
          participants: [],
          activeEffects: [],
        },
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(initialState)
      updateCombat(null)

      const state = useGameStore.getState()
      expect(state.gameState?.combat).toBeNull()
    })

    it('should not update when game state is null', () => {
      const { updateCombat } = useGameStore.getState()

      const combat: CombatState = {
        round: 1,
        turnIndex: 0,
        initiatives: [],
        participants: [],
        activeEffects: [],
      }

      updateCombat(combat)

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('should set loading state', () => {
      const { setLoading } = useGameStore.getState()

      setLoading(true)

      const state = useGameStore.getState()
      expect(state.isLoading).toBe(true)

      setLoading(false)

      const newState = useGameStore.getState()
      expect(newState.isLoading).toBe(false)
    })
  })

  describe('setError', () => {
    it('should set error message', () => {
      const { setError } = useGameStore.getState()

      setError('Connection failed')

      const state = useGameStore.getState()
      expect(state.error).toBe('Connection failed')
    })

    it('should clear error when null is passed', () => {
      const { setError } = useGameStore.getState()

      setError('Some error')
      setError(null)

      const state = useGameStore.getState()
      expect(state.error).toBeNull()
    })

    it('should update error message', () => {
      const { setError } = useGameStore.getState()

      setError('First error')
      setError('Second error')

      const state = useGameStore.getState()
      expect(state.error).toBe('Second error')
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { setGameState, setLoading, setError, reset } = useGameStore.getState()

      const mockState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(mockState)
      setLoading(true)
      setError('Test error')

      reset()

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should be idempotent', () => {
      const { reset } = useGameStore.getState()

      reset()
      reset()
      reset()

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('complex scenarios', () => {
    it('should handle loading -> error -> success flow', () => {
      const { setLoading, setError, setGameState } = useGameStore.getState()

      // Start loading
      setLoading(true)
      expect(useGameStore.getState().isLoading).toBe(true)

      // Error occurs
      setError('Failed to load')
      expect(useGameStore.getState().error).toBe('Failed to load')

      // Clear loading and error on success
      const mockState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }
      setGameState(mockState)

      const state = useGameStore.getState()
      expect(state.isLoading).toBe(true) // Loading needs to be cleared separately
      expect(state.error).toBeNull()
    })

    it('should handle partial updates to game state', () => {
      const { setGameState, updateGameState } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        currentMapId: 'map-1',
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivity: Date.now(),
        },
      }

      setGameState(initialState)

      // Update just the phase
      updateGameState({ phase: 'combat' })

      // Other fields should remain unchanged
      const state = useGameStore.getState()
      expect(state.gameState?.phase).toBe('combat')
      expect(state.gameState?.currentMapId).toBe('map-1')
      expect(state.gameState?.sessionId).toBe('session-123')
    })
  })
})
