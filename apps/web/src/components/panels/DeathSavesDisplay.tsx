import React from 'react'
import type { DeathSaves } from '../../types'

interface DeathSavesDisplayProps {
  deathSaves?: DeathSaves
  currentHitPoints: number
}

export const DeathSavesDisplay = React.memo(function DeathSavesDisplay({ deathSaves, currentHitPoints }: DeathSavesDisplayProps) {
  // Only show when HP is 0 (or below, though it should be clamped to 0)
  if (currentHitPoints > 0) return null

  const successes = deathSaves?.successes ?? 0
  const failures = deathSaves?.failures ?? 0

  return (
    <div className="px-2 py-2 rounded-md border border-blood/20 bg-blood/5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-px flex-1 bg-gradient-to-r from-blood/20 to-transparent" />
        <span className="text-[10px] font-display font-bold text-blood/60 tracking-[0.15em] uppercase">
          Death Saves
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-blood/20 to-transparent" />
      </div>

      {/* Successes */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-display text-heal/60 uppercase tracking-wider w-12 flex-shrink-0">
          Success
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`success-${i}`}
              className="w-3 h-3 rounded-full border transition-all duration-200"
              style={{
                // Theme color: heal (green-500) - rgba(34, 197, 94)
                borderColor:
                  i < successes
                    ? 'rgba(34, 197, 94, 0.7)'
                    : 'rgba(34, 197, 94, 0.2)',
                background:
                  i < successes
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.8) 0%, rgba(34, 197, 94, 0.3) 100%)'
                    : 'transparent',
                boxShadow:
                  i < successes
                    ? '0 0 6px rgba(34, 197, 94, 0.5)'
                    : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Failures */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-display text-blood/60 uppercase tracking-wider w-12 flex-shrink-0">
          Failure
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`failure-${i}`}
              className="w-3 h-3 rounded-full border transition-all duration-200"
              style={{
                // Theme color: blood (red-600) - rgba(220, 53, 69)
                borderColor:
                  i < failures
                    ? 'rgba(220, 53, 69, 0.7)'
                    : 'rgba(220, 53, 69, 0.2)',
                background:
                  i < failures
                    ? 'radial-gradient(circle, rgba(220, 53, 69, 0.8) 0%, rgba(220, 53, 69, 0.3) 100%)'
                    : 'transparent',
                boxShadow:
                  i < failures
                    ? '0 0 6px rgba(220, 53, 69, 0.5)'
                    : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

export default DeathSavesDisplay
