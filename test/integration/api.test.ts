/**
 * API Integration Tests
 *
 * These tests verify the REST API endpoints work correctly.
 * They require the server to be running.
 *
 * Note: Tests will be skipped if the server is not available.
 */

import {
  API_BASE,
  serverAvailable,
  apiRequest,
  itIfServer,
  checkServerAvailability,
} from '../e2e/helpers'

interface SessionResponse {
  sessionId: string
}

interface GameStateResponse {
  sessionId: string
  phase: string
  party: unknown[]
  metadata: {
    createdAt: number
    updatedAt: number
    playTime: number
    scenarioId: string
  }
}

interface ErrorResponse {
  status: string
  error?: {
    code: string
    message: string
  }
}

/**
 * Helper to create a test session
 */
async function createTestSession(sessionId?: string): Promise<SessionResponse> {
  const body = sessionId ? { sessionId } : {}

  const { response, data } = await apiRequest('/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Failed to create session: ${JSON.stringify(data)}`)
  }

  return data as SessionResponse
}

beforeAll(async () => {
  await checkServerAvailability()
})

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    itIfServer('should return health status', async () => {
      const { response, data } = await apiRequest('/health')

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'ok',
        service: 'dnd-game-server',
      })
    })
  })

  describe('Session Management', () => {
    let testSessionId: string

    afterAll(async () => {
      // Clean up test session
      if (testSessionId && serverAvailable) {
        try {
          await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
        } catch {
          // Ignore cleanup errors
        }
      }
    })

    describe('POST /api/sessions', () => {
      itIfServer('should create a new session with auto-generated ID', async () => {
        const { response, data } = await apiRequest('/sessions', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        expect(response.status).toBe(201)
        expect(data).toHaveProperty('sessionId')
        expect(data.status).toBe('success')

        testSessionId = (data as SessionResponse).sessionId
        expect(typeof testSessionId).toBe('string')
        expect(testSessionId).toMatch(/^sess_/)
      })

      itIfServer('should create a session with custom ID', async () => {
        const customId = 'test-session-custom-' + Date.now()

        const { response, data } = await apiRequest('/sessions', {
          method: 'POST',
          body: JSON.stringify({ sessionId: customId }),
        })

        expect(response.status).toBe(201)
        expect((data as SessionResponse).sessionId).toBe(customId)

        // Clean up
        await apiRequest(`/sessions/${customId}`, { method: 'DELETE' })
      })

      itIfServer('should reject duplicate session IDs', async () => {
        const duplicateId = 'test-session-duplicate-' + Date.now()

        // Create first session
        await apiRequest('/sessions', {
          method: 'POST',
          body: JSON.stringify({ sessionId: duplicateId }),
        })

        // Try to create duplicate
        const { response, data } = await apiRequest('/sessions', {
          method: 'POST',
          body: JSON.stringify({ sessionId: duplicateId }),
        })

        expect(response.status).toBe(400)
        expect((data as ErrorResponse).error?.code).toBe('BAD_REQUEST')

        // Clean up
        await apiRequest(`/sessions/${duplicateId}`, { method: 'DELETE' })
      })
    })

    describe('GET /api/sessions/:id', () => {
      itIfServer('should retrieve an existing session', async () => {
        const session = await createTestSession()

        const { response, data } = await apiRequest(`/sessions/${session.sessionId}`)

        expect(response.status).toBe(200)
        expect((data as GameStateResponse).sessionId).toBe(session.sessionId)
        expect(data).toHaveProperty('phase')

        // Clean up
        await apiRequest(`/sessions/${session.sessionId}`, { method: 'DELETE' })
      })

      itIfServer('should return 404 for non-existent session', async () => {
        const { response, data } = await apiRequest('/sessions/non-existent-session')

        expect(response.status).toBe(404)
        expect((data as ErrorResponse).error?.code).toBe('NOT_FOUND')
      })
    })

    describe('GET /api/sessions', () => {
      itIfServer('should list all sessions', async () => {
        const { response, data } = await apiRequest('/sessions')

        expect(response.status).toBe(200)
        expect(data).toHaveProperty('sessions')
        expect(data).toHaveProperty('count')
        expect(Array.isArray((data as { sessions: string[] }).sessions)).toBe(true)
      })
    })

    describe('DELETE /api/sessions/:id', () => {
      itIfServer('should delete an existing session', async () => {
        const session = await createTestSession()

        const { response, data } = await apiRequest(`/sessions/${session.sessionId}`, {
          method: 'DELETE',
        })

        expect(response.status).toBe(200)
        expect(data).toMatchObject({
          sessionId: session.sessionId,
          deleted: true,
        })

        // Verify session is gone
        const getResponse = await apiRequest(`/sessions/${session.sessionId}`)
        expect(getResponse.response.status).toBe(404)
      })

      itIfServer('should return 404 when deleting non-existent session', async () => {
        const { response, data } = await apiRequest('/sessions/non-existent-session', {
          method: 'DELETE',
        })

        expect(response.status).toBe(404)
        expect((data as ErrorResponse).error?.code).toBe('NOT_FOUND')
      })
    })
  })

  describe('GET /api/config', () => {
    itIfServer('should return server configuration', async () => {
      const { response, data } = await apiRequest('/config')

      expect(response.status).toBe(200)
      // Config endpoint returns data inside a wrapper
      const wrappedData = data as { status: string; data: { features: string[] } }
      expect(wrappedData.data).toHaveProperty('features')
      expect(Array.isArray(wrappedData.data.features)).toBe(true)

      // Verify expected features are present
      const features = wrappedData.data.features
      expect(features).toContain('websocket')
      expect(features).toContain('rest_api')
      expect(features).toContain('dice_rolling')
    })
  })

  describe('CORS Headers', () => {
    itIfServer('should include CORS headers', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        headers: {
          Origin: 'http://localhost:5173',
        },
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    itIfServer('should return 404 for invalid endpoints', async () => {
      const response = await fetch(`${API_BASE}/api/invalid-endpoint`)

      expect(response.status).toBe(404)
    })

    itIfServer('should return proper error format', async () => {
      const { response, data } = await apiRequest('/sessions/non-existent')

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('status', 'error')
      expect(data).toHaveProperty('error')
      expect((data as ErrorResponse).error).toHaveProperty('code')
      expect((data as ErrorResponse).error).toHaveProperty('message')
    })
  })
})
