/**
 * @fileoverview Persisted game state store (dual-storage architecture).
 *
 * This store is the **persisted** half of the combat state architecture:
 * - `gameStore.gameState.combat` -- serialized to localStorage via zustand/persist,
 *   survives page reloads and is the long-term source of truth for game session data.
 * - `combatStore.combat`        -- ephemeral Zustand store for real-time combat updates
 *   (UI interactions, combat log, targeting, etc.). Cleared on page unload.
 *
 * The two stores must be kept in sync. Backend `state_update` messages with
 * `stateType: 'combat'` should update both stores so that the persisted snapshot
 * remains consistent with the ephemeral combat state.
 *
 * @see combatStore.ts -- the real-time combat companion store
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameState, Character, CombatState } from '../types'
import type { SpellCastPayload, ItemUsePayload, EquipPayload, UnequipPayload, MapSwitchPayload } from '../types'
import { sessionApi } from '../services/api'

interface GameStore {
  // State
  gameState: GameState | null
  isLoading: boolean
  error: string | null

  // Actions
  setGameState: (state: GameState) => void
  updateGameState: (updates: Partial<GameState>) => void
  updateParty: (party: Character[]) => void
  updateCombat: (combat: CombatState | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  initSession: () => Promise<void>

  // v0.4 Phase 4: New event handlers for spell/item/map integration
  handleSpellCast: (payload: SpellCastPayload) => void
  handleItemUse: (payload: ItemUsePayload) => void
  handleEquip: (payload: EquipPayload) => void
  handleUnequip: (payload: UnequipPayload) => void
  handleMapSwitch: (payload: MapSwitchPayload) => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      isLoading: false,
      error: null,

      setGameState: (state) => set({ gameState: state, error: null }),

      /**
       * Shallow-merge partial updates into the current gameState.
       *
       * @warning This method uses a single-level spread (`{ ...state, ...updates }`),
       *          which means **nested objects are replaced entirely, NOT deep-merged**.
       *          For example, if you pass `{ metadata: { updatedAt: 3000 } }`, the
       *          entire `metadata` object is replaced and any fields not included
       *          (createdAt, playTime, scenarioId) are lost.
       *
       *          To avoid data loss, always pass the complete nested object when
       *          updating fields like `metadata`, `combat`, or `party`:
       *          ```
       *          // SAFE: full replacement
       *          updateGameState({ combat: { ...currentCombat, round: 2 } })
       *
       *          // UNSAFE: partial nested object (other metadata fields are lost)
       *          updateGameState({ metadata: { updatedAt: 3000 } })
       *          ```
       *
       *          For combat updates specifically, prefer `updateCombat()` which
       *          handles the full-replacement semantics explicitly.
       *
       * @see gameStore.test.ts -- "should use shallow merge (replaces nested objects entirely)"
       */
      updateGameState: (updates) =>
        set((state) => ({
          gameState: state.gameState ? { ...state.gameState, ...updates } : null,
        })),

      updateParty: (party) =>
        set((state) => ({
          gameState: state.gameState
            ? { ...state.gameState, party }
            : {
                sessionId: '',
                phase: 'exploring' as const,
                party,
                currentMapId: '',
                combat: null,
                scenario: null,
                metadata: {
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  playTime: 0,
                  scenarioId: '',
                },
              },
        })),

      updateCombat: (combat) =>
        set((state) => ({
          gameState: state.gameState ? { ...state.gameState, combat } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => set({ gameState: null, isLoading: false, error: null }),

      // v0.4 Phase 4: Handle spell_cast server events.
      // Updates the caster's spell slot usage.
      handleSpellCast: (payload) =>
        set((state) => {
          if (!state.gameState) return state
          const party = state.gameState.party.map((char) => {
            if (char.id !== payload.characterId) return char
            if (!char.spellSlots || payload.slotLevelUsed === 0) return char
            const slot = char.spellSlots[payload.slotLevelUsed]
            if (!slot) return char
            const spellSlots = {
              ...char.spellSlots,
              [payload.slotLevelUsed]: { ...slot, used: slot.used + 1 },
            }
            return { ...char, spellSlots }
          })
          return { gameState: { ...state.gameState, party } }
        }),

      // v0.4 Phase 4: Handle item_use server events.
      // Removes consumed items from the character's inventory.
      handleItemUse: (payload) =>
        set((state) => {
          if (!state.gameState) return state
          const party = state.gameState.party.map((char) => {
            if (char.id !== payload.characterId) return char
            if (!payload.consumed) return char
            // Reduce quantity by 1 for consumed items; remove when quantity reaches 0
            const inventory = char.inventory
              .map((item) =>
                item.id === payload.itemId
                  ? { ...item, quantity: (item.quantity ?? 1) - 1 }
                  : item,
              )
              .filter((item) => item.quantity > 0)
            return { ...char, inventory }
          })
          return { gameState: { ...state.gameState, party } }
        }),

      // v0.4 Phase 4: Handle equip server events.
      // Updates character equipment and recalculates AC from baseAC + all equipment bonuses.
      //
      // 【AC 计算约定】
      // 公式: armorClass = baseArmorClass + Σ(equipment[].acBonus)
      //
      // - baseArmorClass 在角色首次装备时从当前 armorClass 快照（char.baseArmorClass ?? char.armorClass），
      //   捕获角色天生的 AC 值（例如 10 + 敏捷调整量），此值一旦设定不再改变。
      // - 每次装备/卸载时，从 equipment 数组中所有槽位的 acBonus 求和，
      //   再加上 baseArmorClass 得到最终 armorClass。
      // - 前后端必须使用相同的公式，否则 AC 会产生不一致。
      //
      handleEquip: (payload) =>
        set((state) => {
          if (!state.gameState) return state
          const party = state.gameState.party.map((char) => {
            if (char.id !== payload.characterId) return char
            const newEntry = { slot: payload.slot, itemId: payload.itemId, acBonus: payload.acBonus ?? 0 }
            const equipment = [
              ...char.equipment.filter((e) => e.slot !== payload.slot),
              newEntry,
            ]
            // Initialize baseArmorClass on first equip if not already set.
            // This captures the character's innate AC before any equipment bonuses.
            const baseAC = char.baseArmorClass ?? char.armorClass
            // Sum AC bonuses from ALL equipped items across all slots.
            const totalAcBonus = equipment.reduce((sum, e) => sum + (e.acBonus ?? 0), 0)
            const armorClass = baseAC + totalAcBonus
            // Remove equipped item from inventory if present
            const inventory = char.inventory.filter(
              (item) => item.id !== payload.itemId,
            )
            return { ...char, equipment, armorClass, baseArmorClass: baseAC, inventory }
          })
          return { gameState: { ...state.gameState, party } }
        }),

      // v0.4 Phase 4: Handle unequip server events.
      // Removes item from equipment slot, recalculates AC from remaining equipment, and adds back to inventory.
      //
      // 【AC 计算约定】
      // 公式: armorClass = baseArmorClass + Σ(equipment[].acBonus)
      //
      // - 卸载时从 equipment 数组移除对应槽位后，对剩余所有装备的 acBonus 求和，
      //   再加上 baseArmorClass 重算 armorClass。
      // - baseArmorClass 始终保持不变（由首次装备时快照确定）。
      // - 前后端必须使用相同的公式，否则 AC 会产生不一致。
      //
      handleUnequip: (payload) =>
        set((state) => {
          if (!state.gameState) return state
          const party = state.gameState.party.map((char) => {
            if (char.id !== payload.characterId) return char
            const equipment = char.equipment.filter(
              (e) => e.slot !== payload.slot,
            )
            // Recalculate AC from baseArmorClass + all remaining equipment bonuses.
            const baseAC = char.baseArmorClass ?? char.armorClass
            const totalAcBonus = equipment.reduce((sum, e) => sum + (e.acBonus ?? 0), 0)
            const armorClass = baseAC + totalAcBonus
            // Add the unequipped item back to inventory
            const inventory = [
              ...char.inventory,
              { id: payload.itemId, name: payload.itemName, quantity: 1 },
            ]
            return { ...char, equipment, armorClass, baseArmorClass: baseAC, inventory }
          })
          return { gameState: { ...state.gameState, party } }
        }),

      // v0.4 Phase 4: Handle map_switch server events.
      // Updates the currentMapId in game state.
      handleMapSwitch: (payload) =>
        set((state) => {
          if (!state.gameState) return state
          return {
            gameState: {
              ...state.gameState,
              currentMapId: payload.toMapId,
            },
          }
        }),

      initSession: async () => {
        const { gameState } = get()

        // If we have a cached sessionId, validate it against the backend
        // first. The in-memory state manager loses all sessions on server
        // restart, so a cached ID may be stale (P0 bug fix).
        if (gameState?.sessionId) {
          set({ isLoading: true, error: null })
          try {
            const validateRes = await sessionApi.get(gameState.sessionId)
            if (validateRes.status === 'success') {
              // Session is still valid on the backend — reuse it
              set({ isLoading: false })
              return
            }
            // Session not found or other error — fall through to recreate
            // Clear stale state so the new session replaces it cleanly
            set({ gameState: null })
          } catch {
            // Network error during validation — fall through to recreate
            set({ gameState: null })
          }
        }

        set({ isLoading: true, error: null })
        try {
          const response = await sessionApi.create()
          if (response.status === 'success' && response.data) {
            const sessionId = response.data.sessionId
            set({
              gameState: {
                sessionId,
                phase: 'exploring',
                party: [],
                currentMapId: '',
                combat: null,
                scenario: null,
                metadata: {
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  playTime: 0,
                  scenarioId: '',
                },
              },
              isLoading: false,
            })
          } else {
            set({
              error: response.error?.message ?? 'Failed to create session',
              isLoading: false,
            })
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to create session',
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'dnd-game-state',
      partialize: (state) => ({ gameState: state.gameState }),
    }
  )
)
