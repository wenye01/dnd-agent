// Shared type definitions
// Mirror of apps/web/src/types/ — the canonical Single Source of Truth.
// NOTE: The web app does NOT import from this package. These types are kept
// here for documentation and potential future server-side (Node) consumers.
// For the active definitions, always refer to apps/web/src/types/.

// ---------------------------------------------------------------------------
// Client / Server message types (mirrors apps/web/src/types/message.ts)
// ---------------------------------------------------------------------------

// Client message types
export type ClientMessageType =
  | 'user_input'
  | 'map_action'
  | 'combat_action'
  | 'management'
  | 'ping'

// Server message types
export type ServerMessageType =
  | 'narration'
  | 'state_update'
  | 'dice_result'
  | 'combat_event'
  | 'error'
  | 'pong'

// Client message base
export interface ClientMessage {
  type: ClientMessageType
  payload: unknown
  requestId?: string
}

// Server message base
export interface ServerMessage {
  type: ServerMessageType
  payload: unknown
  requestId?: string
  timestamp: number
}

// Narration payload
export interface NarrationPayload {
  text: string
  isStreaming: boolean
}

// Dice result payload
export interface DiceResultPayload {
  formula: string
  dice: number[]
  modifier: number
  total: number
  isCrit?: boolean
  isFumble?: boolean
}

// Error payload
export interface ErrorPayload {
  code: string
  message: string
  details?: unknown
}

// User input payload
export interface UserInputPayload {
  text: string
  characterId?: string
}

// Map action payload
export interface MapActionPayload {
  action: 'move' | 'interact' | 'examine'
  targetId?: string
  position?: { x: number; y: number }
}

// Combat action payload
export interface CombatActionPayload {
  action: 'attack' | 'spell' | 'item' | 'move' | 'dodge' | 'disengage'
  targetId?: string
  itemId?: string
  spellId?: string
  position?: { x: number; y: number }
}

// Management action payload
export interface ManagementPayload {
  action: 'save' | 'load' | 'new_game' | 'settings'
  data?: unknown
}

// ---------------------------------------------------------------------------
// Game types (mirrors apps/web/src/types/game.ts)
// ---------------------------------------------------------------------------

export type GamePhase = 'exploring' | 'combat' | 'dialog' | 'resting'

export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export interface AbilityScores {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder'

export type Condition =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'

export interface ActiveEffect {
  id: string
  name: string
  targetId: string
  duration: number
  conditions?: string[]
}

// ---------------------------------------------------------------------------
// Combat event types (mirrors apps/web/src/config/constants.ts)
// ---------------------------------------------------------------------------

export type CombatEventType =
  | 'combat_start' | 'combat_end'
  | 'initiative_rolled'
  | 'turn_start' | 'turn_end'
  | 'round_start' | 'round_end'
  | 'attack' | 'damage' | 'heal' | 'death' | 'unconscious'
  | 'condition_applied' | 'condition_removed'
  | 'opportunity_attack'
  | 'move' | 'spell' | 'item' | 'dodge' | 'disengage'

// Legacy alias — the web app uses DiceResultPayload instead.
// Kept for backward compatibility with any external consumer.
export type DiceResult = DiceResultPayload
