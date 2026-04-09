/**
 * WebSocket configuration constants
 * These can be overridden by environment variables
 */

// WebSocket URL defaults
export const WS_DEFAULT_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`

// Reconnection configuration
export const WS_DEFAULT_RECONNECT_INTERVAL = Number(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 3000
export const WS_DEFAULT_MAX_RECONNECT_ATTEMPTS = Number(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS) || 10

// Exponential backoff configuration
export const WS_BACKOFF_BASE_MS = 1000       // initial delay: 1 s
export const WS_BACKOFF_MAX_MS = 30_000      // cap: 30 s
export const WS_BACKOFF_JITTER = 0.25        // +/-25 % random jitter

// HTTP API timeout
export const API_DEFAULT_TIMEOUT_MS = 15_000 // 15 s

// Heartbeat configuration
export const WS_DEFAULT_HEARTBEAT_INTERVAL = Number(import.meta.env.VITE_WS_HEARTBEAT_INTERVAL) || 30000

// Message queue configuration
export const WS_MAX_QUEUE_SIZE = 100

// State update types (matches backend state update stateType values)
export const STATE_UPDATE_TYPES = ['game', 'party', 'combat', 'map', 'notification'] as const

/** State update type string literal — derived from STATE_UPDATE_TYPES. */
export type StateUpdateType = typeof STATE_UPDATE_TYPES[number]

// Combat event types (matches backend combat.EventType constants)
// Single source of truth for both the runtime array and the derived type.
export const COMBAT_EVENT_TYPES = [
  'combat_start',
  'combat_end',
  'initiative_rolled',
  'turn_start',
  'turn_end',
  'round_start',
  'round_end',
  'attack',
  'damage',
  'heal',
  'death',
  'unconscious',
  'condition_applied',
  'condition_removed',
  'opportunity_attack',
  'move',
  'spell',
  'item',
  'dodge',
  'disengage',
] as const

/** Combat event type string literal — derived from COMBAT_EVENT_TYPES. */
export type CombatEventType = typeof COMBAT_EVENT_TYPES[number]
