/**
 * @fileoverview Ephemeral combat store (dual-storage architecture).
 *
 * This store is the **real-time** half of the combat state architecture:
 * - `combatStore.combat`        -- ephemeral Zustand store for live combat data:
 *   participant tracking, HP changes, targeting, combat log, and combat actions.
 *   NOT persisted; cleared on page unload or when `reset()` is called.
 * - `gameStore.gameState.combat` -- persisted via zustand/persist to localStorage,
 *   serves as the long-term snapshot that survives page reloads.
 *
 * Synchronization contract:
 * Backend `state_update` messages with `stateType: 'combat'` should update BOTH
 * stores so that the persisted snapshot stays consistent with the ephemeral state.
 * Combat event handlers (damage, heal, etc.) update this store optimistically;
 * the persisted copy in gameStore is updated when the backend confirms the new state.
 *
 * @see gameStore.ts -- the persisted game state companion store
 */
import { create } from 'zustand'
import type { Combatant, CombatState } from '../types'
import type { SpellCastPayload, ItemUsePayload } from '../types'
import { eventBus, GameEvents } from '../events'

export type TargetMode = 'none' | 'attack' | 'spell' | 'item'

export interface CombatLogEntry {
  id: string
  text: string
  timestamp: number
  type: 'info' | 'damage' | 'heal' | 'status' | 'turn' | 'system'
}

interface CombatStore {
  // Combat state from backend
  combat: CombatState | null
  isCombatActive: boolean

  // UI interaction state
  currentUnitId: string | null
  targetMode: TargetMode
  validTargetIds: string[]
  selectedTargetId: string | null
  moveRange: { x: number; y: number }[]

  // Combat log
  logEntries: CombatLogEntry[]

  // Actions
  setCombat: (combat: CombatState | null) => void
  setCurrentUnit: (unitId: string | null) => void
  setTargetMode: (mode: TargetMode) => void
  setValidTargets: (ids: string[]) => void
  setSelectedTarget: (id: string | null) => void
  setMoveRange: (cells: { x: number; y: number }[]) => void

  // Log actions
  addLogEntry: (text: string, type: CombatLogEntry['type']) => void

  // Combatant helpers
  getCombatant: (id: string) => Combatant | undefined
  updateCombatant: (id: string, updates: Partial<Combatant>) => void
  applyDamage: (targetId: string, amount: number) => void
  applyHeal: (targetId: string, amount: number) => void

  // v0.4 Phase 4: Combat spell/item event handlers
  handleCombatSpellCast: (payload: SpellCastPayload) => void
  handleCombatItemUse: (payload: ItemUsePayload) => void

  // WebSocket request dispatchers
  requestMove: (position: { x: number; y: number }) => void
  requestAttack: (targetId: string) => void
  requestAction: (action: string, data?: Record<string, unknown>) => void

  // Reset
  reset: () => void
}

// Module-level counter for unique log entry IDs (avoids Date.now() collisions)
let _logIdCounter = 0

export const useCombatStore = create<CombatStore>((set, get) => ({
  combat: null,
  isCombatActive: false,
  currentUnitId: null,
  targetMode: 'none',
  validTargetIds: [],
  selectedTargetId: null,
  moveRange: [],
  logEntries: [],

  setCombat: (combat) =>
    set({
      combat,
      isCombatActive: combat?.status === 'active',
    }),

  setCurrentUnit: (unitId) => set({ currentUnitId: unitId }),

  setTargetMode: (mode) => set({ targetMode: mode }),

  setValidTargets: (ids) => set({ validTargetIds: ids }),

  setSelectedTarget: (id) => set({ selectedTargetId: id }),

  setMoveRange: (cells) => set({ moveRange: cells }),

  addLogEntry: (text, type) =>
    set((state) => {
      const entries = [
        ...state.logEntries,
        {
          id: `log-${++_logIdCounter}`,
          text,
          timestamp: Date.now(),
          type,
        },
      ]
      // Keep at most 100 entries to prevent unbounded growth
      return { logEntries: entries.length > 100 ? entries.slice(-100) : entries }
    }),

  getCombatant: (id) => {
    return get().combat?.participants.find((p) => p.id === id)
  },

  updateCombatant: (id, updates) =>
    set((state) => {
      if (!state.combat) return state
      const participants = state.combat.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      )
      return { combat: { ...state.combat, participants } }
    }),

  /** Safely apply damage using functional update, respecting temporaryHp. */
  // Matches backend ApplyDamageToCombatant order:
  //   1. If tempHp >= damage -> tempHp -= damage, damage = 0
  //   2. Else -> damage -= tempHp, tempHp = 0
  //   3. currentHp = max(0, currentHp - remaining damage)
  applyDamage: (targetId, amount) =>
    set((state) => {
      if (!state.combat) return state
      const participants = state.combat.participants.map((p) => {
        if (p.id !== targetId) return p

        let remaining = amount
        let tempHp = p.temporaryHp

        // Step 1 & 2: absorb with temporary HP
        if (tempHp > 0) {
          if (tempHp >= remaining) {
            tempHp -= remaining
            remaining = 0
          } else {
            remaining -= tempHp
            tempHp = 0
          }
        }

        return {
          ...p,
          temporaryHp: tempHp,
          currentHp: Math.max(0, p.currentHp - remaining),
        }
      })
      return { combat: { ...state.combat, participants } }
    }),

  /** Safely apply healing using functional update; caps at maxHp. */
  applyHeal: (targetId, amount) =>
    set((state) => {
      if (!state.combat) return state
      const participants = state.combat.participants.map((p) =>
        p.id === targetId
          ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + amount) }
          : p,
      )
      return { combat: { ...state.combat, participants } }
    }),

  requestMove: (position) => {
    const { currentUnitId } = get()
    if (!currentUnitId) return
    // Emit event that GamePage/useGameMessages will forward via WebSocket
    eventBus.emit(GameEvents.COMBAT_MOVE_CONFIRM, {
      unitId: currentUnitId,
      position,
    })
  },

  requestAttack: (targetId) => {
    const { currentUnitId } = get()
    if (!currentUnitId) return
    eventBus.emit(GameEvents.COMBAT_TARGET_SELECT, {
      sourceId: currentUnitId,
      targetId,
    })
  },

  requestAction: (action, data) => {
    eventBus.emit(GameEvents.COMBAT_UNIT_SELECT, {
      action,
      ...data,
    })
  },

  // v0.4 Phase 4: Handle spell_cast events during combat.
  // Applies spell damage/healing to combatants and triggers visual effects.
  handleCombatSpellCast: (payload) =>
    set((state) => {
      if (!state.combat) return state
      const participants = state.combat.participants.map((p) => {
        // Apply damage to the target
        if (payload.targetId && p.id === payload.targetId && payload.damage) {
          const newHp = Math.max(0, p.currentHp - payload.damage)
          return { ...p, currentHp: newHp }
        }
        // Apply healing to the caster
        if (p.id === payload.characterId && payload.healing) {
          return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + payload.healing) }
        }
        return p
      })

      // Log the spell cast
      const logText = payload.damage
        ? `${payload.characterId} casts ${payload.spellName} for ${payload.damage} ${payload.damageType ?? ''} damage`
        : payload.healing
          ? `${payload.characterId} casts ${payload.spellName} healing ${payload.healing} HP`
          : `${payload.characterId} casts ${payload.spellName}`

      // Emit visual effect events for Phaser
      eventBus.emit(GameEvents.SPELL_CAST, payload)
      if (payload.damage && payload.targetId) {
        eventBus.emit(GameEvents.EFFECT_DAMAGE, {
          eventType: 'damage',
          characterId: payload.characterId,
          target: payload.targetId,
          damage: payload.damage,
          damageType: payload.damageType,
        })
      }
      if (payload.healing) {
        eventBus.emit(GameEvents.EFFECT_HEAL, {
          eventType: 'heal',
          characterId: payload.characterId,
          amount: payload.healing,
        })
      }

      const entries = [
        ...state.logEntries,
        {
          id: `log-${++_logIdCounter}`,
          text: logText,
          timestamp: Date.now(),
          type: (payload.damage ? 'damage' : payload.healing ? 'heal' : 'info') as CombatLogEntry['type'],
        },
      ]

      return {
        combat: { ...state.combat, participants },
        logEntries: entries.length > 100 ? entries.slice(-100) : entries,
      }
    }),

  // v0.4 Phase 4: Handle item_use events during combat.
  // Applies item effects (healing/damage) to combatants.
  handleCombatItemUse: (payload) =>
    set((state) => {
      if (!state.combat) return state

      const participants = state.combat.participants.map((p) => {
        // Apply healing to the character using the item
        if (p.id === payload.characterId && payload.healing) {
          return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + payload.healing) }
        }
        // Apply damage to the target if any
        if (payload.targetId && p.id === payload.targetId && payload.damage) {
          return { ...p, currentHp: Math.max(0, p.currentHp - payload.damage) }
        }
        return p
      })

      // Log the item use
      const logText = payload.healing
        ? `${payload.characterId} uses ${payload.itemName} healing ${payload.healing} HP`
        : payload.damage
          ? `${payload.characterId} uses ${payload.itemName} for ${payload.damage} damage`
          : `${payload.characterId} uses ${payload.itemName}`

      // Emit visual effect events for Phaser
      eventBus.emit(GameEvents.ITEM_USE, payload)
      if (payload.healing) {
        eventBus.emit(GameEvents.EFFECT_HEAL, {
          eventType: 'heal',
          characterId: payload.characterId,
          amount: payload.healing,
        })
      }

      const entries = [
        ...state.logEntries,
        {
          id: `log-${++_logIdCounter}`,
          text: logText,
          timestamp: Date.now(),
          type: (payload.healing ? 'heal' : payload.damage ? 'damage' : 'info') as CombatLogEntry['type'],
        },
      ]

      return {
        combat: { ...state.combat, participants },
        logEntries: entries.length > 100 ? entries.slice(-100) : entries,
      }
    }),

  reset: () =>
    set({
      combat: null,
      isCombatActive: false,
      currentUnitId: null,
      targetMode: 'none',
      validTargetIds: [],
      selectedTargetId: null,
      moveRange: [],
      logEntries: [],
    }),
}))
