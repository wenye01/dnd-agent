import Phaser from 'phaser'
import { TILE_SIZE } from '../types/combat-scene'
import type { WeaponType } from '../types/combat-scene'

/**
 * AttackEffect - Visual effects for melee and ranged attacks.
 *
 * Creates weapon trail, impact flash, and hit spark graphics
 * that auto-destroy after their animation completes.
 */
export class AttackEffect {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Play a melee weapon swing trail effect.
   * Draws an arc from the source toward the target direction.
   */
  playMeleeSwing(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    weaponType: WeaponType = 'melee'
  ): void {
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX)
    const radius = TILE_SIZE / 2 + 4
    const arcLength = Math.PI / 2

    const g = this.scene.add.graphics()
    g.setDepth(950)

    // Color depends on weapon type
    const color = weaponType === 'magic' ? 0x8844ff : 0xcccccc

    g.lineStyle(3, color, 0.8)
    g.beginPath()
    g.arc(sourceX, sourceY, radius, angle - arcLength / 2, angle + arcLength / 2, false)
    g.strokePath()

    // Fade out
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      onComplete: () => g.destroy(),
    })
  }

  /**
   * Play an impact flash at the target position.
   */
  playImpact(x: number, y: number, hit: boolean = true): void {
    const color = hit ? 0xffffff : 0x666666
    const flash = this.scene.add.circle(x, y, 6, color, 0.8)
    flash.setDepth(960)

    this.scene.tweens.add({
      targets: flash,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    })
  }

  /**
   * Play hit sparks at the target position.
   */
  playHitSparks(x: number, y: number, color: number = 0xffaa00): void {
    const count = 5
    for (let i = 0; i < count; i++) {
      const spark = this.scene.add.circle(x, y, 2, color, 0.9)
      spark.setDepth(960)

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const dist = 15 + Math.random() * 20

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      })
    }
  }
}
