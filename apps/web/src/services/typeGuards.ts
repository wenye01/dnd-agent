import type {
  NarrationPayload,
  DiceResultPayload,
  ErrorPayload,
  SpellCastPayload,
  ItemUsePayload,
  EquipPayload,
  UnequipPayload,
  MapInteractPayload,
  MapSwitchPayload,
} from '../types'
import {
  COMBAT_EVENT_TYPES,
  STATE_UPDATE_TYPES,
} from '../config/constants'
import type { CombatEventType, StateUpdateType } from '../config/constants'

// Re-export CombatEventType so existing consumers can import it from here
// without changing their import paths. The canonical definition lives in
// config/constants.ts.
export type { CombatEventType }

// State update payload type (from backend spec)
export interface StateUpdatePayload {
  stateType: StateUpdateType
  data: unknown
}

// Combat event payload type (from backend spec)
export interface CombatEventPayload {
  eventType: CombatEventType
  characterId?: string
  characterName?: string
  spellName?: string
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

  return (
    typeof stateType === 'string' &&
    (STATE_UPDATE_TYPES as readonly string[]).includes(stateType)
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

  return (
    typeof eventType === 'string' &&
    (COMBAT_EVENT_TYPES as readonly string[]).includes(eventType)
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

// --- v0.4 Phase 4: Type guards for new event payloads ---

// Type guard for spell cast payload
export function isSpellCastPayload(payload: unknown): payload is SpellCastPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.characterId === 'string' &&
    typeof obj.spellId === 'string' &&
    typeof obj.spellName === 'string' &&
    typeof obj.slotLevelUsed === 'number' &&
    typeof obj.concentrating === 'boolean'
  )
}

// Type guard for item use payload
export function isItemUsePayload(payload: unknown): payload is ItemUsePayload {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.characterId === 'string' &&
    typeof obj.itemId === 'string' &&
    typeof obj.itemName === 'string' &&
    typeof obj.itemType === 'string' &&
    typeof obj.consumed === 'boolean'
  )
}

// Type guard for equip payload
export function isEquipPayload(payload: unknown): payload is EquipPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.characterId === 'string' &&
    typeof obj.itemId === 'string' &&
    typeof obj.itemName === 'string' &&
    typeof obj.slot === 'string'
  )
}

// Type guard for unequip payload
export function isUnequipPayload(payload: unknown): payload is UnequipPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.characterId === 'string' &&
    typeof obj.itemId === 'string' &&
    typeof obj.itemName === 'string' &&
    typeof obj.slot === 'string'
  )
}

// Type guard for map interact payload
export function isMapInteractPayload(payload: unknown): payload is MapInteractPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.characterId === 'string' &&
    typeof obj.interactableId === 'string' &&
    typeof obj.interactableType === 'string' &&
    typeof obj.action === 'string' &&
    typeof obj.mapId === 'string' &&
    typeof obj.position === 'object' && obj.position !== null
  )
}

// Type guard for map switch payload
export function isMapSwitchPayload(payload: unknown): payload is MapSwitchPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const obj = payload as Record<string, unknown>
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.characterId === 'string' &&
    typeof obj.fromMapId === 'string' &&
    typeof obj.toMapId === 'string' &&
    typeof obj.entryPoint === 'string' &&
    typeof obj.position === 'object' && obj.position !== null
  )
}
