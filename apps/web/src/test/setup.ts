import { vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

// Module-level variable to store WebSocket handler (avoids global pollution)
let wsTestHandler: ((message: unknown) => void) | undefined

// Mock crypto.randomUUID for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      return 'test-uuid-' + Math.random().toString(36).substring(2, 15)
    },
  },
  writable: true,
})

// Mock window.matchMedia for responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock WebSocketContext for tests that use hooks that depend on it
vi.mock('../contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useWebSocket: () => ({
    client: null,
    connected: false,
    send: vi.fn(),
    subscribe: vi.fn((handler: (message: unknown) => void) => {
      // Store handler for test access (module-level, not global)
      wsTestHandler = handler
      return vi.fn()
    }),
  }),
}))

// Helper function to get the WebSocket handler for testing
export function getWebSocketHandler() {
  return wsTestHandler
}

// Helper function to reset the WebSocket handler between tests
export function resetWebSocketHandler() {
  wsTestHandler = undefined
}
