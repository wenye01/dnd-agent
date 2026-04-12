import React from 'react'
import type { SpellSlots } from '../../../types'

function getOrdinalSuffix(level: number): string {
  const rem = level % 100
  if (rem >= 11 && rem <= 13) return 'th'
  if (level % 10 === 1) return 'st'
  if (level % 10 === 2) return 'nd'
  if (level % 10 === 3) return 'rd'
  return 'th'
}

export interface SpellSlotsBarProps {
  spellSlots?: SpellSlots
  onSlotClick?: (level: number) => void
  readOnly?: boolean
}

export const SpellSlotsBar = React.memo(function SpellSlotsBar({
  spellSlots,
  onSlotClick,
  readOnly = false,
}: SpellSlotsBarProps) {
  if (!spellSlots) return null

  // Filter levels that have at least some slots
  const activeLevels = Object.keys(spellSlots)
    .map(Number)
    .filter((level) => level >= 1 && level <= 9 && spellSlots[level].max > 0)
    .sort((a, b) => a - b)

  if (activeLevels.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-arcane/20 to-transparent" />
        <span className="text-[10px] font-display font-bold text-arcane/60 tracking-[0.15em] uppercase">
          Spell Slots
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-arcane/20 to-transparent" />
      </div>

      <div className="space-y-1.5">
        {activeLevels.map((level) => {
          const { max, used } = spellSlots[level]
          const available = max - used
          return (
            <div key={level} className="flex items-center gap-2">
              <span className="text-[9px] font-display font-semibold text-arcane/50 w-8 flex-shrink-0">
                {level}{getOrdinalSuffix(level)}
              </span>
              <div
                className="flex gap-1 cursor-pointer"
                onClick={() => !readOnly && onSlotClick?.(level)}
                role={readOnly ? undefined : 'button'}
                aria-label={`${level}${getOrdinalSuffix(level)} level: ${available} of ${max} slots available`}
              >
                {Array.from({ length: max }).map((_, i) => {
                  const isFilled = i < available
                  return (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full border transition-all duration-200"
                      style={{
                        borderColor: isFilled
                          ? 'rgba(155, 109, 255, 0.6)'
                          : 'rgba(155, 109, 255, 0.15)',
                        background: isFilled
                          ? 'radial-gradient(circle, rgba(155, 109, 255, 0.8) 0%, rgba(155, 109, 255, 0.4) 100%)'
                          : 'transparent',
                        boxShadow: isFilled
                          ? '0 0 6px rgba(155, 109, 255, 0.4)'
                          : 'none',
                      }}
                    />
                  )
                })}
              </div>
              <span className="text-[9px] font-mono text-parchment/40 ml-auto">
                {available}/{max}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default SpellSlotsBar
