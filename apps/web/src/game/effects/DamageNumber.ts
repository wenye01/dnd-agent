/**
 * Floating damage number effect.
 * Red for damage, green for heal, gray for miss, gold for crit.
 */
import Phaser from 'phaser'
import { COLORS, ANIMATIONS } from '../constants'

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

    const fontSize = type === 'crit' ? '28px' : type === 'miss' ? '18px' : '22px'

    const textObj = scene.add.text(worldX, worldY - 20, text, {
      fontSize,
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    textObj.setOrigin(0.5)
    textObj.setDepth(1000)

    // Crit: extra scale punch
    if (type === 'crit') {
      textObj.setScale(0.5)
      scene.tweens.add({
        targets: textObj,
        scaleX: 1.4,
        scaleY: 1.4,
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
      y: textObj.y - 40,
      alpha: 0,
      duration: ANIMATIONS.DAMAGE_FLOAT,
      delay: type === 'crit' ? 200 : 0,
      ease: 'Sine.easeUp',
      onComplete: () => textObj.destroy(),
    })
  }
}
