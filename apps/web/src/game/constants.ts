/**
 * Game constants for the Phaser combat engine.
 * All grid measurements use 64px tiles (D&D 5e: 1 tile = 5 feet).
 */

// Grid
export const TILE_SIZE = 64
export const GRID_WIDTH = 12
export const GRID_HEIGHT = 9

// Colors (hex)
export const COLORS = {
  // Grid
  GRID_LINE: 0x444466,
  GRID_LINE_ALPHA: 0.5,
  GRID_BG: 0x1a1a2e,

  // Move range
  MOVE_RANGE: 0x44ff44,
  MOVE_RANGE_ALPHA: 0.25,

  // Attack range
  ATTACK_RANGE: 0xff4444,
  ATTACK_RANGE_ALPHA: 0.25,

  // Target highlight
  TARGET_HIGHLIGHT: 0xff4444,
  TARGET_HIGHLIGHT_ALPHA: 0.6,

  // Turn indicator
  TURN_RING: 0xffd700,
  TURN_RING_ALPHA: 0.7,

  // Selection
  SELECTION_RING: 0x4488ff,
  SELECTION_RING_ALPHA: 0.8,

  // Obstacle
  OBSTACLE_FILL: 0x222233,
  OBSTACLE_ALPHA: 0.8,

  // Entity colors
  PLAYER: 0x4488ff,
  ENEMY: 0xff4444,
  NPC: 0x44cc44,

  // HP bar
  HP_GREEN: 0x44ff44,
  HP_YELLOW: 0xffff00,
  HP_RED: 0xff4444,
  HP_BG: 0x333333,

  // Damage number
  DAMAGE_COLOR: '#ff4444',
  HEAL_COLOR: '#44ff44',
  MISS_COLOR: '#aaaaaa',
  CRIT_COLOR: '#ffdd00',
} as const

// Animation durations (ms)
export const ANIMATIONS = {
  MOVE_DURATION: 250,
  ATTACK_LUNGE: 150,
  ATTACK_RETURN: 150,
  DAMAGE_FLOAT: 800,
  DAMAGE_FADE: 400,
  DEATH_SHRINK: 500,
  DEATH_FADE: 300,
  SELECTION_PULSE: 800,
  TURN_RING_PULSE: 1000,
  PROJECTILE_SPEED: 4, // pixels per ms
  SPELL_DURATION: 600,
  HEALING_DURATION: 500,
  STATUS_DURATION: 400,
} as const

// Combat
export const FEET_PER_TILE = 5
export const MAX_GRID_WIDTH = 20
export const MAX_GRID_HEIGHT = 15

// Default attack ranges (in grid tiles)
// TODO: Read from Combatant weapon/spell data when backend provides range info
export const DEFAULT_MELEE_RANGE = 1
export const DEFAULT_RANGED_RANGE = 6
export const DEFAULT_SPELL_RANGE = 3

// Distance threshold in pixels to distinguish melee vs ranged attacks
// 2 tiles * TILE_SIZE (64px) = 128px
export const MELEE_RANGE_THRESHOLD_PX = TILE_SIZE * 2

// UI
export const HP_BAR_WIDTH = 48
export const HP_BAR_HEIGHT = 5
export const HP_BAR_OFFSET_Y = -28
export const NAME_LABEL_OFFSET_Y = -36
export const STATUS_ICON_SIZE = 10
export const STATUS_ICON_OFFSET_Y = -22
export const STATUS_ICON_SPACING = 12

// Condition color mapping (shared by StatusIcon and StatusEffect)
export const CONDITION_COLORS: Record<string, number> = {
  blinded: 0x333333,
  charmed: 0xff69b4,
  deafened: 0x888888,
  frightened: 0xffff00,
  grappled: 0xff8800,
  incapacitated: 0x999999,
  invisible: 0xaaaaff,
  paralyzed: 0xdddd00,
  petrified: 0xaaaaaa,
  poisoned: 0x00cc00,
  prone: 0x886644,
  restrained: 0xff6600,
  stunned: 0xffff88,
  unconscious: 0xcccccc,
  exhaustion: 0x664444,
}
