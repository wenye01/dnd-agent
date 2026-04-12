import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameMessages } from '../hooks/useGameMessages'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useCombatStore } from '../stores/combatStore'
import { ChatPanel } from '../components/chat'
import { CharacterPanel, QuickActions, InventoryPanel, SpellbookPanel } from '../components/panels'
import { MainLayout } from '../components/layout'
import { ConnectionStatus } from '../components/ui'
import { Button } from '../components/ui'
import { CharacterCreationDialog } from '../components/character/CharacterCreationDialog'
import { GameContainer } from '../components/game/GameContainer'
import { IdlePortalBackground } from '../components/game/IdlePortalBackground'
import { CombatHUD } from '../components/combat/CombatHUD'

function GamePage() {
  // Set up message processing
  useGameMessages()

  const navigate = useNavigate()
  const sessionId = useGameStore((s) => s.gameState?.sessionId)
  const isLoading = useGameStore((s) => s.isLoading)
  const error = useGameStore((s) => s.error)
  const setError = useGameStore((s) => s.setError)

  // Session should already exist from HomePage. If not, redirect back.
  useEffect(() => {
    if (!sessionId && !isLoading) {
      navigate('/')
    }
  }, [sessionId, isLoading, navigate])

  // UI state for panel toggles
  const { isPanelOpen, togglePanel, activePanel, setActivePanel } = useUIStore()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const isCombatActive = useCombatStore((s) => s.isCombatActive)
  const phase = useGameStore((s) => s.gameState?.phase)

  // Render active left panel
  const renderLeftPanel = () => {
    switch (activePanel) {
      case 'inventory':
        return <InventoryPanel />
      case 'spells':
        return <SpellbookPanel />
      case 'character':
      default:
        return <CharacterPanel />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-abyss">
        <div className="text-center space-y-4 animate-fade-in">
          {/* Animated D20 loading spinner */}
          <div className="relative w-16 h-16 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-slow-spin" fill="none">
              <path
                d="M50 5 L90 30 L90 70 L50 95 L10 70 L10 30 Z"
                stroke="rgba(212, 168, 67, 0.3)"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-gold/40 rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-antique text-sm font-display tracking-wider uppercase">
            Entering the realm...
          </p>
          <p className="text-stone-text/50 text-xs italic">
            Gathering your party
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-abyss">
        <div className="text-center space-y-4 animate-slide-up max-w-sm">
          {/* Error icon */}
          <div className="w-14 h-14 mx-auto border border-blood/30 rounded-lg flex items-center justify-center bg-blood/5">
            <svg className="w-7 h-7 text-blood/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-blood text-sm font-display font-semibold">Portal Connection Failed</p>
          <p className="text-stone-text text-xs">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => { setError(null); navigate('/') }}>
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <MainLayout
        header={
          <div className="flex items-center justify-between w-full relative">
            {/* Subtle radial glow behind title area */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2 w-48 h-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(212,168,67,0.06) 0%, transparent 70%)' }} />

            {/* Left: Title with enhanced icon */}
            <div className="flex items-center gap-3 relative z-10">
              {/* D20 icon with strong glow and gentle float */}
              <div className="relative animate-gentle-float" style={{ filter: 'drop-shadow(0 0 12px rgba(212, 168, 67, 0.8)) drop-shadow(0 0 24px rgba(212, 168, 67, 0.35))' }}>
                <svg viewBox="0 0 100 100" className="w-10 h-10 text-gold" fill="none">
                  <path d="M50 5 L90 30 L90 70 L50 95 L10 70 L10 30 Z" stroke="currentColor" strokeWidth="3" fill="rgba(212,168,67,0.08)" />
                  <path d="M50 5 L50 95 M10 30 L90 70 M90 30 L10 70" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                  <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="24" fontFamily="'Cinzel', serif" fontWeight="700" opacity="0.8">20</text>
                </svg>
              </div>

              {/* Vertical divider */}
              <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212, 168, 67, 0.55), rgba(155, 109, 255, 0.35), transparent)' }} />

              <div>
                <h1 className="font-display text-[15px] font-bold text-gold tracking-[0.15em] uppercase leading-tight" style={{ textShadow: '0 0 24px rgba(212, 168, 67, 0.8), 0 0 48px rgba(212, 168, 67, 0.35), 0 1px 3px rgba(0,0,0,0.8)' }}>
                  Dungeons & Dragons
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(155, 109, 255, 0.6)', boxShadow: '0 0 4px rgba(155, 109, 255, 0.5)' }} />
                  <p className="text-[10px] font-display text-arcane tracking-[0.2em] uppercase" style={{ textShadow: '0 0 16px rgba(155, 109, 255, 0.7), 0 0 6px rgba(155, 109, 255, 0.4)' }}>
                    Dungeon Master AI
                  </p>
                  <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(155, 109, 255, 0.6)', boxShadow: '0 0 4px rgba(155, 109, 255, 0.5)' }} />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={() => setShowCharacterCreation(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md font-display text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, rgba(155, 109, 255, 0.3) 0%, rgba(155, 109, 255, 0.12) 50%, rgba(212, 168, 67, 0.08) 100%)',
                  border: '1.5px solid rgba(155, 109, 255, 0.6)',
                  color: 'rgba(225, 210, 255, 0.95)',
                  boxShadow: '0 0 20px rgba(155, 109, 255, 0.25), 0 0 6px rgba(155, 109, 255, 0.15), inset 0 0 14px rgba(155, 109, 255, 0.06)',
                  textShadow: '0 0 8px rgba(155, 109, 255, 0.45)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.5 6.5 0 0113 0v.109A12.344 12.344 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Create Character
              </button>
              <ConnectionStatus />
            </div>
          </div>
        }
        leftPanel={
          <div className="flex flex-col h-full relative">
            {/* Enhanced atmospheric overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 50% 20%, rgba(212,168,67,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(155,109,255,0.03) 0%, transparent 50%)',
            }} />
            {/* Panel tab switcher */}
            <div className="flex gap-1 px-3 pt-2 relative z-10">
              {(['character', 'inventory', 'spells'] as const).map((panel) => (
                <button
                  key={panel}
                  className={`
                    px-2.5 py-1 rounded text-[10px] font-display tracking-wider uppercase transition-all duration-200 cursor-pointer
                    ${activePanel === panel
                      ? 'bg-gold/15 text-gold border border-gold/25'
                      : 'text-stone-text/40 hover:text-parchment hover:bg-cave/40 border border-transparent'
                    }
                  `}
                  onClick={() => setActivePanel(panel)}
                >
                  {panel === 'character' ? '\u{1F464} Party' : panel === 'inventory' ? '\u{1F392} Items' : '\u{1F4D6} Spells'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 relative">
              {renderLeftPanel()}
            </div>
            <QuickActions />
          </div>
        }
        mainContent={
          phase === 'combat' && isCombatActive ? (
            <div className="relative w-full h-full overflow-hidden bg-dungeon">
              <GameContainer />
              <CombatHUD />
            </div>
          ) : (
            <IdlePortalBackground />
          )
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
