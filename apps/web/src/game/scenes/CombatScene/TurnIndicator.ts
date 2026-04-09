/**
 * Turn indicator: shows a pulsing golden ring around the currently active unit.
 */
import Phaser from 'phaser'
import { COLORS, ANIMATIONS } from '../../constants'

export class TurnIndicator {
  private scene: Phaser.Scene
  private ring: Phaser.GameObjects.Graphics | null = null
  private pulseTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /** Set the active unit by world position. Shows a pulsing golden ring. */
  setActive(worldX: number, worldY: number): void {
    this.clear()

    this.ring = this.scene.add.graphics()
    this.ring.setDepth(20)
    this.ring.lineStyle(3, COLORS.TURN_RING, COLORS.TURN_RING_ALPHA)
    this.ring.strokeCircle(0, 0, 30)
    this.ring.setPosition(worldX, worldY)

    this.pulseTween = this.scene.tweens.add({
      targets: this.ring,
      alpha: 0.3,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: ANIMATIONS.TURN_RING_PULSE,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  /** Clear the turn indicator. */
  clear(): void {
    // NOTE(P1-6): Uses tween.stop() (async: marks PENDING_REMOVE, cleaned next frame)
    //   rather than scene.tweens.killTweensOf(ring) (sync: immediate destroy).
    //   Safe because Phaser's Tween.update() short-circuits on PENDING_REMOVE state,
    //   so yoyo callbacks never fire on a destroyed ring.
    //   TargetHighlight.clear() uses killTweensOf for consistency — consider unifying here.
    if (this.pulseTween) {
      this.pulseTween.stop()
      this.pulseTween = null
    }
    if (this.ring) {
      this.ring.destroy()
      this.ring = null
    }
  }

  destroy(): void {
    this.clear()
  }
}
