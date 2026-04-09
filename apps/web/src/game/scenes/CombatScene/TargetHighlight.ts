/**
 * Target highlight: shows attack range as red overlay, with pulsing
 * rings on valid target entities.
 */
import Phaser from 'phaser'
import { TILE_SIZE, COLORS, ANIMATIONS, DEPTH, TARGET_RING_LINE_WIDTH, TARGET_RING_RADIUS, TARGET_PULSE_MIN_ALPHA } from '../../constants'
import type { GridPosition } from '../../utils/CoordinateUtils'
import { gridToWorld } from '../../utils/CoordinateUtils'

export class TargetHighlight {
  private scene: Phaser.Scene
  private rangeGraphics: Phaser.GameObjects.Graphics
  private targetRings: Phaser.GameObjects.Graphics[] = []
  private rangeCells: GridPosition[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.rangeGraphics = scene.add.graphics()
    this.rangeGraphics.setDepth(DEPTH.ATTACK_RANGE)
  }

  /** Show attack range overlay and pulsing rings on target positions. */
  show(rangeCells: GridPosition[], targetPositions: GridPosition[]): void {
    this.clear()
    this.rangeCells = rangeCells

    // Draw range overlay
    this.rangeGraphics.fillStyle(COLORS.ATTACK_RANGE, COLORS.ATTACK_RANGE_ALPHA)
    for (const cell of rangeCells) {
      this.rangeGraphics.fillRect(
        cell.x * TILE_SIZE,
        cell.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      )
    }

    // Draw pulsing target rings
    for (const pos of targetPositions) {
      const worldPos = gridToWorld(pos.x, pos.y)
      const ring = this.scene.add.graphics()
      ring.setDepth(DEPTH.TARGET_RING)
      ring.lineStyle(TARGET_RING_LINE_WIDTH, COLORS.TARGET_HIGHLIGHT, COLORS.TARGET_HIGHLIGHT_ALPHA)
      ring.strokeCircle(0, 0, TARGET_RING_RADIUS)
      ring.setPosition(worldPos.x, worldPos.y)

      // Pulse animation
      this.scene.tweens.add({
        targets: ring,
        alpha: TARGET_PULSE_MIN_ALPHA,
        duration: ANIMATIONS.SELECTION_PULSE,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      })

      this.targetRings.push(ring)
    }
  }

  /** Check if a grid position is within the displayed attack range. */
  contains(pos: GridPosition): boolean {
    return this.rangeCells.some((c) => c.x === pos.x && c.y === pos.y)
  }

  /** Clear all overlays and rings. */
  clear(): void {
    this.rangeGraphics.clear()
    this.rangeCells = []
    for (const ring of this.targetRings) {
      this.scene.tweens.killTweensOf(ring)
      ring.destroy()
    }
    this.targetRings = []
  }

  destroy(): void {
    this.clear()
    this.rangeGraphics.destroy()
  }
}
