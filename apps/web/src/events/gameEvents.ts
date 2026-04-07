/**
 * Event type constants for Phaser <-> React communication.
 */
export const GameEvents = {
  // Combat interaction events (Phaser -> React)
  COMBAT_CELL_CLICK: 'combat:cell_click',
  COMBAT_UNIT_SELECT: 'combat:unit_select',
  COMBAT_TARGET_SELECT: 'combat:target_select',
  COMBAT_MOVE_CONFIRM: 'combat:move_confirm',

  // Combat state events (React/Store -> Phaser)
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  COMBAT_TURN_START: 'combat:turn_start',
  COMBAT_TURN_END: 'combat:turn_end',
  COMBAT_UPDATE: 'combat:update',

  // Effect events (Store -> Phaser)
  EFFECT_ATTACK: 'effect:attack',
  EFFECT_DAMAGE: 'effect:damage',
  EFFECT_HEAL: 'effect:heal',
  EFFECT_SPELL: 'effect:spell',
  EFFECT_STATUS: 'effect:status',
  EFFECT_DEATH: 'effect:death',
  EFFECT_MISS: 'effect:miss',
} as const

export type GameEventType = (typeof GameEvents)[keyof typeof GameEvents]
