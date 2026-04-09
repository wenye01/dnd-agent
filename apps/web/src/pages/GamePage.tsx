import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameMessages } from '../hooks/useGameMessages'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useCombatStore } from '../stores/combatStore'
import { ChatPanel } from '../components/chat'
import { CharacterPanel, QuickActions } from '../components/panels'
import { MainLayout } from '../components/layout'
import { ConnectionStatus } from '../components/ui'
import { Button } from '../components/ui'
import { CharacterCreationDialog } from '../components/character/CharacterCreationDialog'
import { GameContainer } from '../components/game/GameContainer'
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
  const { isPanelOpen, togglePanel } = useUIStore()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const isCombatActive = useCombatStore((s) => s.isCombatActive)
  const phase = useGameStore((s) => s.gameState?.phase)

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
            <div className="flex-1 overflow-y-auto p-3 relative">
              <CharacterPanel />
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
          <div className="flex items-center justify-center h-full relative overflow-hidden bg-dungeon">
            {/* Atmospheric background layers */}
            <div className="absolute inset-0 bg-vignette pointer-events-none" />
            <div className="absolute inset-0 bg-dungeon-wall opacity-40 pointer-events-none" />
            <div className="absolute inset-0 bg-map-grid opacity-60 pointer-events-none" />
            <div className="absolute inset-0 bg-fog pointer-events-none" />

            {/* Deep radial ambient glow - stronger */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(155,109,255,0.1) 0%, rgba(212,168,67,0.06) 25%, rgba(155,109,255,0.03) 45%, transparent 65%)' }} />
            </div>
            {/* Secondary warm glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.08) 0%, rgba(155,109,255,0.04) 40%, transparent 60%)' }} />
            </div>

            {/* Outermost ring - pulsing gold with tick marks */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[440px] h-[440px] rounded-full animate-slow-spin relative" style={{ border: '2px solid rgba(212, 168, 67, 0.35)', boxShadow: '0 0 60px rgba(212, 168, 67, 0.15), 0 0 120px rgba(212, 168, 67, 0.06), inset 0 0 40px rgba(212, 168, 67, 0.05)' }}>
                {/* Tick marks around outer ring */}
                {[...Array(36)].map((_, i) => (
                  <div key={i} className="absolute" style={{
                    top: '50%', left: '50%',
                    width: i % 3 === 0 ? '8px' : '4px', height: '1px',
                    background: i % 3 === 0 ? 'rgba(212, 168, 67, 0.5)' : 'rgba(212, 168, 67, 0.22)',
                    transform: `rotate(${i * 10}deg) translateY(-210px)`,
                    transformOrigin: '0 0',
                  }} />
                ))}
              </div>
            </div>

            {/* Middle ring - arcane with reverse spin */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[300px] h-[300px] rounded-full relative" style={{ border: '2px solid rgba(155, 109, 255, 0.4)', boxShadow: '0 0 60px rgba(155, 109, 255, 0.18), 0 0 120px rgba(155, 109, 255, 0.06), inset 0 0 30px rgba(155, 109, 255, 0.06)', animation: 'slow-spin 40s linear infinite reverse' }}>
                {/* Rune glyphs around middle ring */}
                {['★', '✶', '✧', '❁', '★', '✶', '✧', '❁'].map((glyph, i) => (
                  <div key={i} className="absolute animate-rune-pulse" style={{
                    top: '50%', left: '50%',
                    fontSize: '12px',
                    color: i % 2 === 0 ? 'rgba(155, 109, 255, 0.8)' : 'rgba(212, 168, 67, 0.7)',
                    textShadow: i % 2 === 0 ? '0 0 12px rgba(155, 109, 255, 0.6), 0 0 24px rgba(155, 109, 255, 0.25)' : '0 0 12px rgba(212, 168, 67, 0.5), 0 0 24px rgba(212, 168, 67, 0.2)',
                    transform: `rotate(${i * 45}deg) translateY(-140px) rotate(-${i * 45}deg)`,
                    animationDelay: `${i * 0.4}s`,
                  }}>{glyph}</div>
                ))}
                {/* Inner connecting arcs - 4 crescent shapes */}
                {[0, 90, 180, 270].map((deg, i) => (
                  <div key={`arc-${i}`} className="absolute" style={{
                    top: '50%', left: '50%',
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    border: '1px solid transparent',
                    borderTopColor: i % 2 === 0 ? 'rgba(155, 109, 255, 0.25)' : 'rgba(212, 168, 67, 0.2)',
                    transform: `rotate(${deg}deg) translateY(-80px)`,
                    boxShadow: i % 2 === 0 ? '0 0 10px rgba(155, 109, 255, 0.15)' : '0 0 10px rgba(212, 168, 67, 0.12)',
                  }} />
                ))}
              </div>
            </div>

            {/* Inner ring - breathing gold */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[160px] h-[160px] rounded-full" style={{ border: '1.5px solid rgba(212, 168, 67, 0.25)', boxShadow: '0 0 35px rgba(212, 168, 67, 0.1), inset 0 0 15px rgba(212, 168, 67, 0.03)', animation: 'emblem-pulse 4s ease-in-out infinite' }} />
            </div>

            {/* Cardinal diamond markers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[420px] h-[420px]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-rune-pulse" style={{ animationDelay: '0s' }}>
                  <div className="w-4 h-4 rotate-45" style={{ background: 'rgba(212, 168, 67, 0.55)', boxShadow: '0 0 15px rgba(212, 168, 67, 0.5), 0 0 30px rgba(212, 168, 67, 0.2)' }} />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 animate-rune-pulse" style={{ animationDelay: '1.5s' }}>
                  <div className="w-4 h-4 rotate-45" style={{ background: 'rgba(212, 168, 67, 0.55)', boxShadow: '0 0 15px rgba(212, 168, 67, 0.5), 0 0 30px rgba(212, 168, 67, 0.2)' }} />
                </div>
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 animate-rune-pulse" style={{ animationDelay: '0.75s' }}>
                  <div className="w-4 h-4 rotate-45" style={{ background: 'rgba(155, 109, 255, 0.55)', boxShadow: '0 0 15px rgba(155, 109, 255, 0.5), 0 0 30px rgba(155, 109, 255, 0.2)' }} />
                </div>
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-rune-pulse" style={{ animationDelay: '2.25s' }}>
                  <div className="w-4 h-4 rotate-45" style={{ background: 'rgba(155, 109, 255, 0.55)', boxShadow: '0 0 15px rgba(155, 109, 255, 0.5), 0 0 30px rgba(155, 109, 255, 0.2)' }} />
                </div>
              </div>
            </div>

            {/* Floating ambient particles - enhanced brightness */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${2 + (i * 4.2)}%`,
                    bottom: '0',
                    width: `${1.5 + (i % 3)}px`,
                    height: `${1.5 + (i % 3)}px`,
                    background: i % 4 === 0 ? 'rgba(212, 168, 67, 0.8)' : i % 4 === 1 ? 'rgba(155, 109, 255, 0.65)' : i % 4 === 2 ? 'rgba(232, 197, 109, 0.6)' : 'rgba(180, 160, 255, 0.55)',
                    boxShadow: `0 0 ${8 + (i % 3) * 4}px ${i % 4 === 0 ? 'rgba(212, 168, 67, 0.5)' : i % 4 === 1 ? 'rgba(155, 109, 255, 0.4)' : i % 4 === 2 ? 'rgba(232, 197, 109, 0.35)' : 'rgba(180, 160, 255, 0.3)'}`,
                    animationName: 'float-ember',
                    animationDuration: `${10 + i * 1.8}s`,
                    animationDelay: `${i * 0.7}s`,
                    animationTimingFunction: 'ease-out',
                    animationIterationCount: 'infinite',
                  }}
                />
              ))}
            </div>

            {/* Center portal content */}
            <div className="text-center relative z-10 animate-fade-in">
              {/* Portal icon with dramatic glow */}
              <div className="relative mx-auto mb-6">
                {/* Multi-layered pulsing glow */}
                <div className="absolute inset-0 scale-[3] rounded-full" style={{
                  background: 'radial-gradient(circle, rgba(155,109,255,0.12) 0%, rgba(212,168,67,0.05) 30%, transparent 55%)',
                  animation: 'portal-pulse 4s ease-in-out infinite',
                }} />
                <div className="absolute inset-0 scale-[1.8] rounded-full" style={{
                  background: 'radial-gradient(circle, rgba(212,168,67,0.08) 0%, transparent 50%)',
                  animation: 'portal-pulse 3s ease-in-out infinite 1s',
                }} />
                {/* Portal container */}
                <div className="relative w-40 h-40 mx-auto rounded-xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, rgba(15, 14, 26, 0.95) 0%, rgba(22, 20, 38, 0.92) 100%)',
                  border: '2px solid rgba(212, 168, 67, 0.65)',
                  boxShadow: '0 0 60px rgba(212, 168, 67, 0.4), 0 0 120px rgba(155, 109, 255, 0.15), inset 0 0 25px rgba(0,0,0,0.6), inset 0 0 50px rgba(155, 109, 255, 0.06)',
                }}>
                  {/* Inner decorative border */}
                  <div className="absolute inset-2.5 rounded-lg" style={{ border: '1px solid rgba(212, 168, 67, 0.35)' }} />
                  {/* Rotating inner D20 */}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'slow-spin 60s linear infinite' }}>
                    <svg viewBox="0 0 100 100" className="w-20 h-20" fill="none" style={{ opacity: 0.15 }}>
                      <path d="M50 8 L88 28 L88 72 L50 92 L12 72 L12 28 Z" stroke="rgba(212,168,67,1)" strokeWidth="1" />
                      <path d="M50 8 L88 28 M50 8 L12 28 M88 28 L88 72 M12 28 L12 72 M50 92 L88 72 M50 92 L12 72 M50 8 L50 92 M12 28 L88 72 M88 28 L12 72" stroke="rgba(212,168,67,0.6)" strokeWidth="0.5" />
                    </svg>
                  </div>
                  {/* Map SVG icon */}
                  <svg className="w-16 h-16 text-gold/70 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8} style={{ filter: 'drop-shadow(0 0 16px rgba(212, 168, 67, 0.6))' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  {/* Corner accents on portal box */}
                  <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: 'rgba(212, 168, 67, 0.55)' }} />
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: 'rgba(212, 168, 67, 0.55)' }} />
                  <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: 'rgba(212, 168, 67, 0.55)' }} />
                  <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: 'rgba(212, 168, 67, 0.55)' }} />
                </div>
              </div>
              <div className="space-y-4">
                {/* Title with stronger glow */}
                <p className="text-parchment text-lg font-display font-bold tracking-[0.25em] uppercase" style={{ textShadow: '0 0 20px rgba(212, 168, 67, 0.7), 0 0 40px rgba(212, 168, 67, 0.3), 0 0 8px rgba(155,109,255,0.2), 0 1px 3px rgba(0,0,0,0.8)' }}>
                  Arcane Map Portal
                </p>
                {/* Ornamental divider */}
                <div className="flex items-center gap-2 px-8">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(212,168,67,0.5), rgba(155,109,255,0.35), transparent)' }} />
                  <span className="text-gold/50 text-[10px]">&#9670;</span>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(155,109,255,0.35), rgba(212,168,67,0.5), transparent)' }} />
                </div>
                <p className="text-antique/70 text-[13px] italic font-body leading-relaxed px-10" style={{ textShadow: '0 0 8px rgba(196, 181, 154, 0.2)' }}>
                  The battle map will materialize here as your adventure unfolds
                </p>
                {/* Version indicator with subtle glow */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse" style={{ boxShadow: '0 0 6px rgba(212,168,67,0.4)' }} />
                  <span className="text-stone-text/60 text-[10px] font-mono tracking-wider">
                    v0.3 &middot; Map Engine
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-arcane/40 animate-pulse" style={{ animationDelay: '1s', boxShadow: '0 0 6px rgba(155,109,255,0.4)' }} />
                </div>
              </div>
            </div>
          </div>
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
