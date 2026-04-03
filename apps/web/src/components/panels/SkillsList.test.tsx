import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkillsList } from './SkillsList'
import type { AbilityScores, SkillProficiencies } from '../../types'

const defaultAbilityScores: AbilityScores = {
  strength: 16,
  dexterity: 14,
  constitution: 12,
  intelligence: 10,
  wisdom: 8,
  charisma: 13,
}

/**
 * Helper: find the skill row for a given skill label (e.g. "Acrobatics")
 * and return the modifier text shown in that row.
 */
function getModifierForSkill(label: string): string {
  const labelEl = screen.getByText(label)
  const row = labelEl.closest('.grid-cols-2 > div') ?? labelEl.parentElement
  if (!row) throw new Error(`Row not found for ${label}`)
  const modSpans = row.querySelectorAll('.font-mono')
  const lastSpan = modSpans[modSpans.length - 1]
  return lastSpan?.textContent?.trim() ?? ''
}

/**
 * Helper: find the ability abbreviation for a given skill label.
 */
function getAbilityAbbrForSkill(label: string): string {
  const labelEl = screen.getByText(label)
  const row = labelEl.closest('.grid-cols-2 > div') ?? labelEl.parentElement
  if (!row) throw new Error(`Row not found for ${label}`)
  // The ability abbreviation is a small span with text like STR, DEX, etc.
  const abbrSpans = row.querySelectorAll('.text-gold\\/35')
  return abbrSpans[0]?.textContent?.trim() ?? ''
}

describe('SkillsList', () => {
  it('should render the Skills header', () => {
    render(
      <SkillsList
        skills={{}}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    expect(screen.getByText('Skills')).toBeDefined()
  })

  it('should render all 18 D&D 5e skills', () => {
    render(
      <SkillsList
        skills={{}}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    const expectedSkills = [
      'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
      'Deception', 'History', 'Insight', 'Intimidation',
      'Investigation', 'Medicine', 'Nature', 'Perception',
      'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
      'Stealth', 'Survival',
    ]
    expectedSkills.forEach((skill) => {
      expect(screen.getByText(skill)).toBeDefined()
    })
  })

  it('should show the correct ability abbreviation for each skill', () => {
    render(
      <SkillsList
        skills={{}}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // Check a few representative skill-to-ability mappings
    expect(getAbilityAbbrForSkill('Acrobatics')).toBe('DEX')
    expect(getAbilityAbbrForSkill('Athletics')).toBe('STR')
    expect(getAbilityAbbrForSkill('Arcana')).toBe('INT')
    expect(getAbilityAbbrForSkill('Perception')).toBe('WIS')
    expect(getAbilityAbbrForSkill('Persuasion')).toBe('CHA')
  })

  it('should calculate modifiers correctly without proficiency', () => {
    render(
      <SkillsList
        skills={{}}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // Acrobatics (DEX 14) -> +2
    expect(getModifierForSkill('Acrobatics')).toBe('+2')
    // Athletics (STR 16) -> +3
    expect(getModifierForSkill('Athletics')).toBe('+3')
    // Arcana (INT 10) -> +0
    expect(getModifierForSkill('Arcana')).toBe('+0')
    // Insight (WIS 8) -> -1
    expect(getModifierForSkill('Insight')).toBe('-1')
    // Deception (CHA 13) -> +1
    expect(getModifierForSkill('Deception')).toBe('+1')
  })

  it('should add proficiency bonus to proficient skills', () => {
    const skills: SkillProficiencies = {
      acrobatics: true,
      athletics: true,
    }
    render(
      <SkillsList
        skills={skills}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // Acrobatics (DEX 14) -> +2 + 2 = +4
    expect(getModifierForSkill('Acrobatics')).toBe('+4')
    // Athletics (STR 16) -> +3 + 2 = +5
    expect(getModifierForSkill('Athletics')).toBe('+5')
    // Arcana should still be +0 (not proficient)
    expect(getModifierForSkill('Arcana')).toBe('+0')
  })

  it('should not add proficiency bonus when skill is false', () => {
    const skills: SkillProficiencies = {
      acrobatics: false,
    }
    render(
      <SkillsList
        skills={skills}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // Acrobatics (DEX 14) -> +2 (no prof bonus since value is false)
    expect(getModifierForSkill('Acrobatics')).toBe('+2')
  })

  it('should handle all skills proficient', () => {
    const allProficient: SkillProficiencies = {
      acrobatics: true, animal_handling: true, arcana: true, athletics: true,
      deception: true, history: true, insight: true, intimidation: true,
      investigation: true, medicine: true, nature: true, perception: true,
      performance: true, persuasion: true, religion: true, sleight_of_hand: true,
      stealth: true, survival: true,
    }
    const flatScores: AbilityScores = {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
    }
    render(
      <SkillsList
        skills={allProficient}
        abilityScores={flatScores}
        proficiencyBonus={3}
      />
    )
    // All skills at 10 -> +0 + 3 = +3
    expect(getModifierForSkill('Acrobatics')).toBe('+3')
    expect(getModifierForSkill('Athletics')).toBe('+3')
    expect(getModifierForSkill('Arcana')).toBe('+3')
    expect(getModifierForSkill('Survival')).toBe('+3')
  })

  it('should calculate negative modifiers correctly', () => {
    const lowScores: AbilityScores = {
      strength: 3, dexterity: 3, constitution: 3,
      intelligence: 3, wisdom: 3, charisma: 3,
    }
    render(
      <SkillsList
        skills={{}}
        abilityScores={lowScores}
        proficiencyBonus={2}
      />
    )
    // All abilities at 3 -> -4
    expect(getModifierForSkill('Acrobatics')).toBe('-4')
    expect(getModifierForSkill('Athletics')).toBe('-4')
    expect(getModifierForSkill('Arcana')).toBe('-4')
  })

  it('should correctly map skills to their associated abilities', () => {
    // Acrobatics -> DEX, Athletics -> STR, Arcana -> INT
    const scores: AbilityScores = {
      strength: 20, dexterity: 8, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
    }
    render(
      <SkillsList
        skills={{}}
        abilityScores={scores}
        proficiencyBonus={2}
      />
    )
    // Athletics (STR 20) -> +5
    expect(getModifierForSkill('Athletics')).toBe('+5')
    // Acrobatics (DEX 8) -> -1
    expect(getModifierForSkill('Acrobatics')).toBe('-1')
  })

  it('should show proficiency dots for proficient skills', () => {
    const skills: SkillProficiencies = {
      acrobatics: true,
      perception: true,
    }
    const { container } = render(
      <SkillsList
        skills={skills}
        abilityScores={defaultAbilityScores}
        proficiencyBonus={2}
      />
    )
    // Check that proficiency dots are rendered (bg-gold for proficient)
    const allDots = container.querySelectorAll('[data-testid="skill-proficiency-dot"]')
    const goldDots = Array.from(allDots).filter((dot) => dot.classList.contains('bg-gold'))
    expect(goldDots.length).toBe(2) // Acrobatics and Perception
  })
})
