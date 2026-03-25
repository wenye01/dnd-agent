import { type ReactNode } from 'react'
import { useUIStore } from '../../stores/uiStore'

export interface MainLayoutProps {
  leftPanel?: ReactNode
  leftPanelCollapsed?: ReactNode
  mainContent: ReactNode
  rightPanel?: ReactNode
  header?: ReactNode
}

export function MainLayout({
  leftPanel,
  leftPanelCollapsed,
  mainContent,
  rightPanel,
  header,
}: MainLayoutProps) {
  const { isPanelOpen, togglePanel } = useUIStore()

  return (
    <div className="h-screen flex flex-col bg-parchment">
      {/* Header */}
      {header ? (
        header
      ) : (
        <header className="h-14 bg-white border-b border-ink/10 flex items-center justify-between px-4 shadow-sm">
          <h1 className="font-display text-xl font-bold text-ink">Dungeons & Dragons</h1>
          {leftPanel && (
            <button
              onClick={togglePanel}
              className="text-ink/60 hover:text-ink transition-colors p-2 hover:bg-stone-100 rounded"
              aria-label={isPanelOpen ? 'Hide panel' : 'Show panel'}
            >
              {isPanelOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {leftPanel && (
          <aside
            className={`
              bg-parchment border-r border-ink/10 overflow-y-auto transition-all duration-300 ease-in-out
              ${isPanelOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'}
            `}
          >
            <div className="p-4">{leftPanel}</div>
          </aside>
        )}

        {/* Collapsed Left Panel (when hidden) */}
        {!isPanelOpen && leftPanelCollapsed && (
          <aside className="w-12 bg-parchment border-r border-ink/10 flex flex-col items-center py-4 gap-2">
            {leftPanelCollapsed}
          </aside>
        )}

        {/* Center Main Area */}
        <main className="flex-1 overflow-hidden flex flex-col">{mainContent}</main>

        {/* Right Panel */}
        {rightPanel && (
          <aside className="w-96 bg-parchment border-l border-ink/10 overflow-y-auto">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  )
}
