import { describe, it, expect } from 'vitest'
import { GameEvents, type GameEventType } from './gameEvents'

describe('GameEvents', () => {
  it('should have combat interaction events', () => {
    expect(GameEvents.COMBAT_CELL_CLICK).toBe('combat:cell_click')
    expect(GameEvents.COMBAT_UNIT_SELECT).toBe('combat:unit_select')
    expect(GameEvents.COMBAT_TARGET_SELECT).toBe('combat:target_select')
    expect(GameEvents.COMBAT_MOVE_CONFIRM).toBe('combat:move_confirm')
  })

  it('should have combat state events', () => {
    expect(GameEvents.COMBAT_START).toBe('combat:start')
    expect(GameEvents.COMBAT_END).toBe('combat:end')
    expect(GameEvents.COMBAT_TURN_START).toBe('combat:turn_start')
    expect(GameEvents.COMBAT_TURN_END).toBe('combat:turn_end')
    expect(GameEvents.COMBAT_UPDATE).toBe('combat:update')
  })

  it('should have effect events', () => {
    expect(GameEvents.EFFECT_ATTACK).toBe('effect:attack')
    expect(GameEvents.EFFECT_DAMAGE).toBe('effect:damage')
    expect(GameEvents.EFFECT_HEAL).toBe('effect:heal')
    expect(GameEvents.EFFECT_SPELL).toBe('effect:spell')
    expect(GameEvents.EFFECT_STATUS).toBe('effect:status')
    expect(GameEvents.EFFECT_DEATH).toBe('effect:death')
    expect(GameEvents.EFFECT_MISS).toBe('effect:miss')
  })

  it('should have spell events (v0.4 Phase 4)', () => {
    expect(GameEvents.SPELL_CAST).toBe('spell:cast')
    expect(GameEvents.SPELL_EFFECT).toBe('spell:effect')
    expect(GameEvents.SPELL_COMPLETE).toBe('spell:complete')
  })

  it('should have item events (v0.4 Phase 4)', () => {
    expect(GameEvents.ITEM_USE).toBe('item:use')
    expect(GameEvents.ITEM_EFFECT).toBe('item:effect')
  })

  it('should have equipment events (v0.4 Phase 4)', () => {
    expect(GameEvents.EQUIP_CHANGE).toBe('equip:change')
    expect(GameEvents.UNEQUIP_CHANGE).toBe('unequip:change')
  })

  it('should have map events (v0.4 Phase 4)', () => {
    expect(GameEvents.MAP_INTERACT).toBe('map:interact')
    expect(GameEvents.MAP_SWITCH).toBe('map:switch')
    expect(GameEvents.MAP_SWITCH_COMPLETE).toBe('map:switch_complete')
    expect(GameEvents.MAP_LOAD).toBe('map:load')
  })

  it('should have visual feedback events (v0.4 Phase 4)', () => {
    expect(GameEvents.EFFECT_DAMAGE_NUMBER).toBe('effect:damage_number')
    expect(GameEvents.EFFECT_STATUS_ICON).toBe('effect:status_icon')
  })

  it('should have unique event names (no collisions)', () => {
    const values = Object.values(GameEvents)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })

  it('should be usable as a const type', () => {
    const eventType: GameEventType = GameEvents.COMBAT_START
    expect(typeof eventType).toBe('string')
  })

  // v0.4 Phase 3: Scene map events
  it('should have scene map events', () => {
    expect(GameEvents.SCENEMAP_TILE_CLICK).toBe('scenemap:tile_click')
    expect(GameEvents.SCENEMAP_INTERACT).toBe('scenemap:interact')
    expect(GameEvents.SCENEMAP_TRANSITION_START).toBe('scenemap:transition_start')
    expect(GameEvents.SCENEMAP_TRANSITION_END).toBe('scenemap:transition_end')
  })

  // v0.4 Phase 3: Inventory events
  it('should have inventory events', () => {
    expect(GameEvents.INVENTORY_EQUIP).toBe('inventory:equip')
    expect(GameEvents.INVENTORY_UNEQUIP).toBe('inventory:unequip')
    expect(GameEvents.INVENTORY_USE).toBe('inventory:use')
    expect(GameEvents.INVENTORY_DROP).toBe('inventory:drop')
  })

  // v0.4 Phase 3: Spell events
  it('should have spell events', () => {
    expect(GameEvents.SPELL_CAST).toBe('spell:cast')
    expect(GameEvents.SPELL_PREPARE).toBe('spell:prepare')
    expect(GameEvents.SPELL_UNPREPARE).toBe('spell:unprepare')
  })
})
