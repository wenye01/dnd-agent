import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SavingThrows } from './SavingThrows'
import type { Ability, AbilityScores } from '../../types'

const defaultAbilityScores: AbilityScores = {
  strength: 16,
  dexterity: 14,
  constitution: 12,
  intelligence: 10,
  wisdom: 8,
  charisma: 13,
}

/**
 * Helper: find the saving throw row for a given ability label (STR, DEX, etc.)
 * and return the modifier text shown in that row.
 */
function getModifierForAbility(label: string): string {
  const labelEl = screen.getByText(label)
  // Walk up to the row container (parent div of the label)
  const row = labelEl.closest('.grid-cols-3 > div') ?? labelEl.parentElement
  if (!row) throw new Error(`Row not found for ${label}`)
  // The modifier is the last span with font-mono in the row
  const modSpans = row.querySelectorAll('.font-mono')
  const lastSpan = modSpans[modSpans.length - 1]
  return lastSpan?.textContent?.trim() ?? ''
}

describe('SavingThrows', () => {
  it('should render the Saving Throws header', () => {
    render(
      <SavingThrows
        savingThrows={[]}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    expect(screen.getByText('Saving Throws')).toBeDefined()
  })

  it('should render all 6 ability labels', () => {
    render(
      <SavingThrows
        savingThrows={[]}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    expect(screen.getByText('STR')).toBeDefined()
    expect(screen.getByText('DEX')).toBeDefined()
    expect(screen.getByText('CON')).toBeDefined()
    expect(screen.getByText('INT')).toBeDefined()
    expect(screen.getByText('WIS')).toBeDefined()
    expect(screen.getByText('CHA')).toBeDefined()
  })

  it('should calculate modifiers correctly without proficiency', () => {
    render(
      <SavingThrows
        savingThrows={[]}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // STR 16 -> +3 (no prof)
    expect(getModifierForAbility('STR')).toBe('+3')
    // DEX 14 -> +2 (no prof)
    expect(getModifierForAbility('DEX')).toBe('+2')
    // CON 12 -> +1 (no prof)
    expect(getModifierForAbility('CON')).toBe('+1')
    // INT 10 -> +0 (no prof)
    expect(getModifierForAbility('INT')).toBe('+0')
    // WIS 8 -> -1 (no prof)
    expect(getModifierForAbility('WIS')).toBe('-1')
    // CHA 13 -> +1 (no prof)
    expect(getModifierForAbility('CHA')).toBe('+1')
  })

  it('should add proficiency bonus to proficient saves', () => {
    const proficientSaves: Ability[] = ['strength', 'constitution']
    render(
      <SavingThrows
        savingThrows={proficientSaves}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // STR 16 -> +3 + 2 (prof) = +5
    expect(getModifierForAbility('STR')).toBe('+5')
    // DEX 14 -> +2 (no prof)
    expect(getModifierForAbility('DEX')).toBe('+2')
    // CON 12 -> +1 + 2 (prof) = +3
    expect(getModifierForAbility('CON')).toBe('+3')
    // CHA 13 -> +1 (no prof)
    expect(getModifierForAbility('CHA')).toBe('+1')
  })

  it('should show modifier +0 for score 10 without proficiency', () => {
    const scores: AbilityScores = {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
    }
    render(
      <SavingThrows
        savingThrows={[]}
        abilityScores={scores}
        proficiencyBonus={3}
      />
    )
    // All should be +0 without proficiency
    expect(getModifierForAbility('STR')).toBe('+0')
    expect(getModifierForAbility('DEX')).toBe('+0')
    expect(getModifierForAbility('CON')).toBe('+0')
    expect(getModifierForAbility('INT')).toBe('+0')
    expect(getModifierForAbility('WIS')).toBe('+0')
    expect(getModifierForAbility('CHA')).toBe('+0')
  })

  it('should show modifier +prof with all proficient saves', () => {
    const allProficient: Ability[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    const scores: AbilityScores = {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
    }
    render(
      <SavingThrows
        savingThrows={allProficient}
        abilityScores={scores}
        proficiencyBonus={3}
      />
    )
    // All should be +3 with proficiency (0 + 3)
    expect(getModifierForAbility('STR')).toBe('+3')
    expect(getModifierForAbility('DEX')).toBe('+3')
    expect(getModifierForAbility('CON')).toBe('+3')
    expect(getModifierForAbility('INT')).toBe('+3')
    expect(getModifierForAbility('WIS')).toBe('+3')
    expect(getModifierForAbility('CHA')).toBe('+3')
  })

  it('should handle proficiency bonus of 0', () => {
    render(
      <SavingThrows
        savingThrows={['strength']}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={0}
      />
    )
    // STR 16 -> +3 + 0 = +3 (same as without prof)
    expect(getModifierForAbility('STR')).toBe('+3')
  })

  it('should handle low ability scores', () => {
    const lowScores: AbilityScores = {
      strength: 3, dexterity: 4, constitution: 5,
      intelligence: 6, wisdom: 7, charisma: 8,
    }
    render(
      <SavingThrows
        savingThrows={[]}
        abilityScores={lowScores}
        proficiencyBonus={2}
      />
    )
    // STR 3 -> -4
    expect(getModifierForAbility('STR')).toBe('-4')
    // DEX 4 -> -3
    expect(getModifierForAbility('DEX')).toBe('-3')
    // CHA 8 -> -1
    expect(getModifierForAbility('CHA')).toBe('-1')
  })

  it('should handle proficiency with negative modifiers', () => {
    const lowScores: AbilityScores = {
      strength: 6, dexterity: 8, constitution: 10,
      intelligence: 12, wisdom: 14, charisma: 16,
    }
    render(
      <SavingThrows
        savingThrows={['strength']}
        abilityScores={lowScores}
        proficiencyBonus={2}
      />
    )
    // STR 6 -> -2 + 2 = +0
    expect(getModifierForAbility('STR')).toBe('+0')
  })

  it('should show proficiency dot for proficient saves', () => {
    const proficientSaves: Ability[] = ['strength', 'wisdom']
    const { container } = render(
      <SavingThrows
        savingThrows={proficientSaves}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // Check that proficiency dots are rendered (bg-gold for proficient, border for non-proficient)
    const profDots = container.querySelectorAll('.bg-gold')
    expect(profDots.length).toBe(2) // STR and WIS
  })
})
