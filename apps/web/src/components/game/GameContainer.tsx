import { useEffect, useRef } from 'react'
import { gameManager } from '../../game/GameManager'
import { useGameStore } from '../../stores/gameStore'
import type { ClientMessage } from '../../types'

/**
 * GameContainer - Mounts the Phaser game canvas and manages its lifecycle.
 *
 * Also listens for `dnd-combat-action` custom DOM events dispatched by
 * the CombatScene and forwards them via the gameStore/WebSocket layer.
 */
export function GameContainer({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const phase = useGameStore((s) => s.gameState?.phase)

  // Initialize Phaser once
  useEffect(() => {
    if (containerRef.current && !gameManager.isReady) {
      gameManager.init(containerRef.current.id)
    }
    return () => {
      gameManager.destroy()
    }
  }, [])

  // Switch scene based on game phase
  useEffect(() => {
    if (!phase || !gameManager.isReady) return

    switch (phase) {
      case 'combat':
        gameManager.switchScene('combat')
        break
      default:
        // For now, other phases do not render a game scene
        break
    }
  }, [phase])

  // Forward combat actions from the Phaser scene to the WebSocket.
  // The CombatScene dispatches 'dnd-combat-action' custom DOM events.
  // We pick them up here and send them through the proper React channel.
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ClientMessage>
      // The actual send is handled by the useGameMessages hook or similar.
      // We re-dispatch on a shared event bus that the hook listens to.
      window.dispatchEvent(
        new CustomEvent('dnd-ws-send', { detail: customEvent.detail })
      )
    }

    window.addEventListener('dnd-combat-action', handler)
    return () => window.removeEventListener('dnd-combat-action', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      id="game-container"
      className={`w-full h-full ${className ?? ''}`}
    />
  )
}
