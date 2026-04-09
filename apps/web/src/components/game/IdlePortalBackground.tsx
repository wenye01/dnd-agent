/**
 * IdlePortalBackground — decorative background shown in the main content area
 * when the game is NOT in combat mode. Renders atmospheric layers, rune circles,
 * particle effects and a centered "Arcane Map Portal" emblem.
 */
export function IdlePortalBackground() {
  return (
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
