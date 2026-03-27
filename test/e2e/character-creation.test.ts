/**
 * Character Creation End-to-End Tests
 *
 * These tests verify complete user workflows that span multiple API calls.
 * For individual API endpoint testing, see test/integration/api.test.ts.
 *
 * Note: These tests require the server to be running.
 * Set API_BASE_URL environment variable to configure the server address.
 */

import {
  serverAvailable,
  apiRequest,
  itIfServer,
  checkServerAvailability,
} from './helpers'
import type { SessionResponse, GameStateResponse, SessionListResponse } from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Character Creation E2E Tests', () => {
  describe('Complete character creation workflow', () => {
    let testSessionId: string

    afterAll(async () => {
      if (testSessionId && serverAvailable) {
        try {
          await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
        } catch {
          // Ignore cleanup errors
        }
      }
    })

    itIfServer('should create session, verify state, list, and delete', async () => {
      // Step 1: Create a new session
      const { response: createResponse, data: createData } = await apiRequest<SessionResponse>('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(createResponse.status).toBe(201)
      expect(createData).not.toBeNull()
      testSessionId = createData!.sessionId
      expect(testSessionId).toMatch(/^sess_/)

      // Step 2: Retrieve and verify full session state structure
      const { response: getResponse, data: sessionData } = await apiRequest<GameStateResponse>(`/sessions/${testSessionId}`)

      expect(getResponse.status).toBe(200)
      expect(sessionData).not.toBeNull()
      expect(sessionData!.sessionId).toBe(testSessionId)
      expect(sessionData).toHaveProperty('phase')
      expect(sessionData).toHaveProperty('party')
      expect(Array.isArray(sessionData!.party)).toBe(true)
      expect(sessionData).toHaveProperty('metadata')
      expect(sessionData!.metadata).toHaveProperty('createdAt')
      expect(sessionData!.metadata).toHaveProperty('updatedAt')

      // Step 3: Verify session appears in session list
      const { data: listData } = await apiRequest<SessionListResponse>('/sessions')
      expect(listData).not.toBeNull()
      expect(listData!.sessions).toContain(testSessionId)

      // Step 4: State persists across requests
      const { data: secondFetch } = await apiRequest<GameStateResponse>(`/sessions/${testSessionId}`)
      expect(secondFetch).not.toBeNull()
      expect(secondFetch!.sessionId).toBe(testSessionId)

      // Step 5: Delete session
      const { response: deleteResponse } = await apiRequest(`/sessions/${testSessionId}`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      // Step 6: Verify session is gone
      const { response: notFoundResponse } = await apiRequest(`/sessions/${testSessionId}`)
      expect(notFoundResponse.status).toBe(404)
    })
  })

  describe('Named session workflow', () => {
    itIfServer('should create named session and clean up', async () => {
      const characterName = 'test-character-' + Date.now()

      const { response, data } = await apiRequest<SessionResponse>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: characterName }),
      })

      expect(response.status).toBe(201)
      expect(data).not.toBeNull()
      expect(data!.sessionId).toBe(characterName)

      // Clean up
      await apiRequest(`/sessions/${characterName}`, { method: 'DELETE' })
    })
  })
})
