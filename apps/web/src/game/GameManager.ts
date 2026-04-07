import Phaser from 'phaser'
import { gameConfig } from './config'
import { CombatScene } from './scenes/CombatScene'

export type SceneType = 'combat'

/**
 * GameManager - Singleton that manages the Phaser Game instance.
 *
 * Handles initialization, scene switching, and cleanup.
 * The React layer calls init() when the container mounts and
 * destroy() on unmount.
 */
class GameManager {
  private game: Phaser.Game | null = null
  private currentScene: SceneType | null = null

  /**
   * Initialize the Phaser game in the given DOM parent element.
   */
  init(parent: string): void {
    if (this.game) {
      this.game.destroy(true)
    }

    const config = gameConfig(parent)
    this.game = new Phaser.Game(config)

    // Register the combat scene
    this.game.scene.add('combat', CombatScene, false)
  }

  /**
   * Switch to a scene, optionally passing init data.
   */
  switchScene(scene: SceneType, data?: Record<string, unknown>): void {
    if (!this.game) return

    if (this.currentScene) {
      this.game.scene.stop(this.currentScene)
    }

    this.currentScene = scene
    this.game.scene.start(scene, data)
  }

  /**
   * Get the current active Phaser Scene.
   */
  getCurrentScene(): Phaser.Scene | null {
    if (!this.game || !this.currentScene) return null
    return this.game.scene.getScene(this.currentScene)
  }

  /**
   * Destroy the Phaser game instance and clean up.
   */
  destroy(): void {
    if (this.game) {
      this.game.destroy(true)
      this.game = null
    }
    this.currentScene = null
  }

  /** Whether the game has been initialized. */
  get isReady(): boolean {
    return this.game !== null
  }
}

/** Singleton game manager instance. */
export const gameManager = new GameManager()
