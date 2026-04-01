import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { CharacterCreationDialog } from '../components/character/CharacterCreationDialog'
import { useGameStore } from '../stores/gameStore'

function D20Icon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* D20 icosahedron shape */}
      <path
        d="M50 5 L90 30 L90 70 L50 95 L10 70 L10 30 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M50 5 L50 50 L90 30 M50 50 L90 70 M50 50 L10 70 M50 50 L10 30 M50 50 L50 95"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.4"
      />
      {/* Center number */}
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize="22"
        fontFamily="'Cinzel', serif"
        fontWeight="700"
      >
        20
      </text>
    </svg>
  )
}

function SwordCrossDecorator({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 40" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left sword */}
      <path
        d="M10 20 L70 20 M40 5 L40 35 M60 10 L40 20 L60 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Center diamond */}
      <path
        d="M100 10 L110 20 L100 30 L90 20 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Right sword */}
      <path
        d="M130 20 L190 20 M160 5 L160 35 M140 10 L160 20 L140 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 overflow-hidden bg-abyss">
      {/* Deep radial gradient background for depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(155, 109, 255, 0.06) 0%, rgba(212, 168, 67, 0.04) 30%, transparent 70%)'
      }} />
      <div className="absolute inset-0 bg-vignette pointer-events-none" />
      <div className="absolute inset-0 bg-noise pointer-events-none" />
      <div className="absolute inset-0 bg-fog pointer-events-none" />

      {/* Large decorative runic circle behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full animate-slow-spin" style={{
          border: '2px solid rgba(212, 168, 67, 0.35)',
          boxShadow: '0 0 80px rgba(212, 168, 67, 0.2), 0 0 120px rgba(212, 168, 67, 0.08), inset 0 0 80px rgba(212, 168, 67, 0.08)'
        }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{
          border: '1.5px solid rgba(155, 109, 255, 0.3)',
          boxShadow: '0 0 60px rgba(155, 109, 255, 0.15), 0 0 100px rgba(155, 109, 255, 0.06)',
          animation: 'slow-spin 50s linear infinite reverse'
        }} />
        <div className="absolute w-[380px] h-[380px] rounded-full" style={{
          border: '1.5px solid rgba(212, 168, 67, 0.25)',
          boxShadow: '0 0 40px rgba(212, 168, 67, 0.12)',
          animation: 'slow-spin 35s linear infinite'
        }} />
        <div className="absolute w-[260px] h-[260px] rounded-full" style={{
          border: '1px solid rgba(155, 109, 255, 0.2)',
          boxShadow: '0 0 30px rgba(155, 109, 255, 0.1)',
          animation: 'slow-spin 25s linear infinite reverse'
        }} />
      </div>

      {/* Floating ember particles - denser, brighter, with purple */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(28)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${2 + (i * 4.5)}%`,
              bottom: `${5 + (i % 7) * 12}%`,
              width: `${3 + (i % 5)}px`,
              height: `${3 + (i % 5)}px`,
              background: i % 5 === 0
                ? 'rgba(212, 168, 67, 1)'
                : i % 5 === 1
                  ? 'rgba(155, 109, 255, 0.9)'
                  : i % 5 === 2
                    ? 'rgba(232, 197, 109, 0.9)'
                    : i % 5 === 3
                      ? 'rgba(249, 115, 22, 0.85)'
                      : 'rgba(212, 168, 67, 0.95)',
              boxShadow: `0 0 ${14 + (i % 4) * 6}px ${
                i % 5 === 0 ? 'rgba(212, 168, 67, 0.7)'
                : i % 5 === 1 ? 'rgba(155, 109, 255, 0.5)'
                : i % 5 === 2 ? 'rgba(232, 197, 109, 0.6)'
                : i % 5 === 3 ? 'rgba(249, 115, 22, 0.6)'
                : 'rgba(212, 168, 67, 0.6)'
              }`,
              animationName: 'float-ember',
              animationDuration: `${8 + i * 1.5}s`,
              animationDelay: `${i * 0.6}s`,
              animationTimingFunction: 'ease-out',
              animationIterationCount: 'infinite',
            }}
          />
        ))}
      </div>

      {/* Arcane rune symbols - brighter */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[12%] left-[7%] text-arcane/40 text-5xl animate-rune-pulse" style={{ animationDelay: '0s' }}>&#9733;</div>
        <div className="absolute top-[22%] right-[10%] text-arcane/35 text-4xl animate-rune-pulse" style={{ animationDelay: '1s' }}>&#10022;</div>
        <div className="absolute bottom-[18%] left-[13%] text-arcane/35 text-4xl animate-rune-pulse" style={{ animationDelay: '2s' }}>&#10038;</div>
        <div className="absolute bottom-[28%] right-[7%] text-arcane/40 text-5xl animate-rune-pulse" style={{ animationDelay: '0.5s' }}>&#9733;</div>
        <div className="absolute top-[42%] left-[2%] text-gold/30 text-3xl animate-rune-pulse" style={{ animationDelay: '1.5s' }}>&#10070;</div>
        <div className="absolute top-[38%] right-[4%] text-gold/30 text-3xl animate-rune-pulse" style={{ animationDelay: '2.5s' }}>&#10070;</div>
        <div className="absolute top-[65%] left-[20%] text-gold/25 text-3xl animate-rune-pulse" style={{ animationDelay: '3s' }}>&#10022;</div>
        <div className="absolute top-[8%] left-[45%] text-arcane/20 text-3xl animate-rune-pulse" style={{ animationDelay: '1.8s' }}>&#10038;</div>
      </div>

      {/* Main Content - wrapped in ornate frame */}
      <div className="relative z-10 text-center max-w-xl animate-fade-in">
        <div className="relative px-10 py-10 rounded-lg" style={{
          border: '1.5px solid rgba(212, 168, 67, 0.35)',
          boxShadow: '0 0 60px rgba(212, 168, 67, 0.18), 0 0 100px rgba(212, 168, 67, 0.08), 0 0 140px rgba(155, 109, 255, 0.04), inset 0 0 40px rgba(0, 0, 0, 0.4)',
          background: 'radial-gradient(ellipse at center, rgba(15, 14, 26, 0.8) 0%, rgba(8, 7, 14, 0.6) 100%)'
        }}>
          {/* Corner accents - larger and more ornate */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold/60 rounded-tl-md" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold/60 rounded-tr-md" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold/60 rounded-bl-md" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold/60 rounded-br-md" />
          {/* Inner corner accents - secondary layer */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-gold/25 rounded-tl-sm" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-gold/25 rounded-tr-sm" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-gold/25 rounded-bl-sm" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-gold/25 rounded-br-sm" />
          {/* Side rune decorations */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-0.5 text-gold/20 text-[10px]">&#10022;</div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-0.5 text-gold/20 text-[10px]">&#10022;</div>

          {/* D20 decorative icon - larger, brighter */}
          <div className="flex justify-center mb-3">
            <D20Icon className="w-20 h-20 text-gold/70 animate-gentle-float" />
          </div>

          {/* Decorative top sword cross */}
          <SwordCrossDecorator className="w-56 h-8 mx-auto text-gold/30" />

          {/* Title block - enhanced glow */}
          <div className="space-y-3 py-3">
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-none tracking-wide" style={{
              textShadow: '0 0 20px rgba(212, 168, 67, 0.8), 0 0 40px rgba(212, 168, 67, 0.4), 0 0 80px rgba(212, 168, 67, 0.2)'
            }}>
              <span className="text-gold">Dungeons</span>
              <br />
              <span className="text-3xl md:text-4xl text-gold-light/70 font-normal tracking-widest mx-2">
                &amp;
              </span>
              <br />
              <span className="text-gold">Dragons</span>
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
              <p className="text-base md:text-lg text-gold-light/80 font-body italic tracking-wide">
                AI-Powered Tabletop Adventure
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
            </div>
          </div>

          {/* Decorative bottom sword cross */}
          <SwordCrossDecorator className="w-56 h-8 mx-auto text-gold/30" style={{ transform: 'scaleX(-1)' }} />

          {/* Action Buttons - enhanced with wider min-width */}
          <div className="flex flex-col gap-3 items-center pt-5">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartAdventure}
              disabled={isLoading}
              className="min-w-[280px] shadow-glow-gold hover:scale-[1.02]"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              }
            >
              {isLoading ? 'Entering the realm...' : 'Start Adventure'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleCreateCharacter}
              className="min-w-[280px] hover:scale-[1.02]"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
            >
              Create Character
            </Button>
          </div>

          {/* Flavor text */}
          <div className="pt-4 space-y-1">
            <p className="text-xs text-stone-text/80 italic font-body">
              &ldquo;The dungeon awaits those brave enough to enter...&rdquo;
            </p>
          </div>
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
