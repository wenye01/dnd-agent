import Phaser from 'phaser'
import { TILE_SIZE, GridColors } from '../types/combat-scene'
import type { GridPosition } from '../types/combat-scene'

/**
 * RangeHighlight - Renders movement/attack range overlays and target
 * selection highlights on the combat grid.
 */
export class RangeHighlight {
  private scene: Phaser.Scene
  private moveRangeGraphics: Phaser.GameObjects.Graphics
  private attackRangeGraphics: Phaser.GameObjects.Graphics
  private targetHighlights: Map<string, Phaser.GameObjects.Graphics> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.moveRangeGraphics = scene.add.graphics()
    this.attackRangeGraphics = scene.add.graphics()
  }

  /**
   * Show movement range highlight (green, Manhattan distance).
   * @param center - Grid position of the moving unit
   * @param speed  - Number of grid cells the unit can move
   */
  showMoveRange(center: GridPosition, speed: number): void {
    this.clearMoveRange()
    this.moveRangeGraphics.fillStyle(GridColors.moveRange, GridColors.moveRangeAlpha)

    for (let dx = -speed; dx <= speed; dx++) {
      for (let dy = -speed; dy <= speed; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= speed) {
          const gx = center.x + dx
          const gy = center.y + dy
          this.moveRangeGraphics.fillRect(
            gx * TILE_SIZE,
            gy * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          )
        }
      }
    }
  }

  /** Clear the movement range overlay */
  clearMoveRange(): void {
    this.moveRangeGraphics.clear()
  }

  /**
   * Show attack range highlight (red, Manhattan distance).
   * @param center - Grid position of the attacking unit
   * @param range  - Attack range in grid cells
   */
  showAttackRange(center: GridPosition, range: number): void {
    this.clearAttackRange()
    this.attackRangeGraphics.fillStyle(GridColors.attackRange, GridColors.attackRangeAlpha)

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= range) {
          const gx = center.x + dx
          const gy = center.y + dy
          this.attackRangeGraphics.fillRect(
            gx * TILE_SIZE,
            gy * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          )
        }
      }
    }
  }

  /** Clear the attack range overlay */
  clearAttackRange(): void {
    this.attackRangeGraphics.clear()
  }

  /**
   * Highlight a specific unit as a target (golden border).
   * @param unitId  - Unique key for this target
   * @param worldX  - World x of the target center
   * @param worldY  - World y of the target center
   */
  addTargetHighlight(unitId: string, worldX: number, worldY: number): void {
    this.removeTargetHighlight(unitId)

    const g = this.scene.add.graphics()
    g.lineStyle(3, GridColors.targetHighlight, GridColors.targetHighlightAlpha)
    g.strokeCircle(worldX, worldY, TILE_SIZE / 2 + 2)
    this.targetHighlights.set(unitId, g)

    // Pulse animation
    this.scene.tweens.add({
      targets: g,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /** Remove a target highlight */
  removeTargetHighlight(unitId: string): void {
    const existing = this.targetHighlights.get(unitId)
    if (existing) {
      this.scene.tweens.killTweensOf(existing)
      existing.destroy()
      this.targetHighlights.delete(unitId)
    }
  }

  /** Remove all target highlights */
  clearAllTargetHighlights(): void {
    for (const [id] of this.targetHighlights) {
      this.removeTargetHighlight(id)
    }
  }

  /** Clear all highlights */
  clearAll(): void {
    this.clearMoveRange()
    this.clearAttackRange()
    this.clearAllTargetHighlights()
  }

  /** Clean up resources */
  destroy(): void {
    this.clearAll()
    this.moveRangeGraphics.destroy()
    this.attackRangeGraphics.destroy()
  }
}
