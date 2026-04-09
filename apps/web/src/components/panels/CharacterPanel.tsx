import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { Panel, HealthBar } from '../ui'
import { Shield, Zap, Heart, ChevronDown, ChevronRight } from 'lucide-react'
import { EquipmentSlots } from './EquipmentSlots'
import { SkillsList } from './SkillsList'
import { SpellSlotsBar } from './SpellSlotsBar'
import { SavingThrows } from './SavingThrows'
import { DeathSavesDisplay } from './DeathSavesDisplay'
import { AbilityScore, StatChip } from './CharacterStats'
import { EmptyPartyState } from './EmptyPartyState'

function CharacterSection({ character }: { character: import('../../types').Character }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-cave/60 rounded-lg border border-gold/15 hover:border-gold/25 transition-all duration-200 group"
      style={{ boxShadow: '0 0 8px rgba(0,0,0,0.3), inset 0 0 6px rgba(0,0,0,0.2)' }}
    >
      {/* Header - always visible */}
      <div
        className="p-3 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((prev) => !prev)
          }
        }}
      >
        {/* Name and Class header */}
        <div className="mb-2.5 flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-gold text-sm tracking-wide group-hover:text-gold-light transition-colors">
              {character.name}
            </h3>
            <p className="text-[11px] text-antique/70 mt-0.5">
              Level {character.level} {character.class} &middot; {character.race}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-display text-gold/40 bg-gold/8 px-1.5 py-0.5 rounded tracking-wider uppercase">
              {character.class}
            </div>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gold/30" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gold/30" />
            )}
          </div>
        </div>

        {/* HP Bar */}
        <div className="mb-2.5">
          <HealthBar
            current={character.currentHitPoints}
            max={character.maxHitPoints}
            temporary={character.temporaryHitPoints}
            size="sm"
            label="HP"
          />
        </div>

        {/* AC, Speed, Initiative - as compact chips */}
        <div className="flex gap-1.5 mb-2.5">
          <StatChip icon={Shield} label="AC" value={character.armorClass} />
          <StatChip icon={Zap} label="SPD" value={`${character.speed}ft`} />
          <StatChip
            icon={Heart}
            label="INIT"
            value={`${character.initiative > 0 ? '+' : ''}${character.initiative}`}
            color={character.initiative > 0 ? 'text-heal' : character.initiative < 0 ? 'text-blood' : 'text-parchment'}
          />
        </div>

        {/* Ability Scores */}
        <div className="grid grid-cols-6 gap-1">
          <AbilityScore name="STR" value={character.abilityScores.strength} />
          <AbilityScore name="DEX" value={character.abilityScores.dexterity} />
          <AbilityScore name="CON" value={character.abilityScores.constitution} />
          <AbilityScore name="INT" value={character.abilityScores.intelligence} />
          <AbilityScore name="WIS" value={character.abilityScores.wisdom} />
          <AbilityScore name="CHA" value={character.abilityScores.charisma} />
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

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gold/10 pt-3">
          {/* Saving Throws */}
          <SavingThrows
            savingThrows={character.savingThrows}
            abilityScores={character.abilityScores}
            proficiencyBonus={character.proficiencyBonus}
          />

          {/* Skills */}
          <SkillsList
            skills={character.skills}
            abilityScores={character.abilityScores}
            proficiencyBonus={character.proficiencyBonus}
          />

          {/* Spell Slots (only for casters) */}
          <SpellSlotsBar
            spellSlots={character.spellSlots}
            characterClass={character.class}
          />

          {/* Equipment */}
          <EquipmentSlots equipment={character.equipment} />

          {/* Death Saves (only when HP = 0) */}
          <DeathSavesDisplay
            deathSaves={character.deathSaves}
            currentHitPoints={character.currentHitPoints}
          />
        </div>
      )}
    </div>
  )
}

export default function CharacterPanel() {
  const party = useGameStore((s) => s.gameState?.party)

  if (!party || party.length === 0) {
    return <EmptyPartyState />
  }

  return (
    <Panel title="Party" variant="parchment">
      <div className="space-y-3">
        {party.map((character) => (
          <CharacterSection key={character.id} character={character} />
        ))}
      </div>
    </Panel>
  )
}
