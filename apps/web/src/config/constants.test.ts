import { describe, it, expect } from 'vitest'
import { COMBAT_EVENT_TYPES } from './constants'

describe('COMBAT_EVENT_TYPES', () => {
  it('should contain all backend event types', () => {
    // These are all event types defined in the backend combat/events.go
    const requiredTypes = [
      'combat_start', 'combat_end',
      'initiative_rolled',
      'turn_start', 'turn_end',
      'round_start', 'round_end',
      'attack', 'damage', 'heal', 'death', 'unconscious',
      'condition_applied', 'condition_removed',
      'opportunity_attack',
      'move', 'spell', 'item', 'dodge', 'disengage',
    ]

    for (const type of requiredTypes) {
      expect(COMBAT_EVENT_TYPES).toContain(type)
    }
  })

  it('should have exactly 20 event types', () => {
    expect(COMBAT_EVENT_TYPES).toHaveLength(20)
  })

  it('should be a readonly array (as const)', () => {
    expect(Array.isArray(COMBAT_EVENT_TYPES)).toBe(true)
  })

  it('should have no duplicate event types', () => {
    const unique = new Set(COMBAT_EVENT_TYPES)
    expect(unique.size).toBe(COMBAT_EVENT_TYPES.length)
  })
})
