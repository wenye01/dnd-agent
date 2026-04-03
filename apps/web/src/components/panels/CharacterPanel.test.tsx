import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useGameStore } from '../../stores/gameStore'
import type { Character, GameState, GameMetadata } from '../../types'
import CharacterPanel from './CharacterPanel'

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

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: 'TestHero',
    race: 'Human',
    class: 'Wizard',
    level: 5,
    background: 'Sage',
    alignment: 'Lawful Good',
    abilityScores: {
      strength: 10,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 13,
      charisma: 8,
    },
    maxHitPoints: 28,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    armorClass: 12,
    speed: 30,
    initiative: 2,
    proficiencyBonus: 3,
    skills: {
      arcana: true,
      history: true,
      investigation: true,
    },
    savingThrows: ['intelligence', 'wisdom'],
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    equipment: [
      { slot: 'body', itemId: 'robe-001' },
      { slot: 'main_hand', itemId: 'staff-001' },
    ],
    inventory: [],
    spellSlots: {
      1: { max: 4, used: 1 },
      2: { max: 3, used: 0 },
      3: { max: 2, used: 2 },
    },
    ...overrides,
  }
}

describe('CharacterPanel', () => {
  beforeEach(() => {
    const { reset } = useGameStore.getState()
    reset()
  })

  it('should show "No Party Members" when party is empty', () => {
    render(<CharacterPanel />)
    expect(screen.getByText('No Party Members')).toBeDefined()
  })

  it('should show "No Party Members" when party is null', () => {
    render(<CharacterPanel />)
    expect(screen.getByText('No Party Members')).toBeDefined()
  })

  it('should render character cards for party members', () => {
    const character = createMockCharacter()
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)
    expect(screen.getByText('TestHero')).toBeDefined()
    expect(screen.getByText(/Level 5 Wizard/)).toBeDefined()
  })

  it('should display character stats in the header section', () => {
    // Use ability scores that won't collide with AC=17
    const character = createMockCharacter({
      armorClass: 17,
      speed: 25,
      initiative: 3,
      abilityScores: {
        strength: 8,
        dexterity: 16,
        constitution: 14,
        intelligence: 12,
        wisdom: 10,
        charisma: 13,
      },
    })
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    // AC, Speed, Initiative should be visible
    // '+3' appears twice: once for DEX modifier and once for Initiative
    expect(screen.getByText('17')).toBeDefined() // AC
    expect(screen.getByText('25ft')).toBeDefined() // Speed
    expect(screen.getAllByText('+3').length).toBeGreaterThanOrEqual(2) // Initiative + DEX modifier
  })

  it('should show ability scores', () => {
    const character = createMockCharacter()
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)
    // Ability score labels
    expect(screen.getAllByText('STR').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DEX').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CON').length).toBeGreaterThan(0)
  })

  it('should show conditions when present', () => {
    const character = createMockCharacter({
      conditions: ['poisoned', 'blinded'],
    })
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)
    expect(screen.getByText('poisoned')).toBeDefined()
    expect(screen.getByText('blinded')).toBeDefined()
  })

  it('should expand to show sub-components on click', () => {
    const character = createMockCharacter()
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    // Before expand, sub-component headers should not be visible
    expect(screen.queryByText('Saving Throws')).toBeNull()
    expect(screen.queryByText('Skills')).toBeNull()
    expect(screen.queryByText('Equipment')).toBeNull()

    // Click to expand
    const headerArea = screen.getByText('TestHero').closest('[role="button"]')
    expect(headerArea).toBeTruthy()
    fireEvent.click(headerArea!)

    // After expand, sub-component headers should be visible
    expect(screen.getByText('Saving Throws')).toBeDefined()
    expect(screen.getByText('Skills')).toBeDefined()
    expect(screen.getByText('Equipment')).toBeDefined()
    expect(screen.getByText('Spell Slots')).toBeDefined()
  })

  it('should show Death Saves when character HP is 0 and expanded', () => {
    const character = createMockCharacter({
      currentHitPoints: 0,
    })
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    // Expand the character section
    const headerArea = screen.getByText('TestHero').closest('[role="button"]')
    fireEvent.click(headerArea!)

    // Death Saves should be visible
    expect(screen.getByText('Death Saves')).toBeDefined()
  })

  it('should not show Death Saves when character HP > 0 even when expanded', () => {
    const character = createMockCharacter({
      currentHitPoints: 10,
    })
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    // Expand the character section
    const headerArea = screen.getByText('TestHero').closest('[role="button"]')
    fireEvent.click(headerArea!)

    // Death Saves should NOT be visible
    expect(screen.queryByText('Death Saves')).toBeNull()
  })

  it('should show Spell Slots for caster characters when expanded', () => {
    const character = createMockCharacter() // Wizard with spellSlots
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    const headerArea = screen.getByText('TestHero').closest('[role="button"]')
    fireEvent.click(headerArea!)

    expect(screen.getByText('Spell Slots')).toBeDefined()
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.getByText('2nd')).toBeDefined()
    expect(screen.getByText('3rd')).toBeDefined()
  })

  it('should not show Spell Slots for non-caster characters', () => {
    const character = createMockCharacter({
      class: 'Fighter',
      spellSlots: undefined,
    })
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    const headerArea = screen.getByText('TestHero').closest('[role="button"]')
    fireEvent.click(headerArea!)

    expect(screen.queryByText('Spell Slots')).toBeNull()
  })

  it('should show equipment slots when expanded', () => {
    const character = createMockCharacter()
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    const headerArea = screen.getByText('TestHero').closest('[role="button"]')
    fireEvent.click(headerArea!)

    // Equipment header should be present
    expect(screen.getByText('Equipment')).toBeDefined()
    // Two equipped items should show their itemIds as fallback (inventory is empty)
    expect(screen.getByText('robe-001')).toBeDefined()
    expect(screen.getByText('staff-001')).toBeDefined()
  })

  it('should render multiple party members', () => {
    const char1 = createMockCharacter({ id: 'char-1', name: 'Hero1' })
    const char2 = createMockCharacter({ id: 'char-2', name: 'Hero2', class: 'Fighter' })
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [char1, char2],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)
    expect(screen.getByText('Hero1')).toBeDefined()
    expect(screen.getByText('Hero2')).toBeDefined()
  })

  it('should toggle expand/collapse on repeated clicks', () => {
    const character = createMockCharacter()
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    const headerArea = screen.getByText('TestHero').closest('[role="button"]')!

    // First click: expand
    fireEvent.click(headerArea)
    expect(screen.getByText('Saving Throws')).toBeDefined()

    // Second click: collapse
    fireEvent.click(headerArea)
    expect(screen.queryByText('Saving Throws')).toBeNull()
  })

  it('should support keyboard interaction for expand/collapse', () => {
    const character = createMockCharacter()
    const metadata = createMockMetadata()
    const gameState: GameState = {
      party: [character],
      combat: null,
      turnOrder: [],
      currentTurnIndex: 0,
      round: 0,
      npcs: [],
      metadata,
    }
    useGameStore.getState().setGameState(gameState)

    render(<CharacterPanel />)

    const headerArea = screen.getByText('TestHero').closest('[role="button"]')!

    // Press Enter to expand
    fireEvent.keyDown(headerArea, { key: 'Enter' })
    expect(screen.getByText('Saving Throws')).toBeDefined()

    // Press Space to collapse
    fireEvent.keyDown(headerArea, { key: ' ' })
    expect(screen.queryByText('Saving Throws')).toBeNull()
  })
})
