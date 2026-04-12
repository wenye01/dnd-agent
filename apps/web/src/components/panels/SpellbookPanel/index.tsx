import { useState, useMemo } from 'react'
import { useGameStore } from '../../../stores/gameStore'
import { eventBus } from '../../../events/eventBus'
import { GameEvents } from '../../../events/gameEvents'
import type { Spell, SpellSchool } from '../../../types'
import { Panel } from '../../ui'
import { SpellSlotsBar } from './SpellSlotsBar'
import { SpellGroup } from './SpellGroup'
import { SpellDetail } from './SpellDetail'
import { ConcentrationBadge } from './ConcentrationBadge'

// Mock spell data for development (Phase 4 will replace with real API data)
const MOCK_SPELLS: Spell[] = [
  {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    level: 0,
    school: 'evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    components: 'V, S',
    description: 'A mote of fire streaks toward a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.',
    ritual: false,
    concentration: false,
    damage: '1d10',
    damageType: 'fire',
    higherLevel: 'The damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).',
  },
  {
    id: 'mage_hand',
    name: 'Mage Hand',
    level: 0,
    school: 'conjuration',
    castingTime: '1 action',
    range: '30 feet',
    duration: '1 minute',
    components: 'V, S',
    description: 'A spectral, floating hand appears at a point you choose within range. You can use the hand to manipulate objects, open unlocked doors, or stow items.',
    ritual: false,
    concentration: false,
  },
  {
    id: 'prestidigitation',
    name: 'Prestidigitation',
    level: 0,
    school: 'transmutation',
    castingTime: '1 action',
    range: '10 feet',
    duration: '1 hour',
    components: 'V, S',
    description: 'This spell is a minor magical trick that novice spellcasters use for practice. You create one of a number of magical effects.',
    ritual: false,
    concentration: false,
  },
  {
    id: 'magic_missile',
    name: 'Magic Missile',
    level: 1,
    school: 'evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    components: 'V, S',
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. Each dart deals 1d4 + 1 force damage.',
    ritual: false,
    concentration: false,
    damage: '3d4 + 3',
    damageType: 'force',
    higherLevel: 'When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.',
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    duration: '1 round',
    components: 'V, S',
    description: 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.',
    ritual: false,
    concentration: false,
  },
  {
    id: 'mage_armor',
    name: 'Mage Armor',
    level: 1,
    school: 'abjuration',
    castingTime: '1 action',
    range: 'Touch',
    duration: '8 hours',
    components: 'V, S, M',
    description: 'You touch a willing creature who isn\'t wearing armor, and a protective magical force surrounds it until the spell ends. The target\'s base AC becomes 13 + its Dexterity modifier.',
    ritual: false,
    concentration: false,
  },
  {
    id: 'hold_person',
    name: 'Hold Person',
    level: 2,
    school: 'enchantment',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Concentration, up to 1 minute',
    components: 'V, S, M',
    description: 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.',
    ritual: false,
    concentration: true,
    saveType: 'wisdom',
    higherLevel: 'When you cast this spell using a spell slot of 3rd level or higher, you can target one additional humanoid for each slot level above 2nd.',
  },
  {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: 'evocation',
    castingTime: '1 action',
    range: '150 feet',
    duration: 'Instantaneous',
    components: 'V, S, M',
    description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere must make a Dexterity saving throw.',
    ritual: false,
    concentration: false,
    damage: '8d6',
    damageType: 'fire',
    saveType: 'dexterity',
    higherLevel: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
  },
]

const SPELLCASTER_CLASSES = [
  'wizard', 'sorcerer', 'cleric', 'bard', 'druid', 'warlock',
  'paladin', 'ranger',
]

const SCHOOL_FILTER_OPTIONS: { value: SpellSchool | 'all'; label: string }[] = [
  { value: 'all', label: 'All Schools' },
  { value: 'abjuration', label: 'Abjuration' },
  { value: 'conjuration', label: 'Conjuration' },
  { value: 'divination', label: 'Divination' },
  { value: 'enchantment', label: 'Enchantment' },
  { value: 'evocation', label: 'Evocation' },
  { value: 'illusion', label: 'Illusion' },
  { value: 'necromancy', label: 'Necromancy' },
  { value: 'transmutation', label: 'Transmutation' },
]

export default function SpellbookPanel() {
  const party = useGameStore((s) => s.gameState?.party)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterSchool, setFilterSchool] = useState<SpellSchool | 'all'>('all')
  const [preparedSpellIds, setPreparedSpellIds] = useState<string[]>([
    'fire_bolt', 'magic_missile', 'shield', 'mage_armor', 'fireball',
  ])

  // Find spellcaster character
  const spellcaster = party?.find(
    (c) => SPELLCASTER_CLASSES.includes(c.class.toLowerCase())
  )
  const characterId = selectedCharacterId || spellcaster?.id || null
  const character = party?.find((c) => c.id === characterId)

  // Get spells for this character (using mock data keyed by knownSpells)
  const characterSpells = useMemo(() => {
    if (!character?.knownSpells || character.knownSpells.length === 0) {
      // Default to all mock spells if no knownSpells defined
      return MOCK_SPELLS
    }
    return MOCK_SPELLS.filter((s) => character.knownSpells.includes(s.id))
  }, [character])

  // Filter and group spells by level
  const filteredSpells = useMemo(() => {
    const filtered = filterSchool === 'all'
      ? characterSpells
      : characterSpells.filter((s) => s.school === filterSchool)

    // Group by level
    const groups = new Map<number, Spell[]>()
    for (const spell of filtered) {
      const level = spell.level
      const group = groups.get(level)
      if (group) {
        group.push(spell)
      } else {
        groups.set(level, [spell])
      }
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b)
  }, [characterSpells, filterSchool])

  // Handlers
  const handleSpellSelect = (spell: Spell) => {
    setSelectedSpell(spell)
    setIsDetailOpen(true)
  }

  const handleCast = (spell: Spell) => {
    eventBus.emit(GameEvents.SPELL_CAST, {
      characterId,
      spellId: spell.id,
      level: spell.level,
    })
    setIsDetailOpen(false)
  }

  const handleTogglePrepare = (spellId: string) => {
    setPreparedSpellIds((prev) =>
      prev.includes(spellId)
        ? prev.filter((id) => id !== spellId)
        : [...prev, spellId]
    )
    eventBus.emit(
      preparedSpellIds.includes(spellId) ? GameEvents.SPELL_UNPREPARE : GameEvents.SPELL_PREPARE,
      { characterId, spellId }
    )
  }

  if (!party || party.length === 0 || !spellcaster) {
    return (
      <Panel title="Spellbook" variant="parchment">
        <div className="flex flex-col items-center justify-center py-8 text-stone-text/40">
          <div className="text-2xl mb-2 opacity-30">{'\u{1F4D6}'}</div>
          <p className="text-xs font-display tracking-wider uppercase">No spellcaster in party</p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel title="Spellbook" variant="parchment">
      <div className="p-3 space-y-3">
        {/* Character selector (for multi-caster parties) */}
        {party.filter((c) => SPELLCASTER_CLASSES.includes(c.class.toLowerCase())).length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {party
              .filter((c) => SPELLCASTER_CLASSES.includes(c.class.toLowerCase()))
              .map((char) => (
                <button
                  key={char.id}
                  className={`
                    px-2 py-1 rounded text-[10px] font-display tracking-wider uppercase transition-all duration-200 cursor-pointer
                    ${char.id === characterId
                      ? 'bg-arcane/15 text-arcane border border-arcane/25'
                      : 'text-stone-text/50 hover:text-parchment hover:bg-cave/50 border border-transparent'
                    }
                  `}
                  onClick={() => setSelectedCharacterId(char.id)}
                >
                  {char.name}
                </button>
              ))}
          </div>
        )}

        {character && (
          <>
            {/* Concentration badge */}
            <ConcentrationBadge
              concentration={character.concentration || null}
              onBreak={() => {
                // Emit concentration break event
                eventBus.emit(GameEvents.SPELL_CAST, {
                  characterId,
                  action: 'break_concentration',
                })
              }}
            />

            {/* Spell slots */}
            <SpellSlotsBar spellSlots={character.spellSlots} />

            {/* School filter */}
            <div className="flex items-center gap-2">
              <select
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value as SpellSchool | 'all')}
                className="bg-cave/50 border border-arcane/10 rounded px-1.5 py-0.5 text-[9px] font-display text-parchment/70 tracking-wider uppercase cursor-pointer"
                style={{ background: 'rgba(26, 24, 38, 0.6)' }}
              >
                {SCHOOL_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <span className="text-[9px] text-stone-text/30 font-mono ml-auto">
                {characterSpells.length} spell{characterSpells.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Spell groups by level */}
            <div className="space-y-3">
              {filteredSpells.map(([level, spells]) => (
                <SpellGroup
                  key={level}
                  level={level}
                  spells={spells}
                  preparedSpellIds={preparedSpellIds}
                  selectedSpellId={selectedSpell?.id}
                  onSelect={handleSpellSelect}
                  onTogglePrepare={handleTogglePrepare}
                  onCast={handleCast}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Spell detail modal */}
      <SpellDetail
        spell={selectedSpell}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onCast={handleCast}
        onTogglePrepare={handleTogglePrepare}
        isPrepared={selectedSpell ? preparedSpellIds.includes(selectedSpell.id) : false}
      />
    </Panel>
  )
}

export { SpellSlotsBar } from './SpellSlotsBar'
export { SpellGroup } from './SpellGroup'
export { SpellDetail } from './SpellDetail'
export { ConcentrationBadge } from './ConcentrationBadge'
