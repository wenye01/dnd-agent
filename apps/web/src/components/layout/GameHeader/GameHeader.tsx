import type { ReactNode } from 'react'
import { ConnectionStatus } from '../../ui'

export interface GameHeaderProps {
  title?: string
  showConnectionStatus?: boolean
  leftActions?: ReactNode
  rightActions?: ReactNode
  className?: string
}

export function GameHeader({
  title = 'Dungeons & Dragons',
  showConnectionStatus = true,
  leftActions,
  rightActions,
  className = '',
}: GameHeaderProps) {
  return (
    <div className={`relative h-14 flex items-center justify-between px-6 glass-panel ${className}`}>
      {/* Left decorative corner flourish */}
      <div className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none bg-gradient-to-r from-gold/10 to-transparent" />
      {/* Right decorative corner flourish */}
      <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none bg-gradient-to-l from-arcane/6 to-transparent" />

      {/* Left side */}
      <div className="flex items-center gap-3 relative z-10">
        {/* D20 icon with arcane glow */}
        <div className="relative animate-gentle-float" style={{ filter: 'drop-shadow(0 0 8px rgba(212, 168, 67, 0.6)) drop-shadow(0 0 16px rgba(212, 168, 67, 0.25))' }}>
          <svg viewBox="0 0 100 100" className="w-8 h-8 text-gold/90" fill="none">
            <path d="M50 5 L90 30 L90 70 L50 95 L10 70 L10 30 Z" stroke="currentColor" strokeWidth="3.5" />
            <path d="M50 5 L50 95 M10 30 L90 70 M90 30 L10 70" stroke="currentColor" strokeWidth="1" opacity="0.35" />
            <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="22" fontFamily="'Cinzel', serif" fontWeight="700" opacity="0.7">20</text>
          </svg>
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-gold/50 to-transparent" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212, 168, 67, 0.5), rgba(155, 109, 255, 0.3), transparent)' }} />

        <div>
          <h1 className="font-display text-base font-bold text-gold tracking-wider uppercase leading-tight text-glow-gold">
            {title}
          </h1>
          <p className="text-[10px] font-display text-arcane/50 tracking-[0.2em] uppercase mt-0.5 text-glow-arcane">
            Dungeon Master AI
          </p>
        </div>

        {/* Decorative rune cluster */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[10px] text-gold/40 text-glow-gold">&#10022;</span>
          <div className="w-4 h-px bg-gradient-to-r from-gold/40 to-arcane/30" />
          <span className="text-[8px] text-arcane/40 text-glow-arcane">&#10023;</span>
          <div className="w-4 h-px bg-gradient-to-r from-arcane/30 to-gold/40" />
          <span className="text-[10px] text-gold/40 text-glow-gold">&#10022;</span>
        </div>

        {leftActions}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 relative z-10">
        {showConnectionStatus && <ConnectionStatus />}
        {rightActions}
      </div>
    </div>
  )
}
