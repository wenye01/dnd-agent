import { type ReactNode } from 'react'

export interface MainLayoutProps {
  leftPanel?: ReactNode
  leftPanelClassName?: string
  mainContent: ReactNode
  mainContentClassName?: string
  rightPanel?: ReactNode
  rightPanelClassName?: string
  header?: ReactNode
  headerClassName?: string
  isLeftPanelOpen?: boolean
  isRightPanelOpen?: boolean
  onToggleLeftPanel?: () => void
  onToggleRightPanel?: () => void
  leftPanelWidth?: string
  rightPanelWidth?: string
}

export function MainLayout({
  leftPanel,
  leftPanelClassName = '',
  mainContent,
  mainContentClassName = '',
  rightPanel,
  rightPanelClassName = '',
  header,
  headerClassName = '',
  isLeftPanelOpen = true,
  isRightPanelOpen = true,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelWidth = 'w-80',
  rightPanelWidth = 'w-96',
}: MainLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-parchment">
      {/* Header */}
      {header && (
        <header
          className={`h-14 border-b border-ink/10 flex items-center justify-between px-4 bg-white/50 ${headerClassName}`}
        >
          {header}
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {leftPanel && (
          <aside
            className={`${leftPanelWidth} bg-parchment border-r border-ink/10 overflow-y-auto transition-all ${
              isLeftPanelOpen ? 'flex' : 'hidden'
            } ${leftPanelClassName}`}
          >
            {leftPanel}
          </aside>
        )}

        {/* Center - Main Content */}
        <main className={`flex-1 bg-ink/5 flex flex-col overflow-hidden ${mainContentClassName}`}>
          {mainContent}
        </main>

        {/* Right Panel */}
        {rightPanel && (
          <aside
            className={`${rightPanelWidth} bg-parchment border-l border-ink/10 overflow-y-auto transition-all ${
              isRightPanelOpen ? 'flex' : 'hidden'
            } ${rightPanelClassName}`}
          >
            {rightPanel}
          </aside>
        )}
      </div>

      {/* Panel Toggle Buttons */}
      {(onToggleLeftPanel || onToggleRightPanel) && (
        <div className="fixed bottom-4 right-4 flex gap-2 z-40">
          {onToggleLeftPanel && leftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className="px-3 py-2 bg-ink text-parchment rounded-lg shadow-lg hover:bg-ink/80 transition-colors"
              aria-label={isLeftPanelOpen ? 'Hide left panel' : 'Show left panel'}
            >
              {isLeftPanelOpen ? '◀' : '▶'}
            </button>
          )}
          {onToggleRightPanel && rightPanel && (
            <button
              onClick={onToggleRightPanel}
              className="px-3 py-2 bg-ink text-parchment rounded-lg shadow-lg hover:bg-ink/80 transition-colors"
              aria-label={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
            >
              {isRightPanelOpen ? '▶' : '◀'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
