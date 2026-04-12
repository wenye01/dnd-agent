import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellGroup } from './SpellGroup'
import type { Spell } from '../../../types'

const CANTRIPS: Spell[] = [
  {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    level: 0,
    school: 'evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    components: 'V, S',
    description: 'A mote of fire.',
    ritual: false,
    concentration: false,
  },
  {
    id: 'mage_hand',
    name: 'Mage Hand',
    level: 0,
    school: 'conjuration',
    castingTime: '1 action',
    range: '30 feet',
    duration: '1 minute',
    components: 'V, S',
    description: 'A spectral hand.',
    ritual: false,
    concentration: false,
  },
]

const LEVEL1_SPELLS: Spell[] = [
  {
    id: 'magic_missile',
    name: 'Magic Missile',
    level: 1,
    school: 'evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    components: 'V, S',
    description: 'Three darts of force.',
    ritual: false,
    concentration: false,
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    duration: '1 round',
    components: 'V, S',
    description: '+5 to AC.',
    ritual: false,
    concentration: false,
  },
]

const CONCENTRATION_SPELL: Spell = {
  id: 'hold_person',
  name: 'Hold Person',
  level: 2,
  school: 'enchantment',
  castingTime: '1 action',
  range: '60 feet',
  duration: 'Concentration, up to 1 minute',
  components: 'V, S, M',
  description: 'Paralyze a humanoid.',
  ritual: false,
  concentration: true,
}

describe('SpellGroup', () => {
  describe('rendering', () => {
    it('should return null when spells array is empty', () => {
      const { container } = render(<SpellGroup level={0} spells={[]} />)
      expect(container.innerHTML).toBe('')
    })

    it('should display "Cantrips" for level 0', () => {
      render(<SpellGroup level={0} spells={CANTRIPS} />)
      expect(screen.getByText('Cantrips')).toBeDefined()
    })

    it('should display "1st Level" for level 1', () => {
      render(<SpellGroup level={1} spells={LEVEL1_SPELLS} />)
      expect(screen.getByText('1st Level')).toBeDefined()
    })

    it('should display "2nd Level" for level 2', () => {
      render(<SpellGroup level={2} spells={[CONCENTRATION_SPELL]} />)
      expect(screen.getByText('2nd Level')).toBeDefined()
    })

    it('should display spell count in the header', () => {
      render(<SpellGroup level={0} spells={CANTRIPS} />)
      // The count "2" appears next to the level label
      expect(screen.getByText('Cantrips')).toBeDefined()
    })

    it('should render all spell names', () => {
      render(<SpellGroup level={0} spells={CANTRIPS} />)
      expect(screen.getByText('Fire Bolt')).toBeDefined()
      expect(screen.getByText('Mage Hand')).toBeDefined()
    })

    it('should show concentration indicator for concentration spells', () => {
      render(<SpellGroup level={2} spells={[CONCENTRATION_SPELL]} />)
      expect(screen.getByText('C')).toBeDefined()
    })

    it('should show Cast button for prepared spells', () => {
      render(
        <SpellGroup
          level={0}
          spells={CANTRIPS}
          preparedSpellIds={['fire_bolt']}
          onCast={vi.fn()}
        />
      )
      expect(screen.getByLabelText('Cast Fire Bolt')).toBeDefined()
    })

    it('should NOT show Cast button for unprepared spells', () => {
      render(
        <SpellGroup
          level={0}
          spells={CANTRIPS}
          preparedSpellIds={[]}
          onCast={vi.fn()}
        />
      )
      expect(screen.queryByLabelText('Cast Fire Bolt')).toBeNull()
    })
  })

  describe('interactions', () => {
    it('should call onSelect when a spell row is clicked', () => {
      const handleSelect = vi.fn()
      render(<SpellGroup level={0} spells={CANTRIPS} onSelect={handleSelect} />)
      fireEvent.click(screen.getByText('Fire Bolt'))
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'fire_bolt' }))
    })

    it('should call onSelect on keyboard Enter', () => {
      const handleSelect = vi.fn()
      render(<SpellGroup level={0} spells={CANTRIPS} onSelect={handleSelect} />)
      const spellEl = screen.getByLabelText('Fire Bolt')
      fireEvent.keyDown(spellEl, { key: 'Enter' })
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'fire_bolt' }))
    })

    it('should call onTogglePrepare on context menu (right-click)', () => {
      const handleToggle = vi.fn()
      render(<SpellGroup level={0} spells={CANTRIPS} onTogglePrepare={handleToggle} />)
      const spellEl = screen.getByLabelText('Fire Bolt')
      fireEvent.contextMenu(spellEl)
      expect(handleToggle).toHaveBeenCalledWith('fire_bolt')
    })

    it('should call onCast when Cast button is clicked', () => {
      const handleCast = vi.fn()
      render(
        <SpellGroup
          level={0}
          spells={CANTRIPS}
          preparedSpellIds={['fire_bolt']}
          onCast={handleCast}
        />
      )
      fireEvent.click(screen.getByLabelText('Cast Fire Bolt'))
      expect(handleCast).toHaveBeenCalledWith(expect.objectContaining({ id: 'fire_bolt' }))
    })

    it('should NOT call onSelect when Cast button is clicked (stopPropagation)', () => {
      const handleSelect = vi.fn()
      const handleCast = vi.fn()
      render(
        <SpellGroup
          level={0}
          spells={CANTRIPS}
          preparedSpellIds={['fire_bolt']}
          onSelect={handleSelect}
          onCast={handleCast}
        />
      )
      fireEvent.click(screen.getByLabelText('Cast Fire Bolt'))
      expect(handleCast).toHaveBeenCalled()
      expect(handleSelect).not.toHaveBeenCalled()
    })

    it('should NOT be interactive when readOnly is true', () => {
      render(<SpellGroup level={0} spells={CANTRIPS} readOnly={true} />)
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })

    it('should NOT call onTogglePrepare when readOnly', () => {
      const handleToggle = vi.fn()
      render(<SpellGroup level={0} spells={CANTRIPS} onTogglePrepare={handleToggle} readOnly={true} />)
      const spellEl = screen.getByText('Fire Bolt')
      fireEvent.contextMenu(spellEl)
      expect(handleToggle).not.toHaveBeenCalled()
    })
  })

  describe('ordinal suffixes', () => {
    it.each([
      [1, '1st Level'],
      [2, '2nd Level'],
      [3, '3rd Level'],
      [4, '4th Level'],
      [5, '5th Level'],
      [6, '6th Level'],
      [7, '7th Level'],
      [8, '8th Level'],
      [9, '9th Level'],
      [11, '11th Level'],
      [12, '12th Level'],
      [13, '13th Level'],
    ])('should display correct ordinal for level %i: %s', (level, expectedLabel) => {
      const spell: Spell = {
        id: `test-spell-${level}`,
        name: `Test Spell ${level}`,
        level,
        school: 'evocation',
        castingTime: '1 action',
        range: '30 feet',
        duration: 'Instantaneous',
        components: 'V, S',
        description: 'Test.',
        ritual: false,
        concentration: false,
      }
      render(<SpellGroup level={level} spells={[spell]} />)
      expect(screen.getByText(expectedLabel)).toBeDefined()
    })
  })
})
