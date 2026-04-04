import { describe, it, expect } from 'vitest'
import { getModifier, formatModifier } from './modifiers'

describe('modifiers', () => {
  describe('getModifier', () => {
    it('should return +0 for score 10', () => {
      expect(getModifier(10)).toBe(0)
    })

    it('should return +0 for score 11', () => {
      expect(getModifier(11)).toBe(0)
    })

    it('should return +1 for score 12', () => {
      expect(getModifier(12)).toBe(1)
    })

    it('should return +4 for score 18', () => {
      expect(getModifier(18)).toBe(4)
    })

    it('should return +5 for score 20', () => {
      expect(getModifier(20)).toBe(5)
    })

    it('should return -1 for score 9', () => {
      expect(getModifier(9)).toBe(-1)
    })

    it('should return -5 for score 1', () => {
      expect(getModifier(1)).toBe(-5)
    })

    it('should return -4 for score 3', () => {
      expect(getModifier(3)).toBe(-4)
    })

    it('should return +2 for score 14', () => {
      expect(getModifier(14)).toBe(2)
    })

    it('should return +3 for score 16', () => {
      expect(getModifier(16)).toBe(3)
    })

    it('should handle boundary score 0 (below minimum)', () => {
      expect(getModifier(0)).toBe(-5)
    })

    it('should handle very high score 30', () => {
      expect(getModifier(30)).toBe(10)
    })
  })

  describe('formatModifier', () => {
    it('should format positive modifier with plus sign', () => {
      expect(formatModifier(3)).toBe('+3')
    })

    it('should format zero modifier with plus sign', () => {
      expect(formatModifier(0)).toBe('+0')
    })

    it('should format negative modifier with minus sign', () => {
      expect(formatModifier(-2)).toBe('-2')
    })

    it('should format +1 correctly', () => {
      expect(formatModifier(1)).toBe('+1')
    })

    it('should format -1 correctly', () => {
      expect(formatModifier(-1)).toBe('-1')
    })

    it('should format large positive modifier', () => {
      expect(formatModifier(10)).toBe('+10')
    })

    it('should format large negative modifier', () => {
      expect(formatModifier(-10)).toBe('-10')
    })
  })
})
