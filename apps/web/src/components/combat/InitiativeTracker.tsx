/**
 * InitiativeTracker: sorted list of combatants with active turn marker.
 */
import { useCombatStore } from '../../stores/combatStore'
import type { Combatant } from '../../types'

export function InitiativeTracker() {
  const combat = useCombatStore((s) => s.combat)
  const currentUnitId = useCombatStore((s) => s.currentUnitId)

  if (!combat) return null

  // Sort by initiative descending
  const sorted = [...combat.initiatives]
    .sort((a, b) => b.initiative - a.initiative)
    .map((entry) => {
      const combatant = combat.participants.find((p) => p.id === entry.characterId)
      return { ...entry, combatant }
    })
    .filter((entry) => entry.combatant)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] font-display text-gold/60 uppercase tracking-wider px-2 py-1 border-b border-gold/10">
        Initiative
      </div>
      {sorted.map((entry) => {
        const isActive = entry.characterId === currentUnitId
        const combatant = entry.combatant as Combatant
        const isPlayer = combatant.type === 'player'
        const hpPct = combatant.maxHp > 0 ? (combatant.currentHp / combatant.maxHp) * 100 : 0
        const isDead = combatant.currentHp <= 0

        return (
          <div
            key={entry.characterId}
            className={`flex items-center gap-2 px-2 py-1 text-[10px] transition-colors ${
              isActive
                ? 'bg-gold/10 border-l-2 border-gold'
                : isDead
                  ? 'opacity-40'
                  : 'border-l-2 border-transparent'
            }`}
          >
            {/* Team color dot */}
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isPlayer ? 'bg-blue-400' : 'bg-red-400'
              }`}
            />
            {/* Name */}
            <span
              className={`flex-1 truncate ${
                isActive
                  ? 'text-gold font-semibold'
                  : isDead
                    ? 'text-stone-text/30 line-through'
                    : 'text-stone-text/70'
              }`}
            >
              {combatant.name}
            </span>
            {/* Initiative score */}
            <span className="text-stone-text/40 font-mono">{entry.initiative}</span>
            {/* Mini HP bar */}
            <div className="w-8 h-1 bg-stone-text/10 rounded-full overflow-hidden flex-shrink-0">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor:
                    hpPct > 60 ? '#44ff44' : hpPct > 30 ? '#ffff00' : '#ff4444',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
