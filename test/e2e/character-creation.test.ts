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
      const { response: createResponse, data: createData } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(createResponse.status).toBe(201)
      testSessionId = (createData as { sessionId: string }).sessionId
      expect(testSessionId).toMatch(/^sess_/)

      // Step 2: Retrieve and verify full session state structure
      const { response: getResponse, data: sessionData } = await apiRequest(`/sessions/${testSessionId}`)

      expect(getResponse.status).toBe(200)
      expect((sessionData as { sessionId: string }).sessionId).toBe(testSessionId)
      expect(sessionData).toHaveProperty('phase')
      expect(sessionData).toHaveProperty('party')
      expect(Array.isArray((sessionData as { party: unknown[] }).party)).toBe(true)
      expect(sessionData).toHaveProperty('metadata')
      const metadata = (sessionData as { metadata: { createdAt: number; updatedAt: number } }).metadata
      expect(metadata).toHaveProperty('createdAt')
      expect(metadata).toHaveProperty('updatedAt')

      // Step 3: Verify session appears in session list
      const { data: listData } = await apiRequest('/sessions')
      const sessions = (listData as { sessions: string[] }).sessions
      expect(sessions).toContain(testSessionId)

      // Step 4: State persists across requests
      const { data: secondFetch } = await apiRequest(`/sessions/${testSessionId}`)
      expect((secondFetch as { sessionId: string }).sessionId).toBe(testSessionId)

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

      const { response, data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: characterName }),
      })

      expect(response.status).toBe(201)
      expect((data as { sessionId: string }).sessionId).toBe(characterName)

      // Clean up
      await apiRequest(`/sessions/${characterName}`, { method: 'DELETE' })
    })
  })
})
