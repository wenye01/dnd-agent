import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { CharacterCreationDialog } from '../components/character/CharacterCreationDialog'
import { useGameStore } from '../stores/gameStore'

function HomePage() {
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const navigate = useNavigate()
  const initSession = useGameStore((s) => s.initSession)
  const isLoading = useGameStore((s) => s.isLoading)

  const handleStartAdventure = async () => {
    await initSession()
    navigate('/game')
  }

  const handleCreateCharacter = async () => {
    await initSession()
    setShowCharacterCreation(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-parchment">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold text-ink mb-4">
          Dungeons & Dragons
        </h1>
        <p className="text-lg text-ink/80 mb-8">
          AI-Powered Tabletop Adventure
        </p>
        <div className="flex flex-col gap-3 items-center">
          <Button variant="primary" size="lg" onClick={handleStartAdventure} disabled={isLoading}>
            {isLoading ? 'Initializing...' : 'Start Adventure'}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCreateCharacter}
          >
            Create Character
          </Button>
        </div>
      </div>

      <CharacterCreationDialog
        isOpen={showCharacterCreation}
        onClose={() => setShowCharacterCreation(false)}
      />
    </div>
  )
}

export default HomePage
