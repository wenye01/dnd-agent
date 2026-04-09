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
          gameState: state.gameState ? { ...state.gameState, party } : null,
        })),

      updateCombat: (combat) =>
        set((state) => ({
          gameState: state.gameState ? { ...state.gameState, combat } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => set({ gameState: null, isLoading: false, error: null }),

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
