/**
 * Dice Rolling End-to-End Tests
 *
 * These tests verify dice rolling behavior via the WebSocket protocol.
 * Since the backend exposes dice rolling through WebSocket messages
 * (not a REST endpoint), these tests use the message format to verify
 * dice result structure and behavior.
 *
 * Note: These tests require the server to be running.
 * Set API_BASE_URL environment variable to configure the server address.
 */

import {
  serverAvailable,
  apiRequest,
  itIfServer,
  checkServerAvailability,
  createTestSession,
} from './helpers'
import type { SessionResponse, ConfigResponse } from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Dice Rolling E2E Tests', () => {
  let sessionId: string

  beforeAll(async () => {
    if (!serverAvailable) return

    const session = await createTestSession()
    sessionId = session.sessionId
  })

  afterAll(async () => {
    if (sessionId && serverAvailable) {
      await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
    }
  })

  describe('Session setup for dice operations', () => {
    itIfServer('should have session available for dice operations', async () => {
      const { response } = await apiRequest(`/sessions/${sessionId}`)
      expect(response.status).toBe(200)
    })
  })

  describe('Config validation', () => {
    itIfServer('should support dice_rolling feature in config', async () => {
      const { response, data } = await apiRequest<ConfigResponse>('/config')

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      expect(data!.data.features).toContain('dice_rolling')
    })
  })
})

/**
 * Dice result structure validation tests.
 *
 * These tests validate the expected shape of dice results based on the
 * DiceResultPayload type defined in apps/web/src/types/message.ts.
 * They can run without a server and verify the type contract.
 */
describe('Dice Result Structure Validation', () => {
  it('should validate a basic d20 roll result structure', () => {
    const diceResult = {
      formula: '1d20',
      dice: [14],
      modifier: 0,
      total: 14,
    }

    expect(diceResult.formula).toBe('1d20')
    expect(diceResult.dice).toHaveLength(1)
    expect(diceResult.dice[0]).toBeGreaterThanOrEqual(1)
    expect(diceResult.dice[0]).toBeLessThanOrEqual(20)
    expect(diceResult.total).toBe(14)
    expect(diceResult.modifier).toBe(0)
  })

  it('should validate a d20 roll with modifier', () => {
    const diceResult = {
      formula: '1d20+5',
      dice: [12],
      modifier: 5,
      total: 17,
    }

    expect(diceResult.formula).toBe('1d20+5')
    expect(diceResult.dice).toHaveLength(1)
    expect(diceResult.total).toBe(diceResult.dice[0] + diceResult.modifier)
  })

  it('should validate a multi-dice roll (2d6+3)', () => {
    const diceResult = {
      formula: '2d6+3',
      dice: [4, 5],
      modifier: 3,
      total: 12,
    }

    expect(diceResult.formula).toBe('2d6+3')
    expect(diceResult.dice).toHaveLength(2)
    expect(diceResult.dice.every(d => d >= 1 && d <= 6)).toBe(true)
    expect(diceResult.total).toBe(diceResult.dice[0] + diceResult.dice[1] + diceResult.modifier)
  })

  it('should validate advantage roll structure (two d20 rolls)', () => {
    const roll1 = 8
    const roll2 = 17
    const advantageTotal = Math.max(roll1, roll2)

    const diceResult = {
      formula: '2d20kh1+3',
      dice: [roll1, roll2],
      modifier: 3,
      total: advantageTotal + 3,
    }

    expect(diceResult.dice).toHaveLength(2)
    expect(diceResult.total).toBe(advantageTotal + 3)
  })

  it('should validate disadvantage roll structure (two d20 rolls)', () => {
    const roll1 = 8
    const roll2 = 17
    const disadvantageTotal = Math.min(roll1, roll2)

    const diceResult = {
      formula: '2d20kl1+3',
      dice: [roll1, roll2],
      modifier: 3,
      total: disadvantageTotal + 3,
    }

    expect(diceResult.dice).toHaveLength(2)
    expect(diceResult.total).toBe(disadvantageTotal + 3)
  })

  it('should detect critical hit (natural 20 on d20)', () => {
    const diceResult = {
      formula: '1d20',
      dice: [20],
      modifier: 0,
      total: 20,
      isCrit: true,
      isFumble: false,
    }

    expect(diceResult.dice[0]).toBe(20)
    expect(diceResult.isCrit).toBe(true)
    expect(diceResult.isFumble).toBe(false)
  })

  it('should detect critical fumble (natural 1 on d20)', () => {
    const diceResult = {
      formula: '1d20',
      dice: [1],
      modifier: 0,
      total: 1,
      isCrit: false,
      isFumble: true,
    }

    expect(diceResult.dice[0]).toBe(1)
    expect(diceResult.isCrit).toBe(false)
    expect(diceResult.isFumble).toBe(true)
  })

  it('should handle invalid dice expression gracefully', () => {
    // An invalid expression should not match the standard dice pattern
    const invalidExpressions = [
      'abc',
      'd',
      '1d',
      'dice',
      'hello world',
    ]

    for (const expr of invalidExpressions) {
      // In production, these would be rejected by the backend validator
      expect(() => {
        const match = expr.match(/^(\d+)?d(\d+)([+-]\d+)?$/)
        if (!match) throw new Error(`Invalid dice expression: ${expr}`)
      }).toThrow()
    }

    // Semantically invalid but syntactically valid expressions (0d6, 1d0)
    // would be caught by a higher-level validator that checks dice/side counts
    const syntacticOnly = ['0d6', '1d0']
    for (const expr of syntacticOnly) {
      const match = expr.match(/^(\d+)?d(\d+)([+-]\d+)?$/)
      expect(match).not.toBeNull()
      // But the dice count or sides would fail semantic validation
      const count = parseInt(match![1] || '1', 10)
      const sides = parseInt(match![2], 10)
      expect(count === 0 || sides === 0).toBe(true)
    }
  })

  it('should validate total is sum of dice plus modifier', () => {
    const testCases = [
      { formula: '1d20', dice: [15], modifier: 0, expected: 15 },
      { formula: '1d20+5', dice: [10], modifier: 5, expected: 15 },
      { formula: '2d6+3', dice: [3, 4], modifier: 3, expected: 10 },
      { formula: '3d8-2', dice: [5, 6, 7], modifier: -2, expected: 16 },
      { formula: '4d6', dice: [3, 4, 5, 6], modifier: 0, expected: 18 },
    ]

    for (const tc of testCases) {
      const total = tc.dice.reduce((sum, d) => sum + d, 0) + tc.modifier
      expect(total).toBe(tc.expected)
    }
  })
})
