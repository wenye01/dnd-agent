import React from 'react'
import type { ConcentrationState } from '../../../types'

export interface ConcentrationBadgeProps {
  concentration?: ConcentrationState | null
  onBreak?: () => void
  className?: string
}

export const ConcentrationBadge = React.memo(function ConcentrationBadge({
  concentration,
  onBreak,
  className = '',
}: ConcentrationBadgeProps) {
  if (!concentration) return null

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded border border-warning/25 bg-warning/5 ${className}`}
      style={{
        boxShadow: '0 0 8px rgba(251, 191, 36, 0.08)',
      }}
    >
      {/* Concentration icon */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
        style={{
          background: 'rgba(251, 191, 36, 0.7)',
          boxShadow: '0 0 6px rgba(251, 191, 36, 0.4)',
        }}
      />

      {/* Spell name */}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-display tracking-wider uppercase text-warning/50">
          Concentrating on
        </span>
        <p className="text-[11px] text-parchment/80 font-body truncate">
          {concentration.spellName}
        </p>
      </div>

      {/* Duration (if tracked) */}
      {concentration.remainingRounds !== undefined && (
        <span className="text-[9px] font-mono text-warning/40">
          {concentration.remainingRounds} rd
        </span>
      )}

      {/* Break concentration button */}
      {onBreak && (
        <button
          className="px-1.5 py-0.5 rounded text-[8px] font-display tracking-wider uppercase text-blood/50 hover:text-blood hover:bg-blood/10 transition-all cursor-pointer"
          onClick={onBreak}
          aria-label="Break concentration"
        >
          Break
        </button>
      )}
    </div>
  )
})

export default ConcentrationBadge
