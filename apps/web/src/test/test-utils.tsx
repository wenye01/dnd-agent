import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { useChatStore } from '@/stores/chatStore'
import { useUIStore } from '@/stores/uiStore'
import { useGameStore } from '@/stores/gameStore'

// Wrapper component that provides all necessary contexts and stores
function TestProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Custom render function that includes providers
export function renderWithStore(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options })
}

// Helper to reset all stores before each test
export function resetAllStores() {
  const { clearMessages } = useChatStore.getState()
  clearMessages()

  useUIStore.setState({
    activePanel: 'character',
    isPanelOpen: true,
    activeDialog: null,
  })

  const { reset } = useGameStore.getState()
  reset()
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
