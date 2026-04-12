// 客户端消息类型
export type ClientMessageType =
  | 'user_input'
  | 'map_action'
  | 'combat_action'
  | 'management'
  | 'ping'

// 服务端消息类型 (v0.4 Phase 4: extended with spell/item/map events)
export type ServerMessageType =
  | 'narration'
  | 'state_update'
  | 'dice_result'
  | 'combat_event'
  | 'error'
  | 'pong'
  | 'spell_cast'
  | 'item_use'
  | 'equip'
  | 'unequip'
  | 'map_interact'
  | 'map_switch'

// 客户端消息基类
export interface ClientMessage {
  type: ClientMessageType
  payload: unknown
  requestId?: string
}

// 服务端消息基类
export interface ServerMessage {
  type: ServerMessageType
  payload: unknown
  requestId?: string
  timestamp: number
}

// 叙述消息载荷
export interface NarrationPayload {
  text: string
  isStreaming: boolean
}

// 骰子结果载荷
export interface DiceResultPayload {
  formula: string
  dice: number[]
  modifier: number
  total: number
  isCrit?: boolean
  isFumble?: boolean
}

// 错误消息载荷
export interface ErrorPayload {
  code: string
  message: string
  details?: unknown
}

// --- v0.4 Phase 4: Extended event payload types ---

// Common game event fields shared by all new event payloads
export interface GameEventPayload {
  eventId: string
  timestamp: number
  characterId: string
  targetId?: string
  effects?: Record<string, unknown>
  stateChange?: Record<string, unknown>
}

// Spell cast event payload
export interface SpellCastPayload extends GameEventPayload {
  spellId: string
  spellName: string
  slotLevelUsed: number
  concentrating: boolean
  damage?: number
  healing?: number
  damageType?: string
}

// Item use event payload
export interface ItemUsePayload extends GameEventPayload {
  itemId: string
  itemName: string
  itemType: string
  consumed: boolean
  healing?: number
  damage?: number
  description?: string
}

// Equip event payload
export interface EquipPayload extends GameEventPayload {
  itemId: string
  itemName: string
  slot: string
  acBonus?: number
  oldItemId?: string
}

// Unequip event payload
export interface UnequipPayload extends GameEventPayload {
  itemId: string
  itemName: string
  slot: string
}

// Map interact event payload
export interface MapInteractPayload extends GameEventPayload {
  interactableId: string
  interactableType: 'door' | 'chest' | 'npc' | 'trigger'
  action: string
  mapId: string
  position: { x: number; y: number }
}

// Map switch event payload
export interface MapSwitchPayload extends GameEventPayload {
  fromMapId: string
  toMapId: string
  entryPoint: string
  position: { x: number; y: number }
}
