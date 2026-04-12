/**
 * Singleton game manager: creates/destroys the Phaser.Game instance,
 * switches scenes, and provides access to the current scene.
 */
import Phaser from 'phaser'
import { gameConfig } from './config'
import { CombatScene } from './scenes/CombatScene'
import { SceneMapScene } from './scenes/SceneMapScene'

export type SceneType = 'combat' | 'exploring'

class GameManagerClass {
  private game: Phaser.Game | null = null
  private currentScene: SceneType | null = null

  /** Create and mount the Phaser game into the given DOM element id. */
  init(parentId: string): void {
    if (this.game) {
      this.game.destroy(true)
    }

    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      parent: parentId,
      scene: [CombatScene, SceneMapScene],
    }

    this.game = new Phaser.Game(config)
  }

  /** Register a scene class (must be called before init or before switching). */
  registerScene(scene: Phaser.Types.Scenes.SceneType): void {
    if (!this.game) return
    this.game.scene.add(
      (scene as Phaser.Types.Scenes.SceneType & { key: string }).key ?? 'unknown',
      scene,
    )
  }

  /** Switch to a named scene, optionally passing data. */
  switchScene(sceneKey: SceneType, data?: Record<string, unknown>): void {
    if (!this.game) return

    // Stop current scene
    if (this.currentScene) {
      this.game.scene.stop(this.currentScene)
    }

    this.currentScene = sceneKey

    // Start (or restart) the target scene
    if (this.game.scene.getScene(sceneKey)) {
      this.game.scene.start(sceneKey, data)
    } else {
      console.warn(`[GameManager] Scene "${sceneKey}" not registered.`)
    }
  }

  /** Get the Phaser.Scene instance for the given key, or the current scene. */
  getScene<T extends Phaser.Scene = Phaser.Scene>(key?: string): T | null {
    if (!this.game) return null
    const sceneKey = key ?? this.currentScene
    if (!sceneKey) return null
    return (this.game.scene.getScene(sceneKey) as T) ?? null
  }

  /** Get the raw Phaser.Game instance. */
  getGame(): Phaser.Game | null {
    return this.game
  }

  /** Destroy the Phaser game instance and clean up. */
  destroy(): void {
    if (this.game) {
      this.game.destroy(true)
      this.game = null
    }
    this.currentScene = null
  }
}

/** Singleton game manager. */
export const gameManager = new GameManagerClass()
