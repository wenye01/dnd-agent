/**
 * E2E Test Helpers
 *
 * Shared utilities for end-to-end tests that interact with the server API.
 */

/**
 * Base URL for API requests
 */
export const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080'

/**
 * Flag indicating whether the server is available for testing
 */
export let serverAvailable = false

/**
 * Helper to make API requests
 */
export async function apiRequest(endpoint: string, options?: RequestInit) {
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
 * Check server availability - should be called in beforeAll
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
}
