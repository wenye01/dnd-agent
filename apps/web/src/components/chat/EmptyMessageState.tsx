/**
 * EmptyMessageState — decorative empty state shown in the chat panel when no
 * messages have been sent yet. Renders an arcane portal emblem, quest scroll
 * and a call-to-action prompt.
 */
export function EmptyMessageState() {
  return (
    <div className="flex items-center justify-center h-full relative">
      {/* Background atmospheric glow behind entire empty state - STRONG */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 35%, rgba(155,109,255,0.22) 0%, rgba(212,168,67,0.10) 25%, transparent 55%), radial-gradient(ellipse at 30% 65%, rgba(212,168,67,0.10) 0%, transparent 40%), radial-gradient(ellipse at 70% 55%, rgba(155,109,255,0.08) 0%, transparent 35%)',
      }} />
      <div className="w-full max-w-[320px] mx-auto animate-fade-in px-3 relative z-10">
        {/* Large arcane portal emblem - ENHANCED */}
        <div className="relative w-40 h-40 mx-auto mb-6">
          {/* Outermost ambient glow - very strong */}
          <div className="absolute -inset-8 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(155,109,255,0.35) 0%, rgba(212,168,67,0.15) 35%, transparent 60%)',
            animation: 'breathe 4s ease-in-out infinite',
          }} />
          {/* Outer ring - bright glow with emblem-pulse */}
          <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(155, 109, 255, 0.8)', boxShadow: '0 0 40px rgba(155, 109, 255, 0.5), 0 0 80px rgba(155, 109, 255, 0.2), inset 0 0 20px rgba(155, 109, 255, 0.1)', animation: 'emblem-pulse 4s ease-in-out infinite, slow-spin 30s linear infinite' }} />
          {/* Middle rune dots - bright */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <div key={i} className="absolute animate-rune-pulse" style={{
              top: '50%', left: '50%',
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: i % 2 === 0 ? 'rgba(155,109,255,0.95)' : 'rgba(212,168,67,0.9)',
              boxShadow: i % 2 === 0 ? '0 0 12px rgba(155,109,255,0.9), 0 0 24px rgba(155,109,255,0.4)' : '0 0 12px rgba(212,168,67,0.8), 0 0 24px rgba(212,168,67,0.35)',
              transform: `rotate(${deg}deg) translateY(-80px)`,
              animationDelay: `${i * 0.35}s`,
            }} />
          ))}
          {/* Gold ring - very strong glow */}
          <div className="absolute inset-4 rounded-full" style={{ border: '2px solid rgba(212, 168, 67, 0.75)', boxShadow: '0 0 45px rgba(212, 168, 67, 0.45), 0 0 90px rgba(212, 168, 67, 0.15), inset 0 0 15px rgba(212, 168, 67, 0.12)' }} />
          {/* Inner arcane ring - stronger */}
          <div className="absolute inset-7 rounded-full" style={{ border: '1.5px solid rgba(155, 109, 255, 0.5)', boxShadow: '0 0 25px rgba(155, 109, 255, 0.25), inset 0 0 8px rgba(155, 109, 255, 0.08)' }} />
          {/* Center core - brighter */}
          <div className="absolute inset-9 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(28, 26, 50, 0.95) 0%, rgba(15, 14, 26, 0.98) 100%)', boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(155, 109, 255, 0.4), 0 0 20px rgba(212, 168, 67, 0.2), 0 0 70px rgba(155, 109, 255, 0.15)' }}>
            <svg className="w-10 h-10 text-arcane" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ color: 'rgba(155, 109, 255, 1)', filter: 'drop-shadow(0 0 16px rgba(155, 109, 255, 1)) drop-shadow(0 0 32px rgba(155, 109, 255, 0.6))' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          {/* Cardinal dots with very strong glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3.5 h-3.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(155,109,255,1)', boxShadow: '0 0 16px rgba(155,109,255,1), 0 0 32px rgba(155,109,255,0.5)', animationDelay: '0s' }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-3.5 h-3.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(155,109,255,1)', boxShadow: '0 0 16px rgba(155,109,255,1), 0 0 32px rgba(155,109,255,0.5)', animationDelay: '1.5s' }} />
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-3.5 h-3.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(212,168,67,1)', boxShadow: '0 0 16px rgba(212,168,67,1), 0 0 32px rgba(212,168,67,0.5)', animationDelay: '0.75s' }} />
          <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 w-3.5 h-3.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(212,168,67,1)', boxShadow: '0 0 16px rgba(212,168,67,1), 0 0 32px rgba(212,168,67,0.5)', animationDelay: '2.25s' }} />
          {/* Floating particles - bright */}
          {[...Array(10)].map((_, i) => (
            <div key={`p-${i}`} className="absolute rounded-full" style={{
              left: `${10 + i * 8}%`,
              bottom: `${5 + (i % 3) * 10}%`,
              width: `${2 + (i % 2)}px`,
              height: `${2 + (i % 2)}px`,
              background: i % 3 === 0 ? 'rgba(155,109,255,0.85)' : i % 3 === 1 ? 'rgba(212,168,67,0.8)' : 'rgba(232,197,109,0.75)',
              boxShadow: `0 0 10px ${i % 3 === 0 ? 'rgba(155,109,255,0.6)' : i % 3 === 1 ? 'rgba(212,168,67,0.5)' : 'rgba(232,197,109,0.4)'}`,
              animationName: 'float-ember',
              animationDuration: `${7 + i * 1.2}s`,
              animationDelay: `${i * 0.5}s`,
              animationTimingFunction: 'ease-out',
              animationIterationCount: 'infinite',
            }} />
          ))}
        </div>

        {/* Title with very strong glow */}
        <div className="text-center space-y-3 mb-5">
          <h2 className="text-2xl font-display font-bold tracking-wider" style={{ color: '#FFFFFF', textShadow: '0 0 50px rgba(155, 109, 255, 1), 0 0 100px rgba(155, 109, 255, 0.5), 0 0 20px rgba(212,168,67,0.4), 0 1px 3px rgba(0,0,0,0.9)' }}>
            Chronicle of the Realm
          </h2>
          <div className="flex items-center gap-2 px-3">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(212,168,67,0.8), rgba(155,109,255,0.6), transparent)' }} />
            <span className="text-[12px] text-gold font-display font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(232, 197, 109, 1)', textShadow: '0 0 16px rgba(212,168,67,0.8), 0 0 32px rgba(212,168,67,0.4)' }}>Adventure Log</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(155,109,255,0.6), rgba(212,168,67,0.8), transparent)' }} />
          </div>
        </div>

        {/* Quest scroll with stronger static glow */}
        <div className="relative mx-0.5">
          {/* Floating particles behind scroll - more particles */}
          <div className="absolute inset-0 overflow-hidden rounded pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div key={`sp-${i}`} className="absolute rounded-full" style={{
                left: `${10 + i * 15}%`,
                bottom: `${3 + (i % 2) * 5}%`,
                width: `${1.5 + (i % 2)}px`,
                height: `${1.5 + (i % 2)}px`,
                background: i % 2 === 0 ? 'rgba(212,168,67,0.6)' : 'rgba(155,109,255,0.5)',
                boxShadow: `0 0 6px ${i % 2 === 0 ? 'rgba(212,168,67,0.4)' : 'rgba(155,109,255,0.3)'}`,
                animationName: 'float-ember',
                animationDuration: `${5 + i * 1.5}s`,
                animationDelay: `${i * 0.8}s`,
                animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite',
              }} />
            ))}
          </div>
          {/* Scroll body - very strong glow */}
          <div className="relative px-4 py-4 text-center overflow-hidden rounded" style={{
            background: 'linear-gradient(180deg, rgba(32, 30, 52, 0.97) 0%, rgba(25, 23, 42, 0.98) 100%)',
            border: '2px solid rgba(212,168,67,0.75)',
            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.2), 0 0 20px rgba(212,168,67,0.25), 0 0 45px rgba(212,168,67,0.12), 0 0 15px rgba(155,109,255,0.1), 0 0 70px rgba(212,168,67,0.06)',
            animation: 'scroll-glow 4s ease-in-out infinite',
          }}>
            {/* Corner accents - bright */}
            <div className="absolute top-1.5 left-1.5 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: 'rgba(212,168,67,0.8)' }} />
            <div className="absolute top-1.5 right-1.5 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: 'rgba(212,168,67,0.8)' }} />
            <div className="absolute bottom-1.5 left-1.5 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: 'rgba(212,168,67,0.8)' }} />
            <div className="absolute bottom-1.5 right-1.5 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: 'rgba(212,168,67,0.8)' }} />
            {/* Session badge - very bright */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full mb-2.5" style={{
              background: 'rgba(212,168,67,0.18)',
              border: '1px solid rgba(212,168,67,0.7)',
              boxShadow: '0 0 20px rgba(212,168,67,0.25), inset 0 0 10px rgba(212,168,67,0.1)',
            }}>
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ boxShadow: '0 0 10px rgba(212,168,67,1)' }} />
              <span className="text-[11px] font-display font-bold tracking-widest uppercase" style={{ color: 'rgba(232, 197, 109, 1)', textShadow: '0 0 12px rgba(212,168,67,0.7)' }}>Session I</span>
            </div>

            {/* Quest title - very bright */}
            <p className="text-lg font-display font-bold tracking-wide mb-1.5" style={{ color: 'rgba(245, 239, 224, 1)', textShadow: '0 0 30px rgba(232,220,200,0.8), 0 0 12px rgba(212,168,67,0.5)' }}>
              The Dragon&apos;s Lair
            </p>

            {/* Divider - bright */}
            <div className="flex items-center gap-1.5 mb-2 px-4">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(212,168,67,0.65))' }} />
              <span className="text-[10px]" style={{ color: 'rgba(212,168,67,0.8)', textShadow: '0 0 8px rgba(212,168,67,0.5)' }}>&#9670;</span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(212,168,67,0.65))' }} />
            </div>

            {/* Quote - bright */}
            <p className="text-[13px] font-body italic leading-relaxed px-1" style={{ color: 'rgba(196, 181, 154, 1)', textShadow: '0 0 12px rgba(196,181,154,0.35)' }}>
              &ldquo;The ancient dragon stirs in its mountain lair...&rdquo;
            </p>
          </div>
        </div>

        {/* CTA - bright and prominent */}
        <div className="text-center py-3.5 px-4 rounded-lg relative overflow-hidden mt-4" style={{
          background: 'linear-gradient(135deg, rgba(212,168,67,0.28) 0%, rgba(155,109,255,0.22) 100%)',
          border: '2px solid rgba(212,168,67,0.75)',
          boxShadow: '0 0 40px rgba(212,168,67,0.35), 0 0 20px rgba(155,109,255,0.18), inset 0 0 25px rgba(212,168,67,0.12), 0 0 70px rgba(212,168,67,0.12)',
          animation: 'breathe 3s ease-in-out infinite',
        }}>
          <p className="text-[14px] font-display font-bold tracking-[0.12em] uppercase" style={{ color: 'rgba(245, 235, 200, 1)', textShadow: '0 0 30px rgba(212,168,67,1), 0 0 15px rgba(155,109,255,0.5)' }}>
            <span style={{ color: 'rgba(212,168,67,1)' }}>&#10022;</span>
            {' '}Speak to begin{' '}
            <span style={{ color: 'rgba(212,168,67,1)' }}>&#10022;</span>
          </p>
        </div>
      </div>
    </div>
  )
}
