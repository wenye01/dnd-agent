import type { Character, Monster } from './character'
import type { ActiveEffect, GamePhase } from './game'

// 先攻条目
export interface InitiativeEntry {
  characterId: string
  initiative: number
  hasActed: boolean
}

// Combatant type (player or enemy)
export type CombatantType = 'player' | 'enemy' | 'npc'

// Action resource state (matches backend state.ActionState)
export type ActionState = 'available' | 'used'

// Condition entry with duration tracking (matches backend state.ConditionEntry)
export interface ConditionEntry {
  condition: string
  source?: string
  duration: number
  remaining: number
  level?: number
}

// 战斗参与者（完整对象，匹配后端 state.Combatant）
export interface Combatant {
  id: string
  name: string
  type: CombatantType
  maxHp: number
  currentHp: number
  temporaryHp: number
  ac: number
  speed: number
  dexScore: number
  // Turn resources (matches backend ActionState)
  action: ActionState
  bonusAction: ActionState
  reaction: ActionState
  // Conditions and resistances
  conditions: ConditionEntry[]
  damageResistances?: string[]
  damageImmunities?: string[]
  // Death saves (player only)
  deathSaves?: {
    successes: number
    failures: number
  }
  // Hit dice
  hitDice?: {
    total: number
    current: number
    dieSize: number
  }
  // Reference to character ID
  characterId?: string
  /**
   * Grid position on the combat map.
   * NOTE: Backend Combatant struct does NOT include position.
   * This field is populated client-side from move events (CombatEventPayload.position).
   * Falls back to findEmptyCell() when undefined (e.g. on combat start).
   */
  position?: { x: number; y: number }
  // Level and CON modifier
  level?: number
  conModifier?: number
}

// 战斗状态
export interface CombatState {
  status: 'idle' | 'active' | 'ended'
  round: number
  turnIndex: number
  initiatives: InitiativeEntry[]
  participants: Combatant[]
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

// 地图交互点类型
export type InteractableType = 'door' | 'chest' | 'npc' | 'lever' | 'trap' | 'portal' | 'item'

// 地图交互点
export interface MapInteractable {
  id: string
  type: InteractableType
  name: string
  description?: string
  position: { x: number; y: number }
  icon?: string
  isAvailable: boolean
}

// 地图触发器
export interface MapTrigger {
  id: string
  type: 'area_enter' | 'area_exit' | 'interact' | 'proximity'
  area: { x: number; y: number; width: number; height: number }
  action: string
  data?: unknown
  once?: boolean
  triggered?: boolean
}
