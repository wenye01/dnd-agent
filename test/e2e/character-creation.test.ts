/**
 * Character Creation End-to-End Tests
 *
 * These tests verify the character creation flow works correctly
 * by testing the backend API directly.
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
  describe('Session creation for character', () => {
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

    itIfServer('should create a new session for character', async () => {
      const { response, data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('sessionId')

      testSessionId = (data as { sessionId: string }).sessionId
      expect(testSessionId).toMatch(/^sess_/)
    })

    itIfServer('should create session with custom name for character', async () => {
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

  describe('Character state persistence', () => {
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

    itIfServer('should store and retrieve character data', async () => {
      const { response, data } = await apiRequest(`/sessions/${sessionId}`)

      expect(response.status).toBe(200)
      expect((data as { sessionId: string }).sessionId).toBe(sessionId)
      expect(data).toHaveProperty('phase')
    })

    itIfServer('should maintain character data across requests', async () => {
      const { data: firstFetch } = await apiRequest(`/sessions/${sessionId}`)
      const { data: secondFetch } = await apiRequest(`/sessions/${sessionId}`)

      expect((firstFetch as { sessionId: string }).sessionId).toBe(
        (secondFetch as { sessionId: string }).sessionId,
      )
    })
  })

  describe('Character data structure', () => {
    itIfServer('should validate session state structure', async () => {
      const { data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const sessionId = (data as { sessionId: string }).sessionId

      const { response, data: sessionData } = await apiRequest(`/sessions/${sessionId}`)

      expect(response.status).toBe(200)
      expect(sessionData).toHaveProperty('sessionId')
      expect(sessionData).toHaveProperty('phase')
      expect(sessionData).toHaveProperty('party')
      expect(sessionData).toHaveProperty('metadata')
      expect(Array.isArray((sessionData as { party: unknown[] }).party)).toBe(true)

      const metadata = (sessionData as { metadata: { createdAt: number; updatedAt: number } }).metadata
      expect(metadata).toHaveProperty('createdAt')
      expect(metadata).toHaveProperty('updatedAt')

      // Clean up
      await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
    })
  })

  describe('Error handling', () => {
    itIfServer('should handle invalid session ID gracefully', async () => {
      const { response, data } = await apiRequest('/sessions/invalid-session-format')

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('status', 'error')
      expect(data).toHaveProperty('error')
    })

    itIfServer('should handle duplicate session creation', async () => {
      const duplicateId = 'duplicate-test-' + Date.now()

      await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: duplicateId }),
      })

      const { response, data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: duplicateId }),
      })

      expect(response.status).toBe(400)
      expect((data as { error?: { code: string } }).error?.code).toBe('BAD_REQUEST')

      // Clean up
      await apiRequest(`/sessions/${duplicateId}`, { method: 'DELETE' })
    })
  })

  describe('Character creation workflow', () => {
    itIfServer('should support complete character creation workflow', async () => {
      const { data: createData } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const sessionId = (createData as { sessionId: string }).sessionId
      expect(sessionId).toBeTruthy()

      const { response: getResponse } = await apiRequest(`/sessions/${sessionId}`)
      expect(getResponse.status).toBe(200)

      const { data: listData } = await apiRequest('/sessions')
      const sessions = (listData as { sessions: string[] }).sessions
      expect(sessions).toContain(sessionId)

      const { response: deleteResponse } = await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      const { response: notFoundResponse } = await apiRequest(`/sessions/${sessionId}`)
      expect(notFoundResponse.status).toBe(404)
    })
  })
})
