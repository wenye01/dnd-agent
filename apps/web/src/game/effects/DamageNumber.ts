import Phaser from 'phaser'
import type { DamageNumberType } from '../types/combat-scene'

/**
 * DamageNumber - Floating damage/heal/miss numbers.
 *
 * Shows a number above the target that floats upward and fades out.
 * Color and size depend on the type (damage=red, heal=green, critical=big bold, etc).
 */
export class DamageNumber {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Show a floating damage number.
   * @param x          - World x position (center of target)
   * @param y          - World y position (top of target)
   * @param amount     - The number to display
   * @param type       - What kind of number
   */
  show(x: number, y: number, amount: number, type: DamageNumberType): void {
    const config = this.getConfig(type)
    const text = this.formatText(amount, type)

    const label = this.scene.add.text(x, y - 24, text, {
      fontSize: config.fontSize,
      fontStyle: config.fontStyle,
      color: config.color,
      fontFamily: 'monospace',
      stroke: config.stroke,
      strokeThickness: config.strokeThickness,
    })
    label.setOrigin(0.5, 1)
    label.setDepth(1000)

    this.scene.tweens.add({
      targets: label,
      y: label.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private getConfig(type: DamageNumberType): {
    fontSize: string
    fontStyle: string
    color: string
    stroke: string
    strokeThickness: number
  } {
    switch (type) {
      case 'critical':
        return {
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#ff4444',
          stroke: '#000000',
          strokeThickness: 4,
        }
      case 'damage':
        return {
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ff4444',
          stroke: '#000000',
          strokeThickness: 2,
        }
      case 'heal':
        return {
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#44ff44',
          stroke: '#000000',
          strokeThickness: 2,
        }
      case 'immune':
        return {
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#888888',
          stroke: '#000000',
          strokeThickness: 1,
        }
      case 'miss':
        return {
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#aaaaaa',
          stroke: '#000000',
          strokeThickness: 1,
        }
    }
  }

  private formatText(amount: number, type: DamageNumberType): string {
    switch (type) {
      case 'damage':
      case 'critical':
        return `-${amount}`
      case 'heal':
        return `+${amount}`
      case 'immune':
        return 'IMMUNE'
      case 'miss':
        return 'MISS'
    }
  }
}
