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

  // These tests are skipped until the backend WebSocket dice command is implemented.
  // They document the expected E2E behavior and can be enabled once the endpoint exists.

  describe.skip('Dice rolling via WebSocket (requires backend implementation)', () => {
    it.skip('should roll a d20 and return valid DiceResultPayload', async () => {
      // Expected flow:
      // 1. Connect WebSocket to session
      // 2. Send dice command: { type: 'dice_roll', payload: { formula: '1d20' } }
      // 3. Receive response with DiceResultPayload:
      //    { formula: '1d20', dice: [7], modifier: 0, total: 7 }
      // 4. Verify: total === dice[0], formula matches, modifier is 0
    })

    it.skip('should roll d20 with modifier (e.g. 1d20+5)', async () => {
      // Expected: { formula: '1d20+5', dice: [12], modifier: 5, total: 17 }
    })

    it.skip('should roll multiple dice (e.g. 2d6+3)', async () => {
      // Expected: { formula: '2d6+3', dice: [4, 5], modifier: 3, total: 12 }
      // Verify: dice.length === 2, total === dice.reduce(sum) + modifier
    })

    it.skip('should detect critical hit on natural 20', async () => {
      // Expected: { formula: '1d20', dice: [20], modifier: 0, total: 20, isCrit: true }
    })

    it.skip('should detect critical fumble on natural 1', async () => {
      // Expected: { formula: '1d20', dice: [1], modifier: 0, total: 1, isFumble: true }
    })

    it.skip('should handle invalid dice expressions gracefully', async () => {
      // Send: { type: 'dice_roll', payload: { formula: 'invalid' } }
      // Expected: error response or DiceResultPayload with error indication
    })
  })
})
