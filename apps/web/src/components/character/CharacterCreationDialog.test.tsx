import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useGameStore } from '../../stores/gameStore'
import { CharacterCreationDialog } from './CharacterCreationDialog'

// Mock the API
vi.mock('../../services/api', () => ({
  characterApi: {
    create: vi.fn(),
  },
}))

// Import the mock after vi.mock
import { characterApi } from '../../services/api'
const mockCreate = vi.mocked(characterApi.create)

// Helper to create a mock server response
function createMockServerCharacter(overrides: Record<string, unknown> = {}) {
  return {
    id: 'new-char-1',
    name: 'TestChar',
    race: 'elf',
    class: 'wizard',
    level: 1,
    hp: 6,
    maxHp: 6,
    ac: 10,
    stats: {
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 16,
      wisdom: 13,
      charisma: 10,
    },
    skills: { arcana: true, history: true },
    inventory: [],
    conditions: [],
    background: 'sage',
    proficiencyBonus: 2,
    savingThrows: { intelligence: true, wisdom: true },
    speed: 30,
    gold: 0,
    racialTraits: [],
    ...overrides,
  }
}

/**
 * Click the submit button (the one with type="submit")
 */
function clickSubmit() {
  const submitBtn = screen.getByRole('button', { name: 'Create Character' })
  fireEvent.click(submitBtn)
}

describe('CharacterCreationDialog', () => {
  beforeEach(() => {
    const { reset, setGameState } = useGameStore.getState()
    reset()
    vi.clearAllMocks()
    // Initialize a minimal gameState so that updateParty can work
    setGameState({
      sessionId: 'test-session',
      phase: 'exploring',
      party: [],
      currentMapId: '',
      combat: null,
      scenario: null,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        playTime: 0,
        scenarioId: 'test',
      },
    })
  })

  it('should render the dialog when isOpen is true', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)
    // The modal title should be visible
    expect(screen.getByRole('heading', { name: 'Create Character' })).toBeDefined()
  })

  it('should not render the dialog when isOpen is false', () => {
    const { container } = render(<CharacterCreationDialog isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('should render all 9 races (expanded from original 3)', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)
    const expectedRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling']
    expectedRaces.forEach((race) => {
      expect(screen.getByText(race)).toBeDefined()
    })
  })

  it('should render all 12 classes (expanded from original 4)', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)
    const expectedClasses = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Bard', 'Paladin', 'Sorcerer', 'Warlock', 'Druid', 'Monk', 'Barbarian']
    expectedClasses.forEach((cls) => {
      expect(screen.getByText(cls)).toBeDefined()
    })
  })

  it('should render all 12 backgrounds (expanded from original 4)', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)
    const expectedBackgrounds = ['Sage', 'Soldier', 'Criminal', 'Commoner', 'Noble', 'Folk Hero', 'Acolyte', 'Entertainer', 'Outlander', 'Sailor', 'Urchin', 'Guild Artisan']
    expectedBackgrounds.forEach((bg) => {
      expect(screen.getByText(bg)).toBeDefined()
    })
  })

  it('should show error when submitting without a name', async () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)
    clickSubmit()
    await waitFor(() => {
      expect(screen.getByText('Character name is required')).toBeDefined()
    })
  })

  it('should call onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<CharacterCreationDialog isOpen={true} onClose={onClose} />)
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should map server character with equipment field correctly', async () => {
    const serverChar = createMockServerCharacter({
      equipment: [
        { slot: 'body', itemId: 'robe-001' },
        { slot: 'main_hand', itemId: 'staff-001' },
      ],
    })
    mockCreate.mockResolvedValueOnce({
      status: 'success',
      data: serverChar,
    })

    const onClose = vi.fn()
    render(<CharacterCreationDialog isOpen={true} onClose={onClose} />)

    // Fill in a name
    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })

    // Verify the party was updated
    const state = useGameStore.getState()
    expect(state.gameState?.party).toBeDefined()
    expect(state.gameState!.party.length).toBe(1)
    const createdChar = state.gameState!.party[0]
    expect(createdChar.equipment).toEqual([
      { slot: 'body', itemId: 'robe-001' },
      { slot: 'main_hand', itemId: 'staff-001' },
    ])
  })

  it('should default equipment to empty array when server does not provide it', async () => {
    const serverChar = createMockServerCharacter() // no equipment field
    mockCreate.mockResolvedValueOnce({
      status: 'success',
      data: serverChar,
    })

    const onClose = vi.fn()
    render(<CharacterCreationDialog isOpen={true} onClose={onClose} />)

    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })

    const state = useGameStore.getState()
    const createdChar = state.gameState!.party[0]
    expect(createdChar.equipment).toEqual([])
  })

  it('should map server character with spellSlots field correctly', async () => {
    const serverChar = createMockServerCharacter({
      spellSlots: {
        1: { max: 4, used: 1 },
        2: { max: 3, used: 0 },
      },
    })
    mockCreate.mockResolvedValueOnce({
      status: 'success',
      data: serverChar,
    })

    const onClose = vi.fn()
    render(<CharacterCreationDialog isOpen={true} onClose={onClose} />)

    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })

    const state = useGameStore.getState()
    const createdChar = state.gameState!.party[0]
    expect(createdChar.spellSlots).toEqual({
      1: { max: 4, used: 1 },
      2: { max: 3, used: 0 },
    })
  })

  it('should map server character with deathSaves field correctly', async () => {
    const serverChar = createMockServerCharacter({
      deathSaves: { successes: 1, failures: 2 },
    })
    mockCreate.mockResolvedValueOnce({
      status: 'success',
      data: serverChar,
    })

    const onClose = vi.fn()
    render(<CharacterCreationDialog isOpen={true} onClose={onClose} />)

    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })

    const state = useGameStore.getState()
    const createdChar = state.gameState!.party[0]
    expect(createdChar.deathSaves).toEqual({ successes: 1, failures: 2 })
  })

  it('should handle API error gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      status: 'error',
      error: { code: 'VALIDATION_ERROR', message: 'Invalid class selection' },
    })

    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)

    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(screen.getByText('Invalid class selection')).toBeDefined()
    })
  })

  it('should handle network error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network failure'))

    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)

    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeDefined()
    })
  })

  it('should allow selecting different races', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)

    // Click on "Elf" race
    const elfButton = screen.getByText('Elf').closest('button')!
    fireEvent.click(elfButton)

    // Elf should now be selected (border-gold/40 indicates selected state)
    expect(elfButton.className).toContain('border-gold')
  })

  it('should allow selecting different classes', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)

    // Click on "Wizard" class
    const wizardButton = screen.getByText('Wizard').closest('button')!
    fireEvent.click(wizardButton)

    expect(wizardButton.className).toContain('border-gold')
  })

  it('should allow selecting different backgrounds', () => {
    render(<CharacterCreationDialog isOpen={true} onClose={vi.fn()} />)

    // Click on "Sage" background
    const sageButton = screen.getByText('Sage').closest('button')!
    fireEvent.click(sageButton)

    expect(sageButton.className).toContain('border-gold')
  })

  it('should set spellSlots to undefined when server does not provide it', async () => {
    const serverChar = createMockServerCharacter() // no spellSlots field
    mockCreate.mockResolvedValueOnce({
      status: 'success',
      data: serverChar,
    })

    const onClose = vi.fn()
    render(<CharacterCreationDialog isOpen={true} onClose={onClose} />)

    const nameInput = screen.getByPlaceholderText('Enter character name')
    fireEvent.change(nameInput, { target: { value: 'TestChar' } })

    clickSubmit()

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })

    const state = useGameStore.getState()
    const createdChar = state.gameState!.party[0]
    expect(createdChar.spellSlots).toBeUndefined()
  })
})
