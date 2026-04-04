import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpellSlotsBar } from './SpellSlotsBar'
import type { SpellSlots } from '../../types'

describe('SpellSlotsBar', () => {
  it('should return null for non-caster class', () => {
    const { container } = render(
      <SpellSlotsBar spellSlots={{ 1: { max: 4, used: 1 } }} characterClass="fighter" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('should return null for non-caster class (barbarian)', () => {
    const { container } = render(
      <SpellSlotsBar spellSlots={{ 1: { max: 4, used: 1 } }} characterClass="Barbarian" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('should return null when spellSlots is undefined', () => {
    const { container } = render(
      <SpellSlotsBar spellSlots={undefined} characterClass="wizard" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('should return null when spellSlots has no active levels', () => {
    const spellSlots: SpellSlots = { 1: { max: 0, used: 0 } }
    const { container } = render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('should render for wizard with spell slots', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 1 },
      2: { max: 3, used: 0 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    expect(screen.getByText('Spell Slots')).toBeDefined()
  })

  it('should render for all caster classes (case-insensitive)', () => {
    const casterClasses = ['wizard', 'sorcerer', 'cleric', 'bard', 'druid', 'warlock', 'paladin', 'ranger']
    const spellSlots: SpellSlots = { 1: { max: 2, used: 0 } }

    casterClasses.forEach((cls) => {
      const { container } = render(
        <SpellSlotsBar spellSlots={spellSlots} characterClass={cls} />
      )
      expect(container.innerHTML).not.toBe('')
    })
  })

  it('should render for caster classes with capitalized names', () => {
    const spellSlots: SpellSlots = { 1: { max: 2, used: 0 } }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="Wizard" />
    )
    expect(screen.getByText('Spell Slots')).toBeDefined()
  })

  it('should display ordinal suffixes correctly', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 0 },
      3: { max: 2, used: 0 },
      4: { max: 1, used: 0 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.getByText('2nd')).toBeDefined()
    expect(screen.getByText('3rd')).toBeDefined()
    expect(screen.getByText('4th')).toBeDefined()
  })

  it('should display available/max count for each level', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 1 },
      2: { max: 3, used: 3 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    // Level 1: 4-1 = 3 available
    expect(screen.getByText('3/4')).toBeDefined()
    // Level 2: 3-3 = 0 available
    expect(screen.getByText('0/3')).toBeDefined()
  })

  it('should filter out levels with max 0', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 0 },
      2: { max: 0, used: 0 },
      3: { max: 2, used: 0 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.getByText('3rd')).toBeDefined()
    // 2nd should not be present since max is 0
    expect(screen.queryByText('2nd')).toBeNull()
  })

  it('should filter out levels outside 1-9 range', () => {
    const spellSlots: SpellSlots = {
      0: { max: 4, used: 0 },
      1: { max: 4, used: 0 },
      10: { max: 1, used: 0 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.queryByText('0th')).toBeNull()
    expect(screen.queryByText('10th')).toBeNull()
  })

  it('should sort levels in ascending order', () => {
    const spellSlots: SpellSlots = {
      3: { max: 2, used: 0 },
      1: { max: 4, used: 0 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    const levelLabels = screen.getAllByText(/(st|nd|rd|th)$/)
    expect(levelLabels[0].textContent).toBe('1st')
    expect(levelLabels[1].textContent).toBe('3rd')
  })

  it('should render the correct number of dot indicators per level', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 1 },
    }
    const { container } = render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    // 4 dots for level 1 (max=4)
    const dots = container.querySelectorAll('.rounded-full.w-2\\.5')
    expect(dots.length).toBe(4)
  })

  it('should handle high-level spell slots (5th-9th)', () => {
    const spellSlots: SpellSlots = {
      5: { max: 2, used: 0 },
      9: { max: 1, used: 0 },
    }
    render(
      <SpellSlotsBar spellSlots={spellSlots} characterClass="wizard" />
    )
    expect(screen.getByText('5th')).toBeDefined()
    expect(screen.getByText('9th')).toBeDefined()
  })

  it('should render for monk (not a caster class)', () => {
    const { container } = render(
      <SpellSlotsBar spellSlots={{ 1: { max: 4, used: 0 } }} characterClass="monk" />
    )
    expect(container.innerHTML).toBe('')
  })
})
