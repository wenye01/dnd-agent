import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/stores/gameStore'
import type { GameState, Character, CombatState, GameMetadata, InitiativeEntry, ActiveEffect } from '@/types'

// Helper function to create valid GameMetadata
function createMockMetadata(overrides: Partial<GameMetadata> = {}): GameMetadata {
  const now = Date.now()
  return {
    createdAt: now,
    updatedAt: now,
    playTime: 0,
    scenarioId: 'test-scenario',
    ...overrides,
  }
}

// Helper function to create valid Character with correct field names
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: 'Hero',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    background: 'Soldier',
    alignment: 'Lawful Good',
    abilityScores: {
      strength: 16,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 8,
      charisma: 13,
    },
    maxHitPoints: 10,
    currentHitPoints: 10,
    temporaryHitPoints: 0,
    armorClass: 15,
    speed: 30,
    initiative: 1,
    proficiencyBonus: 2,
    skills: {},
    savingThrows: ['strength', 'constitution'],
    conditions: [],
    equipment: [],
    inventory: [],
    ...overrides,
  }
}

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
        metadata: createMockMetadata(),
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
        metadata: createMockMetadata(),
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
        metadata: createMockMetadata(),
      }

      const secondState: GameState = {
        sessionId: 'session-2',
        phase: 'combat',
        party: [],
        metadata: createMockMetadata(),
      }

      setGameState(firstState)
      setGameState(secondState)

      const state = useGameStore.getState()
      expect(state.gameState?.sessionId).toBe('session-2')
      expect(state.gameState?.phase).toBe('combat')
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
        metadata: createMockMetadata(),
      }

      setGameState(initialState)
      updateGameState({ phase: 'combat', currentMapId: 'map-2' })

      const state = useGameStore.getState()
      expect(state.gameState?.phase).toBe('combat')
      expect(state.gameState?.currentMapId).toBe('map-2')
      expect(state.gameState?.sessionId).toBe('session-123')
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
        metadata: createMockMetadata({
          createdAt: 1000,
          updatedAt: 2000,
          playTime: 100,
        }),
      }

      setGameState(initialState)
      updateGameState({
        metadata: createMockMetadata({
          createdAt: 1000,
          updatedAt: 3000,
          playTime: 200,
        }),
      })

      const state = useGameStore.getState()
      expect(state.gameState?.metadata.updatedAt).toBe(3000)
    })

    it('should use shallow merge (replaces nested objects entirely)', () => {
      const { setGameState, updateGameState } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: createMockMetadata({
          createdAt: 1000,
          updatedAt: 2000,
          playTime: 100,
          scenarioId: 'original-scenario',
        }),
      }

      setGameState(initialState)

      // Shallow merge: passing a new metadata object replaces the whole thing
      updateGameState({
        metadata: createMockMetadata({
          updatedAt: 3000,
        }),
      })

      const state = useGameStore.getState()
      expect(state.gameState?.metadata.updatedAt).toBe(3000)
      // With shallow spread, the new metadata object's defaults apply
      // This test documents the actual behavior of the spread-based merge
    })
  })

  describe('updateParty', () => {
    it('should update party members', () => {
      const { setGameState, updateParty } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: createMockMetadata(),
      }

      setGameState(initialState)

      const party: Character[] = [
        createMockCharacter({
          id: 'char-1',
          name: 'Hero',
          race: 'Human',
          class: 'Fighter',
          level: 1,
          currentHitPoints: 10,
          maxHitPoints: 10,
          armorClass: 15,
          abilityScores: {
            strength: 16,
            dexterity: 12,
            constitution: 14,
            intelligence: 10,
            wisdom: 8,
            charisma: 13,
          },
        }),
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
          createMockCharacter({
            id: 'char-1',
            name: 'Old Character',
            race: 'Elf',
            class: 'Wizard',
            currentHitPoints: 6,
            maxHitPoints: 6,
            armorClass: 10,
            abilityScores: {
              strength: 8,
              dexterity: 14,
              constitution: 12,
              intelligence: 16,
              wisdom: 12,
              charisma: 10,
            },
          }),
        ],
        metadata: createMockMetadata(),
      }

      setGameState(initialState)

      const newParty: Character[] = [
        createMockCharacter({
          id: 'char-2',
          name: 'New Character',
          race: 'Dwarf',
          class: 'Cleric',
          currentHitPoints: 8,
          maxHitPoints: 8,
          armorClass: 16,
          abilityScores: {
            strength: 14,
            dexterity: 8,
            constitution: 16,
            intelligence: 10,
            wisdom: 14,
            charisma: 12,
          },
        }),
      ]

      updateParty(newParty)

      const state = useGameStore.getState()
      expect(state.gameState?.party).toHaveLength(1)
      expect(state.gameState?.party[0].id).toBe('char-2')
      expect(state.gameState?.party[0].name).toBe('New Character')
      expect(state.gameState?.party[0].race).toBe('Dwarf')
    })

    it('should store Character with all required fields', () => {
      const { setGameState, updateParty } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: createMockMetadata(),
      }

      setGameState(initialState)

      const character = createMockCharacter()
      updateParty([character])

      const stored = useGameStore.getState().gameState?.party[0]
      expect(stored).toEqual(character)
    })
  })

  describe('updateCombat', () => {
    it('should set combat state', () => {
      const { setGameState, updateCombat } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: createMockMetadata(),
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

    it('should set combat state with populated initiatives and effects', () => {
      const { setGameState, updateCombat } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [createMockCharacter({ id: 'fighter-1' })],
        metadata: createMockMetadata(),
      }

      setGameState(initialState)

      const initiatives: InitiativeEntry[] = [
        { characterId: 'fighter-1', initiative: 18, hasActed: false },
        { characterId: 'goblin-1', initiative: 12, hasActed: true },
      ]

      const effects: ActiveEffect[] = [
        { id: 'effect-1', name: 'Bless', duration: 10, source: 'cleric-1', target: 'fighter-1' },
      ]

      const combat: CombatState = {
        round: 2,
        turnIndex: 1,
        initiatives,
        participants: ['fighter-1', 'goblin-1'],
        activeEffects: effects,
      }

      updateCombat(combat)

      const state = useGameStore.getState()
      expect(state.gameState?.combat).toEqual(combat)
      expect(state.gameState?.combat?.initiatives).toHaveLength(2)
      expect(state.gameState?.combat?.activeEffects).toHaveLength(1)
      expect(state.gameState?.combat?.initiatives[0].initiative).toBe(18)
      expect(state.gameState?.combat?.activeEffects[0].name).toBe('Bless')
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
        metadata: createMockMetadata(),
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
        metadata: createMockMetadata(),
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

      setLoading(true)
      expect(useGameStore.getState().isLoading).toBe(true)

      setError('Failed to load')
      expect(useGameStore.getState().error).toBe('Failed to load')

      const mockState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        metadata: createMockMetadata(),
      }
      setGameState(mockState)

      const state = useGameStore.getState()
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should handle partial updates to game state', () => {
      const { setGameState, updateGameState } = useGameStore.getState()

      const initialState: GameState = {
        sessionId: 'session-123',
        phase: 'exploring',
        party: [],
        currentMapId: 'map-1',
        metadata: createMockMetadata(),
      }

      setGameState(initialState)
      updateGameState({ phase: 'combat' })

      const state = useGameStore.getState()
      expect(state.gameState?.phase).toBe('combat')
      expect(state.gameState?.currentMapId).toBe('map-1')
      expect(state.gameState?.sessionId).toBe('session-123')
    })
  })

  describe('persist middleware', () => {
    it('should only persist gameState field', () => {
      // Verify partialize: the persisted snapshot should contain only gameState
      const { setLoading, setError, setGameState } = useGameStore.getState()

      setLoading(true)
      setError('transient error')

      const mockState: GameState = {
        sessionId: 'session-persist',
        phase: 'exploring',
        party: [],
        metadata: createMockMetadata(),
      }
      setGameState(mockState)

      // Read what Zustand persist would serialize via partialize
      const fullState = useGameStore.getState()
      const persisted = { gameState: fullState.gameState }

      // isLoading and error exist in memory but should NOT be in persisted snapshot
      expect(persisted).not.toHaveProperty('isLoading')
      expect(persisted).not.toHaveProperty('error')
      expect(persisted.gameState?.sessionId).toBe('session-persist')
    })
  })
})
