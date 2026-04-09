/**
 * E2E Test Helpers
 *
 * Shared utilities for end-to-end tests that interact with the server API.
 */

import type { SessionResponse, CharacterResponse } from '../types'

/**
 * Base URL for API requests
 */
export const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080'

/**
 * Flag indicating whether the server is available for testing
 */
export let serverAvailable = false

/**
 * Helper to make API requests with typed response data.
 *
 * @typeParam T - The expected type of the response data (defaults to unknown)
 * @param endpoint - API endpoint (without /api prefix)
 * @param options - Fetch options
 * @returns Object containing response and typed data (data is null for non-JSON responses)
 *
 * @example
 * // With typed response
 * const { response, data } = await apiRequest<SessionResponse>('/sessions')
 * if (response.ok && data) {
 *   console.log(data.sessionId) // TypeScript knows data is SessionResponse
 * }
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options?: RequestInit,
): Promise<{ response: Response; data: T | null }> {
  const url = `${API_BASE}/api${endpoint}`
  const { headers: customHeaders, ...restOptions } = options ?? {}

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  })

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return { response, data: null }
  }

  const data = await response.json()
  return { response, data: data as T }
}

/**
 * Helper to conditionally run tests based on server availability.
 * Uses the global `it` from vitest (globals: true in vitest.config.ts).
 */
export const itIfServer = (
  title: string,
  fn: () => void | Promise<void>,
) => {
  return serverAvailable ? it(title, fn) : it.skip(title, fn)
}

/**
 * Check server availability - should be called in beforeAll.
 * Outputs a warning when the server is not reachable.
 */
export async function checkServerAvailability(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(2000),
    })
    serverAvailable = response.ok
  } catch {
    serverAvailable = false
  }

  if (!serverAvailable) {
    console.warn(
      `[e2e] Server not available at ${API_BASE}/api/health. ` +
      `All server-dependent tests will be skipped. ` +
      `Set API_BASE_URL to configure the server address.`,
    )
  }
}

/**
 * Helper to create a test session via POST /api/sessions.
 * Throws if the server fails to create the session.
 */
export async function createTestSession(sessionId?: string): Promise<SessionResponse> {
  const body = sessionId ? { sessionId } : {}

  const { response, data } = await apiRequest<SessionResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!response.ok || !data) {
    throw new Error(`Failed to create session: ${JSON.stringify(data)}`)
  }

  return data
}

/**
 * Helper to create a character in a specific session.
 * Requires the server to be running and the session to exist.
 */
export async function createTestCharacter(
  sessionId: string,
  overrides?: Partial<{
    name: string
    race: string
    class_: string
    background: string
    abilityScores: Record<string, number>
  }>,
): Promise<CharacterResponse> {
  const body = {
    name: overrides?.name ?? `TestChar-${Date.now()}`,
    race: overrides?.race ?? 'human',
    class: overrides?.class_ ?? 'fighter',
    background: overrides?.background ?? 'soldier',
    abilityScores: overrides?.abilityScores ?? {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
    },
  }

  const { response, data } = await apiRequest<CharacterResponse>(
    `/characters?sessionId=${encodeURIComponent(sessionId)}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )

  if (!response.ok || !data) {
    throw new Error(`Failed to create character: ${JSON.stringify(data)}`)
  }

  return data
}

/**
 * Helper to delete a character from a session.
 * Throws if the server fails to delete the character (matches createTestCharacter behavior).
 */
export async function deleteTestCharacter(
  sessionId: string,
  characterId: string,
): Promise<void> {
  const { response, data } = await apiRequest(
    `/characters/${characterId}?sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    throw new Error(
      `Failed to delete character ${characterId}: ${response.status} ${JSON.stringify(data)}`,
    )
  }
}

// =========================================================================
// WebSocket Testing Helpers
// =========================================================================

/**
 * Connect to the server's WebSocket endpoint.
 *
 * The WebSocket URL is derived from API_BASE (replacing http with ws).
 * Returns the raw WebSocket instance for use with waitForMessage/collectMessages.
 *
 * @param sessionId - Optional session ID to associate with the connection
 * @param timeoutMs - Connection timeout in milliseconds (default 5000)
 * @returns Connected WebSocket instance
 *
 * @example
 * const ws = await connectWebSocket('sess_abc')
 * const messages = await collectMessages(ws, 2000)
 * ws.close()
 */
export async function connectWebSocket(
  sessionId?: string,
  timeoutMs = 5000,
): Promise<WebSocket> {
  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws'
  const url = sessionId ? `${wsUrl}?sessionId=${encodeURIComponent(sessionId)}` : wsUrl

  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url)

    const timer = setTimeout(() => {
      ws.close()
      reject(new Error(`WebSocket connection timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve(ws)
    }, { once: true })

    ws.addEventListener('error', (event) => {
      clearTimeout(timer)
      reject(new Error(`WebSocket connection error: ${(event as ErrorEvent).message ?? 'unknown'}`))
    }, { once: true })
  })
}

/**
 * Wait for the next WebSocket message that matches an optional filter.
 * Resolves with the parsed message data, or null if the timeout expires.
 *
 * @param ws - Connected WebSocket instance
 * @param options - Optional filter and timeout
 * @returns Parsed message object, or null on timeout
 */
export async function waitForMessage<T = unknown>(
  ws: WebSocket,
  options?: {
    /** Only accept messages whose `type` field matches this value. */
    messageType?: string
    /** Custom filter function. Called with the parsed JSON message. */
    filter?: (msg: T) => boolean
    /** Maximum time to wait in milliseconds (default 5000). */
    timeoutMs?: number
  },
): Promise<T | null> {
  const timeoutMs = options?.timeoutMs ?? 5000

  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', handler)
      resolve(null)
    }, timeoutMs)

    function handler(event: MessageEvent) {
      let msg: T
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return // Skip non-JSON messages
      }

      // Apply type filter
      if (options?.messageType != null) {
        const msgAny = msg as Record<string, unknown>
        if (msgAny.type !== options.messageType) {
          return // Not the message type we want; keep waiting
        }
      }

      // Apply custom filter
      if (options?.filter && !options.filter(msg)) {
        return
      }

      // Message matched
      clearTimeout(timer)
      ws.removeEventListener('message', handler)
      resolve(msg)
    }

    ws.addEventListener('message', handler)
  })
}

/**
 * Collect all WebSocket messages received within a time window.
 * Useful for capturing all combat events emitted during an operation.
 *
 * @param ws - Connected WebSocket instance
 * @param durationMs - How long to listen for messages (default 2000)
 * @returns Array of parsed message objects received during the window
 */
export async function collectMessages<T = unknown>(
  ws: WebSocket,
  durationMs = 2000,
): Promise<T[]> {
  const messages: T[] = []

  return new Promise<T[]>((resolve) => {
    function handler(event: MessageEvent) {
      try {
        messages.push(JSON.parse(event.data as string) as T)
      } catch {
        // Skip non-JSON messages
      }
    }

    ws.addEventListener('message', handler)

    setTimeout(() => {
      ws.removeEventListener('message', handler)
      resolve(messages)
    }, durationMs)
  })
}

/**
 * Send a user input message through the WebSocket.
 * This simulates what the frontend sends when a player takes an action.
 *
 * @param ws - Connected WebSocket instance
 * @param input - The user input payload (action description or structured command)
 */
export function sendUserInput(ws: WebSocket, input: Record<string, unknown>): void {
  ws.send(JSON.stringify({
    type: 'user_input',
    payload: input,
    timestamp: Date.now(),
  }))
}
