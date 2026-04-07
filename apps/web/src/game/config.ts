import Phaser from 'phaser'

/**
 * Phaser game configuration for the D&D game.
 *
 * The scene list is populated dynamically by the GameManager
 * so we can control scene lifecycle from React.
 */
export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
    parent,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [], // Scenes are added dynamically
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }
}
