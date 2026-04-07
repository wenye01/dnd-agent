import Phaser from 'phaser'
import { TILE_SIZE, GridColors } from '../types/combat-scene'

/**
 * Grid - Renders the battle grid on the combat scene.
 *
 * Draws a configurable tile grid with dark fantasy themed colors.
 * Supports coordinate-to-pixel conversion for overlaying game objects.
 */
export class Grid {
  private graphics: Phaser.GameObjects.Graphics
  private scene: Phaser.Scene
  private gridWidth: number
  private gridHeight: number

  constructor(scene: Phaser.Scene, gridWidth: number, gridHeight: number) {
    this.scene = scene
    this.gridWidth = gridWidth
    this.gridHeight = gridHeight
    this.graphics = scene.add.graphics()
    this.draw()
  }

  /** Draw grid lines across the full camera area */
  private draw(): void {
    this.graphics.clear()
    this.graphics.lineStyle(1, GridColors.gridLine, GridColors.gridLineAlpha)

    const totalWidth = this.gridWidth * TILE_SIZE
    const totalHeight = this.gridHeight * TILE_SIZE

    // Vertical lines
    for (let x = 0; x <= totalWidth; x += TILE_SIZE) {
      this.graphics.moveTo(x, 0)
      this.graphics.lineTo(x, totalHeight)
    }

    // Horizontal lines
    for (let y = 0; y <= totalHeight; y += TILE_SIZE) {
      this.graphics.moveTo(0, y)
      this.graphics.lineTo(totalWidth, y)
    }

    this.graphics.strokePath()
  }

  /** Update grid dimensions (e.g. on map change) */
  resize(gridWidth: number, gridHeight: number): void {
    this.gridWidth = gridWidth
    this.gridHeight = gridHeight
    this.draw()
  }

  /** Clean up graphics resources */
  destroy(): void {
    this.graphics.destroy()
  }
}
