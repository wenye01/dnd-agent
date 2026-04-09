/**
 * ActionSelector: panel showing available combat actions.
 * Highlights used resources (action, bonus action, reaction, movement).
 */
import React, { useCallback } from 'react'
import { useCombatStore } from '../../stores/combatStore'
import type { Combatant } from '../../types'
import type { TargetMode } from '../../stores/combatStore'

interface ActionButton {
  key: string
  label: string
  action: string
  icon: string
  requiresTarget?: boolean
}

const ACTIONS: ActionButton[] = [
  { key: 'attack', label: 'Attack', action: 'attack', icon: 'A', requiresTarget: true },
  { key: 'spell', label: 'Cast Spell', action: 'spell', icon: 'S' },
  { key: 'move', label: 'Move', action: 'move', icon: 'M' },
  { key: 'item', label: 'Use Item', action: 'item', icon: 'I' },
  { key: 'dodge', label: 'Dodge', action: 'dodge', icon: 'D' },
  { key: 'disengage', label: 'Disengage', action: 'disengage', icon: 'R' },
]

export const ActionSelector = React.memo(function ActionSelector() {
  const combat = useCombatStore((s) => s.combat)
  const currentUnitId = useCombatStore((s) => s.currentUnitId)
  const setTargetMode = useCombatStore((s) => s.setTargetMode)
  const setValidTargets = useCombatStore((s) => s.setValidTargets)

  const currentCombatant = (combat && currentUnitId)
    ? (combat.participants.find((p) => p.id === currentUnitId) as Combatant | undefined)
    : undefined

  const handleAction = useCallback((action: ActionButton) => {
    if (!combat || !currentCombatant) return
    if (action.requiresTarget) {
      // Enter target selection mode
      const enemies = combat.participants.filter(
        (p) => p.type !== currentCombatant.type && p.currentHp > 0,
      )
      setValidTargets(enemies.map((e) => e.id))
      // Validate action maps to a valid TargetMode
      const validModes: readonly TargetMode[] = ['attack', 'spell', 'item']
      const mode = validModes.includes(action.action as TargetMode)
        ? (action.action as TargetMode)
        : 'attack'
      setTargetMode(mode)
    } else {
      // Direct action
      useCombatStore.getState().requestAction(action.action)
    }
  }, [combat, currentCombatant, setTargetMode, setValidTargets])

  if (!combat || !currentUnitId || !currentCombatant) return null

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-display text-gold/60 uppercase tracking-wider px-2 py-1 border-b border-gold/10">
        Actions
      </div>
      <div className="grid grid-cols-3 gap-1 px-1">
        {ACTIONS.map((action) => {
          const isUsed = (() => {
            // STYLE(P1-7): 'spell' case is identical to 'attack'/'item'/'dodge'/'disengage'.
            //   Kept separate to allow future differentiation (e.g., bonus-action spells).
            //   If no such plan exists, merge 'spell' into the fall-through group above.
            switch (action.key) {
              case 'attack':
              case 'item':
              case 'dodge':
              case 'disengage':
                return currentCombatant.action === 'used'
              case 'spell':
                return currentCombatant.action === 'used'
              case 'move':
                return false // Move doesn't consume action resources; controlled by backend speed
              default:
                return false
            }
          })()

          return (
            <button
              key={action.key}
              onClick={() => handleAction(action)}
              disabled={isUsed}
              className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded text-[9px] font-display uppercase tracking-wide transition-all cursor-pointer ${
                isUsed
                  ? 'bg-stone-text/5 text-stone-text/20 cursor-not-allowed'
                  : 'bg-stone-text/5 text-stone-text/60 hover:bg-gold/10 hover:text-gold border border-stone-text/10 hover:border-gold/20'
              }`}
            >
              <span
                className={`text-base font-bold ${
                  isUsed ? 'text-stone-text/15' : 'text-gold/50'
                }`}
              >
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
      {/* Resource indicators */}
      <div className="flex items-center gap-3 px-2 py-1 mt-1 border-t border-gold/10">
        <ResourceDot label="ACT" used={currentCombatant.action === 'used'} />
        <ResourceDot label="BNS" used={currentCombatant.bonusAction === 'used'} />
        <ResourceDot label="RCT" used={currentCombatant.reaction === 'used'} />
      </div>
    </div>
  )
})

const ResourceDot = React.memo(function ResourceDot({ label, used }: { label: string; used: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          used ? 'bg-stone-text/20' : 'bg-green-400'
        }`}
        style={
          !used
            ? { boxShadow: '0 0 4px rgba(74, 222, 128, 0.5)' }
            : undefined
        }
      />
      <span className="text-[8px] font-mono text-stone-text/40">{label}</span>
    </div>
  )
})
