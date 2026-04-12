import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpellSlotsBar } from './SpellSlotsBar'
import type { SpellSlots } from '../../../types'

describe('SpellSlotsBar (v0.4 SpellbookPanel)', () => {
  it('should return null when spellSlots is undefined', () => {
    const { container } = render(<SpellSlotsBar />)
    expect(container.innerHTML).toBe('')
  })

  it('should return null when spellSlots has no active levels', () => {
    const spellSlots: SpellSlots = { 1: { max: 0, used: 0 } }
    const { container } = render(<SpellSlotsBar spellSlots={spellSlots} />)
    expect(container.innerHTML).toBe('')
  })

  it('should render Spell Slots header', () => {
    const spellSlots: SpellSlots = { 1: { max: 4, used: 1 } }
    render(<SpellSlotsBar spellSlots={spellSlots} />)
    expect(screen.getByText('Spell Slots')).toBeDefined()
  })

  it('should display ordinal suffixes correctly for levels 1-9', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 0 },
      3: { max: 2, used: 0 },
      4: { max: 1, used: 0 },
      5: { max: 1, used: 0 },
      6: { max: 1, used: 0 },
      7: { max: 1, used: 0 },
      8: { max: 1, used: 0 },
      9: { max: 1, used: 0 },
    }
    render(<SpellSlotsBar spellSlots={spellSlots} />)
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.getByText('2nd')).toBeDefined()
    expect(screen.getByText('3rd')).toBeDefined()
    expect(screen.getByText('4th')).toBeDefined()
    expect(screen.getByText('5th')).toBeDefined()
    expect(screen.getByText('6th')).toBeDefined()
    expect(screen.getByText('7th')).toBeDefined()
    expect(screen.getByText('8th')).toBeDefined()
    expect(screen.getByText('9th')).toBeDefined()
  })

  it('should display available/max count for each level', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 1 },
      2: { max: 3, used: 3 },
    }
    render(<SpellSlotsBar spellSlots={spellSlots} />)
    expect(screen.getByText('3/4')).toBeDefined()
    expect(screen.getByText('0/3')).toBeDefined()
  })

  it('should filter out levels with max 0', () => {
    const spellSlots: SpellSlots = {
      1: { max: 4, used: 0 },
      2: { max: 0, used: 0 },
      3: { max: 2, used: 0 },
    }
    render(<SpellSlotsBar spellSlots={spellSlots} />)
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.getByText('3rd')).toBeDefined()
    expect(screen.queryByText('2nd')).toBeNull()
  })

  it('should filter out levels outside 1-9 range', () => {
    const spellSlots: SpellSlots = {
      0: { max: 4, used: 0 },
      1: { max: 4, used: 0 },
      10: { max: 1, used: 0 },
    }
    render(<SpellSlotsBar spellSlots={spellSlots} />)
    expect(screen.getByText('1st')).toBeDefined()
    expect(screen.queryByText('0th')).toBeNull()
    expect(screen.queryByText('10th')).toBeNull()
  })

  it('should sort levels in ascending order', () => {
    const spellSlots: SpellSlots = {
      3: { max: 2, used: 0 },
      1: { max: 4, used: 0 },
    }
    render(<SpellSlotsBar spellSlots={spellSlots} />)
    const levelLabels = screen.getAllByText(/(st|nd|rd|th)$/)
    expect(levelLabels[0].textContent).toBe('1st')
    expect(levelLabels[1].textContent).toBe('3rd')
  })

  it('should NOT be interactive when readOnly is true', () => {
    const spellSlots: SpellSlots = { 1: { max: 4, used: 0 } }
    render(<SpellSlotsBar spellSlots={spellSlots} readOnly={true} />)
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })
})
