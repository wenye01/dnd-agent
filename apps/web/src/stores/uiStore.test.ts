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

  })

  describe('edge cases', () => {
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
