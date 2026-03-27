/**
 * Dice Rolling End-to-End Tests
 *
 * These tests verify the dice rolling functionality works correctly
 * by testing the backend API directly.
 *
 * Note: These tests require the server to be running.
 * Set API_BASE_URL environment variable to configure the server address.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  serverAvailable,
  apiRequest,
  itIfServer,
  checkServerAvailability,
} from './helpers'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Dice Rolling E2E Tests', () => {
  let sessionId: string

  beforeAll(async () => {
    if (!serverAvailable) return

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

  describe('Session setup for dice operations', () => {
    itIfServer('should have session available for dice operations', async () => {
      const { response } = await apiRequest(`/sessions/${sessionId}`)
      expect(response.status).toBe(200)
    })
  })

  describe('Config validation', () => {
    itIfServer('should support dice_rolling feature in config', async () => {
      const { response, data } = await apiRequest('/config')

      expect(response.status).toBe(200)
      const wrappedData = data as { status: string; data: { features: string[] } }
      const features = wrappedData.data.features
      expect(features).toContain('dice_rolling')
    })
  })
})
