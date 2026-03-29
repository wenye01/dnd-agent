import { useState } from 'react'
import { useGameMessages } from '../hooks/useGameMessages'
import { useUIStore } from '../stores/uiStore'
import { ChatPanel } from '../components/chat'
import { CharacterPanel, QuickActions } from '../components/panels'
import { MainLayout } from '../components/layout'
import { ConnectionStatus } from '../components/ui'
import { Button } from '../components/ui'
import { CharacterCreationDialog } from '../components/character/CharacterCreationDialog'

function GamePage() {
  // Set up message processing
  useGameMessages()

  // UI state for panel toggles
  const { isPanelOpen, togglePanel } = useUIStore()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)

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
