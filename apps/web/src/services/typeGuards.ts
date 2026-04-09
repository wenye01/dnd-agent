import type {
  NarrationPayload,
  DiceResultPayload,
  ErrorPayload,
} from '../types'

// State update payload type (from backend spec)
export interface StateUpdatePayload {
  stateType: 'game' | 'party' | 'combat' | 'map' | 'notification'
  data: unknown
}

// Combat event types (matches backend combat.CombatEventType)
export type CombatEventType =
  | 'combat_start' | 'combat_end'
  | 'initiative_rolled'
  | 'turn_start' | 'turn_end'
  | 'round_start' | 'round_end'
  | 'attack' | 'damage' | 'heal' | 'death' | 'unconscious'
  | 'condition_applied' | 'condition_removed'
  | 'opportunity_attack'
  | 'move' | 'spell' | 'item' | 'dodge' | 'disengage'

// Combat event payload type (from backend spec)
export interface CombatEventPayload {
  eventType: CombatEventType
  characterId?: string
  round?: number
  data?: unknown
  target?: string
  // Attack event data
  damage?: number
  damageType?: string
  isCrit?: boolean
  isHit?: boolean
  // Heal event data
  amount?: number
  // Condition event data
  condition?: string
  // Move event data
  position?: { x: number; y: number }
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  // Initiative
  initiatives?: Array<{ characterId: string; initiative: number }>
}

// User input payload type
export interface UserInputPayload {
  text: string
  characterId?: string
}

// Type guard for partial game state update
export function isPartialGameState(data: unknown): data is { sessionId?: string; phase?: string; currentMapId?: string } {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  // Check that any present fields have the correct type
  if ('sessionId' in obj && typeof obj.sessionId !== 'string') {
    return false
  }
  if ('phase' in obj && typeof obj.phase !== 'string') {
    return false
  }
  if ('currentMapId' in obj && typeof obj.currentMapId !== 'string') {
    return false
  }

  return true
}

// Type guard for Character array
export function isCharacterArray(data: unknown): data is Array<{ id: string; name: string }> {
  return Array.isArray(data) && data.every((item) =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  )
}

// Type guard for CombatState
export function isCombatState(data: unknown): data is { round: number; turnIndex: number; initiatives: unknown[]; participants: string[]; activeEffects: unknown[] } {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  return (
    typeof obj.round === 'number' &&
    typeof obj.turnIndex === 'number' &&
    Array.isArray(obj.initiatives) &&
    Array.isArray(obj.participants) &&
    obj.participants.every((p) => typeof p === 'string') &&
    Array.isArray(obj.activeEffects)
  )
}

// Type guard for narration payload
export function isNarrationPayload(payload: unknown): payload is NarrationPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'text' in payload &&
    typeof payload.text === 'string' &&
    'isStreaming' in payload &&
    typeof payload.isStreaming === 'boolean'
  )
}

// Type guard for state update payload
export function isStateUpdatePayload(payload: unknown): payload is StateUpdatePayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('stateType' in payload) ||
    !('data' in payload)
  ) {
    return false
  }

  const { stateType } = payload as { stateType: unknown }
  const VALID_STATE_TYPES = ['game', 'party', 'combat', 'map', 'notification'] as const

  return (
    typeof stateType === 'string' &&
    VALID_STATE_TYPES.includes(stateType as typeof VALID_STATE_TYPES[number])
  )
}

// Type guard for dice result payload
export function isDiceResultPayload(payload: unknown): payload is DiceResultPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('formula' in payload) ||
    !('total' in payload) ||
    !('dice' in payload) ||
    !('modifier' in payload)
  ) {
    return false
  }

  const { formula, total, dice, modifier, isCrit, isFumble } = payload as {
    formula: unknown
    total: unknown
    dice: unknown
    modifier: unknown
    isCrit?: unknown
    isFumble?: unknown
  }

  // Check optional fields are correct type if present
  if (isCrit !== undefined && typeof isCrit !== 'boolean') {
    return false
  }
  if (isFumble !== undefined && typeof isFumble !== 'boolean') {
    return false
  }

  return (
    typeof formula === 'string' &&
    typeof total === 'number' &&
    Array.isArray(dice) &&
    dice.every((d) => typeof d === 'number') &&
    typeof modifier === 'number'
  )
}

// Type guard for error payload
export function isErrorPayload(payload: unknown): payload is ErrorPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('code' in payload) ||
    !('message' in payload)
  ) {
    return false
  }

  const { code, message } = payload as { code: unknown; message: unknown }
  return (
    typeof code === 'string' &&
    typeof message === 'string'
  )
}

// Type guard for combat event payload
export function isCombatEventPayload(payload: unknown): payload is CombatEventPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('eventType' in payload)
  ) {
    return false
  }

  const { eventType } = payload as { eventType: unknown }
  const validEventTypes: string[] = [
    'combat_start', 'combat_end',
    'initiative_rolled',
    'turn_start', 'turn_end',
    'round_start', 'round_end',
    'attack', 'damage', 'heal', 'death', 'unconscious',
    'condition_applied', 'condition_removed',
    'opportunity_attack',
    'move', 'spell', 'item', 'dodge', 'disengage',
  ]

  return (
    typeof eventType === 'string' &&
    validEventTypes.includes(eventType)
  )
}

// Type guard for user input payload
export function isUserInputPayload(payload: unknown): payload is UserInputPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('text' in payload)
  ) {
    return false
  }

  const { text, characterId } = payload as { text: unknown; characterId?: unknown }

  if (typeof text !== 'string') {
    return false
  }

  if (characterId !== undefined && typeof characterId !== 'string') {
    return false
  }

  return true
}

// Helper type guards for state update data
// These are more permissive than the full types since the server may send partial updates

export function isGameStateData(data: unknown): data is Partial<import('../types').GameState> {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  return 'sessionId' in obj && typeof obj.sessionId === 'string'
}

export function isPartyData(data: unknown): data is import('../types').Character[] {
  return Array.isArray(data) && data.every((item) =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    'race' in item &&
    'class' in item &&
    'level' in item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  )
}

export function isCombatData(data: unknown): data is import('../types').CombatState {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.participants)) return false
  return (
    typeof obj.round === 'number' &&
    typeof obj.turnIndex === 'number' &&
    Array.isArray(obj.initiatives) &&
    Array.isArray(obj.activeEffects) &&
    ('status' in obj && typeof obj.status === 'string')
  )
}
