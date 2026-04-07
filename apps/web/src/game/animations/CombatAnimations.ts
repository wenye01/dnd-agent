import Phaser from 'phaser'
import type { UnitSprite } from '../objects/UnitSprite'
import type { GridPosition, WeaponType } from '../types/combat-scene'
import { TILE_SIZE, gridToWorld } from '../types/combat-scene'

/**
 * CombatAnimations - A collection of tween-based combat animations.
 *
 * All methods return Promises so callers can await animation completion.
 */
export class CombatAnimations {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Animate a unit moving smoothly from one grid cell to another.
   */
  animateMove(unit: UnitSprite, to: GridPosition, duration: number = 300): Promise<void> {
    return unit.tweenToPosition(to, duration)
  }

  /**
   * Animate a melee attack: source lunges toward target, then returns.
   * Different weapon types produce slightly different feel.
   */
  animateMeleeAttack(
    source: UnitSprite,
    target: UnitSprite,
    weaponType: WeaponType = 'melee'
  ): Promise<void> {
    const origX = source.x
    const origY = source.y

    // Lunge distance depends on weapon type
    const lungeFactor = weaponType === 'melee' ? 0.7 : weaponType === 'magic' ? 0.3 : 0.5
    const dx = (target.x - source.x) * lungeFactor
    const dy = (target.y - source.y) * lungeFactor

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: source,
        x: origX + dx,
        y: origY + dy,
        duration: 120,
        ease: 'Quad.easeIn',
        yoyo: true,
        onComplete: () => resolve(),
      })
    })
  }

  /**
   * Animate a ranged attack: projectile from source to target.
   * Creates a simple graphic that travels in a straight line.
   */
  animateRangedAttack(
    source: UnitSprite,
    target: UnitSprite,
    color: number = 0xffff00
  ): Promise<void> {
    return new Promise((resolve) => {
      const projectile = this.scene.add.circle(source.x, source.y, 4, color)
      projectile.setDepth(1000)

      this.scene.tweens.add({
        targets: projectile,
        x: target.x,
        y: target.y,
        duration: 200,
        ease: 'Linear',
        onComplete: () => {
          projectile.destroy()
          resolve()
        },
      })
    })
  }

  /**
   * Play a hit flash on the target unit.
   */
  animateHit(target: UnitSprite): void {
    target.flash(0xffffff, 150)
  }

  /**
   * Play a miss effect - a brief grey flash on target.
   */
  animateMiss(target: UnitSprite): void {
    target.flash(0x666666, 200)
  }

  /**
   * Play the death animation on a unit.
   */
  animateDeath(unit: UnitSprite): Promise<void> {
    return unit.playDeath()
  }

  /**
   * Animate a spell cast - a growing ring at the caster, then impact at target.
   */
  animateSpellCast(
    caster: UnitSprite,
    target: UnitSprite | null,
    color: number = 0x8844ff,
    duration: number = 400
  ): Promise<void> {
    return new Promise((resolve) => {
      // Ring expanding from caster
      const ring = this.scene.add.circle(caster.x, caster.y, 4, color, 0)
      ring.setStrokeStyle(3, color, 0.8)
      ring.setDepth(900)

      this.scene.tweens.add({
        targets: ring,
        scaleX: 4,
        scaleY: 4,
        alpha: 0,
        duration: duration / 2,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          ring.destroy()

          // Impact at target if present
          if (target) {
            const impact = this.scene.add.circle(target.x, target.y, 8, color, 0.6)
            impact.setDepth(900)
            this.scene.tweens.add({
              targets: impact,
              scaleX: 3,
              scaleY: 3,
              alpha: 0,
              duration: duration / 2,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                impact.destroy()
                resolve()
              },
            })
          } else {
            resolve()
          }
        },
      })
    })
  }

  /**
   * Animate an AOE effect - expanding circle from center point.
   */
  animateAOE(
    center: GridPosition,
    radius: number,
    color: number = 0x8844ff,
    duration: number = 600
  ): Promise<void> {
    return new Promise((resolve) => {
      const worldPos = gridToWorld(center.x, center.y)
      const maxRadius = radius * TILE_SIZE

      const aoeCircle = this.scene.add.circle(worldPos.x, worldPos.y, 8, color, 0.3)
      aoeCircle.setStrokeStyle(2, color, 0.6)
      aoeCircle.setDepth(800)

      this.scene.tweens.add({
        targets: aoeCircle,
        displayWidth: maxRadius * 2,
        displayHeight: maxRadius * 2,
        alpha: 0,
        duration,
        ease: 'Sine.easeOut',
        onComplete: () => {
          aoeCircle.destroy()
          resolve()
        },
      })
    })
  }
}
