/**
 * Whitebox tests for v0.4 Phase 3 type additions in state.ts
 * Validates InteractableType, MapInteractable, and MapTrigger types.
 */
import { describe, it, expect } from 'vitest'
import type { InteractableType, MapInteractable, MapTrigger } from './state'

describe('v0.4 Phase 3 - state.ts types', () => {
  describe('InteractableType', () => {
    it('should accept all valid interactable type values', () => {
      const types: InteractableType[] = [
        'door', 'chest', 'npc', 'lever', 'trap', 'portal', 'item',
      ]
      expect(types).toHaveLength(7)
    })
  })

  describe('MapInteractable', () => {
    it('should define a door interactable', () => {
      const door: MapInteractable = {
        id: 'door-001',
        type: 'door',
        name: 'Front Door',
        description: 'A heavy oak door.',
        position: { x: 5, y: 0 },
        isAvailable: true,
      }
      expect(door.type).toBe('door')
      expect(door.isAvailable).toBe(true)
    })

    it('should define an NPC interactable', () => {
      const npc: MapInteractable = {
        id: 'npc-barkeep',
        type: 'npc',
        name: 'Barkeep',
        position: { x: 3, y: 3 },
        isAvailable: true,
      }
      expect(npc.type).toBe('npc')
      expect(npc.description).toBeUndefined()
    })

    it('should define a portal interactable with icon', () => {
      const portal: MapInteractable = {
        id: 'portal-cave',
        type: 'portal',
        name: 'Cave Entrance',
        position: { x: 0, y: 7 },
        icon: 'cave',
        isAvailable: false,
      }
      expect(portal.isAvailable).toBe(false)
      expect(portal.icon).toBe('cave')
    })
  })

  describe('MapTrigger', () => {
    it('should define an area enter trigger', () => {
      const trigger: MapTrigger = {
        id: 'trigger-001',
        type: 'area_enter',
        area: { x: 0, y: 0, width: 5, height: 5 },
        action: 'start_combat',
        data: { encounterId: 'goblin-ambush' },
        once: true,
        triggered: false,
      }
      expect(trigger.type).toBe('area_enter')
      expect(trigger.once).toBe(true)
      expect(trigger.triggered).toBe(false)
    })

    it('should define a proximity trigger', () => {
      const trigger: MapTrigger = {
        id: 'trigger-002',
        type: 'proximity',
        area: { x: 10, y: 10, width: 3, height: 3 },
        action: 'reveal_trap',
      }
      expect(trigger.type).toBe('proximity')
      expect(trigger.once).toBeUndefined()
    })

    it('should define an interact trigger', () => {
      const trigger: MapTrigger = {
        id: 'trigger-003',
        type: 'interact',
        area: { x: 5, y: 5, width: 1, height: 1 },
        action: 'open_chest',
        data: { chestId: 'chest-001' },
        once: true,
        triggered: true,
      }
      expect(trigger.triggered).toBe(true)
    })
  })
})
