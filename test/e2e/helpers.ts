/**
 * E2E Test Helpers
 *
 * Shared utilities for end-to-end tests that interact with the server API.
 */

import type { SessionResponse } from '../types'

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
