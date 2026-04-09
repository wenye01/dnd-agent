/**
 * Grid layer: draws grid lines and marks non-walkable areas.
 */
import Phaser from 'phaser'
import { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, COLORS, DEPTH } from '../../constants'

export class GridLayer {
  private graphics: Phaser.GameObjects.Graphics
  private obstacleGraphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(DEPTH.GRID)
    this.obstacleGraphics = scene.add.graphics()
    this.obstacleGraphics.setDepth(DEPTH.GRID)

    this.drawGrid()
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

  // TODO(P2-2): Wire up when backend sends wall/obstacle data.
  //   Note: @internal was used here incorrectly — @internal means "API not for external consumers"
  //   (filtered by API Extractor tools). The correct TSDoc tag for unimplemented work is @todo.
  drawObstacles(walls: boolean[][]): void {
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
