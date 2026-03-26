import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
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

      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)

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
      expect(state.isPanelOpen).toBe(true)
    })
  })

  describe('togglePanel', () => {
    it('should toggle panel open state', () => {
      const { togglePanel } = useUIStore.getState()

      const initialOpenState = useUIStore.getState().isPanelOpen

      togglePanel()

      const newState = useUIStore.getState()
      expect(newState.isPanelOpen).toBe(!initialOpenState)
    })

    it('should close open panel', () => {
      const { togglePanel } = useUIStore.getState()

      expect(useUIStore.getState().isPanelOpen).toBe(true)
      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)
    })

    it('should open closed panel', () => {
      const { togglePanel } = useUIStore.getState()

      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)
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

      expect(useUIStore.getState().activeDialog).toBeNull()
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
      expect(state.activePanel).toBe('map')
      expect(state.activeDialog).toBe('export')
    })

    it('should maintain dialog state when panel changes', () => {
      const { setActivePanel, openDialog } = useUIStore.getState()

      openDialog('settings')
      setActivePanel('inventory')

      const state = useUIStore.getState()
      expect(state.activeDialog).toBe('settings')
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

      for (let i = 0; i < 10; i++) {
        togglePanel()
      }

      const finalState = useUIStore.getState()
      expect(finalState.isPanelOpen).toBe(true)
    })
  })

  describe('type safety', () => {
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

      setActivePanel('character')
      expect(useUIStore.getState().activePanel).toBe('character')

      openDialog('settings')
      expect(useUIStore.getState().activeDialog).toBe('settings')

      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)

      closeDialog()
      expect(useUIStore.getState().activeDialog).toBeNull()

      togglePanel()
      const state = useUIStore.getState()
      expect(state.isPanelOpen).toBe(true)
      expect(state.activePanel).toBe('character')
    })
  })
})
