/**
 * Entity name label rendered as Phaser Text.
 */
import Phaser from 'phaser'

export class NameLabel extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, name: string, color = '#ffffff') {
    super(scene, 0, 0, name, {
      fontSize: '10px',
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    })
    this.setOrigin(0.5, 1)
  }

  setName(name: string): void {
    this.setText(name)
  }
}
