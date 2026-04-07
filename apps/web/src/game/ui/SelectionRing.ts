/**
 * Selection ring with pulsing animation, drawn via Graphics API.
 */
import Phaser from 'phaser'
import { TILE_SIZE, COLORS, ANIMATIONS } from '../constants'

export class SelectionRing extends Phaser.GameObjects.Graphics {
  private pulseTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene) {
    super(scene)
    this.drawRing()
    this.setAlpha(0)
  }

  /** Show the ring and start pulsing. */
  show(): void {
    this.setAlpha(COLORS.SELECTION_RING_ALPHA)
    this.startPulse()
  }

  /** Hide the ring and stop pulsing. */
  hide(): void {
    this.stopPulse()
    this.setAlpha(0)
  }

  private drawRing(): void {
    this.clear()
    this.lineStyle(2.5, COLORS.SELECTION_RING, 1)
    this.strokeCircle(0, 0, TILE_SIZE / 2 - 2)
  }

  private startPulse(): void {
    this.stopPulse()
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      duration: ANIMATIONS.SELECTION_PULSE,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  private stopPulse(): void {
    if (this.pulseTween) {
      this.pulseTween.stop()
      this.pulseTween = null
    }
  }

  destroy(): void {
    this.stopPulse()
    super.destroy()
  }
}
