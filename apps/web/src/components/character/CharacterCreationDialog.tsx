import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { characterApi, type CreateCharacterRequest, type ServerCharacter } from '../../services/api'
import { useGameStore } from '../../stores/gameStore'

interface CharacterCreationDialogProps {
  isOpen: boolean
  onClose: () => void
}

const RACES = [
  { value: 'human', label: 'Human', description: '+1 to all ability scores' },
  { value: 'elf', label: 'Elf', description: '+2 DEX, Darkvision, Keen Senses' },
  { value: 'dwarf', label: 'Dwarf', description: '+2 CON, Darkvision, Dwarven Resilience' },
]

const CLASSES = [
  { value: 'fighter', label: 'Fighter', description: 'd10 HP, martial weapon master' },
  { value: 'wizard', label: 'Wizard', description: 'd6 HP, arcane spellcaster' },
  { value: 'rogue', label: 'Rogue', description: 'd8 HP, stealth and skill expert' },
]

const BACKGROUNDS = [
  { value: 'sage', label: 'Sage' },
  { value: 'soldier', label: 'Soldier' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'commoner', label: 'Commoner' },
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
          str: scores.str,
          dex: scores.dex,
          con: scores.con,
          int: scores.int,
          wis: scores.wis,
          cha: scores.cha,
        },
      }

      const response = await characterApi.create(request)

      if (response.status === 'success' && response.data) {
        // Convert server character to frontend Character type and add to party
        const serverChar = response.data as ServerCharacter
        const newChar = serverToClientCharacter(serverChar)

        if (gameState?.party) {
          updateParty([...gameState.party, newChar])
        } else {
          updateParty([newChar])
        }

        // Reset form and close
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Character Name */}
        <div>
          <label className="block text-sm font-semibold text-ink/70 mb-1">Character Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter character name"
            className="w-full px-3 py-2 border border-ink/20 rounded bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
            maxLength={50}
          />
        </div>

        {/* Race Selection */}
        <div>
          <label className="block text-sm font-semibold text-ink/70 mb-1">Race</label>
          <div className="grid grid-cols-3 gap-2">
            {RACES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRace(r.value)}
                className={`p-3 rounded border-2 text-left transition-colors ${
                  race === r.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-ink/10 hover:border-ink/30 bg-white'
                }`}
              >
                <div className="font-semibold text-ink">{r.label}</div>
                <div className="text-xs text-ink/60">{r.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-sm font-semibold text-ink/70 mb-1">Class</label>
          <div className="grid grid-cols-3 gap-2">
            {CLASSES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCharClass(c.value)}
                className={`p-3 rounded border-2 text-left transition-colors ${
                  charClass === c.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-ink/10 hover:border-ink/30 bg-white'
                }`}
              >
                <div className="font-semibold text-ink">{c.label}</div>
                <div className="text-xs text-ink/60">{c.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Background Selection */}
        <div>
          <label className="block text-sm font-semibold text-ink/70 mb-1">Background</label>
          <div className="grid grid-cols-4 gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBackground(b.value)}
                className={`px-3 py-2 rounded border-2 text-sm font-medium transition-colors ${
                  background === b.value
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-ink/10 hover:border-ink/30 bg-white text-ink/70'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ability Scores */}
        <div>
          <label className="block text-sm font-semibold text-ink/70 mb-1">
            Ability Scores
            <span className="ml-2 text-xs font-normal text-ink/40">
              Standard Array: {STANDARD_ARRAY.join(', ')}
            </span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {ABILITY_NAMES.map((ability) => (
              <div key={ability.key} className="flex flex-col items-center">
                <span className="text-xs font-semibold text-ink/60 mb-1">{ability.label}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={scores[ability.key]}
                  onChange={(e) => handleScoreChange(ability.key, e.target.value)}
                  className="w-full text-center px-1 py-2 border border-ink/20 rounded bg-white text-ink font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-xs text-primary-700 mt-1">
                  {getModifier(scores[ability.key])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
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

/**
 * Converts a server-side Character object to the frontend Character type.
 * The backend uses snake_case/camelCase differences and different field names.
 */
function serverToClientCharacter(char: ServerCharacter): import('../../types').Character {
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
      .map(([k]) => k as import('../../types').Ability),
    conditions: (char.conditions ?? []) as import('../../types').Condition[],
    equipment: [],
    inventory: char.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: 1,
      description: item.description,
    })),
  }
}
