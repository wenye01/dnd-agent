/**
 * Move range display: BFS-calculated reachable cells shown as green overlay.
 */
import Phaser from 'phaser'
import { TILE_SIZE, COLORS } from '../../constants'
import type { GridPosition } from '../../utils/CoordinateUtils'

export class MoveRange {
  private graphics: Phaser.GameObjects.Graphics
  private cells: GridPosition[] = []

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(10)
  }

  /** Display the given set of reachable cells. */
  show(cells: GridPosition[]): void {
    this.cells = cells
    this.draw()
  }

  /** Clear the overlay. */
  clear(): void {
    this.cells = []
    this.graphics.clear()
  }

  /** Check if a grid cell is within the displayed move range. */
  contains(pos: GridPosition): boolean {
    return this.cells.some((c) => c.x === pos.x && c.y === pos.y)
  }

  private draw(): void {
    this.graphics.clear()
    this.graphics.fillStyle(COLORS.MOVE_RANGE, COLORS.MOVE_RANGE_ALPHA)

    for (const cell of this.cells) {
      this.graphics.fillRect(
        cell.x * TILE_SIZE,
        cell.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      )
    }
  }

  destroy(): void {
    this.graphics.destroy()
  }
}
