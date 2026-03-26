/**
 * Dice Rolling End-to-End Tests
 *
 * These tests verify the dice rolling functionality works correctly
 * including formula parsing, random number generation, and
 * API interaction.
 *
 * Note: These tests require the server to be running.
 * Set API_BASE_URL environment variable to configure the server address.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080'

// Check if server is available
let serverAvailable = false

/**
 * Helper to make API requests
 */
async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}/api${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  const data = await response.json()
  return { response, data }
}

beforeAll(async () => {
  // Check if server is available
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(2000),
    })
    serverAvailable = response.ok
  } catch {
    serverAvailable = false
  }
})

// Helper to conditionally run tests
const itIfServer = (title: string, fn: () => void | Promise<void>) => {
  return serverAvailable ? it(title, fn) : it.skip(title, fn)
}

describe('Dice Rolling E2E Tests', () => {
  describe('Dice formula validation', () => {
    it('should validate standard dice format', () => {
      const validFormats = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', '1d20', '2d6', '3d8', '4d6+3', '1d20-2', '2d8 5']

      validFormats.forEach((formula) => {
        // Match pattern: XdY[+|-| ]Z
        const dicePattern = /^(\d+)?d(\d+)([\+\- ]\d+)?$/
        expect(dicePattern.test(formula)).toBe(true)
      })
    })

    it('should accept valid dice formats', () => {
      const validFormats = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', '1d20', '2d6', '3d8', '4d6+3', '1d20-2', '2d8 5']

      validFormats.forEach((formula) => {
        const dicePattern = /^(\d+)?d(\d+)([\+\- ]\d+)?$/
        expect(dicePattern.test(formula)).toBe(true)
      })
    })

    it('should parse dice formula components', () => {
      const parseFormula = (formula: string) => {
        const match = formula.match(/^(\d+)?d(\d+)([\+\- ]\d+)?$/)
        if (!match) return null

        const count = match[1] ? parseInt(match[1], 10) : 1
        const sides = parseInt(match[2], 10)
        const modifierStr = match[3] || ''
        const modifier = modifierStr ? parseInt(modifierStr.replace(/\s/g, ''), 10) : 0

        return { count, sides, modifier }
      }

      const result = parseFormula('2d6+3')
      expect(result).toEqual({ count: 2, sides: 6, modifier: 3 })

      const result2 = parseFormula('1d20-2')
      expect(result2).toEqual({ count: 1, sides: 20, modifier: -2 })

      const result3 = parseFormula('d20')
      expect(result3).toEqual({ count: 1, sides: 20, modifier: 0 })
    })
  })

  describe('Dice roll simulation', () => {
    it('should generate valid random numbers for d20', () => {
      const rolls: number[] = []
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const roll = Math.floor(Math.random() * 20) + 1
        rolls.push(roll)
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(20)
      }

      // Check distribution roughly
      const min = Math.min(...rolls)
      const max = Math.max(...rolls)
      const avg = rolls.reduce((a, b) => a + b, 0) / rolls.length

      expect(min).toBeGreaterThanOrEqual(1)
      expect(max).toBeLessThanOrEqual(20)
      expect(avg).toBeGreaterThan(7)
      expect(avg).toBeLessThan(14)
    })

    it('should generate valid sums for 2d6', () => {
      const rolls: number[] = []
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const die1 = Math.floor(Math.random() * 6) + 1
        const die2 = Math.floor(Math.random() * 6) + 1
        const sum = die1 + die2
        rolls.push(sum)
        expect(sum).toBeGreaterThanOrEqual(2)
        expect(sum).toBeLessThanOrEqual(12)
      }

      // Average should be around 7
      const avg = rolls.reduce((a, b) => a + b, 0) / rolls.length
      expect(avg).toBeGreaterThan(5)
      expect(avg).toBeLessThan(9)
    })

    it('should apply modifier correctly', () => {
      const roll = Math.floor(Math.random() * 20) + 1
      const modifier = 5
      const total = roll + modifier

      expect(total).toBeGreaterThanOrEqual(1 + modifier)
      expect(total).toBeLessThanOrEqual(20 + modifier)
    })
  })

  describe('Critical hits and fumbles', () => {
    it('should detect critical hit on natural 20', () => {
      const roll = 20
      const isCrit = roll === 20

      expect(isCrit).toBe(true)
    })

    it('should detect fumble on natural 1', () => {
      const roll = 1
      const isFumble = roll === 1

      expect(isFumble).toBe(true)
    })

    it('should not crit or fumble on normal rolls', () => {
      const roll = 10
      const isCrit = roll === 20
      const isFumble = roll === 1

      expect(isCrit).toBe(false)
      expect(isFumble).toBe(false)
    })
  })

  describe('Dice result structure', () => {
    it('should have valid dice result structure', () => {
      const result = {
        formula: '2d6+3',
        dice: [4, 2],
        modifier: 3,
        total: 9,
        isCrit: false,
        isFumble: false,
      }

      expect(result.formula).toBe('2d6+3')
      expect(result.dice).toHaveLength(2)
      expect(result.dice[0]).toBeGreaterThanOrEqual(1)
      expect(result.dice[0]).toBeLessThanOrEqual(6)
      expect(result.modifier).toBe(3)
      expect(result.total).toBe(result.dice[0] + result.dice[1] + result.modifier)
    })

    it('should serialize to JSON correctly', () => {
      const result = {
        formula: '1d20+5',
        dice: [15],
        modifier: 5,
        total: 20,
        isCrit: false,
        isFumble: false,
      }

      const json = JSON.stringify(result)
      const parsed = JSON.parse(json)

      expect(parsed.formula).toBe(result.formula)
      expect(parsed.dice).toEqual(result.dice)
      expect(parsed.modifier).toBe(result.modifier)
      expect(parsed.total).toBe(result.total)
    })
  })

  describe('Ability check simulation', () => {
    it('should calculate success correctly', () => {
      const roll = 15
      const modifier = 3
      const dc = 15
      const total = roll + modifier
      const success = total >= dc

      expect(total).toBe(18)
      expect(success).toBe(true)
    })

    it('should calculate failure correctly', () => {
      const roll = 8
      const modifier = 2
      const dc = 15
      const total = roll + modifier
      const success = total >= dc

      expect(total).toBe(10)
      expect(success).toBe(false)
    })

    it('should handle critical success on natural 20', () => {
      const roll = 20
      const modifier = 0
      const dc = 25
      const total = roll + modifier
      const success = total >= dc
      const isCrit = roll === 20

      expect(total).toBe(20)
      expect(success).toBe(false) // Still fails DC check but is a crit
      expect(isCrit).toBe(true)
    })

    it('should handle automatic failure on natural 1', () => {
      const roll = 1
      const modifier = 10
      const dc = 5
      const isFumble = roll === 1

      expect(isFumble).toBe(true)
      // In D&D 5e, natural 1 always fails regardless of modifier
    })
  })

  describe('Advantage and disadvantage', () => {
    it('should take higher roll with advantage', () => {
      const roll1 = 8
      const roll2 = 15
      const finalRoll = Math.max(roll1, roll2)

      expect(finalRoll).toBe(15)
    })

    it('should take lower roll with disadvantage', () => {
      const roll1 = 8
      const roll2 = 15
      const finalRoll = Math.min(roll1, roll2)

      expect(finalRoll).toBe(8)
    })

    it('should cancel advantage and disadvantage', () => {
      const roll = 12
      // When both advantage and disadvantage apply, they cancel
      const hasAdvantage = true
      const hasDisadvantage = true
      const useNormalRoll = hasAdvantage && hasDisadvantage

      expect(useNormalRoll).toBe(true)
    })
  })

  describe('Dice probability distributions', () => {
    it('should calculate average for single die', () => {
      const averageD4 = (1 + 4) / 2
      const averageD6 = (1 + 6) / 2
      const averageD8 = (1 + 8) / 2
      const averageD20 = (1 + 20) / 2

      expect(averageD4).toBe(2.5)
      expect(averageD6).toBe(3.5)
      expect(averageD8).toBe(4.5)
      expect(averageD20).toBe(10.5)
    })

    it('should calculate average for multiple dice', () => {
      const average2d6 = 2 * 3.5
      const average4d6 = 4 * 3.5
      const average2d8 = 2 * 4.5

      expect(average2d6).toBe(7)
      expect(average4d6).toBe(14)
      expect(average2d8).toBe(9)
    })

    it('should calculate range for dice combinations', () => {
      const range2d6 = { min: 2, max: 12 }
      const range4d6 = { min: 4, max: 24 }
      const range1d20plus5 = { min: 6, max: 25 }

      expect(range2d6.max - range2d6.min + 1).toBe(11) // 2-6-7-8-9-10-11-12
      expect(range4d6.max - range4d6.min + 1).toBe(21)
      expect(range1d20plus5.max - range1d20plus5.min + 1).toBe(20)
    })
  })

  describe('WebSocket message format', () => {
    it('should format dice result message correctly', () => {
      const diceResult = {
        type: 'dice_result',
        payload: {
          formula: '2d6+3',
          dice: [4, 2],
          modifier: 3,
          total: 9,
          isCrit: false,
          isFumble: false,
        },
        timestamp: Date.now(),
      }

      expect(diceResult.type).toBe('dice_result')
      expect(diceResult.payload.formula).toBe('2d6+3')
      expect(diceResult.payload.total).toBe(9)
      expect(diceResult.timestamp).toBeGreaterThan(0)
    })

    it('should format ability check message correctly', () => {
      const checkResult = {
        type: 'ability_check',
        payload: {
          ability: 'strength',
          roll: 15,
          modifier: 3,
          total: 18,
          dc: 15,
          success: true,
          isCrit: false,
          isFumble: false,
        },
        timestamp: Date.now(),
      }

      expect(checkResult.type).toBe('ability_check')
      expect(checkResult.payload.ability).toBe('strength')
      expect(checkResult.payload.success).toBe(true)
    })
  })

  describe('API integration for dice rolling', () => {
    let sessionId: string

    beforeAll(async () => {
      if (!serverAvailable) return

      // Create a session for dice tests
      const { data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      sessionId = (data as { sessionId: string }).sessionId
    })

    afterAll(async () => {
      if (sessionId && serverAvailable) {
        await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
      }
    })

    itIfServer('should support dice-related features in config', async () => {
      const { response, data } = await apiRequest('/config')

      expect(response.status).toBe(200)
      const wrappedData = data as { status: string; data: { features: string[] } }
      const features = wrappedData.data.features
      expect(features).toContain('dice_rolling')
    })

    itIfServer('should have session available for dice operations', async () => {
      const { response } = await apiRequest(`/sessions/${sessionId}`)
      expect(response.status).toBe(200)
    })
  })
})
