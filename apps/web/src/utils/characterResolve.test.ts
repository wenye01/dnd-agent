import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { resolveCharacterName } from './characterResolve'

describe('resolveCharacterName', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('should return "Unknown" for undefined input', () => {
    expect(resolveCharacterName(undefined)).toBe('Unknown')
  })

  it('should return "Unknown" for null input', () => {
    expect(resolveCharacterName(null)).toBe('Unknown')
  })

  it('should return "Unknown" for empty string', () => {
    expect(resolveCharacterName('')).toBe('Unknown')
  })

  it('should return characterId when no game state exists', () => {
    expect(resolveCharacterName('char-1')).toBe('char-1')
  })

  it('should return characterId when party is empty', () => {
    useGameStore.getState().setGameState({
      sessionId: 's1',
      phase: 'exploration',
      party: [],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })
    expect(resolveCharacterName('char-1')).toBe('char-1')
  })

  it('should return characterId when character not found in party', () => {
    useGameStore.getState().setGameState({
      sessionId: 's1',
      phase: 'exploration',
      party: [
        { id: 'char-2', name: 'Aragorn', race: 'Human', class: 'Fighter', level: 5 } as any,
      ],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })
    expect(resolveCharacterName('char-1')).toBe('char-1')
  })

  it('should resolve character name from party', () => {
    useGameStore.getState().setGameState({
      sessionId: 's1',
      phase: 'exploration',
      party: [
        { id: 'char-1', name: 'Gandalf', race: 'Human', class: 'Wizard', level: 5 } as any,
        { id: 'char-2', name: 'Aragorn', race: 'Human', class: 'Fighter', level: 5 } as any,
      ],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })
    expect(resolveCharacterName('char-1')).toBe('Gandalf')
    expect(resolveCharacterName('char-2')).toBe('Aragorn')
  })

  it('should resolve correctly when gameState has no party field', () => {
    useGameStore.getState().setGameState({
      sessionId: 's1',
      phase: 'exploration',
      party: undefined as any,
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })
    expect(resolveCharacterName('char-1')).toBe('char-1')
  })
})
