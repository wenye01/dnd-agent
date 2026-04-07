/**
 * Phaser game configuration.
 */
import Phaser from 'phaser'
import { COLORS, GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from './constants'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GRID_WIDTH * TILE_SIZE,
  height: GRID_HEIGHT * TILE_SIZE,
  backgroundColor: COLORS.GRID_BG,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [], // Scenes added dynamically by GameManager
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}
