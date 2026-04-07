/**
 * Attack effect: melee weapon swing arc + ranged projectile trail + hit flash.
 */
import Phaser from 'phaser'
import { ANIMATIONS } from '../constants'

export class AttackEffect {
  /**
   * Play a melee swing arc from source toward target.
   */
  static meleeSwing(
    scene: Phaser.Scene,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    const graphics = scene.add.graphics()
    graphics.setDepth(500)

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const radius = 30
    const startAngle = angle - 0.8
    const endAngle = angle + 0.8

    let progress = 0
    const arcSteps = 6

    scene.time.addEvent({
      delay: 20,
      repeat: arcSteps,
      callback: () => {
        graphics.clear()
        progress++
        const currentAngle = startAngle + (endAngle - startAngle) * (progress / arcSteps)

        // Slash line
        const slashX = fromX + Math.cos(currentAngle) * radius
        const slashY = fromY + Math.sin(currentAngle) * radius

        graphics.lineStyle(3, 0xffffff, 0.8 - progress * 0.1)
        graphics.lineBetween(fromX, fromY, slashX, slashY)

        // Impact flash at end
        if (progress === arcSteps) {
          scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 100,
            onComplete: () => graphics.destroy(),
          })
        }
      },
    })
  }

  /**
   * Play a ranged projectile from source to target.
   */
  static projectile(
    scene: Phaser.Scene,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color = 0xffff88,
  ): void {
    const graphics = scene.add.graphics()
    graphics.setDepth(500)

    // Small projectile circle
    const dot = scene.add.circle(fromX, fromY, 4, color)
    dot.setDepth(500)

    const dx = toX - fromX
    const dy = toY - fromY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const duration = distance / ANIMATIONS.PROJECTILE_SPEED

    scene.tweens.add({
      targets: dot,
      x: toX,
      y: toY,
      duration,
      ease: 'Linear',
      onComplete: () => {
        // Hit flash
        AttackEffect.hitFlash(scene, toX, toY)
        dot.destroy()
        graphics.destroy()
      },
      onUpdate: () => {
        // Trail line
        graphics.clear()
        graphics.lineStyle(2, color, 0.4)
        graphics.lineBetween(fromX, fromY, dot.x, dot.y)
      },
    })
  }

  /**
   * Play a hit flash at a position.
   */
  static hitFlash(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): void {
    const flash = scene.add.circle(x, y, 16, 0xffffff, 0.8)
    flash.setDepth(500)

    scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    })
  }
}
