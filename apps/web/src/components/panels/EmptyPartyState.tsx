/**
 * EmptyPartyState — decorative empty state shown in the CharacterPanel when
 * the party has no members. Renders a shield emblem, class archetype placeholder
 * slots and rune decorations.
 */
import { Panel } from '../ui'

export function EmptyPartyState() {
  return (
    <Panel title="Party" variant="parchment">
      <div className="text-center py-6 space-y-4 relative overflow-hidden">
        {/* Atmospheric background - dark gradient with mist */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(212,168,67,0.06) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(155,109,255,0.05) 0%, transparent 40%), radial-gradient(ellipse at 70% 80%, rgba(212,168,67,0.04) 0%, transparent 35%)',
        }} />
        {/* Subtle rune grid pattern background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(212,168,67,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        {/* Floating ambient particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={`lp-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${5 + (i * 8)}%`,
                bottom: '0',
                width: `${1 + (i % 3)}px`,
                height: `${1 + (i % 3)}px`,
                background: i % 3 === 0 ? 'rgba(212, 168, 67, 0.7)' : i % 3 === 1 ? 'rgba(155, 109, 255, 0.6)' : 'rgba(232, 197, 109, 0.5)',
                boxShadow: `0 0 ${6 + (i % 3) * 3}px ${i % 3 === 0 ? 'rgba(212, 168, 67, 0.4)' : 'rgba(155, 109, 255, 0.3)'}`,
                animationName: 'float-ember',
                animationDuration: `${8 + i * 1.5}s`,
                animationDelay: `${i * 0.6}s`,
                animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite',
              }}
            />
          ))}
        </div>
        {/* Decorative corner accents - enhanced with inner lines */}
        <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none" style={{ borderTop: '2px solid rgba(212, 168, 67, 0.6)', borderLeft: '2px solid rgba(212, 168, 67, 0.6)' }} />
        <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none" style={{ borderTop: '2px solid rgba(212, 168, 67, 0.6)', borderRight: '2px solid rgba(212, 168, 67, 0.6)' }} />
        <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none" style={{ borderBottom: '2px solid rgba(212, 168, 67, 0.6)', borderLeft: '2px solid rgba(212, 168, 67, 0.6)' }} />
        <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" style={{ borderBottom: '2px solid rgba(212, 168, 67, 0.6)', borderRight: '2px solid rgba(212, 168, 67, 0.6)' }} />
        {/* Inner corner accents */}
        <div className="absolute top-2 left-2 w-3 h-3 pointer-events-none" style={{ borderTop: '1px solid rgba(155, 109, 255, 0.3)', borderLeft: '1px solid rgba(155, 109, 255, 0.3)' }} />
        <div className="absolute top-2 right-2 w-3 h-3 pointer-events-none" style={{ borderTop: '1px solid rgba(155, 109, 255, 0.3)', borderRight: '1px solid rgba(155, 109, 255, 0.3)' }} />
        <div className="absolute bottom-2 left-2 w-3 h-3 pointer-events-none" style={{ borderBottom: '1px solid rgba(155, 109, 255, 0.3)', borderLeft: '1px solid rgba(155, 109, 255, 0.3)' }} />
        <div className="absolute bottom-2 right-2 w-3 h-3 pointer-events-none" style={{ borderBottom: '1px solid rgba(155, 109, 255, 0.3)', borderRight: '1px solid rgba(155, 109, 255, 0.3)' }} />

        {/* Decorative shield emblem with breathing animation - enhanced */}
        <div className="relative w-32 h-32 mx-auto" style={{ animation: 'breathe 5s ease-in-out infinite' }}>
          {/* Outermost ambient glow */}
          <div className="absolute -inset-6 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(212,168,67,0.18) 0%, rgba(155,109,255,0.08) 40%, transparent 65%)',
            animation: 'breathe 4s ease-in-out infinite',
          }} />
          {/* Outer glow ring - breathing */}
          <div className="absolute inset-0 rounded-full" style={{ border: '2.5px solid rgba(212, 168, 67, 0.7)', boxShadow: '0 0 60px rgba(212, 168, 67, 0.45), 0 0 120px rgba(212, 168, 67, 0.15), inset 0 0 25px rgba(0, 0, 0, 0.3)', animation: 'pulse-gold 3s ease-in-out infinite' }} />
          {/* Middle arcane ring - stronger */}
          <div className="absolute inset-3 rounded-full" style={{ border: '1.5px solid rgba(155, 109, 255, 0.5)', boxShadow: '0 0 35px rgba(155, 109, 255, 0.25), 0 0 70px rgba(155, 109, 255, 0.08)' }} />
          {/* Inner gold ring - stronger */}
          <div className="absolute inset-5 rounded-full" style={{ border: '1.5px solid rgba(212, 168, 67, 0.4)', boxShadow: '0 0 15px rgba(212, 168, 67, 0.1)' }} />
          {/* Center shield icon with crossed swords */}
          <div className="absolute inset-[30px] rounded-full flex items-center justify-center" style={{ background: 'rgba(15, 14, 26, 0.9)', border: '1.5px solid rgba(212, 168, 67, 0.6)', boxShadow: 'inset 0 0 18px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 168, 67, 0.3), 0 0 50px rgba(212, 168, 67, 0.1)' }}>
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ color: 'rgba(212, 168, 67, 0.9)', filter: 'drop-shadow(0 0 10px rgba(212, 168, 67, 0.6)) drop-shadow(0 0 20px rgba(212, 168, 67, 0.25))' }}>
              {/* Shield */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 6v5c0 5.25 3.5 10 8 11 4.5-1 8-5.75 8-11V6l-8-4z" />
              {/* Cross inside shield */}
              <path d="M12 8v8M8 12h8" strokeWidth="0.8" opacity="0.5" />
              {/* Crossed swords behind shield */}
              <line x1="5" y1="1" x2="19" y2="23" strokeWidth="0.8" opacity="0.4" />
              <line x1="19" y1="1" x2="5" y2="23" strokeWidth="0.8" opacity="0.4" />
            </svg>
          </div>
          {/* Cardinal rune dots with pulse */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(212,168,67,0.9)', boxShadow: '0 0 12px rgba(212,168,67,0.8), 0 0 24px rgba(212,168,67,0.3)', animationDelay: '0s' }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2.5 h-2.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(212,168,67,0.9)', boxShadow: '0 0 12px rgba(212,168,67,0.8), 0 0 24px rgba(212,168,67,0.3)', animationDelay: '1.5s' }} />
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2.5 h-2.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(155,109,255,0.8)', boxShadow: '0 0 12px rgba(155,109,255,0.7), 0 0 24px rgba(155,109,255,0.25)', animationDelay: '0.75s' }} />
          <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 w-2.5 h-2.5 rounded-full animate-rune-pulse" style={{ background: 'rgba(155,109,255,0.8)', boxShadow: '0 0 12px rgba(155,109,255,0.7), 0 0 24px rgba(155,109,255,0.25)', animationDelay: '2.25s' }} />
          {/* Diagonal rune dots */}
          <div className="absolute top-2 left-2 w-1 h-1 rounded-full" style={{ background: 'rgba(212,168,67,0.45)' }} />
          <div className="absolute top-2 right-2 w-1 h-1 rounded-full" style={{ background: 'rgba(212,168,67,0.45)' }} />
          <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-gold/35" />
          <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-gold/35" />
        </div>
        <div className="space-y-3">
          <p className="text-[28px] font-display font-bold tracking-wider" style={{ textShadow: '0 0 40px rgba(212, 168, 67, 1), 0 0 80px rgba(212, 168, 67, 0.5), 0 0 12px rgba(155,109,255,0.3), 0 2px 4px rgba(0,0,0,0.9)', color: '#FCF4E4' }}>
            No Party Members
          </p>
          <div className="flex items-center gap-2 px-3">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(212,168,67,0.5))' }} />
            <span className="text-gold/55 text-[8px]" style={{ textShadow: '0 0 4px rgba(212,168,67,0.3)' }}>&#9670;</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(212,168,67,0.5))' }} />
          </div>
          <p className="text-[13px] italic font-body leading-relaxed px-2" style={{ color: 'rgba(255, 245, 225, 1)', textShadow: '0 0 12px rgba(196, 181, 154, 0.4)' }}>
            Create a character or begin your adventure to assemble your party.
          </p>
        </div>

        {/* Placeholder character slots with class archetypes */}
        <div className="space-y-3 px-0.5">
          {[
            { name: 'Warrior', desc: 'Shield & sword', icon: 'shield', color: 'rgba(212, 168, 67, 0.8)', stats: ['STR', 'CON'] },
            { name: 'Mage', desc: 'Arcane caster', icon: 'sparkle', color: 'rgba(155, 109, 255, 0.8)', stats: ['INT', 'WIS'] },
            { name: 'Rogue', desc: 'Shadow & blade', icon: 'dagger', color: 'rgba(74, 222, 128, 0.75)', stats: ['DEX', 'CHA'] },
          ].map((slot, i) => (
            <div
              key={i}
              className="rounded-lg p-3 border flex items-center gap-3 relative overflow-hidden transition-all duration-300 group hover:scale-[1.02] cursor-pointer"
              style={{
                borderColor: slot.color,
                borderStyle: 'dashed',
                background: 'rgba(26, 24, 38, 0.7)',
                boxShadow: `inset 0 0 12px rgba(0,0,0,0.2), 0 0 8px ${slot.color.replace('0.8', '0.08').replace('0.75', '0.06')}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderStyle = 'solid'
                e.currentTarget.style.background = 'rgba(26, 24, 38, 0.9)'
                e.currentTarget.style.boxShadow = `0 0 16px ${slot.color.replace('0.8', '0.12').replace('0.75', '0.1')}, inset 0 0 12px rgba(0,0,0,0.25)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderStyle = 'dashed'
                e.currentTarget.style.background = 'rgba(26, 24, 38, 0.7)'
                e.currentTarget.style.boxShadow = 'inset 0 0 12px rgba(0,0,0,0.2)'
              }}
            >
              {/* Hover glow overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                background: `radial-gradient(ellipse at 30% 50%, ${slot.color.replace('0.8', '0.1').replace('0.75', '0.09')} 0%, transparent 70%)`,
              }} />
              {/* Class icon circle */}
              <div className="w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 relative transition-all duration-300 group-hover:scale-110" style={{ background: 'rgba(20, 18, 32, 0.9)', borderColor: slot.color, boxShadow: `inset 0 0 6px rgba(0,0,0,0.4), 0 0 16px ${slot.color.replace('0.8', '0.35').replace('0.75', '0.28')}` }}>
                {i === 0 && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: slot.color }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 6v5c0 5.25 3.5 10 8 11 4.5-1 8-5.75 8-11V6l-8-4z" />
                  </svg>
                )}
                {i === 1 && (
                  <span style={{ color: slot.color, fontSize: '14px', textShadow: `0 0 8px ${slot.color}` }}>&#10023;</span>
                )}
                {i === 2 && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: slot.color }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                )}
                {/* Plus indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: '#0F0E1A', border: `1px solid ${slot.color}`, color: slot.color, boxShadow: `0 0 6px ${slot.color}` }}>
                  +
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[13px] font-display font-semibold tracking-wider uppercase transition-colors duration-200" style={{ color: slot.color.replace('0.8', '1').replace('0.75', '0.95'), textShadow: `0 0 8px ${slot.color}` }}>
                  {slot.name}
                </p>
                <div className="flex gap-1.5">
                  <div className="h-1 rounded flex-1 transition-all duration-300 group-hover:opacity-80" style={{ background: slot.color.replace('0.8', '0.3').replace('0.75', '0.28') }} />
                </div>
                <p className="text-[10px] font-body italic" style={{ color: 'rgba(210, 195, 170, 0.9)' }}>
                  {slot.desc}
                </p>
                {/* Mini stat badges */}
                <div className="flex gap-1 mt-0.5">
                  {slot.stats.map((stat) => (
                    <span key={stat} className="text-[8px] px-1.5 py-px rounded font-mono font-bold tracking-wider" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${slot.color.replace('0.8', '0.25').replace('0.75', '0.2')}`, color: slot.color.replace('0.8', '0.7').replace('0.75', '0.65') }}>
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom hint with rune decorations */}
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(155, 109, 255, 0.25), rgba(212, 168, 67, 0.4))' }} />
          <span className="text-[10px] font-display tracking-[0.15em] uppercase animate-pulse" style={{ color: 'rgba(212, 168, 67, 0.85)', textShadow: '0 0 12px rgba(212, 168, 67, 0.6), 0 0 24px rgba(212, 168, 67, 0.25)' }}>Awaiting Heroes</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(155, 109, 255, 0.25), rgba(212, 168, 67, 0.4))' }} />
        </div>
        {/* Rune sigils row */}
        <div className="flex items-center justify-center gap-3 mt-1">
          {['★', '✶', '✧', '❁', '★'].map((glyph, i) => (
            <span key={i} className="animate-rune-pulse" style={{
              fontSize: '8px',
              color: i % 2 === 0 ? 'rgba(212, 168, 67, 0.35)' : 'rgba(155, 109, 255, 0.3)',
              textShadow: i % 2 === 0 ? '0 0 6px rgba(212,168,67,0.2)' : '0 0 6px rgba(155,109,255,0.2)',
              animationDelay: `${i * 0.5}s`,
            }}>{glyph}</span>
          ))}
        </div>
      </div>
    </Panel>
  )
}
