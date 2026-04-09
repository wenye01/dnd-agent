/**
 * Entity name label rendered as Phaser Text.
 */
import Phaser from 'phaser'
import { TEXT_STYLES } from '../constants'

export class NameLabel extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, name: string, color = '#ffffff') {
    super(scene, 0, 0, name, {
      ...TEXT_STYLES.NAME_LABEL,
      color,
    })
    this.setOrigin(0.5, 1)
  }

  setName(name: string): void {
    this.setText(name)
  }
}
