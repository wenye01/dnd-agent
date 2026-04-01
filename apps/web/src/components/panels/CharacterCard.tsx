import type { Character } from '../../types'
import { HealthBar } from '../ui/HealthBar'
import { Tooltip } from '../ui/Tooltip'
import { Shield, Zap, Heart } from 'lucide-react'

export interface CharacterCardProps {
  character: Character
  onSelect?: () => void
  isActive?: boolean
}

const abilityFullNames: Record<keyof import('../../types').AbilityScores, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
}

function AbilityScore({ name, value }: { name: keyof import('../../types').AbilityScores; value: number }) {
  const modifier = Math.floor((value - 10) / 2)
  const modifierStr = modifier >= 0 ? `+${modifier}` : modifier.toString()

  return (
    <Tooltip content={abilityFullNames[name]}>
      <div className="stat-badge cursor-help">
        <span className="text-[9px] font-display font-semibold text-stone-text uppercase tracking-wider">{name.slice(0, 3)}</span>
        <span className="text-sm font-mono font-bold text-parchment">{value}</span>
        <span className="text-[10px] text-gold font-mono font-medium">{modifierStr}</span>
      </div>
    </Tooltip>
  )
}

export function CharacterCard({ character, onSelect, isActive }: CharacterCardProps) {
  const abilities: Array<keyof import('../../types').AbilityScores> = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ]

  return (
    <div
      className={`
        bg-cave/50 rounded-lg p-3 border transition-all cursor-pointer group
        ${isActive
          ? 'border-gold/40 shadow-[0_0_16px_rgba(212,168,67,0.1)]'
          : 'border-gold/8 hover:border-gold/20'}
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
    >
      {/* Header: Name and Class */}
      <div className="mb-2.5 flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold text-gold text-sm tracking-wide group-hover:text-gold-light transition-colors">
            {character.name}
          </h3>
          <p className="text-[11px] text-antique/60 mt-0.5">
            Level {character.level} {character.class} &middot; {character.race}
          </p>
        </div>
        <div className="text-[10px] font-display text-gold/25 bg-gold/5 px-1.5 py-0.5 rounded tracking-wider uppercase">
          {character.class}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2.5">
        <HealthBar
          current={character.currentHitPoints}
          max={character.maxHitPoints}
          temporary={character.temporaryHitPoints}
          size="md"
          label="HP"
        />
      </div>

      {/* AC, Speed, Initiative as chips */}
      <div className="flex gap-1.5 text-xs text-antique mb-2.5">
        <div className="flex items-center gap-1 px-2 py-1 bg-cave/50 rounded border border-gold/8">
          <Shield className="w-3 h-3 text-stone-text/50" />
          <span className="text-[10px] text-stone-text font-display">AC</span>
          <span className="font-mono font-bold text-parchment">{character.armorClass}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-cave/50 rounded border border-gold/8">
          <Zap className="w-3 h-3 text-stone-text/50" />
          <span className="text-[10px] text-stone-text font-display">SPD</span>
          <span className="font-mono text-parchment">{character.speed}ft</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-cave/50 rounded border border-gold/8">
          <Heart className="w-3 h-3 text-stone-text/50" />
          <span className="text-[10px] text-stone-text font-display">INIT</span>
          <span className={`font-mono font-bold ${character.initiative > 0 ? 'text-heal' : character.initiative < 0 ? 'text-blood' : 'text-parchment'}`}>
            {character.initiative > 0 ? '+' : ''}{character.initiative}
          </span>
        </div>
      </div>

      {/* Ability Scores */}
      <div className="grid grid-cols-6 gap-1">
        {abilities.map((ability) => (
          <AbilityScore
            key={ability}
            name={ability}
            value={character.abilityScores[ability] ?? 10}
          />
        ))}
      </div>

      {/* Conditions */}
      {character.conditions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {character.conditions.map((condition) => (
            <span
              key={condition}
              className="text-[10px] px-2 py-0.5 bg-blood/10 text-blood/80 border border-blood/15 rounded-full font-medium"
            >
              {condition}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
