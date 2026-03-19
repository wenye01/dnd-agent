// 客户端消息类型
export type ClientMessageType =
  | 'user_input'
  | 'map_action'
  | 'combat_action'
  | 'management'
  | 'ping'

// 服务端消息类型
export type ServerMessageType =
  | 'narration'
  | 'state_update'
  | 'dice_result'
  | 'combat_event'
  | 'error'
  | 'pong'

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

// 用户输入载荷
export interface UserInputPayload {
  text: string
  characterId?: string
}

// 地图动作载荷
export interface MapActionPayload {
  action: 'move' | 'interact' | 'examine'
  targetId?: string
  position?: { x: number; y: number }
}

// 战斗动作载荷
export interface CombatActionPayload {
  action: 'attack' | 'spell' | 'item' | 'move' | 'dodge' | 'disengage'
  targetId?: string
  itemId?: string
  spellId?: string
  position?: { x: number; y: number }
}

// 管理动作载荷
export interface ManagementPayload {
  action: 'save' | 'load' | 'new_game' | 'settings'
  data?: unknown
}
