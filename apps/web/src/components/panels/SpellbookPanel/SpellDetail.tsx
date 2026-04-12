import React from 'react'
import type { Spell, SpellSchool } from '../../../types'
import { Modal } from '../../ui'
import { Button } from '../../ui'

export interface SpellDetailProps {
  spell: Spell | null
  isOpen: boolean
  onClose: () => void
  onCast?: (spell: Spell) => void
  onTogglePrepare?: (spellId: string) => void
  isPrepared?: boolean
}

const SCHOOL_LABELS: Record<SpellSchool, string> = {
  abjuration: 'Abjuration',
  conjuration: 'Conjuration',
  divination: 'Divination',
  enchantment: 'Enchantment',
  evocation: 'Evocation',
  illusion: 'Illusion',
  necromancy: 'Necromancy',
  transmutation: 'Transmutation',
}

const SCHOOL_COLORS: Record<SpellSchool, string> = {
  abjuration: '#FBBF24',
  conjuration: '#4ADE80',
  divination: '#60A5FA',
  enchantment: '#F472B6',
  evocation: '#EF4444',
  illusion: '#9B6DFF',
  necromancy: '#A3A3A3',
  transmutation: '#F97316',
}

function getLevelLabel(level: number): string {
  if (level === 0) return 'Cantrip'
  const suffixes = ['th', 'st', 'nd', 'rd']
  const rem = level % 100
  const suffix = rem >= 11 && rem <= 13 ? 'th' : suffixes[level % 10] || 'th'
  return `${level}${suffix} Level`
}

export const SpellDetail = React.memo(function SpellDetail({
  spell,
  isOpen,
  onClose,
  onCast,
  onTogglePrepare,
  isPrepared = false,
}: SpellDetailProps) {
  if (!spell) return null

  const schoolColor = SCHOOL_COLORS[spell.school] || '#9B6DFF'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={spell.name} size="md">
      <div className="space-y-4">
        {/* Level + School badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-display font-bold tracking-wider uppercase px-2 py-0.5 rounded border"
            style={{
              color: schoolColor,
              borderColor: `${schoolColor}40`,
              background: `${schoolColor}10`,
            }}
          >
            {SCHOOL_LABELS[spell.school]}
          </span>
          <span className="text-[10px] font-display tracking-wider uppercase text-arcane/60">
            {getLevelLabel(spell.level)}
          </span>
          {spell.concentration && (
            <span className="text-[10px] font-display tracking-wider uppercase text-warning/60 bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
              Concentration
            </span>
          )}
          {spell.ritual && (
            <span className="text-[10px] font-display tracking-wider uppercase text-arcane/50 bg-arcane/10 px-2 py-0.5 rounded border border-arcane/20">
              Ritual
            </span>
          )}
          {isPrepared && (
            <span className="text-[10px] font-display tracking-wider uppercase text-heal bg-heal/10 px-2 py-0.5 rounded border border-heal/20">
              Prepared
            </span>
          )}
        </div>

        {/* Spell properties */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-cave/40 border border-gold/8">
            <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Casting Time</span>
            <p className="text-sm text-parchment/80 font-body">{spell.castingTime}</p>
          </div>
          <div className="p-2 rounded bg-cave/40 border border-gold/8">
            <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Range</span>
            <p className="text-sm text-parchment/80 font-body">{spell.range}</p>
          </div>
          <div className="p-2 rounded bg-cave/40 border border-gold/8">
            <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Components</span>
            <p className="text-sm text-parchment/80 font-mono">{spell.components}</p>
          </div>
          <div className="p-2 rounded bg-cave/40 border border-gold/8">
            <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Duration</span>
            <p className="text-sm text-parchment/80 font-body">{spell.duration}</p>
          </div>
        </div>

        {/* Damage / Save info */}
        {(spell.damage || spell.saveType) && (
          <div className="grid grid-cols-2 gap-2">
            {spell.damage && (
              <div className="p-2 rounded bg-cave/40 border border-gold/8">
                <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Damage</span>
                <p className="text-sm text-blood font-mono font-semibold">
                  {spell.damage} {spell.damageType || ''}
                </p>
              </div>
            )}
            {spell.saveType && (
              <div className="p-2 rounded bg-cave/40 border border-gold/8">
                <span className="text-[9px] font-display tracking-wider uppercase text-stone-text/50">Saving Throw</span>
                <p className="text-sm text-parchment/80 font-body capitalize">{spell.saveType}</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div
          className="p-3 rounded border border-gold/10 bg-cave/50"
          style={{ boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)' }}
        >
          <p className="text-sm text-parchment/80 leading-relaxed font-body">
            {spell.description}
          </p>
        </div>

        {/* Higher level description */}
        {spell.higherLevel && (
          <div
            className="p-3 rounded border border-arcane/10 bg-arcane/5"
            style={{ boxShadow: 'inset 0 0 6px rgba(155,109,255,0.05)' }}
          >
            <span className="text-[9px] font-display tracking-wider uppercase text-arcane/50">At Higher Levels</span>
            <p className="text-sm text-parchment/70 leading-relaxed font-body mt-1">
              {spell.higherLevel}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gold/10">
          {onCast && (
            <Button variant="primary" size="sm" onClick={() => onCast(spell)}>
              Cast Spell
            </Button>
          )}
          {onTogglePrepare && (
            <Button
              variant={isPrepared ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onTogglePrepare(spell.id)}
            >
              {isPrepared ? 'Unprepare' : 'Prepare'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
})

export default SpellDetail
