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

// Character-related response types

export interface CharacterResponse {
  id: string
  name: string
  race: string
  class: string
  level: number
  hp: number
  maxHp: number
  temporaryHp?: number
  ac: number
  speed: number
  stats: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
  skills: Record<string, boolean>
  proficiencyBonus: number
  savingThrows: Record<string, boolean>
  background: string
  racialTraits: Array<{ name: string; description: string }>
  deathSaves: {
    successes: number
    failures: number
  }
  hitDice: {
    total: number
    current: number
    size: number
  }
  inventory: Array<{ id: string; name: string; description: string; type: string }>
  conditions: string[]
  gold: number
  damageResistances?: string[]
  damageImmunities?: string[]
  isDead?: boolean
  armorProficiencies?: string[]
  weaponProficiencies?: string[]
}

export interface ListCharactersResponse {
  characters: CharacterResponse[]
  count: number
}

// Combat-related response types

export interface CombatantResponse {
  id: string
  name: string
  type: 'player' | 'enemy' | 'npc'
  maxHp: number
  currentHp: number
  temporaryHp: number
  ac: number
  speed: number
  dexScore: number
  action: 'available' | 'used'
  bonusAction: 'available' | 'used'
  reaction: 'available' | 'used'
}

export interface InitiativeEntryResponse {
  characterId: string
  initiative: number
  hasActed: boolean
}

export interface StartCombatResponse {
  status: string
  round: number
  currentTurn: string
  currentTurnId: string
  initiativeOrder: InitiativeEntryResponse[]
  combatants: CombatantResponse[]
}

export interface EndCombatResponse {
  status: string
  victory: boolean
  reason: string
}

export interface AttackResponse {
  attacker: string
  attackerId: string
  target: string
  targetId: string
  attackRoll: number
  attackTotal: number
  targetAC: number
  hit: boolean
  critical: boolean
  damage?: number
  damageType?: string
  currentHp?: number
  message: string
}

export interface DamageResponse {
  targetId: string
  target: string
  originalDamage: number
  modifiedDamage: number
  resistanceApplied: boolean
  immunityApplied: boolean
  tempHpAbsorbed: number
  currentHp: number
  temporaryHp: number
  maxHp: number
  unconscious: boolean
  dead: boolean
  damageType: string
  message: string
}

export interface HealResponse {
  targetId: string
  target: string
  healing: number
  currentHp: number
  maxHp: number
  conscious: boolean
  message: string
}

export interface DeathSaveResponse {
  combatantId: string
  roll: number
  isSuccess?: boolean
  successes: number
  failures: number
  stable?: boolean
  dead?: boolean
  special?: string
  regainedHp?: boolean
  currentHp?: number
  message: string
}

export interface ShortRestResponse {
  combatantId: string
  diceSpent: number
  diceResults: number[]
  conModifier: number
  healing: number
  currentHp: number
  maxHp: number
  hitDiceLeft: number
  hitDiceTotal: number
  message: string
}

export interface LongRestResponse {
  combatantId: string
  hpRestored: number
  currentHp: number
  maxHp: number
  hitDiceRecovered: number
  hitDiceCurrent: number
  hitDiceTotal: number
  message: string
}

// =========================================================================
// Combat Event Type Definitions (from Go backend events.go)
// =========================================================================

/** All combat event types defined in the Go backend (CombatEventType constants). */
export type CombatEventType =
  | 'combat_start'
  | 'combat_end'
  | 'initiative_rolled'
  | 'turn_start'
  | 'turn_end'
  | 'round_end'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'death'
  | 'unconscious'
  | 'condition_applied'
  | 'condition_removed'
  | 'opportunity_attack'

/**
 * CombatEvent payload as serialized by the Go backend.
 * Source: apps/server/internal/server/combat/events.go - CombatEvent struct
 */
export interface CombatEventPayload {
  type: CombatEventType
  timestamp: number
  data:
    | AttackEventData
    | DamageEventData
    | HealEventData
    | DeathEventData
    | DeathSaveEventData
    | ConditionEventData
    | InitiativeRolledData
    | TurnStartData
    | TurnEndData
    | RoundEndData
    | CombatStartData
    | CombatEndData
    | OpportunityAttackEventData
}

export interface AttackEventData {
  attackerId: string
  targetId: string
  attackRoll: number
  targetAc: number
  hit: boolean
  critical: boolean
  damage?: number
  damageType?: string
}

export interface DamageEventData {
  targetId: string
  originalDamage: number
  modifiedDamage: number
  resistanceApplied: boolean
  immunityApplied: boolean
  currentHp: number
  unconscious: boolean
  dead: boolean
}

export interface HealEventData {
  targetId: string
  healing: number
  currentHp: number
  conscious: boolean
}

export interface DeathEventData {
  combatantId: string
  combatantType: string
  killerId?: string
}

export interface DeathSaveEventData {
  combatantId: string
  roll: number
  isSuccess: boolean
  successes: number
  failures: number
  stable: boolean
  dead: boolean
  regainedHp: boolean
}

export interface ConditionEventData {
  combatantId: string
  condition: string
  applied: boolean
}

export interface InitiativeRolledData {
  /** Not a structured event; initiative data comes from StartCombat response. */
  entries: InitiativeEntryResponse[]
}

export interface TurnStartData {
  combatantId: string
  round: number
}

export interface TurnEndData {
  combatantId: string
  round: number
}

export interface RoundEndData {
  round: number
}

export interface CombatStartData {
  status: string
  round: number
}

export interface CombatEndData {
  victory: boolean
  reason: string
}

export interface OpportunityAttackEventData {
  attackerId: string
  targetId: string
  attackRoll: number
  targetAc: number
  hit: boolean
  critical: boolean
  damage?: number
  damageType?: string
  triggered: boolean
}

// =========================================================================
// WebSocket Message Types
// =========================================================================

/** All WebSocket message types sent by the server. */
export type WSMessageType =
  | 'combat_event'
  | 'state_update'
  | 'narration'
  | 'error'

/** Base shape for all WebSocket messages from the server. */
export interface WSMessage {
  type: WSMessageType
  timestamp?: number
  payload?: unknown
}

/** A combat_event WebSocket message wrapping a CombatEventPayload. */
export interface WSCombatEventMessage extends WSMessage {
  type: 'combat_event'
  payload: CombatEventPayload
}

/** A state_update WebSocket message carrying game/combat state. */
export interface WSStateUpdateMessage extends WSMessage {
  type: 'state_update'
  payload: {
    stateType: 'combat' | 'game' | 'party'
    data: Record<string, unknown>
  }
}

/** A narration WebSocket message for narrative text output. */
export interface WSNarrationMessage extends WSMessage {
  type: 'narration'
  payload: {
    text: string
    source?: string
  }
}
