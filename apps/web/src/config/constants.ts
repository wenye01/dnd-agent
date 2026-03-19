/**
 * WebSocket configuration constants
 * These can be overridden by environment variables
 */

// WebSocket URL defaults
export const WS_DEFAULT_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'

// Reconnection configuration
export const WS_DEFAULT_RECONNECT_INTERVAL = Number(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 3000
export const WS_DEFAULT_MAX_RECONNECT_ATTEMPTS = Number(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS) || 10

// Heartbeat configuration
export const WS_DEFAULT_HEARTBEAT_INTERVAL = Number(import.meta.env.VITE_WS_HEARTBEAT_INTERVAL) || 30000

// Message queue configuration
export const WS_MAX_QUEUE_SIZE = 100

// Message type constants (for type safety)
export const WS_MESSAGE_TYPES = {
  CLIENT: ['user_input', 'map_action', 'combat_action', 'management', 'ping'] as const,
  SERVER: ['narration', 'state_update', 'dice_result', 'combat_event', 'error', 'pong'] as const,
} as const

export type ClientMessageType = typeof WS_MESSAGE_TYPES.CLIENT[number]
export type ServerMessageType = typeof WS_MESSAGE_TYPES.SERVER[number]

// State update types
export const STATE_UPDATE_TYPES = ['game', 'party', 'combat', 'map'] as const

// Combat event types
export const COMBAT_EVENT_TYPES = ['turn_start', 'turn_end', 'round_start', 'round_end', 'combat_start', 'combat_end'] as const
