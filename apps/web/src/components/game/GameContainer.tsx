/**
 * GameContainer: React wrapper that mounts the Phaser canvas.
 * Switches scenes based on gameStore.phase.
 */
import { useEffect, useRef } from 'react'
import { gameManager } from '../../game/GameManager'
import { CombatScene } from '../../game/scenes/CombatScene'
import { useGameStore } from '../../stores/gameStore'

interface GameContainerProps {
  className?: string
}

export function GameContainer({ className }: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const phase = useGameStore((s) => s.gameState?.phase)

  useEffect(() => {
    if (!containerRef.current) return

    // Ensure container has an id for Phaser parent
    const container = containerRef.current
    if (!container.id) {
      container.id = 'game-container'
    }

    // Initialize or re-initialize Phaser game (handles HMR / remount gracefully)
    gameManager.init(container.id)

    // Register the combat scene
    const game = gameManager.getGame()
    if (game) {
      if (!game.scene.getScene('combat')) {
        game.scene.add('combat', CombatScene, false)
      }
    }

    initializedRef.current = true

    return () => {
      // Stop all running scenes before destroying (StrictMode safe)
      if (initializedRef.current && gameManager.getGame()) {
        const activeScene = gameManager.getScene()
        if (activeScene) {
          activeScene.scene.stop()
        }
      }
      gameManager.destroy()
    }
  }, [])

  useEffect(() => {
    if (!phase || !initializedRef.current) return

    switch (phase) {
      case 'combat':
        gameManager.switchScene('combat')
        break
      default:
        // For other phases, stop combat scene if running
        break
    }
  }, [phase])

  return (
    <div
      ref={containerRef}
      id="game-container"
      className={`w-full h-full ${className ?? ''}`}
      style={{ minHeight: '400px' }}
    />
  )
}
