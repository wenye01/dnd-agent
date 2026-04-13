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
    deathSaves: { successes: 0, failures: 0 },
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
      // Original createdAt (1000) and scenarioId ('original-scenario') are LOST
      // because spread ({ ...state, ...updates }) replaces metadata entirely
      expect(state.gameState?.metadata.createdAt).not.toBe(1000)
      expect(state.gameState?.metadata.scenarioId).toBe('test-scenario') // default from createMockMetadata
      // This documents the shallow merge gotcha: nested objects must be fully specified
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
        { id: 'effect-1', name: 'Bless', targetId: 'fighter-1', duration: 10, conditions: [] },
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
      // Use getOptions() to access the actual partialize function from Zustand persist config
      const options = useGameStore.persist.getOptions()
      expect(options.partialize).toBeDefined()

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

      // Call the actual partialize to see what Zustand would serialize
      const fullState = useGameStore.getState()
      const persisted = options.partialize!(fullState)

      // isLoading and error exist in memory but should NOT be in persisted snapshot
      expect(persisted).toHaveProperty('gameState')
      expect(persisted).not.toHaveProperty('isLoading')
      expect(persisted).not.toHaveProperty('error')
      expect((persisted as { gameState: GameState | null }).gameState?.sessionId).toBe('session-persist')
    })
  })
})

// ---------------------------------------------------------------
// v0.4 Phase 4: gameStore handler tests
// ---------------------------------------------------------------

describe('gameStore v0.4 Phase 4 handlers', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  function createGameStateWithCharacter(overrides: Partial<Character> = {}): void {
    const char: Character = {
      id: 'char-1',
      name: 'Wizard',
      race: 'Human',
      class: 'Wizard',
      level: 5,
      background: 'Sage',
      alignment: 'Neutral Good',
      abilityScores: { strength: 10, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 14, charisma: 12 },
      maxHitPoints: 28,
      currentHitPoints: 28,
      temporaryHitPoints: 0,
      armorClass: 12,
      speed: 30,
      initiative: 2,
      proficiencyBonus: 3,
      skills: {},
      savingThrows: ['intelligence', 'wisdom'],
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      equipment: [],
      inventory: [
        { id: 'potion-heal-1', name: 'Healing Potion', quantity: 1 },
        { id: 'longsword-1', name: 'Longsword', quantity: 1 },
        { id: 'chain-mail-1', name: 'Chain Mail', quantity: 1 },
      ],
      spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, 3: { max: 2, used: 0 } },
      ...overrides,
    }

    const state: GameState = {
      sessionId: 'session-test',
      phase: 'exploring',
      party: [char],
      currentMapId: 'map-dungeon-1',
      combat: null,
      scenario: null,
      metadata: createMockMetadata(),
    }
    useGameStore.getState().setGameState(state)
  }

  describe('handleSpellCast', () => {
    it('should not modify party if characterId does not match', () => {
      createGameStateWithCharacter()
      const originalParty = useGameStore.getState().gameState!.party

      useGameStore.getState().handleSpellCast({
        eventId: 'spell-1',
        timestamp: Date.now(),
        characterId: 'nonexistent',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
      })

      expect(useGameStore.getState().gameState!.party).toEqual(originalParty)
    })

    it('should not crash when gameState is null', () => {
      expect(useGameStore.getState().gameState).toBeNull()
      useGameStore.getState().handleSpellCast({
        eventId: 'spell-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
      })
      expect(useGameStore.getState().gameState).toBeNull()
    })
  })

  describe('handleItemUse', () => {
    it('should remove consumed item from character inventory', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleItemUse({
        eventId: 'item-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.inventory.find((i) => i.id === 'potion-heal-1')).toBeUndefined()
    })

    it('should keep item in inventory when consumed is false', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleItemUse({
        eventId: 'item-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        itemType: 'weapon',
        consumed: false,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.inventory.find((i) => i.id === 'longsword-1')).toBeDefined()
    })

    it('should not modify other characters inventory', () => {
      createGameStateWithCharacter()
      const char2: Character = {
        id: 'char-2', name: 'Rogue', race: 'Elf', class: 'Rogue', level: 3,
        background: 'Criminal', alignment: 'Chaotic Neutral',
        abilityScores: { strength: 8, dexterity: 18, constitution: 12, intelligence: 14, wisdom: 10, charisma: 14 },
        maxHitPoints: 24, currentHitPoints: 24, temporaryHitPoints: 0, armorClass: 14,
        speed: 30, initiative: 4, proficiencyBonus: 2, skills: {},
        savingThrows: ['dexterity'], conditions: [], deathSaves: { successes: 0, failures: 0 },
        equipment: [], inventory: [{ id: 'potion-heal-1', name: 'Healing Potion', quantity: 1 }],
      }
      const state = useGameStore.getState().gameState!
      useGameStore.getState().setGameState({ ...state, party: [...state.party, char2] })

      useGameStore.getState().handleItemUse({
        eventId: 'item-3',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
        healing: 8,
      })

      // char-2 still has their potion
      const rogueChar = useGameStore.getState().gameState!.party[1]
      expect(rogueChar.inventory.find((i) => i.id === 'potion-heal-1')).toBeDefined()
    })

    it('should not crash when gameState is null', () => {
      expect(useGameStore.getState().gameState).toBeNull()
      useGameStore.getState().handleItemUse({
        eventId: 'item-4',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'potion-heal-1',
        itemName: 'Healing Potion',
        itemType: 'consumable',
        consumed: true,
      })
      expect(useGameStore.getState().gameState).toBeNull()
    })
  })

  describe('handleEquip', () => {
    it('should add equipment to empty slot and remove from inventory', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleEquip({
        eventId: 'equip-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
        acBonus: 0,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.equipment.find((e) => e.slot === 'main_hand')?.itemId).toBe('longsword-1')
      expect(char.inventory.find((i) => i.id === 'longsword-1')).toBeUndefined()
    })

    it('should increase armorClass by acBonus', () => {
      createGameStateWithCharacter()
      const baseAc = useGameStore.getState().gameState!.party[0].armorClass

      useGameStore.getState().handleEquip({
        eventId: 'equip-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
        acBonus: 5,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.armorClass).toBe(baseAc + 5)
    })

    it('should replace existing equipment in the same slot', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleEquip({
        eventId: 'equip-3a',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
        acBonus: 0,
      })

      useGameStore.getState().handleEquip({
        eventId: 'equip-3b',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'dagger-1',
        itemName: 'Dagger',
        slot: 'main_hand',
        acBonus: 0,
      })

      const char = useGameStore.getState().gameState!.party[0]
      const mainHandItems = char.equipment.filter((e) => e.slot === 'main_hand')
      expect(mainHandItems).toHaveLength(1)
      expect(mainHandItems[0].itemId).toBe('dagger-1')
    })

    it('should not modify other characters when equipping', () => {
      createGameStateWithCharacter()
      const char2: Character = {
        id: 'char-2', name: 'Rogue', race: 'Elf', class: 'Rogue', level: 3,
        background: 'Criminal', alignment: 'Chaotic Neutral',
        abilityScores: { strength: 8, dexterity: 18, constitution: 12, intelligence: 14, wisdom: 10, charisma: 14 },
        maxHitPoints: 24, currentHitPoints: 24, temporaryHitPoints: 0, armorClass: 14,
        speed: 30, initiative: 4, proficiencyBonus: 2, skills: {},
        savingThrows: ['dexterity'], conditions: [], deathSaves: { successes: 0, failures: 0 },
        equipment: [], inventory: [],
      }
      const state = useGameStore.getState().gameState!
      useGameStore.getState().setGameState({ ...state, party: [...state.party, char2] })

      useGameStore.getState().handleEquip({
        eventId: 'equip-4',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
      })

      const rogueChar = useGameStore.getState().gameState!.party[1]
      expect(rogueChar.equipment).toHaveLength(0)
    })

    it('should preserve AC bonuses from other slots when equipping a new item', () => {
      createGameStateWithCharacter()
      const baseAc = useGameStore.getState().gameState!.party[0].armorClass

      // Equip chain mail (+5 AC) in chest slot
      useGameStore.getState().handleEquip({
        eventId: 'equip-multi-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
        acBonus: 5,
      })

      const afterChest = useGameStore.getState().gameState!.party[0]
      expect(afterChest.armorClass).toBe(baseAc + 5)

      // Equip a weapon (+0 AC) in main_hand slot — must NOT lose the +5 from chest
      useGameStore.getState().handleEquip({
        eventId: 'equip-multi-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
        acBonus: 0,
      })

      const afterWeapon = useGameStore.getState().gameState!.party[0]
      expect(afterWeapon.armorClass).toBe(baseAc + 5 + 0)
    })

    it('should preserve AC bonuses from other slots when replacing equipment in same slot', () => {
      createGameStateWithCharacter()
      const baseAc = useGameStore.getState().gameState!.party[0].armorClass

      // Equip chain mail (+5 AC) in chest slot
      useGameStore.getState().handleEquip({
        eventId: 'equip-replace-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
        acBonus: 5,
      })

      // Equip a shield (+2 AC) in off_hand slot
      useGameStore.getState().handleEquip({
        eventId: 'equip-replace-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'shield-1',
        itemName: 'Shield',
        slot: 'off_hand',
        acBonus: 2,
      })

      const afterBoth = useGameStore.getState().gameState!.party[0]
      expect(afterBoth.armorClass).toBe(baseAc + 5 + 2)
      expect(afterBoth.equipment).toHaveLength(2)
    })

    it('should not crash when gameState is null', () => {
      expect(useGameStore.getState().gameState).toBeNull()
      useGameStore.getState().handleEquip({
        eventId: 'equip-5',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
      })
      expect(useGameStore.getState().gameState).toBeNull()
    })
  })

  describe('handleUnequip', () => {
    it('should remove equipment from slot and add item back to inventory', () => {
      createGameStateWithCharacter()

      // First equip
      useGameStore.getState().handleEquip({
        eventId: 'equip-u1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
      })

      // Then unequip
      useGameStore.getState().handleUnequip({
        eventId: 'unequip-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.equipment.find((e) => e.slot === 'main_hand')).toBeUndefined()
      expect(char.inventory.find((i) => i.id === 'longsword-1')).toBeDefined()
    })

    it('should not crash when unequipping from empty slot', () => {
      createGameStateWithCharacter()
      // Slot is empty, should not crash
      useGameStore.getState().handleUnequip({
        eventId: 'unequip-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'nonexistent',
        itemName: 'Nothing',
        slot: 'off_hand',
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.equipment.find((e) => e.slot === 'off_hand')).toBeUndefined()
    })

    it('should preserve AC bonuses from other slots when unequipping', () => {
      createGameStateWithCharacter()
      const baseAc = useGameStore.getState().gameState!.party[0].armorClass

      // Equip chain mail (+5 AC) in chest slot
      useGameStore.getState().handleEquip({
        eventId: 'unequip-multi-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
        acBonus: 5,
      })

      // Equip a shield (+2 AC) in off_hand slot
      useGameStore.getState().handleEquip({
        eventId: 'unequip-multi-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'shield-1',
        itemName: 'Shield',
        slot: 'off_hand',
        acBonus: 2,
      })

      const afterBoth = useGameStore.getState().gameState!.party[0]
      expect(afterBoth.armorClass).toBe(baseAc + 5 + 2)

      // Unequip the shield — should still retain the +5 from chest
      useGameStore.getState().handleUnequip({
        eventId: 'unequip-multi-3',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'shield-1',
        itemName: 'Shield',
        slot: 'off_hand',
      })

      const afterUnequip = useGameStore.getState().gameState!.party[0]
      expect(afterUnequip.armorClass).toBe(baseAc + 5)
      expect(afterUnequip.equipment).toHaveLength(1)
      expect(afterUnequip.equipment[0].slot).toBe('chest')
    })

    it('should not crash when gameState is null', () => {
      expect(useGameStore.getState().gameState).toBeNull()
      useGameStore.getState().handleUnequip({
        eventId: 'unequip-3',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
      })
      expect(useGameStore.getState().gameState).toBeNull()
    })
  })

  describe('handleMapSwitch', () => {
    it('should update currentMapId to toMapId', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleMapSwitch({
        eventId: 'mapswitch-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        fromMapId: 'map-dungeon-1',
        toMapId: 'map-dungeon-2',
        entryPoint: 'south_entrance',
        position: { x: 0, y: 5 },
      })

      expect(useGameStore.getState().gameState!.currentMapId).toBe('map-dungeon-2')
    })

    it('should preserve all other gameState fields', () => {
      createGameStateWithCharacter()
      const originalSessionId = useGameStore.getState().gameState!.sessionId
      const originalPhase = useGameStore.getState().gameState!.phase
      const originalPartyLength = useGameStore.getState().gameState!.party.length

      useGameStore.getState().handleMapSwitch({
        eventId: 'mapswitch-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        fromMapId: 'map-dungeon-1',
        toMapId: 'map-dungeon-3',
        entryPoint: 'north_entrance',
        position: { x: 5, y: 0 },
      })

      const state = useGameStore.getState().gameState!
      expect(state.sessionId).toBe(originalSessionId)
      expect(state.phase).toBe(originalPhase)
      expect(state.party).toHaveLength(originalPartyLength)
    })

    it('should not crash when gameState is null', () => {
      expect(useGameStore.getState().gameState).toBeNull()
      useGameStore.getState().handleMapSwitch({
        eventId: 'mapswitch-3',
        timestamp: Date.now(),
        characterId: 'char-1',
        fromMapId: 'map-1',
        toMapId: 'map-2',
        entryPoint: 'east',
        position: { x: 0, y: 0 },
      })
      expect(useGameStore.getState().gameState).toBeNull()
    })
  })

  // Additional edge-case tests for improved coverage
  describe('handleSpellCast - spell slot edge cases', () => {
    it('should decrement spell slot usage for matching character', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleSpellCast({
        eventId: 'spell-slot-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.spellSlots![1].used).toBe(1)
      expect(char.spellSlots![2].used).toBe(0)
      expect(char.spellSlots![3].used).toBe(0)
    })

    it('should not modify spell slots when slotLevelUsed is 0', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleSpellCast({
        eventId: 'spell-cantrip-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'fire_bolt',
        spellName: 'Fire Bolt',
        slotLevelUsed: 0,
        concentrating: false,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.spellSlots![1].used).toBe(0)
    })

    it('should not modify spell slots when slot level does not exist', () => {
      createGameStateWithCharacter()

      useGameStore.getState().handleSpellCast({
        eventId: 'spell-high-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'meteor_swarm',
        spellName: 'Meteor Swarm',
        slotLevelUsed: 9,
        concentrating: false,
      })

      const char = useGameStore.getState().gameState!.party[0]
      // All slot levels unchanged
      expect(char.spellSlots![1].used).toBe(0)
      expect(char.spellSlots![2].used).toBe(0)
      expect(char.spellSlots![3].used).toBe(0)
    })

    it('should accumulate spell slot usage across multiple casts', () => {
      createGameStateWithCharacter()

      for (let i = 0; i < 3; i++) {
        useGameStore.getState().handleSpellCast({
          eventId: `spell-multi-${i}`,
          timestamp: Date.now(),
          characterId: 'char-1',
          spellId: 'magic_missile',
          spellName: 'Magic Missile',
          slotLevelUsed: 1,
          concentrating: false,
        })
      }

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.spellSlots![1].used).toBe(3)
    })

    it('should not modify slots when character has no spellSlots', () => {
      createGameStateWithCharacter({ spellSlots: undefined })

      useGameStore.getState().handleSpellCast({
        eventId: 'spell-no-slots-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'magic_missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.spellSlots).toBeUndefined()
    })
  })

  describe('handleEquip - edge cases', () => {
    it('should handle equip with no acBonus (undefined)', () => {
      createGameStateWithCharacter()
      const baseAc = useGameStore.getState().gameState!.party[0].armorClass

      useGameStore.getState().handleEquip({
        eventId: 'equip-nobonus-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'longsword-1',
        itemName: 'Longsword',
        slot: 'main_hand',
        // acBonus intentionally omitted
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.armorClass).toBe(baseAc)
      expect(char.equipment.find((e) => e.slot === 'main_hand')?.itemId).toBe('longsword-1')
    })

    it('should correctly recalculate AC when replacing armor in same slot', () => {
      createGameStateWithCharacter()
      const baseAc = useGameStore.getState().gameState!.party[0].armorClass

      // Equip leather armor (+2 AC)
      useGameStore.getState().handleEquip({
        eventId: 'equip-replace-ac-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'leather-armor-1',
        itemName: 'Leather Armor',
        slot: 'chest',
        acBonus: 2,
      })
      expect(useGameStore.getState().gameState!.party[0].armorClass).toBe(baseAc + 2)

      // Replace with chain mail (+5 AC) in same slot
      useGameStore.getState().handleEquip({
        eventId: 'equip-replace-ac-2',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
        acBonus: 5,
      })

      const char = useGameStore.getState().gameState!.party[0]
      expect(char.armorClass).toBe(baseAc + 5)
    })

    it('should set baseArmorClass on first equip and preserve it', () => {
      createGameStateWithCharacter()
      const originalAc = useGameStore.getState().gameState!.party[0].armorClass

      useGameStore.getState().handleEquip({
        eventId: 'equip-base-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
        acBonus: 5,
      })

      const afterFirst = useGameStore.getState().gameState!.party[0]
      expect(afterFirst.baseArmorClass).toBe(originalAc)

      // Unequip should restore baseArmorClass-based AC
      useGameStore.getState().handleUnequip({
        eventId: 'unequip-base-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        itemId: 'chain-mail-1',
        itemName: 'Chain Mail',
        slot: 'chest',
      })

      const afterUnequip = useGameStore.getState().gameState!.party[0]
      expect(afterUnequip.armorClass).toBe(originalAc)
      expect(afterUnequip.baseArmorClass).toBe(originalAc)
    })
  })
})
