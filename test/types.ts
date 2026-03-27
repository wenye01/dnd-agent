/**
 * Shared type definitions for E2E and integration tests.
 *
 * These types represent API response shapes used across multiple test files.
 */

export interface SessionResponse {
  sessionId: string
}

export interface GameStateResponse {
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

export interface SessionListResponse {
  sessions: string[]
  count: number
}

export interface ErrorResponse {
  status: string
  error?: {
    code: string
    message: string
  }
}

export interface HealthResponse {
  status: string
  service: string
}

export interface ConfigResponse {
  status: string
  data: {
    features: string[]
  }
}

export interface DeleteSessionResponse {
  sessionId: string
  deleted: boolean
}
