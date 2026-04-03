import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeathSavesDisplay } from './DeathSavesDisplay'

describe('DeathSavesDisplay', () => {
  it('should return null when currentHitPoints > 0', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 1, failures: 0 }} currentHitPoints={5} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('should return null when currentHitPoints is 1', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 0, failures: 0 }} currentHitPoints={1} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('should render when currentHitPoints is 0', () => {
    render(
      <DeathSavesDisplay deathSaves={{ successes: 0, failures: 0 }} currentHitPoints={0} />
    )
    expect(screen.getByText('Death Saves')).toBeDefined()
  })

  it('should render when currentHitPoints is negative', () => {
    render(
      <DeathSavesDisplay deathSaves={{ successes: 0, failures: 0 }} currentHitPoints={-2} />
    )
    expect(screen.getByText('Death Saves')).toBeDefined()
  })

  it('should render when deathSaves is undefined and HP is 0', () => {
    render(
      <DeathSavesDisplay deathSaves={undefined} currentHitPoints={0} />
    )
    expect(screen.getByText('Death Saves')).toBeDefined()
    expect(screen.getByText('Success')).toBeDefined()
    expect(screen.getByText('Failure')).toBeDefined()
  })

  it('should render success and failure labels', () => {
    render(
      <DeathSavesDisplay deathSaves={{ successes: 2, failures: 1 }} currentHitPoints={0} />
    )
    expect(screen.getByText('Success')).toBeDefined()
    expect(screen.getByText('Failure')).toBeDefined()
  })

  it('should render 3 success dots and 3 failure dots', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 0, failures: 0 }} currentHitPoints={0} />
    )
    // 6 round dots total: 3 success + 3 failure
    const successDots = container.querySelectorAll('[data-testid="death-save-success"]')
    const failureDots = container.querySelectorAll('[data-testid="death-save-failure"]')
    expect(successDots.length).toBe(3)
    expect(failureDots.length).toBe(3)
  })

  it('should show filled dots matching successes count', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 2, failures: 1 }} currentHitPoints={0} />
    )
    const dots = container.querySelectorAll('[data-testid="death-save-success"]')
    // Check that the first success dot has a non-transparent background
    const firstSuccessDot = dots[0]
    expect(firstSuccessDot).toBeDefined()
    const style = getComputedStyle(firstSuccessDot)
    // The background should be a radial-gradient (filled) not 'transparent'
    expect(style.background).toContain('radial-gradient')
  })

  it('should show filled dots matching failures count', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 0, failures: 2 }} currentHitPoints={0} />
    )
    const dots = container.querySelectorAll('[data-testid="death-save-failure"]')
    // Failure dots: first 2 should be filled
    const firstFailureDot = dots[0]
    expect(firstFailureDot).toBeDefined()
    const style = getComputedStyle(firstFailureDot)
    expect(style.background).toContain('radial-gradient')
  })

  it('should show all dots as empty when successes and failures are both 0', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 0, failures: 0 }} currentHitPoints={0} />
    )
    const successDots = container.querySelectorAll('[data-testid="death-save-success"]')
    const failureDots = container.querySelectorAll('[data-testid="death-save-failure"]')
    const allDots = [...Array.from(successDots), ...Array.from(failureDots)]
    allDots.forEach((dot) => {
      const style = getComputedStyle(dot)
      expect(style.background).toBe('transparent')
    })
  })

  it('should handle maximum values: 3 successes and 3 failures', () => {
    const { container } = render(
      <DeathSavesDisplay deathSaves={{ successes: 3, failures: 3 }} currentHitPoints={0} />
    )
    const successDots = container.querySelectorAll('[data-testid="death-save-success"]')
    const failureDots = container.querySelectorAll('[data-testid="death-save-failure"]')
    const allDots = [...Array.from(successDots), ...Array.from(failureDots)]
    // All dots should be filled
    allDots.forEach((dot) => {
      const style = getComputedStyle(dot)
      expect(style.background).toContain('radial-gradient')
    })
  })
})
