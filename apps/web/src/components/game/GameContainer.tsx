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
  const initializedRef = useRef(false)
  const phase = useGameStore((s) => s.gameState?.phase)

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    // Ensure container has an id for Phaser parent
    const container = containerRef.current
    if (!container.id) {
      container.id = 'game-container'
    }

    // Register combat scene before init
    gameManager.getGame() // Will be null before init

    // We use a workaround: init creates the game, then we register scenes
    gameManager.init(container.id)

    // Register the combat scene
    const game = gameManager.getGame()
    if (game) {
      game.scene.add('combat', CombatScene, false)
    }

    return () => {
      gameManager.destroy()
      initializedRef.current = false
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
