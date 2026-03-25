import type { Character } from '../../types'
import { HealthBar } from '../ui/HealthBar'
import { Tooltip } from '../ui/Tooltip'

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
      <div className="flex flex-col items-center p-2 bg-stone-100 rounded border border-ink/10 hover:bg-stone-200 transition-colors cursor-help">
        <span className="text-xs font-semibold text-ink/60">{name.slice(0, 3)}</span>
        <span className="text-lg font-bold text-ink">{value}</span>
        <span className="text-xs text-primary-700 font-medium">{modifierStr}</span>
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
        bg-stone-50 rounded-lg p-3 border-2 transition-all cursor-pointer
        ${isActive ? 'border-primary-500 shadow-md' : 'border-ink/10 hover:border-ink/30'}
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
    >
      {/* Header: Name and Class */}
      <div className="mb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display font-semibold text-ink text-lg">{character.name}</h3>
            <p className="text-sm text-ink/60">
              Level {character.level} {character.class} ({character.race})
            </p>
          </div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-3">
        <HealthBar
          current={character.currentHitPoints}
          max={character.maxHitPoints}
          temporary={character.temporaryHitPoints}
          size="md"
        />
      </div>

      {/* AC, Speed, Initiative */}
      <div className="flex gap-4 text-sm text-ink/70 mb-3">
        <Tooltip content="Armor Class">
          <div className="flex items-center gap-1">
            <span className="font-semibold">AC</span>
            <span className="font-bold text-ink">{character.armorClass}</span>
          </div>
        </Tooltip>
        <Tooltip content="Speed">
          <div className="flex items-center gap-1">
            <span className="font-semibold">SPD</span>
            <span>{character.speed}ft</span>
          </div>
        </Tooltip>
        <Tooltip content="Initiative">
          <div className="flex items-center gap-1">
            <span className="font-semibold">INIT</span>
            <span className={character.initiative > 0 ? 'text-green-600 font-bold' : character.initiative < 0 ? 'text-red-600 font-bold' : ''}>
              {character.initiative > 0 ? '+' : ''}
              {character.initiative}
            </span>
          </div>
        </Tooltip>
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
        <div className="mt-3 flex flex-wrap gap-1">
          {character.conditions.map((condition) => (
            <span
              key={condition}
              className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded border border-red-200 font-medium"
            >
              {condition}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
