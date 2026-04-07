/**
 * CombatHUD: main overlay layout for combat UI.
 * Positions initiative tracker, action selector, turn indicator, and combat log
 * around the Phaser canvas.
 */
import { TurnIndicator } from './TurnIndicator'
import { InitiativeTracker } from './InitiativeTracker'
import { ActionSelector } from './ActionSelector'
import { CombatLog } from './CombatLog'
import { useCombatStore } from '../../stores/combatStore'

export function CombatHUD() {
  const isCombatActive = useCombatStore((s) => s.isCombatActive)

  if (!isCombatActive) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col">
      {/* Top bar - Turn indicator */}
      <div className="pointer-events-auto">
        <TurnIndicator />
      </div>

      {/* Main area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left sidebar - Initiative */}
        <div className="pointer-events-auto w-40 bg-black/50 border-r border-gold/10 overflow-y-auto backdrop-blur-sm">
          <InitiativeTracker />
        </div>

        {/* Center - transparent (Phaser canvas underneath) */}
        <div className="flex-1" />

        {/* Right sidebar - Actions + Log */}
        <div className="pointer-events-auto w-44 bg-black/50 border-l border-gold/10 flex flex-col backdrop-blur-sm">
          <ActionSelector />
          <div className="flex-1 overflow-hidden border-t border-gold/10">
            <CombatLog />
          </div>
        </div>
      </div>
    </div>
  )
}
