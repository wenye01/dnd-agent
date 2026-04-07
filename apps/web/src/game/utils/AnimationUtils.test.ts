import { describe, it, expect } from 'vitest'
import {
  moveTween,
  attackLungeTween,
  damageFloatTween,
  deathTween,
  selectionPulseTween,
  hitFlashTween,
} from './AnimationUtils'
import { ANIMATIONS } from '../constants'

describe('AnimationUtils', () => {
  describe('moveTween', () => {
    it('should return a tween config with correct targets and destination', () => {
      const target = { x: 0, y: 0 }
      const config = moveTween(target, 100, 200)

      expect(config.targets).toBe(target)
      expect(config.x).toBe(100)
      expect(config.y).toBe(200)
      expect(config.duration).toBe(ANIMATIONS.MOVE_DURATION)
      expect(config.ease).toBe('Sine.easeInOut')
    })

    it('should include onComplete callback when provided', () => {
      const cb = () => {}
      const config = moveTween({}, 50, 50, cb)

      expect(config.onComplete).toBe(cb)
    })
  })

  describe('attackLungeTween', () => {
    it('should lunge 60% toward target', () => {
      const target = { x: 0, y: 0 }
      const config = attackLungeTween(target, 100, 0, 0, 0)

      expect(config.targets).toBe(target)
      expect(config.x).toBe(60) // 60% of 100
      expect(config.y).toBe(0)
      expect(config.duration).toBe(ANIMATIONS.ATTACK_LUNGE)
      expect(config.yoyo).toBe(true)
    })

    it('should handle diagonal lunge', () => {
      const config = attackLungeTween({}, 100, 100, 0, 0)

      expect(config.x).toBe(60)
      expect(config.y).toBe(60)
    })
  })

  describe('damageFloatTween', () => {
    it('should return config that moves 40px up and fades out', () => {
      const target = { y: 100 }
      const config = damageFloatTween(target, 100)

      expect(config.targets).toBe(target)
      expect(config.y).toBe(60) // 100 - 40
      expect(config.alpha).toBe(0)
      expect(config.duration).toBe(ANIMATIONS.DAMAGE_FLOAT)
    })
  })

  describe('deathTween', () => {
    it('should return config that shrinks to 0 and fades out', () => {
      const target = {}
      const config = deathTween(target)

      expect(config.targets).toBe(target)
      expect(config.scaleX).toBe(0)
      expect(config.scaleY).toBe(0)
      expect(config.alpha).toBe(0)
      expect(config.duration).toBe(ANIMATIONS.DEATH_SHRINK)
    })
  })

  describe('selectionPulseTween', () => {
    it('should return config that scales up and down', () => {
      const target = {}
      const config = selectionPulseTween(target)

      expect(config.targets).toBe(target)
      expect(config.scaleX).toBe(1.3)
      expect(config.scaleY).toBe(1.3)
      expect(config.alpha).toBe(0.3)
      expect(config.yoyo).toBe(true)
      expect(config.duration).toBe(ANIMATIONS.SELECTION_PULSE)
    })
  })

  describe('hitFlashTween', () => {
    it('should return config for brief alpha flash', () => {
      const target = {}
      const config = hitFlashTween(target)

      expect(config.targets).toBe(target)
      expect(config.alpha).toBe(0.3)
      expect(config.duration).toBe(80)
      expect(config.yoyo).toBe(true)
    })
  })
})
