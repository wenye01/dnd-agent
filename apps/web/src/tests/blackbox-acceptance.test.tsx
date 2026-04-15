/**
 * Blackbox Acceptance Tests for v0.4 手测问题修复
 *
 * Verifies acceptance criteria from user perspective:
 * AC1: Wizard 角色 SPELLS 按钮可用
 * AC2: Save 按钮有可见反馈
 * AC3: 施法日志不显示 "Unknown"
 * AC4: 战斗意图能触发战斗态
 * AC5: 不破坏既有路径
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { useGameStore } from '../stores/gameStore'
import { useChatStore } from '../stores/chatStore'
import { useCombatStore } from '../stores/combatStore'
import { renderHook } from '@testing-library/react'
import { useGameMessages } from '../hooks/useGameMessages'
import { getWebSocketHandler, getWebSocketUnsubscribe, resetWebSocketHandler } from '../test/setup'
import QuickActions from '../components/panels/QuickActions'
import type { Character } from '../types'

// ─── Helpers ───

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: 'Gandalf',
    race: 'Human',
    class: 'Wizard',
    level: 5,
    background: 'Sage',
    alignment: 'Neutral Good',
    abilityScores: { strength: 10, dexterity: 14, constitution: 12, intelligence: 20, wisdom: 15, charisma: 16 },
    maxHitPoints: 30,
    currentHitPoints: 30,
    temporaryHitPoints: 0,
    armorClass: 12,
    speed: 30,
    initiative: 2,
    proficiencyBonus: 3,
    inventory: [],
    equipment: {},
    spellSlots: {},
    conditions: [],
    experiencePoints: 6500,
    hitDice: '5d6',
    deathSaves: { successes: 0, failures: 0 },
    ...overrides,
  }
}

function setupGameStateWithWizard() {
  useGameStore.getState().setGameState({
    sessionId: 'session-123',
    phase: 'exploration',
    party: [createMockCharacter()],
    currentMapId: 'map-1',
    combat: null,
    scenario: null,
    metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
  })
}

function resetAllStores() {
  useGameStore.getState().reset()
  useChatStore.getState().clearMessages()
  useCombatStore.getState().reset()
}

// ─── AC1: Wizard 角色 SPELLS 按钮可用 ───

describe('AC1: SPELLS button for Wizard characters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
  })

  afterEach(() => {
    cleanup()
  })

  it('should enable SPELLS button when party has a Wizard', () => {
    setupGameStateWithWizard()
    render(<QuickActions />)

    const spellsButton = screen.getByTitle('Spells')
    expect(spellsButton).not.toBeDisabled()
  })

  it('should enable SPELLS button for lowercase "wizard" class', () => {
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'exploration',
      party: [createMockCharacter({ class: 'wizard' })],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    render(<QuickActions />)
    expect(screen.getByTitle('Spells')).not.toBeDisabled()
  })

  it('should disable SPELLS button when party has only non-spellcasters', () => {
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'exploration',
      party: [createMockCharacter({ class: 'Fighter', name: 'Aragorn' })],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    render(<QuickActions />)
    expect(screen.getByTitle('Spells')).toBeDisabled()
  })
})

// ─── AC2: Save 按钮有可见反馈 ───

describe('AC2: Save button visible feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
  })

  afterEach(() => {
    cleanup()
  })

  it('should show system message "Game saved successfully" after clicking Save', () => {
    setupGameStateWithWizard()
    render(<QuickActions />)

    fireEvent.click(screen.getByTitle('Save'))

    const messages = useChatStore.getState().messages
    const hasSaveMessage = messages.some((m) =>
      m.content.includes('Game saved successfully'),
    )
    expect(hasSaveMessage).toBe(true)
  })

  it('should change button label from "Save" to "Saved!" after click', () => {
    vi.useFakeTimers()
    setupGameStateWithWizard()
    render(<QuickActions />)

    expect(screen.getByTitle('Save')).toHaveTextContent('Save')

    fireEvent.click(screen.getByTitle('Save'))

    expect(screen.getByTitle('Saved!')).toHaveTextContent('Saved!')

    vi.useRealTimers()
  })

  it('should revert button label back to "Save" after 2 seconds', () => {
    vi.useFakeTimers()
    setupGameStateWithWizard()
    render(<QuickActions />)

    fireEvent.click(screen.getByTitle('Save'))
    expect(screen.getByTitle('Saved!')).toBeDefined()

    act(() => { vi.advanceTimersByTime(2000) })

    expect(screen.getByTitle('Save')).toHaveTextContent('Save')

    vi.useRealTimers()
  })

  it('should not crash when gameState has no metadata', () => {
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

    expect(() => fireEvent.click(screen.getByTitle('Save'))).not.toThrow()
    const messages = useChatStore.getState().messages
    expect(messages.some((m) => m.content.includes('Game saved successfully'))).toBe(true)
  })
})

// ─── AC3: 施法日志不显示 "Unknown" ───

describe('AC3: Spell cast log shows recognizable caster name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
    resetWebSocketHandler()
  })

  afterEach(() => {
    cleanup()
    resetWebSocketHandler()
  })

  it('should show caster name from party when spell_cast event arrives with characterId', () => {
    // Set up party with a known Wizard
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'exploration',
      party: [createMockCharacter({ id: 'char-1', name: 'Gandalf' })],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    // Simulate spell_cast from server with valid payload shape
    handler({
      type: 'spell_cast',
      payload: {
        eventId: 'evt-1',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'spell-fireball',
        spellName: 'Fireball',
        slotLevelUsed: 3,
        concentrating: false,
        damage: 28,
        damageType: 'fire',
        targetId: 'goblin-1',
      },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages.length).toBeGreaterThan(0)

    const lastMessage = messages[messages.length - 1]
    // AC3: Should NOT show "Unknown"
    expect(lastMessage.content).not.toContain('Unknown')
    // Should show the real character name
    expect(lastMessage.content).toContain('Gandalf')
    expect(lastMessage.content).toContain('Fireball')
  })

  it('should show caster name in combat_event spell with characterId from party', () => {
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'combat',
      party: [createMockCharacter({ id: 'char-1', name: 'Gandalf' })],
      currentMapId: 'map-1',
      combat: { status: 'active', round: 1, turnIndex: 0, initiatives: [20], participants: ['char-1'], activeEffects: [] },
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'combat_event',
      payload: {
        eventType: 'spell',
        characterId: 'char-1',
        target: 'goblin-1',
      },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    const lastMessage = messages[messages.length - 1]
    // Should NOT show "Unknown"
    expect(lastMessage.content).not.toContain('Unknown')
    expect(lastMessage.content).toContain('Gandalf')
  })

  it('should fall back to characterId when party member not found (not "Unknown" for spell events)', () => {
    // No party set - characterId falls back to itself
    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'spell_cast',
      payload: {
        eventId: 'evt-2',
        timestamp: Date.now(),
        characterId: 'char-999',
        spellId: 'spell-magic-missile',
        spellName: 'Magic Missile',
        slotLevelUsed: 1,
        concentrating: false,
      },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages.length).toBeGreaterThan(0)
    const lastMessage = messages[messages.length - 1]
    // Should fall back to characterId, NOT "Unknown"
    expect(lastMessage.content).toContain('char-999')
    expect(lastMessage.content).not.toContain('Unknown')
  })

  it('should resolve target name from party for spell with targetId', () => {
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'exploration',
      party: [
        createMockCharacter({ id: 'char-1', name: 'Gandalf' }),
        createMockCharacter({ id: 'monster-1', name: 'Goblin Scout', class: 'Monster' }),
      ],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'spell_cast',
      payload: {
        eventId: 'evt-3',
        timestamp: Date.now(),
        characterId: 'char-1',
        spellId: 'spell-fireball',
        spellName: 'Fireball',
        slotLevelUsed: 3,
        concentrating: false,
        damage: 28,
        damageType: 'fire',
        targetId: 'monster-1',
      },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages.length).toBeGreaterThan(0)
    const lastMessage = messages[messages.length - 1]
    expect(lastMessage.content).toContain('Gandalf')
    expect(lastMessage.content).toContain('Goblin Scout')
    expect(lastMessage.content).not.toContain('Unknown')
  })
})

// ─── AC4: 战斗意图触发战斗态 ───

describe('AC4: Combat intent triggers combat mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
    resetWebSocketHandler()
  })

  afterEach(() => {
    cleanup()
    resetWebSocketHandler()
  })

  it('should transition to combat phase when state_update with phase=combat arrives', () => {
    // Start in exploration
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'exploration',
      party: [createMockCharacter()],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    // Server sends combat state update
    handler({
      type: 'state_update',
      payload: {
        stateType: 'game',
        data: {
          sessionId: 'session-123',
          phase: 'combat',
        },
      },
      timestamp: Date.now(),
    })

    const gameState = useGameStore.getState().gameState
    expect(gameState?.phase).toBe('combat')
  })

  it('should activate combat store when combat_start event arrives', () => {
    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'combat_event',
      payload: { eventType: 'combat_start' },
      timestamp: Date.now(),
    })

    // Chat should show combat started message
    const messages = useChatStore.getState().messages
    expect(messages.some((m) => m.content.includes('Combat has started'))).toBe(true)
  })

  it('should set combat active when state_update with combat data arrives', () => {
    // Initialize gameState first — updateCombat keeps null if gameState is null
    setupGameStateWithWizard()

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'state_update',
      payload: {
        stateType: 'combat',
        data: {
          status: 'active',
          round: 1,
          turnIndex: 0,
          initiatives: [20, 15],
          participants: ['char-1', 'goblin-1'],
          activeEffects: [],
        },
      },
      timestamp: Date.now(),
    })

    const combatState = useGameStore.getState().gameState?.combat
    expect(combatState).not.toBeNull()
    expect(combatState?.status).toBe('active')
    expect(combatState?.round).toBe(1)

    // Combat store should also be synced
    expect(useCombatStore.getState().isCombatActive).toBe(true)
  })

  it('should end combat when combat_end event arrives', () => {
    // First start combat
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'combat',
      party: [createMockCharacter()],
      currentMapId: 'map-1',
      combat: { status: 'active', round: 2, turnIndex: 0, initiatives: [20], participants: ['char-1'], activeEffects: [] },
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'combat_event',
      payload: { eventType: 'combat_end' },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages.some((m) => m.content.includes('Combat has ended'))).toBe(true)

    // Combat store should be cleared
    expect(useCombatStore.getState().combat).toBeNull()
  })

  it('should clear combat when state_update with null combat data arrives', () => {
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'combat',
      party: [createMockCharacter()],
      currentMapId: 'map-1',
      combat: { status: 'active', round: 1, turnIndex: 0, initiatives: [20], participants: ['char-1'], activeEffects: [] },
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'state_update',
      payload: { stateType: 'combat', data: null },
      timestamp: Date.now(),
    })

    expect(useGameStore.getState().gameState?.combat).toBeNull()
  })
})

// ─── AC5: Regression - 不破坏既有路径 ───

describe('AC5: Regression - existing paths still work', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
    resetWebSocketHandler()
  })

  afterEach(() => {
    cleanup()
    resetWebSocketHandler()
  })

  it('should handle normal narration messages without errors', () => {
    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'narration',
      payload: { text: 'You enter a dark dungeon.', isStreaming: false },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe('dm')
    expect(messages[0].content).toBe('You enter a dark dungeon.')
  })

  it('should handle dice results correctly', () => {
    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'dice_result',
      payload: { formula: '1d20+5', dice: [15], modifier: 5, total: 20 },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe('system')
    expect(messages[0].content).toContain('1d20+5')
    expect(messages[0].content).toContain('20')
  })

  it('should handle error messages from server', () => {
    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'error',
      payload: { code: 'NOT_FOUND', message: 'Session not found' },
      timestamp: Date.now(),
    })

    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toContain('Error:')
    expect(messages[0].content).toContain('Session not found')
  })

  it('should handle streaming narration correctly', () => {
    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'narration',
      payload: { text: 'You see a ', isStreaming: true },
      timestamp: Date.now(),
    })
    handler({
      type: 'narration',
      payload: { text: 'dragon!', isStreaming: true },
      timestamp: Date.now(),
    })

    const state = useChatStore.getState()
    expect(state.streamingText).toBe('You see a dragon!')
    expect(state.isStreaming).toBe(true)
  })

  it('should handle party update correctly', () => {
    useGameStore.getState().setGameState({
      sessionId: 'session-123',
      phase: 'exploration',
      party: [],
      currentMapId: 'map-1',
      combat: null,
      scenario: null,
      metadata: { createdAt: Date.now(), updatedAt: Date.now(), playTime: 0, scenarioId: 'test' },
    })

    renderHook(() => useGameMessages())
    const handler = getWebSocketHandler()!

    handler({
      type: 'state_update',
      payload: {
        stateType: 'party',
        data: [{ id: 'char-1', name: 'Hero', race: 'Human', class: 'Fighter', level: 1 }],
      },
      timestamp: Date.now(),
    })

    const party = useGameStore.getState().gameState?.party
    expect(party).toHaveLength(1)
    expect(party?.[0].name).toBe('Hero')
  })
})
