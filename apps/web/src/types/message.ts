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
