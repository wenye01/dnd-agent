import type { Character, Monster } from './character'
import type { ActiveEffect, GamePhase } from './game'

// 先攻条目
export interface InitiativeEntry {
  characterId: string
  initiative: number
  hasActed: boolean
}

// 战斗状态
export interface CombatState {
  round: number
  turnIndex: number
  initiatives: InitiativeEntry[]
  participants: string[]
  activeEffects: ActiveEffect[]
}

// 场景状态
export interface ScenarioState {
  id: string
  name: string
  description: string
  objectives?: string[]
  completedObjectives?: string[]
}

// 游戏元数据
export interface GameMetadata {
  createdAt: number
  updatedAt: number
  playTime: number
  scenarioId: string
}

// 游戏状态
export interface GameState {
  sessionId: string
  phase: GamePhase
  party: Character[]
  currentMapId: string
  combat: CombatState | null
  scenario: ScenarioState | null
  metadata: GameMetadata
}

// 地图位置
export interface MapPosition {
  x: number
  y: number
  mapId: string
}

// 地图实体
export interface MapEntity {
  id: string
  type: 'player' | 'npc' | 'monster' | 'object' | 'trigger'
  position: MapPosition
  data: Character | Monster | unknown
}

// 地图定义
export interface GameMap {
  id: string
  name: string
  width: number
  height: number
  tiles: number[][]
  entities: MapEntity[]
}
