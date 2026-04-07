/**
 * Grid layer: draws grid lines and marks non-walkable areas.
 */
import Phaser from 'phaser'
import { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, COLORS } from '../../constants'

export class GridLayer {
  private graphics: Phaser.GameObjects.Graphics
  private obstacleGraphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, walls?: boolean[][]) {
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(0)
    this.obstacleGraphics = scene.add.graphics()
    this.obstacleGraphics.setDepth(0)

    this.drawGrid()
    if (walls) this.drawObstacles(walls)
  }

  private drawGrid(): void {
    this.graphics.lineStyle(1, COLORS.GRID_LINE, COLORS.GRID_LINE_ALPHA)

    const totalWidth = GRID_WIDTH * TILE_SIZE
    const totalHeight = GRID_HEIGHT * TILE_SIZE

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

  private drawObstacles(walls: boolean[][]): void {
    this.obstacleGraphics.fillStyle(COLORS.OBSTACLE_FILL, COLORS.OBSTACLE_ALPHA)

    for (let y = 0; y < walls.length; y++) {
      for (let x = 0; x < walls[y].length; x++) {
        if (walls[y][x]) {
          this.obstacleGraphics.fillRect(
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          )
        }
      }
    }
  }

  destroy(): void {
    this.graphics.destroy()
    this.obstacleGraphics.destroy()
  }
}
