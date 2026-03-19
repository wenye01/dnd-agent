import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameState, Character, CombatState } from '../types'

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
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'dnd-game-state',
      partialize: (state) => ({ gameState: state.gameState }),
    }
  )
)
