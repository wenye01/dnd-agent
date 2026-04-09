/**
 * TurnIndicator: top bar showing current unit name, team color, round number.
 */
import { useCombatStore } from '../../stores/combatStore'

export function TurnIndicator() {
  const combat = useCombatStore((s) => s.combat)
  const currentUnitId = useCombatStore((s) => s.currentUnitId)

  if (!combat) return null

  const currentUnit = combat.participants.find((p) => p.id === currentUnitId)
  const teamColor = currentUnit?.type === 'player' ? 'text-blue-400' : 'text-red-400'
  const roundText = combat.round > 0 ? `Round ${combat.round}` : ''

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-black/60 border-b border-gold/20">
      <div className="flex items-center gap-2">
        {roundText && (
          <span className="text-gold/70 text-[10px] font-mono uppercase tracking-wider">
            {roundText}
          </span>
        )}
      </div>
      {currentUnit && (
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              currentUnit.type === 'player' ? 'bg-blue-400' : 'bg-red-400'
            }`}
            style={{
              boxShadow: `0 0 6px ${
                currentUnit.type === 'player'
                  ? 'rgba(96, 165, 250, 0.5)'
                  : 'rgba(248, 113, 113, 0.5)'
              }`,
            }}
          />
          <span className={`text-xs font-display font-semibold ${teamColor}`}>
            {currentUnit.name}&apos;s Turn
          </span>
        </div>
      )}
      <div className="text-stone-text/40 text-[10px] font-mono">
        {combat.participants.length} combatants
      </div>
    </div>
  )
}
