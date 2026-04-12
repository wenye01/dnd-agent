import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellDetail } from './SpellDetail'
import type { Spell } from '../../../types'

const FIREBALL: Spell = {
  id: 'fireball',
  name: 'Fireball',
  level: 3,
  school: 'evocation',
  castingTime: '1 action',
  range: '150 feet',
  duration: 'Instantaneous',
  components: 'V, S, M',
  description: 'A bright streak flashes from your pointing finger.',
  ritual: false,
  concentration: false,
  damage: '8d6',
  damageType: 'fire',
  saveType: 'dexterity',
  higherLevel: 'Damage increases by 1d6 per slot level above 3rd.',
}

const HOLD_PERSON: Spell = {
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
  saveType: 'wisdom',
}

const IDENTIFY: Spell = {
  id: 'identify',
  name: 'Identify',
  level: 1,
  school: 'divination',
  castingTime: '1 minute',
  range: 'Touch',
  duration: 'Instantaneous',
  components: 'V, S, M',
  description: 'Reveals magical properties.',
  ritual: true,
  concentration: false,
}

describe('SpellDetail', () => {
  it('should return null when spell is null', () => {
    const { container } = render(<SpellDetail spell={null} isOpen={true} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  describe('with Fireball spell', () => {
    it('should display spell name', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Fireball')).toBeDefined()
    })

    it('should display school label', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Evocation')).toBeDefined()
    })

    it('should display level label', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('3rd Level')).toBeDefined()
    })

    it('should display casting time', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('1 action')).toBeDefined()
    })

    it('should display range', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('150 feet')).toBeDefined()
    })

    it('should display components', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('V, S, M')).toBeDefined()
    })

    it('should display duration', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Instantaneous')).toBeDefined()
    })

    it('should display damage and damage type', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(/8d6/)).toBeDefined()
      expect(screen.getByText(/fire/)).toBeDefined()
    })

    it('should display saving throw', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      // The component renders the save type with CSS capitalize, text content is lowercase
      expect(screen.getByText('dexterity')).toBeDefined()
    })

    it('should display description', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(FIREBALL.description)).toBeDefined()
    })

    it('should display higher level description', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(FIREBALL.higherLevel!)).toBeDefined()
    })

    it('should show Cast Spell button when onCast is provided', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} onCast={vi.fn()} />)
      expect(screen.getByText('Cast Spell')).toBeDefined()
    })

    it('should NOT show Cast Spell button when onCast is not provided', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} />)
      expect(screen.queryByText('Cast Spell')).toBeNull()
    })
  })

  describe('with Hold Person (concentration spell)', () => {
    it('should show Concentration badge', () => {
      render(<SpellDetail spell={HOLD_PERSON} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Concentration')).toBeDefined()
    })

    it('should NOT show Ritual badge', () => {
      render(<SpellDetail spell={HOLD_PERSON} isOpen={true} onClose={vi.fn()} />)
      expect(screen.queryByText('Ritual')).toBeNull()
    })
  })

  describe('with Identify (ritual spell)', () => {
    it('should show Ritual badge', () => {
      render(<SpellDetail spell={IDENTIFY} isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Ritual')).toBeDefined()
    })

    it('should NOT show Concentration badge', () => {
      render(<SpellDetail spell={IDENTIFY} isOpen={true} onClose={vi.fn()} />)
      expect(screen.queryByText('Concentration')).toBeNull()
    })
  })

  describe('prepared state', () => {
    it('should show Prepared badge when isPrepared is true', () => {
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} isPrepared={true} />)
      expect(screen.getByText('Prepared')).toBeDefined()
    })

    it('should show Unprepare button when isPrepared and onTogglePrepare provided', () => {
      render(
        <SpellDetail
          spell={FIREBALL}
          isOpen={true}
          onClose={vi.fn()}
          onTogglePrepare={vi.fn()}
          isPrepared={true}
        />
      )
      expect(screen.getByText('Unprepare')).toBeDefined()
    })

    it('should show Prepare button when not prepared and onTogglePrepare provided', () => {
      render(
        <SpellDetail
          spell={FIREBALL}
          isOpen={true}
          onClose={vi.fn()}
          onTogglePrepare={vi.fn()}
          isPrepared={false}
        />
      )
      expect(screen.getByText('Prepare')).toBeDefined()
    })
  })

  describe('interactions', () => {
    it('should call onCast when Cast Spell is clicked', () => {
      const handleCast = vi.fn()
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={vi.fn()} onCast={handleCast} />)
      fireEvent.click(screen.getByText('Cast Spell'))
      expect(handleCast).toHaveBeenCalledWith(expect.objectContaining({ id: 'fireball' }))
    })

    it('should call onTogglePrepare when Prepare is clicked', () => {
      const handleToggle = vi.fn()
      render(
        <SpellDetail
          spell={FIREBALL}
          isOpen={true}
          onClose={vi.fn()}
          onTogglePrepare={handleToggle}
          isPrepared={false}
        />
      )
      fireEvent.click(screen.getByText('Prepare'))
      expect(handleToggle).toHaveBeenCalledWith('fireball')
    })

    it('should call onClose when Close is clicked', () => {
      const handleClose = vi.fn()
      render(<SpellDetail spell={FIREBALL} isOpen={true} onClose={handleClose} />)
      fireEvent.click(screen.getByText('Close'))
      expect(handleClose).toHaveBeenCalled()
    })
  })
})
