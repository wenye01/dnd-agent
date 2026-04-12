import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConcentrationBadge } from './ConcentrationBadge'
import type { ConcentrationState } from '../../../types'

describe('ConcentrationBadge', () => {
  it('should return null when concentration is null', () => {
    const { container } = render(<ConcentrationBadge concentration={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('should return null when concentration is undefined', () => {
    const { container } = render(<ConcentrationBadge />)
    expect(container.innerHTML).toBe('')
  })

  it('should display the spell name being concentrated on', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    render(<ConcentrationBadge concentration={conc} />)
    expect(screen.getByText('Hold Person')).toBeDefined()
  })

  it('should show "Concentrating on" label', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    render(<ConcentrationBadge concentration={conc} />)
    expect(screen.getByText('Concentrating on')).toBeDefined()
  })

  it('should display remaining rounds when provided', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
      remainingRounds: 5,
    }
    render(<ConcentrationBadge concentration={conc} />)
    expect(screen.getByText('5 rd')).toBeDefined()
  })

  it('should NOT display rounds when remainingRounds is undefined', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    render(<ConcentrationBadge concentration={conc} />)
    expect(screen.queryByText(/rd$/)).toBeNull()
  })

  it('should show Break button when onBreak is provided', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    render(<ConcentrationBadge concentration={conc} onBreak={vi.fn()} />)
    expect(screen.getByText('Break')).toBeDefined()
  })

  it('should NOT show Break button when onBreak is not provided', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    render(<ConcentrationBadge concentration={conc} />)
    expect(screen.queryByText('Break')).toBeNull()
  })

  it('should call onBreak when Break button is clicked', () => {
    const handleBreak = vi.fn()
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    render(<ConcentrationBadge concentration={conc} onBreak={handleBreak} />)
    fireEvent.click(screen.getByText('Break'))
    expect(handleBreak).toHaveBeenCalledOnce()
  })

  it('should apply custom className', () => {
    const conc: ConcentrationState = {
      spellId: 'hold_person',
      spellName: 'Hold Person',
      casterId: 'wizard-001',
    }
    const { container } = render(<ConcentrationBadge concentration={conc} className="test-class" />)
    expect(container.querySelector('.test-class')).not.toBeNull()
  })
})
