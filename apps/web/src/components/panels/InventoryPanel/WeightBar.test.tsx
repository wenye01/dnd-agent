import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeightBar } from './WeightBar'

describe('WeightBar', () => {
  it('should render the weight label', () => {
    render(<WeightBar currentWeight={30} maxWeight={150} />)
    expect(screen.getByText('Weight')).toBeDefined()
  })

  it('should display current and max weight with unit', () => {
    render(<WeightBar currentWeight={30} maxWeight={150} />)
    expect(screen.getByText('30')).toBeDefined()
    expect(screen.getByText('150')).toBeDefined()
    expect(screen.getByText('lb')).toBeDefined()
  })

  it('should display zero weight correctly', () => {
    render(<WeightBar currentWeight={0} maxWeight={150} />)
    expect(screen.getByText('0')).toBeDefined()
    expect(screen.getByText('150')).toBeDefined()
  })

  it('should not show encumbered warning when under max weight', () => {
    render(<WeightBar currentWeight={50} maxWeight={150} />)
    expect(screen.queryByText(/Encumbered/)).toBeNull()
  })

  it('should show encumbered warning when at or over max weight', () => {
    render(<WeightBar currentWeight={150} maxWeight={150} />)
    expect(screen.getByText(/Encumbered/)).toBeDefined()
  })

  it('should show encumbered warning when over max weight', () => {
    render(<WeightBar currentWeight={200} maxWeight={150} />)
    expect(screen.getByText(/Encumbered/)).toBeDefined()
  })

  it('should handle zero maxWeight without crashing', () => {
    const { container } = render(<WeightBar currentWeight={0} maxWeight={0} />)
    expect(container.innerHTML).toContain('Weight')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <WeightBar currentWeight={30} maxWeight={150} className="custom-class" />
    )
    const wrapper = container.querySelector('.custom-class')
    expect(wrapper).not.toBeNull()
  })

  it('should show heavy state when weight is at 66% or more', () => {
    // 100/150 = 66.67% -- heavy but not encumbered
    render(<WeightBar currentWeight={100} maxWeight={150} />)
    // The current weight number should have warning color class
    const weightSpan = screen.getByText('100')
    expect(weightSpan.className).toContain('text-warning')
  })

  it('should show normal state when weight is below 66%', () => {
    render(<WeightBar currentWeight={50} maxWeight={150} />)
    const weightSpan = screen.getByText('50')
    expect(weightSpan.className).toContain('text-heal')
  })

  it('should calculate percentage correctly for progress bar width', () => {
    // 75/150 = 50%
    const { container } = render(<WeightBar currentWeight={75} maxWeight={150} />)
    const bar = container.querySelector('[style*="width"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('style')).toContain('50%')
  })

  it('should cap percentage at 100 even if current exceeds max', () => {
    const { container } = render(<WeightBar currentWeight={300} maxWeight={150} />)
    const bar = container.querySelector('[style*="width"]')
    expect(bar?.getAttribute('style')).toContain('100%')
  })
})
