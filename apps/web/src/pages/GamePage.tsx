import { useState, useEffect } from 'react'
import { useGameMessages } from '../hooks/useGameMessages'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { ChatPanel } from '../components/chat'
import { CharacterPanel, QuickActions } from '../components/panels'
import { MainLayout } from '../components/layout'
import { ConnectionStatus } from '../components/ui'
import { Button } from '../components/ui'
import { CharacterCreationDialog } from '../components/character/CharacterCreationDialog'

function GamePage() {
  // Set up message processing
  useGameMessages()

  // Initialize session on mount
  const initSession = useGameStore((s) => s.initSession)
  const isLoading = useGameStore((s) => s.isLoading)
  const error = useGameStore((s) => s.error)

  useEffect(() => {
    initSession()
  }, [initSession])

  // UI state for panel toggles
  const { isPanelOpen, togglePanel } = useUIStore()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-parchment">
        <p className="text-ink/60 text-sm">Initializing game session...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-parchment">
        <div className="text-center">
          <p className="text-red-600 text-sm">Failed to initialize session: {error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => initSession()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <MainLayout
        header={
          <div className="flex items-center justify-between w-full">
            <h1 className="font-display text-xl font-bold text-ink">Dungeons & Dragons</h1>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowCharacterCreation(true)}>
                Create Character
              </Button>
              <ConnectionStatus />
            </div>
          </div>
        }
        leftPanel={
          <div className="flex flex-col h-full">
            <div className="p-4"><CharacterPanel /></div>
            <div className="flex-1" />
            <QuickActions />
          </div>
        }
        mainContent={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-ink/40 text-sm">Game Canvas</p>
              <p className="text-ink/30 text-xs mt-1">(Phaser integration coming soon)</p>
            </div>
          </div>
        }
        rightPanel={<ChatPanel />}
        isLeftPanelOpen={isPanelOpen}
        onToggleLeftPanel={togglePanel}
        leftPanelWidth="w-80"
        rightPanelWidth="w-96"
      />

      <CharacterCreationDialog
        isOpen={showCharacterCreation}
        onClose={() => setShowCharacterCreation(false)}
      />
    </>
  )
}

export default GamePage
