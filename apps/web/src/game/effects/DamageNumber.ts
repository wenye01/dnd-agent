/**
 * Floating damage number effect.
 * Red for damage, green for heal, gray for miss, gold for crit.
 */
import Phaser from 'phaser'
import { COLORS, ANIMATIONS, DEPTH, DAMAGE_Y_OFFSET, DAMAGE_FLOAT_DISTANCE, DAMAGE_CRIT_INITIAL_SCALE, DAMAGE_CRIT_MAX_SCALE, DAMAGE_FONT_SIZES } from '../constants'

export class DamageNumber {
  /**
   * Show a floating damage/heal/miss number at the given world position.
   */
  static show(
    scene: Phaser.Scene,
    worldX: number,
    worldY: number,
    value: number | string,
    type: 'damage' | 'heal' | 'miss' | 'crit' = 'damage',
  ): void {
    let text: string
    let color: string

    switch (type) {
      case 'heal':
        text = `+${value}`
        color = COLORS.HEAL_COLOR
        break
      case 'miss':
        text = 'Miss'
        color = COLORS.MISS_COLOR
        break
      case 'crit':
        text = `-${value}!`
        color = COLORS.CRIT_COLOR
        break
      default:
        text = `-${value}`
        color = COLORS.DAMAGE_COLOR
    }

    const fontSize = DAMAGE_FONT_SIZES[type] ?? DAMAGE_FONT_SIZES.damage

    const textObj = scene.add.text(worldX, worldY + DAMAGE_Y_OFFSET, text, {
      fontSize,
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    textObj.setOrigin(0.5)
    textObj.setDepth(DEPTH.DAMAGE_NUMBER)

    // Crit: extra scale punch
    if (type === 'crit') {
      textObj.setScale(DAMAGE_CRIT_INITIAL_SCALE)
      scene.tweens.add({
        targets: textObj,
        scaleX: DAMAGE_CRIT_MAX_SCALE,
        scaleY: DAMAGE_CRIT_MAX_SCALE,
        duration: 150,
        ease: 'Back.easeOut',
        onComplete: () => {
          scene.tweens.add({
            targets: textObj,
            scaleX: 1,
            scaleY: 1,
            duration: 100,
          })
        },
      })
    }

    // Float up and fade
    scene.tweens.add({
      targets: textObj,
      y: textObj.y + (-DAMAGE_FLOAT_DISTANCE),
      alpha: 0,
      duration: ANIMATIONS.DAMAGE_FLOAT,
      delay: type === 'crit' ? 200 : 0,
      ease: 'Sine.easeUp',
      onComplete: () => textObj.destroy(),
    })
  }
}
