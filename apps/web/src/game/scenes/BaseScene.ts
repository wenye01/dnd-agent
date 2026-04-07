/**
 * Base scene class with lifecycle helpers, store subscription utilities,
 * and scene-switching convenience methods.
 */
import Phaser from 'phaser'
import { gameManager, type SceneType } from '../GameManager'

export abstract class BaseScene extends Phaser.Scene {
  private unsubscribers: Array<() => void> = []

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config)
  }

  /** Register an unsubscribe callback to be called on scene shutdown. */
  protected addUnsubscribe(fn: () => void): void {
    this.unsubscribers.push(fn)
  }

  /** Switch to another scene via GameManager. */
  protected switchToScene(sceneKey: SceneType, data?: Record<string, unknown>): void {
    gameManager.switchScene(sceneKey, data)
  }

  /** Called by Phaser when scene is shut down. Cleans up all subscriptions. */
  shutdown(): void {
    for (const fn of this.unsubscribers) {
      try {
        fn()
      } catch {
        // Ignore cleanup errors
      }
    }
    this.unsubscribers = []
  }
}
