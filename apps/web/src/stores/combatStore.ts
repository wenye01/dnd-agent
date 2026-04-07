/**
 * Combat Zustand store.
 * Independent from gameStore to manage combat-specific state and actions.
 * Bridges WebSocket requests with Phaser scene events.
 */
import { create } from 'zustand'
import type { Combatant, CombatState } from '../types'
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

  // WebSocket request dispatchers
  requestMove: (position: { x: number; y: number }) => void
  requestAttack: (targetId: string) => void
  requestAction: (action: string, data?: Record<string, unknown>) => void

  // Reset
  reset: () => void
}

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
    set((state) => ({
      logEntries: [
        ...state.logEntries,
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text,
          timestamp: Date.now(),
          type,
        },
      ],
    })),

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
