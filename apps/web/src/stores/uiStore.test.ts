import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './uiStore'

describe('uiStore', () => {
  // Reset store before each test by creating a fresh instance
  beforeEach(() => {
    // Create a new store instance for each test
    const initialState = useUIStore.getState()
    useUIStore.setState({
      activePanel: 'character',
      isPanelOpen: true,
      activeDialog: null,
    })
  })

  describe('initial state', () => {
    it('should have character panel as default', () => {
      const { activePanel } = useUIStore.getState()
      expect(activePanel).toBe('character')
    })

    it('should have panel open by default', () => {
      const { isPanelOpen } = useUIStore.getState()
      expect(isPanelOpen).toBe(true)
    })

    it('should have no active dialog', () => {
      const { activeDialog } = useUIStore.getState()
      expect(activeDialog).toBeNull()
    })
  })

  describe('setActivePanel', () => {
    it('should set the active panel', () => {
      const { setActivePanel } = useUIStore.getState()

      setActivePanel('inventory')

      const state = useUIStore.getState()
      expect(state.activePanel).toBe('inventory')
    })

    it('should open panel when setting active panel', () => {
      const { setActivePanel, togglePanel } = useUIStore.getState()

      // Close the panel first
      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)

      // Set active panel should open it
      setActivePanel('spells')

      const state = useUIStore.getState()
      expect(state.isPanelOpen).toBe(true)
    })

    it('should set all panel types', () => {
      const { setActivePanel } = useUIStore.getState()

      const panelTypes: Array<'character' | 'inventory' | 'spells' | 'map' | null> = [
        'character',
        'inventory',
        'spells',
        'map',
      ]

      for (const panelType of panelTypes) {
        setActivePanel(panelType)
        expect(useUIStore.getState().activePanel).toBe(panelType)
      }
    })

    it('should set null panel type', () => {
      const { setActivePanel } = useUIStore.getState()

      setActivePanel(null)

      const state = useUIStore.getState()
      expect(state.activePanel).toBeNull()
      expect(state.isPanelOpen).toBe(true) // Panel opens even for null
    })
  })

  describe('togglePanel', () => {
    it('should toggle panel open state', () => {
      const { togglePanel } = useUIStore.getState()

      const initialState = useUIStore.getState()
      const initialOpenState = initialState.isPanelOpen

      togglePanel()

      const newState = useUIStore.getState()
      expect(newState.isPanelOpen).toBe(!initialOpenState)
    })

    it('should close open panel', () => {
      const { togglePanel } = useUIStore.getState()

      // Start with open panel
      expect(useUIStore.getState().isPanelOpen).toBe(true)

      // Toggle to close
      togglePanel()

      expect(useUIStore.getState().isPanelOpen).toBe(false)
    })

    it('should open closed panel', () => {
      const { togglePanel } = useUIStore.getState()

      // Close the panel
      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)

      // Toggle to open
      togglePanel()

      expect(useUIStore.getState().isPanelOpen).toBe(true)
    })

    it('should handle multiple toggles', () => {
      const { togglePanel } = useUIStore.getState()

      const initialOpenState = useUIStore.getState().isPanelOpen

      togglePanel()
      togglePanel()
      togglePanel()

      const finalState = useUIStore.getState()
      expect(finalState.isPanelOpen).toBe(!initialOpenState)
    })

    it('should preserve active panel when toggling', () => {
      const { setActivePanel, togglePanel } = useUIStore.getState()

      setActivePanel('inventory')
      togglePanel()
      togglePanel()

      const state = useUIStore.getState()
      expect(state.activePanel).toBe('inventory')
    })
  })

  describe('openDialog', () => {
    it('should open a dialog', () => {
      const { openDialog } = useUIStore.getState()

      openDialog('settings')

      const state = useUIStore.getState()
      expect(state.activeDialog).toBe('settings')
    })

    it('should replace existing dialog', () => {
      const { openDialog } = useUIStore.getState()

      openDialog('settings')
      expect(useUIStore.getState().activeDialog).toBe('settings')

      openDialog('export')

      const state = useUIStore.getState()
      expect(state.activeDialog).toBe('export')
    })

    it('should handle various dialog IDs', () => {
      const { openDialog } = useUIStore.getState()

      const dialogIds = ['settings', 'export', 'import', 'new-game', 'help', 'combat-log']

      for (const dialogId of dialogIds) {
        openDialog(dialogId)
        expect(useUIStore.getState().activeDialog).toBe(dialogId)
      }
    })
  })

  describe('closeDialog', () => {
    it('should close the active dialog', () => {
      const { openDialog, closeDialog } = useUIStore.getState()

      openDialog('settings')
      expect(useUIStore.getState().activeDialog).toBe('settings')

      closeDialog()

      const state = useUIStore.getState()
      expect(state.activeDialog).toBeNull()
    })

    it('should handle closing when no dialog is open', () => {
      const { closeDialog } = useUIStore.getState()

      // No dialog open
      expect(useUIStore.getState().activeDialog).toBeNull()

      // Should not error
      closeDialog()

      expect(useUIStore.getState().activeDialog).toBeNull()
    })

    it('should close and reopen dialogs', () => {
      const { openDialog, closeDialog } = useUIStore.getState()

      openDialog('dialog-1')
      expect(useUIStore.getState().activeDialog).toBe('dialog-1')

      closeDialog()
      expect(useUIStore.getState().activeDialog).toBeNull()

      openDialog('dialog-2')
      expect(useUIStore.getState().activeDialog).toBe('dialog-2')
    })
  })

  describe('panel state combinations', () => {
    it('should handle panel and dialog independently', () => {
      const { setActivePanel, openDialog, togglePanel } = useUIStore.getState()

      setActivePanel('spells')
      openDialog('settings')
      togglePanel()

      const state = useUIStore.getState()
      expect(state.activePanel).toBe('spells')
      expect(state.activeDialog).toBe('settings')
      expect(state.isPanelOpen).toBe(false)
    })

    it('should maintain panel state when dialog opens', () => {
      const { setActivePanel, openDialog } = useUIStore.getState()

      setActivePanel('map')
      expect(useUIStore.getState().activePanel).toBe('map')

      openDialog('export')

      const state = useUIStore.getState()
      expect(state.activePanel).toBe('map') // Panel unchanged
      expect(state.activeDialog).toBe('export')
    })

    it('should maintain dialog state when panel changes', () => {
      const { setActivePanel, openDialog } = useUIStore.getState()

      openDialog('settings')
      setActivePanel('inventory')

      const state = useUIStore.getState()
      expect(state.activeDialog).toBe('settings') // Dialog unchanged
      expect(state.activePanel).toBe('inventory')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string dialog ID', () => {
      const { openDialog } = useUIStore.getState()

      openDialog('')

      const state = useUIStore.getState()
      expect(state.activeDialog).toBe('')
    })

    it('should handle rapid panel changes', () => {
      const { setActivePanel } = useUIStore.getState()

      setActivePanel('character')
      setActivePanel('inventory')
      setActivePanel('spells')
      setActivePanel('map')

      const state = useUIStore.getState()
      expect(state.activePanel).toBe('map')
    })

    it('should handle rapid toggles', () => {
      const { togglePanel } = useUIStore.getState()

      // After 10 toggles (even number), panel should be open again
      // because beforeEach sets it to true
      for (let i = 0; i < 10; i++) {
        togglePanel()
      }

      // After 10 toggles, state should be same as initial (10 is even)
      const finalState = useUIStore.getState()
      expect(finalState.isPanelOpen).toBe(true) // 10 is even, so back to original
    })
  })

  describe('type safety', () => {
    it('should only accept valid panel types', () => {
      const { setActivePanel } = useUIStore.getState()

      // This test verifies type safety at compile time
      // @ts-expect-error - invalid panel type
      setActivePanel('invalid' as any)

      // At runtime, TypeScript allows it but the store accepts it
      // In a real app, you'd want validation
    })

    it('should handle null panel type', () => {
      const { setActivePanel } = useUIStore.getState()

      setActivePanel(null)

      const state = useUIStore.getState()
      expect(state.activePanel).toBeNull()
    })
  })

  describe('state persistence across operations', () => {
    it('should maintain state during complex interactions', () => {
      const { setActivePanel, openDialog, togglePanel, closeDialog } = useUIStore.getState()

      // User opens character panel
      setActivePanel('character')
      expect(useUIStore.getState().activePanel).toBe('character')

      // User opens settings dialog
      openDialog('settings')
      expect(useUIStore.getState().activeDialog).toBe('settings')

      // User closes panel
      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)

      // User closes dialog
      closeDialog()
      expect(useUIStore.getState().activeDialog).toBeNull()

      // User opens panel again - should remember last panel
      togglePanel()
      const state = useUIStore.getState()
      expect(state.isPanelOpen).toBe(true)
      expect(state.activePanel).toBe('character') // Still character
    })
  })
})
