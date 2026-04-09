/**
 * Status effect: visual feedback when a condition is gained or removed.
 */
import Phaser from 'phaser'
import { ANIMATIONS, CONDITION_COLORS } from '../constants'

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
    const ring = scene.add.circle(worldX, worldY, 10, color, 0.6)
    ring.setDepth(500)
    ring.setStrokeStyle(2, color, 0.8)

    scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
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
    const ring = scene.add.circle(worldX, worldY, 20, color, 0.4)
    ring.setDepth(500)

    scene.tweens.add({
      targets: ring,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: ANIMATIONS.STATUS_DURATION,
      ease: 'Sine.easeIn',
      onComplete: () => ring.destroy(),
    })
  }
}
