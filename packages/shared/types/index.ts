// 共享类型定义
// 用于前后端之间的类型同步

// 客户端消息类型
export type ClientMessageType =
  | 'user_input'
  | 'combat_action'
  | 'map_action'
  | 'management';

// 服务端消息类型
export type ServerMessageType =
  | 'state_update'
  | 'narration'
  | 'combat_event'
  | 'dice_result'
  | 'error';

// 客户端消息
export interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
  requestId?: string;
}

// 服务端消息
export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
  requestId?: string;
  timestamp: number;
}

// 角色数据
export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  stats: Stats;
}

// 属性
export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// 掷骰结果
export interface DiceResult {
  rollType: string;
  formula: string;
  result: number[];
  total: number;
}
