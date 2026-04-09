import { describe, it, expect } from 'vitest'
import {
  TILE_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  COLORS,
  ANIMATIONS,
  FEET_PER_TILE,
  CONDITION_COLORS,
  HP_BAR_WIDTH,
  HP_BAR_HEIGHT,
  DEFAULT_MELEE_RANGE,
  DEFAULT_RANGED_RANGE,
  DEFAULT_SPELL_RANGE,
} from './constants'

describe('Game Constants', () => {
  describe('grid dimensions', () => {
    it('should have TILE_SIZE of 64', () => {
      expect(TILE_SIZE).toBe(64)
    })

    it('should have GRID_WIDTH and GRID_HEIGHT as positive integers', () => {
      expect(GRID_WIDTH).toBeGreaterThan(0)
      expect(GRID_HEIGHT).toBeGreaterThan(0)
      expect(Number.isInteger(GRID_WIDTH)).toBe(true)
      expect(Number.isInteger(GRID_HEIGHT)).toBe(true)
    })

    it('should have FEET_PER_TILE of 5 (D&D standard)', () => {
      expect(FEET_PER_TILE).toBe(5)
    })
  })

  describe('COLORS', () => {
    it('should have all required color entries', () => {
      const requiredKeys = [
        'GRID_LINE', 'GRID_BG',
        'MOVE_RANGE', 'ATTACK_RANGE',
        'TARGET_HIGHLIGHT', 'TURN_RING',
        'SELECTION_RING', 'OBSTACLE_FILL',
        'PLAYER', 'ENEMY', 'NPC',
        'HP_GREEN', 'HP_YELLOW', 'HP_RED', 'HP_BG',
      ]

      for (const key of requiredKeys) {
        expect(COLORS).toHaveProperty(key)
      }
    })

    it('should have string colors for damage numbers', () => {
      expect(typeof COLORS.DAMAGE_COLOR).toBe('string')
      expect(typeof COLORS.HEAL_COLOR).toBe('string')
      expect(typeof COLORS.MISS_COLOR).toBe('string')
      expect(typeof COLORS.CRIT_COLOR).toBe('string')
    })
  })

  describe('ANIMATIONS', () => {
    it('should have all required animation duration entries', () => {
      const requiredKeys = [
        'MOVE_DURATION', 'ATTACK_LUNGE', 'ATTACK_RETURN',
        'DAMAGE_FLOAT', 'DAMAGE_FADE',
        'DEATH_SHRINK', 'DEATH_FADE',
        'SELECTION_PULSE', 'TURN_RING_PULSE',
        'PROJECTILE_SPEED', 'SPELL_DURATION',
        'HEALING_DURATION', 'STATUS_DURATION',
      ]

      for (const key of requiredKeys) {
        expect(ANIMATIONS).toHaveProperty(key)
      }
    })

    it('should have all durations as positive numbers', () => {
      const durationKeys = Object.keys(ANIMATIONS) as (keyof typeof ANIMATIONS)[]
      for (const key of durationKeys) {
        expect(ANIMATIONS[key]).toBeGreaterThan(0)
      }
    })
  })

  describe('CONDITION_COLORS', () => {
    it('should have a color mapping for all standard D&D 5e conditions', () => {
      const standardConditions = [
        'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
        'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
        'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
      ]

      for (const condition of standardConditions) {
        expect(CONDITION_COLORS).toHaveProperty(condition)
      }
    })

    it('should map conditions to hex numbers', () => {
      for (const [, value] of Object.entries(CONDITION_COLORS)) {
        expect(typeof value).toBe('number')
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(0xFFFFFF)
      }
    })
  })

  describe('UI constants', () => {
    it('should have positive HP bar dimensions', () => {
      expect(HP_BAR_WIDTH).toBeGreaterThan(0)
      expect(HP_BAR_HEIGHT).toBeGreaterThan(0)
    })
  })

  describe('attack ranges', () => {
    it('should have sensible default ranges', () => {
      expect(DEFAULT_MELEE_RANGE).toBe(1)
      expect(DEFAULT_RANGED_RANGE).toBeGreaterThan(DEFAULT_MELEE_RANGE)
      expect(DEFAULT_SPELL_RANGE).toBeGreaterThan(DEFAULT_MELEE_RANGE)
    })
  })
})
