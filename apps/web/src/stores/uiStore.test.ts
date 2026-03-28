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

  })

  describe('togglePanel', () => {
    it('should toggle panel open/closed and preserve active panel', () => {
      const { setActivePanel, togglePanel } = useUIStore.getState()

      setActivePanel('inventory')
      expect(useUIStore.getState().isPanelOpen).toBe(true)

      // Close
      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(false)
      expect(useUIStore.getState().activePanel).toBe('inventory')

      // Reopen
      togglePanel()
      expect(useUIStore.getState().isPanelOpen).toBe(true)
      expect(useUIStore.getState().activePanel).toBe('inventory')
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
    it('should handle null panel type', () => {
      const { setActivePanel } = useUIStore.getState()

      setActivePanel(null)

      const state = useUIStore.getState()
      expect(state.activePanel).toBeNull()
    })

    it('should handle complex multi-step interactions', () => {
      const { setActivePanel, openDialog, togglePanel, closeDialog } = useUIStore.getState()

      setActivePanel('character')
      openDialog('settings')
      togglePanel()
      closeDialog()
      togglePanel()

      const state = useUIStore.getState()
      expect(state.activePanel).toBe('character')
      expect(state.activeDialog).toBeNull()
      expect(state.isPanelOpen).toBe(true)
    })
  })
})
