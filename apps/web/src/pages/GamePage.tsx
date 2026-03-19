import { useGameMessages } from '../hooks/useGameMessages'
import { ChatPanel } from '../components/chat'
import { CharacterPanel } from '../components/panels'
import { ConnectionStatus } from '../components/ui'

function GamePage() {
  // Set up message processing
  useGameMessages()

  return (
    <div className="flex h-screen bg-parchment">
      {/* Left Sidebar - Character Panel */}
      <div className="w-80 bg-parchment border-r border-ink/10 overflow-y-auto">
        <div className="p-4">
          <CharacterPanel />
        </div>
      </div>

      {/* Center - Game Canvas Area (placeholder for Phaser) */}
      <div className="flex-1 bg-ink/5 flex flex-col">
        {/* Top bar with connection status */}
        <div className="h-14 border-b border-ink/10 flex items-center justify-between px-4 bg-white/50">
          <h1 className="font-display text-xl font-bold text-ink">Dungeons & Dragons</h1>
          <ConnectionStatus />
        </div>

        {/* Game canvas placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink/40 text-sm">Game Canvas</p>
            <p className="text-ink/30 text-xs mt-1">(Phaser integration coming soon)</p>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Chat Panel */}
      <div className="w-96 bg-parchment border-l border-ink/10">
        <ChatPanel />
      </div>
    </div>
  )
}

export default GamePage
