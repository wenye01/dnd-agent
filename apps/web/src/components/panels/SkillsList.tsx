import React from 'react'
import type { AbilityScores, SkillProficiencies } from '../../types'
import { getModifier, formatModifier } from '../../utils/modifiers'

// D&D 5e skill definitions: name -> associated ability
const SKILL_DEFINITIONS: Array<{ name: string; label: string; ability: keyof AbilityScores }> = [
  { name: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { name: 'animal_handling', label: 'Animal Handling', ability: 'wisdom' },
  { name: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { name: 'athletics', label: 'Athletics', ability: 'strength' },
  { name: 'deception', label: 'Deception', ability: 'charisma' },
  { name: 'history', label: 'History', ability: 'intelligence' },
  { name: 'insight', label: 'Insight', ability: 'wisdom' },
  { name: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { name: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { name: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { name: 'nature', label: 'Nature', ability: 'intelligence' },
  { name: 'perception', label: 'Perception', ability: 'wisdom' },
  { name: 'performance', label: 'Performance', ability: 'charisma' },
  { name: 'persuasion', label: 'Persuasion', ability: 'charisma' },
  { name: 'religion', label: 'Religion', ability: 'intelligence' },
  { name: 'sleight_of_hand', label: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { name: 'survival', label: 'Survival', ability: 'wisdom' },
]

const ABILITY_ABBR: Record<keyof AbilityScores, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

interface SkillsListProps {
  skills: SkillProficiencies
  abilityScores: AbilityScores
  proficiencyBonus: number
}

export const SkillsList = React.memo(function SkillsList({ skills, abilityScores, proficiencyBonus }: SkillsListProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        <span className="text-[10px] font-display font-bold text-gold/50 tracking-[0.15em] uppercase">
          Skills
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-gold/20 to-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {SKILL_DEFINITIONS.map((skill) => {
          const isProficient = skills[skill.name] === true
          const abilityMod = getModifier(abilityScores[skill.ability])
          const totalMod = abilityMod + (isProficient ? proficiencyBonus : 0)

          return (
            <div
              key={skill.name}
              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-gold/5 transition-colors duration-150"
            >
              {/* Proficiency indicator */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isProficient
                    ? 'bg-gold'
                    : 'bg-transparent border border-gold/20'
                }`}
              />
              <span className="text-[10px] text-parchment/80 flex-1 truncate font-body">
                {skill.label}
              </span>
              <span className="text-[8px] text-gold/35 font-mono uppercase flex-shrink-0">
                {ABILITY_ABBR[skill.ability]}
              </span>
              <span className={`text-[10px] font-mono font-semibold flex-shrink-0 min-w-[24px] text-right ${
                totalMod > 0
                  ? 'text-heal'
                  : totalMod < 0
                    ? 'text-blood/80'
                    : 'text-parchment/60'
              }`}>
                {formatModifier(totalMod)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default SkillsList
