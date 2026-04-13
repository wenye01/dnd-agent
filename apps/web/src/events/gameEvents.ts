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

  // Scene map events (Phaser -> React)
  SCENEMAP_TILE_CLICK: 'scenemap:tile_click',
  SCENEMAP_INTERACT: 'scenemap:interact',
  SCENEMAP_TRANSITION_START: 'scenemap:transition_start',
  SCENEMAP_TRANSITION_END: 'scenemap:transition_end',

  // Inventory events (React -> WebSocket)
  INVENTORY_EQUIP: 'inventory:equip',
  INVENTORY_UNEQUIP: 'inventory:unequip',
  INVENTORY_USE: 'inventory:use',
  INVENTORY_DROP: 'inventory:drop',

  // Spell events (React -> WebSocket / Phaser animations)
  SPELL_CAST: 'spell:cast',
  SPELL_PREPARE: 'spell:prepare',
  SPELL_UNPREPARE: 'spell:unprepare',
  SPELL_EFFECT: 'spell:effect',
  SPELL_COMPLETE: 'spell:complete',

  // Item events (React -> Phaser for animations)
  ITEM_USE: 'item:use',
  ITEM_EFFECT: 'item:effect',

  // Equipment events (React -> Phaser for visual updates)
  EQUIP_CHANGE: 'equip:change',
  UNEQUIP_CHANGE: 'unequip:change',

  // Map events (React -> Phaser for transitions, Phaser -> React for results)
  MAP_INTERACT: 'map:interact',
  MAP_SWITCH: 'map:switch',
  MAP_SWITCH_COMPLETE: 'map:switch_complete',
  MAP_LOAD: 'map:load',

  // Visual feedback events (Store -> Phaser)
  EFFECT_DAMAGE_NUMBER: 'effect:damage_number',
  EFFECT_STATUS_ICON: 'effect:status_icon',
} as const

export type GameEventType = (typeof GameEvents)[keyof typeof GameEvents]
