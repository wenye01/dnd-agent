import React from 'react'
import type { Spell } from '../../../types'

export interface SpellGroupProps {
  level: number
  spells: Spell[]
  preparedSpellIds?: string[]
  selectedSpellId?: string | null
  onSelect?: (spell: Spell) => void
  onTogglePrepare?: (spellId: string) => void
  onCast?: (spell: Spell) => void
  readOnly?: boolean
}

// School colors for border accents
const SCHOOL_COLORS: Record<string, string> = {
  abjuration: 'rgba(251, 191, 36, 0.4)',
  conjuration: 'rgba(74, 222, 128, 0.4)',
  divination: 'rgba(96, 165, 250, 0.4)',
  enchantment: 'rgba(244, 114, 182, 0.4)',
  evocation: 'rgba(239, 68, 68, 0.4)',
  illusion: 'rgba(155, 109, 255, 0.4)',
  necromancy: 'rgba(163, 163, 163, 0.4)',
  transmutation: 'rgba(249, 115, 22, 0.4)',
}

function getLevelLabel(level: number): string {
  if (level === 0) return 'Cantrips'
  const suffixes = ['th', 'st', 'nd', 'rd']
  const rem = level % 100
  const suffix = rem >= 11 && rem <= 13 ? 'th' : suffixes[level % 10] || 'th'
  return `${level}${suffix} Level`
}

export const SpellGroup = React.memo(function SpellGroup({
  level,
  spells,
  preparedSpellIds = [],
  selectedSpellId,
  onSelect,
  onTogglePrepare,
  onCast,
  readOnly = false,
}: SpellGroupProps) {
  if (spells.length === 0) return null

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-px flex-1 bg-gradient-to-r from-arcane/15 to-transparent" />
        <span className="text-[9px] font-display font-bold text-arcane/50 tracking-[0.15em] uppercase">
          {getLevelLabel(level)}
        </span>
        <span className="text-[9px] font-mono text-stone-text/30">
          {spells.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-arcane/15 to-transparent" />
      </div>

      {/* Spell list */}
      <div className="space-y-1">
        {spells.map((spell) => {
          const isPrepared = preparedSpellIds.includes(spell.id)
          const isSelected = selectedSpellId === spell.id
          const schoolColor = SCHOOL_COLORS[spell.school] || 'rgba(155, 109, 255, 0.3)'

          return (
            <div
              key={spell.id}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded border transition-all duration-200
                ${isSelected ? 'bg-arcane/10 border-arcane/30' : 'bg-cave/30 border-transparent hover:bg-cave/50'}
                ${isPrepared ? 'border-l-2' : ''}
                ${!readOnly ? 'cursor-pointer' : ''}
              `}
              style={{
                borderLeftColor: isPrepared ? schoolColor : undefined,
              }}
              onClick={() => onSelect?.(spell)}
              onContextMenu={(e) => {
                if (readOnly) return
                e.preventDefault()
                onTogglePrepare?.(spell.id)
              }}
              role={readOnly ? undefined : 'button'}
              tabIndex={readOnly ? undefined : 0}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSelect?.(spell)
                }
              }}
              aria-label={`${spell.name}${isPrepared ? ' (prepared)' : ''}`}
            >
              {/* School color dot */}
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: schoolColor }}
              />

              {/* Spell name */}
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] truncate block ${isPrepared ? 'text-parchment/90' : 'text-parchment/60'}`}>
                  {spell.name}
                </span>
              </div>

              {/* Concentration indicator */}
              {spell.concentration && (
                <span className="text-[8px] text-warning/50 font-display tracking-wider" title="Concentration">
                  C
                </span>
              )}

              {/* Ritual indicator */}
              {spell.ritual && (
                <span className="text-[8px] text-arcane/40 font-display tracking-wider" title="Ritual">
                  R
                </span>
              )}

              {/* Prepared check */}
              {isPrepared && (
                <span className="text-[10px] text-heal/70">{'\u{2713}'}</span>
              )}

              {/* Cast button */}
              {!readOnly && isPrepared && onCast && (
                <button
                  className="px-1.5 py-0.5 rounded text-[8px] font-display font-bold tracking-wider uppercase
                    text-arcane/60 hover:text-arcane hover:bg-arcane/10 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCast(spell)
                  }}
                  aria-label={`Cast ${spell.name}`}
                >
                  Cast
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default SpellGroup
