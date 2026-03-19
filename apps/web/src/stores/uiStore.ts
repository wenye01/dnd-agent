import { create } from 'zustand'

export type PanelType = 'character' | 'inventory' | 'spells' | 'map' | null

interface UIStore {
  // Panel state
  activePanel: PanelType
  isPanelOpen: boolean

  // Dialog state
  activeDialog: string | null

  // Actions
  setActivePanel: (panel: PanelType) => void
  togglePanel: () => void
  openDialog: (dialogId: string) => void
  closeDialog: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activePanel: 'character',
  isPanelOpen: true,
  activeDialog: null,

  setActivePanel: (panel) => set({ activePanel: panel, isPanelOpen: true }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  openDialog: (dialogId) => set({ activeDialog: dialogId }),
  closeDialog: () => set({ activeDialog: null }),
}))
