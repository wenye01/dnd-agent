/**
 * MiniMap - A small overlay showing the player's position on the current map.
 * Rendered as a fixed HUD element on the Phaser canvas.
 */
import Phaser from 'phaser'
import { TILE_SIZE } from '../../constants'

const MINI_MAP_SCALE = 4 // Each map tile = 4px on minimap
const MINI_MAP_PADDING = 8
const MINI_MAP_BORDER = 1

export class MiniMap {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private background: Phaser.GameObjects.Rectangle
  private mapImage: Phaser.GameObjects.RenderTexture | null = null
  private playerDot: Phaser.GameObjects.Arc
  private mapWidth: number
  private mapHeight: number

  constructor(scene: Phaser.Scene, mapWidth: number, mapHeight: number) {
    this.scene = scene
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight

    const cam = scene.cameras.main
    const mmWidth = mapWidth * MINI_MAP_SCALE + MINI_MAP_BORDER * 2
    const mmHeight = mapHeight * MINI_MAP_SCALE + MINI_MAP_BORDER * 2

    // Container positioned at bottom-right of camera
    this.container = scene.add.container(
      cam.scrollX + cam.width - mmWidth - MINI_MAP_PADDING,
      cam.scrollY + cam.height - mmHeight - MINI_MAP_PADDING
    )
    this.container.setDepth(10000)
    this.container.setScrollFactor(0)

    // Background
    this.background = scene.add.rectangle(
      mmWidth / 2,
      mmHeight / 2,
      mmWidth,
      mmHeight,
      0x0a0a1a,
      0.85
    )
    this.background.setStrokeStyle(MINI_MAP_BORDER, 0xD4A843, 0.4)
    this.container.add(this.background)

    // Player dot (initially at center, will be updated)
    this.playerDot = scene.add.circle(0, 0, 3, 0x4488ff, 0.9)
    this.playerDot.setStrokeStyle(1, 0x88bbff, 0.6)
    this.container.add(this.playerDot)
  }

  /** Render the map tiles onto the minimap */
  renderTiles(tiles: number[][]): void {
    if (this.mapImage) {
      this.mapImage.destroy()
    }

    const mmWidth = this.mapWidth * MINI_MAP_SCALE
    const mmHeight = this.mapHeight * MINI_MAP_SCALE

    this.mapImage = this.scene.add.renderTexture(
      MINI_MAP_BORDER + mmWidth / 2,
      MINI_MAP_BORDER + mmHeight / 2,
      mmWidth,
      mmHeight
    )

    const tileColors: Record<number, number> = {
      0: 0x2a2844, // floor
      1: 0x444466, // wall
      2: 0x1a3a5c, // water
      3: 0x8B6914, // door
      4: 0x252337, // path
      5: 0x1a2e1a, // grass
    }

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = tiles[y]?.[x] ?? 0
        const color = tileColors[tileType] ?? 0x2a2844

        const rect = this.scene.add.rectangle(
          x * MINI_MAP_SCALE + MINI_MAP_SCALE / 2,
          y * MINI_MAP_SCALE + MINI_MAP_SCALE / 2,
          MINI_MAP_SCALE,
          MINI_MAP_SCALE,
          color,
          1
        )
        this.mapImage.draw(rect)
        rect.destroy()
      }
    }

    // Re-add player dot on top
    this.container.remove(this.playerDot)
    this.container.add(this.mapImage)
    this.container.add(this.playerDot)
  }

  /** Update player position on the minimap */
  updatePlayerPosition(worldX: number, worldY: number): void {
    const gridX = Math.floor(worldX / TILE_SIZE)
    const gridY = Math.floor(worldY / TILE_SIZE)

    this.playerDot.setPosition(
      MINI_MAP_BORDER + gridX * MINI_MAP_SCALE + MINI_MAP_SCALE / 2,
      MINI_MAP_BORDER + gridY * MINI_MAP_SCALE + MINI_MAP_SCALE / 2
    )
  }

  destroy(): void {
    this.container.destroy()
  }
}
