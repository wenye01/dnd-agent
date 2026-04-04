import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { characterApi, type CreateCharacterRequest, type ServerCharacter } from '../../services/api'
import { useGameStore } from '../../stores/gameStore'
import { Sword, Shield, Wand2, User } from 'lucide-react'
import type { Character, Ability, Condition, DeathSaves, EquipmentSlot, SpellSlots } from '../../types'

interface CharacterCreationDialogProps {
  isOpen: boolean
  onClose: () => void
}

const RACES = [
  {
    value: 'human',
    label: 'Human',
    description: '+1 to all ability scores',
    icon: User,
  },
  {
    value: 'elf',
    label: 'Elf',
    description: '+2 DEX, Darkvision, Keen Senses',
    icon: User,
  },
  {
    value: 'dwarf',
    label: 'Dwarf',
    description: '+2 CON, Darkvision, Dwarven Resilience',
    icon: User,
  },
  {
    value: 'halfling',
    label: 'Halfling',
    description: '+2 DEX, Lucky, Brave',
    icon: User,
  },
  {
    value: 'dragonborn',
    label: 'Dragonborn',
    description: '+2 STR, +1 CHA, Breath Weapon',
    icon: User,
  },
  {
    value: 'gnome',
    label: 'Gnome',
    description: '+2 INT, Darkvision, Gnome Cunning',
    icon: User,
  },
  {
    value: 'half-elf',
    label: 'Half-Elf',
    description: '+2 CHA, two +1s, Darkvision, Fey Ancestry',
    icon: User,
  },
  {
    value: 'half-orc',
    label: 'Half-Orc',
    description: '+2 STR, +1 CON, Darkvision, Relentless Endurance',
    icon: User,
  },
  {
    value: 'tiefling',
    label: 'Tiefling',
    description: '+2 CHA, +1 INT, Darkvision, Hellish Resistance',
    icon: User,
  },
]

const CLASSES = [
  {
    value: 'fighter',
    label: 'Fighter',
    description: 'd10 HP, martial weapon master',
    icon: Sword,
    accent: 'text-blood',
  },
  {
    value: 'wizard',
    label: 'Wizard',
    description: 'd6 HP, arcane spellcaster',
    icon: Wand2,
    accent: 'text-arcane',
  },
  {
    value: 'rogue',
    label: 'Rogue',
    description: 'd8 HP, stealth and skill expert',
    icon: Shield,
    accent: 'text-gold',
  },
  {
    value: 'cleric',
    label: 'Cleric',
    description: 'd8 HP, divine spellcaster and healer',
    icon: Wand2,
    accent: 'text-heal',
  },
  {
    value: 'ranger',
    label: 'Ranger',
    description: 'd10 HP, wilderness warrior',
    icon: Sword,
    accent: 'text-heal',
  },
  {
    value: 'bard',
    label: 'Bard',
    description: 'd8 HP, versatile performer and caster',
    icon: Wand2,
    accent: 'text-arcane',
  },
  {
    value: 'paladin',
    label: 'Paladin',
    description: 'd10 HP, holy warrior with divine magic',
    icon: Sword,
    accent: 'text-gold',
  },
  {
    value: 'sorcerer',
    label: 'Sorcerer',
    description: 'd6 HP, innate arcane magic',
    icon: Wand2,
    accent: 'text-arcane',
  },
  {
    value: 'warlock',
    label: 'Warlock',
    description: 'd8 HP, pact magic caster',
    icon: Wand2,
    accent: 'text-arcane',
  },
  {
    value: 'druid',
    label: 'Druid',
    description: 'd8 HP, nature spellcaster and shapeshifter',
    icon: Wand2,
    accent: 'text-heal',
  },
  {
    value: 'monk',
    label: 'Monk',
    description: 'd8 HP, martial arts and ki',
    icon: Shield,
    accent: 'text-gold',
  },
  {
    value: 'barbarian',
    label: 'Barbarian',
    description: 'd12 HP, rage-fueled warrior',
    icon: Sword,
    accent: 'text-blood',
  },
]

const BACKGROUNDS = [
  { value: 'sage', label: 'Sage' },
  { value: 'soldier', label: 'Soldier' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'commoner', label: 'Commoner' },
  { value: 'noble', label: 'Noble' },
  { value: 'folk_hero', label: 'Folk Hero' },
  { value: 'acolyte', label: 'Acolyte' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'outlander', label: 'Outlander' },
  { value: 'sailor', label: 'Sailor' },
  { value: 'urchin', label: 'Urchin' },
  { value: 'guild_artisan', label: 'Guild Artisan' },
]

const ABILITY_NAMES = [
  { key: 'str', label: 'STR', full: 'Strength' },
  { key: 'dex', label: 'DEX', full: 'Dexterity' },
  { key: 'con', label: 'CON', full: 'Constitution' },
  { key: 'int', label: 'INT', full: 'Intelligence' },
  { key: 'wis', label: 'WIS', full: 'Wisdom' },
  { key: 'cha', label: 'CHA', full: 'Charisma' },
] as const

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : mod.toString()
}

export function CharacterCreationDialog({ isOpen, onClose }: CharacterCreationDialogProps) {
  const [name, setName] = useState('')
  const [race, setRace] = useState('human')
  const [charClass, setCharClass] = useState('fighter')
  const [background, setBackground] = useState('sage')
  const [scores, setScores] = useState<Record<string, number>>({
    str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateParty = useGameStore((s) => s.updateParty)
  const gameState = useGameStore((s) => s.gameState)

  const handleScoreChange = (key: string, value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 1 && num <= 20) {
      setScores((prev) => ({ ...prev, [key]: num }))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Character name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const request: CreateCharacterRequest = {
        name: name.trim(),
        race,
        class: charClass,
        background,
        abilityScores: {
          strength: scores.str,
          dexterity: scores.dex,
          constitution: scores.con,
          intelligence: scores.int,
          wisdom: scores.wis,
          charisma: scores.cha,
        },
      }

      const response = await characterApi.create(request)

      if (response.status === 'success' && response.data) {
        const serverChar = response.data as ServerCharacter
        const newChar = serverToClientCharacter(serverChar)

        if (gameState?.party) {
          updateParty([...gameState.party, newChar])
        } else {
          updateParty([newChar])
        }

        // Reset form
        setName('')
        setRace('human')
        setCharClass('fighter')
        setBackground('sage')
        setScores({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 })
        onClose()
      } else {
        setError(response.error?.message ?? 'Failed to create character')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Character" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-blood/8 border border-blood/15 rounded-md text-blood/90 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Character Name */}
        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/70 mb-1.5 tracking-wider uppercase">
            Character Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter character name"
            className="w-full px-4 py-2.5 rounded-md border border-gold/10 bg-metal/25 text-parchment placeholder:text-stone-text/35 font-body text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/20"
            maxLength={50}
          />
        </div>

        {/* Race Selection */}
        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/70 mb-2 tracking-wider uppercase">
            Race
          </label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {RACES.map((r) => {
              const Icon = r.icon
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRace(r.value)}
                  className={`p-3 rounded-md border text-left transition-all duration-200 cursor-pointer ${
                    race === r.value
                      ? 'border-gold/40 bg-gold/8 shadow-[0_0_12px_rgba(212,168,67,0.06)]'
                      : 'border-gold/6 bg-metal/15 hover:border-gold/15 hover:bg-metal/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${race === r.value ? 'text-gold/70' : 'text-stone-text/30'}`} />
                    <div className="font-display font-semibold text-sm text-parchment">{r.label}</div>
                  </div>
                  <div className="text-[11px] text-stone-text/50 mt-1 ml-6">{r.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/70 mb-2 tracking-wider uppercase">
            Class
          </label>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {CLASSES.map((c) => {
              const Icon = c.icon
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCharClass(c.value)}
                  className={`p-3 rounded-md border text-left transition-all duration-200 cursor-pointer ${
                    charClass === c.value
                      ? 'border-gold/40 bg-gold/8 shadow-[0_0_12px_rgba(212,168,67,0.06)]'
                      : 'border-gold/6 bg-metal/15 hover:border-gold/15 hover:bg-metal/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${charClass === c.value ? c.accent : 'text-stone-text/30'}`} />
                    <div className="font-display font-semibold text-sm text-parchment">{c.label}</div>
                  </div>
                  <div className="text-[11px] text-stone-text/50 mt-1 ml-6">{c.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Background Selection */}
        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/70 mb-2 tracking-wider uppercase">
            Background
          </label>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBackground(b.value)}
                className={`px-3 py-2 rounded-md border text-sm font-display font-medium transition-all duration-200 cursor-pointer ${
                  background === b.value
                    ? 'border-gold/40 bg-gold/8 text-gold'
                    : 'border-gold/6 bg-metal/15 text-antique/50 hover:border-gold/15 hover:text-antique'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ability Scores */}
        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/70 mb-2 tracking-wider uppercase">
            Ability Scores
            <span className="ml-2 text-[10px] font-normal text-stone-text/40 normal-case tracking-normal font-body">
              Standard Array: {STANDARD_ARRAY.join(', ')}
            </span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {ABILITY_NAMES.map((ability) => (
              <div key={ability.key} className="flex flex-col items-center">
                <span className="text-[9px] font-display font-semibold text-stone-text/60 mb-1 tracking-wider uppercase">
                  {ability.label}
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={scores[ability.key]}
                  onChange={(e) => handleScoreChange(ability.key, e.target.value)}
                  className="w-full text-center px-1 py-2 border border-gold/10 rounded-md bg-metal/25 text-parchment font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/20 transition-all duration-200"
                />
                <span className="text-[11px] text-gold/60 font-mono mt-1 font-medium">
                  {getModifier(scores[ability.key])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gold/8">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            Create Character
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function serverToClientCharacter(char: ServerCharacter): Character {
  return {
    id: char.id,
    name: char.name,
    race: char.race,
    class: char.class,
    level: char.level,
    background: char.background,
    alignment: '',
    abilityScores: {
      strength: char.stats.strength,
      dexterity: char.stats.dexterity,
      constitution: char.stats.constitution,
      intelligence: char.stats.intelligence,
      wisdom: char.stats.wisdom,
      charisma: char.stats.charisma,
    },
    maxHitPoints: char.maxHp,
    currentHitPoints: char.hp,
    temporaryHitPoints: 0,
    armorClass: char.ac,
    speed: char.speed,
    initiative: Math.floor((char.stats.dexterity - 10) / 2),
    proficiencyBonus: char.proficiencyBonus,
    skills: char.skills,
    savingThrows: Object.entries(char.savingThrows)
      .filter(([, v]) => v)
      .map(([k]) => k as Ability),
    conditions: (char.conditions ?? []) as Condition[],
    deathSaves: char.deathSaves as DeathSaves | undefined,
    equipment: char.equipment ?? [],
    inventory: char.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: 1,
      description: item.description,
    })),
    spellSlots: char.spellSlots as SpellSlots | undefined,
  }
}
