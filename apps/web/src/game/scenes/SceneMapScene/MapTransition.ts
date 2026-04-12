/**
 * MapTransition - Fade-to-black transition effect for map switching.
 */
import Phaser from 'phaser'

export class MapTransition {
  private scene: Phaser.Scene
  private overlay: Phaser.GameObjects.Rectangle | null = null
  private onComplete: () => void
  private _active = false

  constructor(scene: Phaser.Scene, onComplete: () => void) {
    this.scene = scene
    this.onComplete = onComplete
  }

  /** Start the transition (fade out -> callback -> fade in) */
  start(): void {
    if (this._active) return
    this._active = true

    const camera = this.scene.cameras.main
    const width = camera.width
    const height = camera.height

    // Create overlay
    this.overlay = this.scene.add.rectangle(
      camera.scrollX + width / 2,
      camera.scrollY + height / 2,
      width,
      height,
      0x000000,
      0
    )
    this.overlay.setDepth(9999)
    this.overlay.setScrollFactor(0)

    // Fade out (darken)
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Execute the map change
        this.onComplete()

        // Fade in (reveal)
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: 0,
          duration: 400,
          ease: 'Sine.easeInOut',
          delay: 100,
          onComplete: () => {
            this.destroy()
          },
        })
      },
    })
  }

  isActive(): boolean {
    return this._active
  }

  private destroy(): void {
    this._active = false
    if (this.overlay) {
      this.overlay.destroy()
      this.overlay = null
    }
  }
}
