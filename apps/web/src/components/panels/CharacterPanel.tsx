import { useGameStore } from '../../stores/gameStore'

interface AbilityScoreProps {
  name: string
  value: number
}

function AbilityScore({ name, value }: AbilityScoreProps) {
  const modifier = Math.floor((value - 10) / 2)
  const modifierStr = modifier >= 0 ? `+${modifier}` : modifier.toString()

  return (
    <div className="flex flex-col items-center p-2 bg-stone-100 rounded border border-ink/10">
      <span className="text-xs font-semibold text-ink/60 uppercase">{name.slice(0, 3)}</span>
      <span className="text-lg font-bold text-ink">{value}</span>
      <span className="text-xs text-primary-700">{modifierStr}</span>
    </div>
  )
}

export default function CharacterPanel() {
  const party = useGameStore((s) => s.gameState?.party)

  if (!party || party.length === 0) {
    return (
      <div className="p-4 bg-parchment rounded-lg border border-ink/10">
        <h2 className="font-display text-lg font-semibold text-ink mb-4">Party</h2>
        <p className="text-ink/50 text-sm italic">No characters yet. Start your adventure!</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-parchment rounded-lg border border-ink/10">
      <h2 className="font-display text-lg font-semibold text-ink mb-4">Party</h2>

      <div className="space-y-4">
        {party.map((character) => (
          <div key={character.id} className="bg-stone-50 rounded-lg p-3 border border-ink/10">
            {/* Name and Class */}
            <div className="mb-2">
              <h3 className="font-display font-semibold text-ink">{character.name}</h3>
              <p className="text-xs text-ink/60">
                Level {character.level} {character.class} ({character.race})
              </p>
            </div>

            {/* HP Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-ink/70 mb-1">
                <span>HP</span>
                <span>
                  {character.currentHitPoints}
                  {character.temporaryHitPoints > 0 && ` (+${character.temporaryHitPoints})`} /{' '}
                  {character.maxHitPoints}
                </span>
              </div>
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((character.currentHitPoints + character.temporaryHitPoints) /
                        character.maxHitPoints) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* AC and Speed */}
            <div className="flex gap-3 text-xs text-ink/70 mb-2">
              <span>AC: {character.armorClass}</span>
              <span>Speed: {character.speed}ft</span>
              <span>
                Init: {character.initiative > 0 ? '+' : ''}
                {character.initiative}
              </span>
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
              <div className="mt-2 flex flex-wrap gap-1">
                {character.conditions.map((condition) => (
                  <span
                    key={condition}
                    className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
