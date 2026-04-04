import type { Ability, AbilityScores } from '../../types'
import { getModifier, formatModifier } from '../../utils/modifiers'

const ABILITY_LIST: Array<{ key: Ability; label: string }> = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
]

interface SavingThrowsProps {
  savingThrows: Ability[]
  abilityScores: AbilityScores
  proficiencyBonus: number
}

export function SavingThrows({ savingThrows, abilityScores, proficiencyBonus }: SavingThrowsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        <span className="text-[10px] font-display font-bold text-gold/50 tracking-[0.15em] uppercase">
          Saving Throws
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {ABILITY_LIST.map(({ key, label }) => {
          const isProficient = savingThrows.includes(key)
          const abilityMod = getModifier(abilityScores[key])
          const totalMod = abilityMod + (isProficient ? proficiencyBonus : 0)

          return (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-gold/8 bg-cave/30"
            >
              {/* Proficiency dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isProficient
                    ? 'bg-gold'
                    : 'bg-transparent border border-gold/20'
                }`}
              />
              <span className="text-[9px] font-display font-semibold text-gold/60 uppercase tracking-wider">
                {label}
              </span>
              <span
                className={`text-[11px] font-mono font-bold ml-auto ${
                  totalMod > 0
                    ? 'text-heal'
                    : totalMod < 0
                      ? 'text-blood/80'
                      : 'text-parchment/60'
                }`}
              >
                {formatModifier(totalMod)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SavingThrows
