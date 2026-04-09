/**
 * Attack effect: melee weapon swing arc + ranged projectile trail + hit flash.
 */
import Phaser from 'phaser'
import { ANIMATIONS, DEPTH, MELEE_SWING_RADIUS, MELEE_SWING_ARC, MELEE_SWING_STEPS, MELEE_SWING_DELAY, PROJECTILE_DOT_RADIUS, HIT_FLASH_RADIUS, HIT_FLASH_SCALE } from '../constants'

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
    graphics.setDepth(DEPTH.EFFECTS)

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const startAngle = angle - MELEE_SWING_ARC
    const endAngle = angle + MELEE_SWING_ARC

    let progress = 0

    scene.time.addEvent({
      delay: MELEE_SWING_DELAY,
      repeat: MELEE_SWING_STEPS,
      callback: () => {
        graphics.clear()
        progress++
        const currentAngle = startAngle + (endAngle - startAngle) * (progress / MELEE_SWING_STEPS)

        // Slash line
        const slashX = fromX + Math.cos(currentAngle) * MELEE_SWING_RADIUS
        const slashY = fromY + Math.sin(currentAngle) * MELEE_SWING_RADIUS

        graphics.lineStyle(3, 0xffffff, 0.8 - progress * 0.1)
        graphics.lineBetween(fromX, fromY, slashX, slashY)

        // Impact flash at end
        if (progress === MELEE_SWING_STEPS) {
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
    graphics.setDepth(DEPTH.EFFECTS)

    // Small projectile circle
    const dot = scene.add.circle(fromX, fromY, PROJECTILE_DOT_RADIUS, color)
    dot.setDepth(DEPTH.EFFECTS)

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
    const flash = scene.add.circle(x, y, HIT_FLASH_RADIUS, 0xffffff, 0.8)
    flash.setDepth(DEPTH.EFFECTS)

    scene.tweens.add({
      targets: flash,
      scaleX: HIT_FLASH_SCALE,
      scaleY: HIT_FLASH_SCALE,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    })
  }
}
