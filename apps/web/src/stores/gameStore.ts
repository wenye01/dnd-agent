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
        // Always create a fresh session. The in-memory state manager
        // loses all sessions on server restart, while the persistence
        // layer retains them. Since character operations require the
        // in-memory state, we must create a new session each time.
        const { gameState } = get()
        if (gameState?.sessionId) {
          return
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
