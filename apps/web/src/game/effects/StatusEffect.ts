/**
 * Status effect: visual feedback when a condition is gained or removed.
 */
import Phaser from 'phaser'
import { ANIMATIONS, CONDITION_COLORS, DEPTH, STATUS_GAINED_RADIUS, STATUS_GAINED_SCALE, STATUS_REMOVED_RADIUS, STATUS_REMOVED_SCALE } from '../constants'

export class StatusEffect {
  /**
   * Play status gained effect (expanding colored ring).
   */
  static gained(
    scene: Phaser.Scene,
    worldX: number,
    worldY: number,
    condition: string,
  ): void {
    const color = CONDITION_COLORS[condition] ?? 0x666666
    const ring = scene.add.circle(worldX, worldY, STATUS_GAINED_RADIUS, color, 0.6)
    ring.setDepth(DEPTH.EFFECTS)
    ring.setStrokeStyle(2, color, 0.8)

    scene.tweens.add({
      targets: ring,
      scaleX: STATUS_GAINED_SCALE,
      scaleY: STATUS_GAINED_SCALE,
      alpha: 0,
      duration: ANIMATIONS.STATUS_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    })
  }

  /**
   * Play status removed effect (shrinking ring with fade).
   */
  static removed(
    scene: Phaser.Scene,
    worldX: number,
    worldY: number,
    condition: string,
  ): void {
    const color = CONDITION_COLORS[condition] ?? 0x666666
    const ring = scene.add.circle(worldX, worldY, STATUS_REMOVED_RADIUS, color, 0.4)
    ring.setDepth(DEPTH.EFFECTS)

    scene.tweens.add({
      targets: ring,
      scaleX: STATUS_REMOVED_SCALE,
      scaleY: STATUS_REMOVED_SCALE,
      alpha: 0,
      duration: ANIMATIONS.STATUS_DURATION,
      ease: 'Sine.easeIn',
      onComplete: () => ring.destroy(),
    })
  }
}
