import { useGameMessages } from '../hooks/useGameMessages'
import { useUIStore } from '../stores/uiStore'
import { ChatPanel } from '../components/chat'
import { CharacterPanel } from '../components/panels'
import { MainLayout } from '../components/layout'
import { ConnectionStatus } from '../components/ui'

function GamePage() {
  // Set up message processing
  useGameMessages()

  // UI state for panel toggles
  const { isPanelOpen, togglePanel } = useUIStore()

  return (
    <MainLayout
      header={
        <div className="flex items-center justify-between w-full">
          <h1 className="font-display text-xl font-bold text-ink">Dungeons & Dragons</h1>
          <ConnectionStatus />
        </div>
      }
      leftPanel={<div className="p-4"><CharacterPanel /></div>}
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
  )
}

export default GamePage
