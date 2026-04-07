import type { Condition } from '../../types/game'

/** Tile size in pixels. Configurable but defaults to 64. */
export const TILE_SIZE = 64

/** Grid colors for dark fantasy theme */
export const GridColors = {
  gridLine: 0x444466,
  gridLineAlpha: 0.5,
  moveRange: 0x44ff44,
  moveRangeAlpha: 0.3,
  attackRange: 0xff4444,
  attackRangeAlpha: 0.3,
  targetHighlight: 0xffd700,
  targetHighlightAlpha: 0.5,
  currentPlayerGlow: 0x4488ff,
  currentEnemyGlow: 0xff4444,
  playerUnit: 0x4488ff,
  enemyUnit: 0xff4444,
  neutralUnit: 0xffaa00,
} as const

/** Grid coordinate */
export interface GridPosition {
  x: number
  y: number
}

/** Unit team affiliation */
export type UnitTeam = 'player' | 'enemy' | 'neutral'

/** Data needed to create/update a unit in the combat scene */
export interface CombatUnitData {
  id: string
  name: string
  team: UnitTeam
  hp: number
  maxHp: number
  ac: number
  speed: number
  conditions: Condition[]
  gridPosition: GridPosition
}

/** Scene init data passed when switching to combat */
export interface CombatSceneInitData {
  mapId?: string
  gridWidth?: number
  gridHeight?: number
}

/** Weapon type for attack effect differentiation */
export type WeaponType = 'melee' | 'ranged' | 'magic'

/** Damage number display type */
export type DamageNumberType = 'damage' | 'heal' | 'immune' | 'miss' | 'critical'

/** Spell school for color-coding effects */
export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

/** Spell school colors */
export const SpellSchoolColors: Record<SpellSchool, number> = {
  abjuration: 0xffd700,    // gold
  conjuration: 0x88ff88,   // green
  divination: 0x88ccff,    // light blue
  enchantment: 0xff88ff,   // pink
  evocation: 0xff4444,     // red
  illusion: 0xaa88ff,      // purple
  necromancy: 0x44ff44,    // dark green
  transmutation: 0xff8844, // orange
}

/** Condition icon config - maps condition names to display symbols */
export const ConditionIconMap: Record<Condition, string> = {
  blinded: 'B',
  charmed: 'C',
  deafened: 'D',
  frightened: 'F',
  grappled: 'G',
  incapacitated: 'I',
  invisible: 'V',
  paralyzed: 'P',
  petrified: 'S',
  poisoned: 'X',
  prone: 'R',
  restrained: 'E',
  stunned: 'T',
  unconscious: 'U',
  exhaustion: 'Z',
}

/** Condition background colors */
export const ConditionColors: Record<Condition, number> = {
  blinded: 0x333333,
  charmed: 0xff66cc,
  deafened: 0x888888,
  frightened: 0xff8800,
  grappled: 0x884400,
  incapacitated: 0x666666,
  invisible: 0xaaaaff,
  paralyzed: 0xffff00,
  petrified: 0x8b7355,
  poisoned: 0x00ff00,
  prone: 0x996633,
  restrained: 0xff4444,
  stunned: 0xffff88,
  unconscious: 0x444444,
  exhaustion: 0x664400,
}

/** Combat event types handled by the scene */
export interface MoveEventData {
  characterId: string
  from: GridPosition
  to: GridPosition
}

export interface AttackEventData {
  sourceId: string
  targetId: string
  hit: boolean
  critical: boolean
  damage: number
  damageType?: string
  weaponType?: WeaponType
}

export interface DamageEventData {
  targetId: string
  amount: number
  type: DamageNumberType
}

export interface SpellEventData {
  casterId: string
  targetId?: string
  school?: SpellSchool
  aoeCenter?: GridPosition
  aoeRadius?: number
}

export interface TurnChangeEventData {
  characterId: string
  round: number
}

/** Coordinate conversion utilities */
export function worldToGrid(worldX: number, worldY: number): GridPosition {
  return {
    x: Math.floor(worldX / TILE_SIZE),
    y: Math.floor(worldY / TILE_SIZE),
  }
}

export function gridToWorld(gridX: number, gridY: number): GridPosition {
  return {
    x: gridX * TILE_SIZE + TILE_SIZE / 2,
    y: gridY * TILE_SIZE + TILE_SIZE / 2,
  }
}
