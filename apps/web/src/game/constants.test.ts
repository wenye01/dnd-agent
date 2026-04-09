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
  DEPTH,
  ENTITY_RADIUS,
  ENTITY_BORDER_WIDTH,
  TURN_RING_LINE_WIDTH,
  TURN_RING_RADIUS,
  TARGET_RING_LINE_WIDTH,
  TARGET_RING_RADIUS,
  MELEE_SWING_RADIUS,
  MELEE_SWING_ARC,
  MELEE_SWING_STEPS,
  DAMAGE_FONT_SIZES,
  DAMAGE_Y_OFFSET,
  DAMAGE_FLOAT_DISTANCE,
  SPELL_PARTICLE_COUNT,
  HEALING_PARTICLE_COUNT,
  HP_THRESHOLD_HIGH,
  HP_THRESHOLD_LOW,
  TEXT_STYLES,
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

  describe('DEPTH (z-index layers)', () => {
    it('should have all required depth entries', () => {
      const requiredKeys = [
        'GRID', 'CELL_HOVER', 'MOVE_RANGE', 'ATTACK_RANGE',
        'TARGET_RING', 'TURN_INDICATOR', 'EFFECTS', 'EFFECTS_OVERLAY',
        'DAMAGE_NUMBER',
      ]
      for (const key of requiredKeys) {
        expect(DEPTH).toHaveProperty(key)
      }
    })

    it('should have monotonically increasing depth values for distinct layers', () => {
      expect(DEPTH.GRID).toBeLessThan(DEPTH.CELL_HOVER)
      expect(DEPTH.CELL_HOVER).toBeLessThan(DEPTH.MOVE_RANGE)
      expect(DEPTH.MOVE_RANGE).toBeLessThanOrEqual(DEPTH.ATTACK_RANGE)
      expect(DEPTH.TARGET_RING).toBeGreaterThan(DEPTH.ATTACK_RANGE)
      expect(DEPTH.TURN_INDICATOR).toBeGreaterThan(DEPTH.TARGET_RING)
      expect(DEPTH.EFFECTS).toBeGreaterThan(DEPTH.TURN_INDICATOR)
      expect(DEPTH.EFFECTS_OVERLAY).toBeGreaterThan(DEPTH.EFFECTS)
      expect(DEPTH.DAMAGE_NUMBER).toBeGreaterThan(DEPTH.EFFECTS_OVERLAY)
    })
  })

  describe('entity rendering constants', () => {
    it('should have entity radius smaller than half tile size', () => {
      expect(ENTITY_RADIUS).toBeLessThan(TILE_SIZE / 2)
      expect(ENTITY_RADIUS).toBeGreaterThan(0)
    })

    it('should have positive border width', () => {
      expect(ENTITY_BORDER_WIDTH).toBeGreaterThan(0)
    })
  })

  describe('turn/target indicator constants', () => {
    it('should have positive ring dimensions', () => {
      expect(TURN_RING_LINE_WIDTH).toBeGreaterThan(0)
      expect(TURN_RING_RADIUS).toBeGreaterThan(0)
      expect(TARGET_RING_LINE_WIDTH).toBeGreaterThan(0)
      expect(TARGET_RING_RADIUS).toBeGreaterThan(0)
    })
  })

  describe('attack effect constants', () => {
    it('should have positive melee swing values', () => {
      expect(MELEE_SWING_RADIUS).toBeGreaterThan(0)
      expect(MELEE_SWING_ARC).toBeGreaterThan(0)
      expect(MELEE_SWING_ARC).toBeLessThan(Math.PI)
      expect(MELEE_SWING_STEPS).toBeGreaterThan(0)
    })
  })

  describe('damage number constants', () => {
    it('should have font sizes for all damage types', () => {
      expect(DAMAGE_FONT_SIZES).toHaveProperty('crit')
      expect(DAMAGE_FONT_SIZES).toHaveProperty('damage')
      expect(DAMAGE_FONT_SIZES).toHaveProperty('miss')
      expect(DAMAGE_FONT_SIZES).toHaveProperty('heal')
    })

    it('should have negative Y offset (floats upward)', () => {
      expect(DAMAGE_Y_OFFSET).toBeLessThan(0)
    })

    it('should have positive float distance', () => {
      expect(DAMAGE_FLOAT_DISTANCE).toBeGreaterThan(0)
    })
  })

  describe('particle counts', () => {
    it('should have positive particle counts for effects', () => {
      expect(SPELL_PARTICLE_COUNT).toBeGreaterThan(0)
      expect(HEALING_PARTICLE_COUNT).toBeGreaterThan(0)
    })
  })

  describe('HP threshold constants', () => {
    it('should have valid thresholds (high > low)', () => {
      expect(HP_THRESHOLD_HIGH).toBeGreaterThan(HP_THRESHOLD_LOW)
      expect(HP_THRESHOLD_HIGH).toBeGreaterThan(0)
      expect(HP_THRESHOLD_HIGH).toBeLessThan(1)
      expect(HP_THRESHOLD_LOW).toBeGreaterThan(0)
      expect(HP_THRESHOLD_LOW).toBeLessThan(1)
    })
  })

  describe('TEXT_STYLES', () => {
    it('should have styles for all text types', () => {
      expect(TEXT_STYLES).toHaveProperty('INITIAL_LETTER')
      expect(TEXT_STYLES).toHaveProperty('NAME_LABEL')
      expect(TEXT_STYLES).toHaveProperty('STATUS_ICON')
    })

    it('should have fontFamily in all text styles', () => {
      const styles = TEXT_STYLES as Record<string, Record<string, unknown>>
      for (const key of Object.keys(styles)) {
        expect(styles[key]).toHaveProperty('fontFamily')
      }
    })
  })
})
