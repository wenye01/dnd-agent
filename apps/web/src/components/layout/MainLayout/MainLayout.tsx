import { type ReactNode } from 'react'

export interface MainLayoutProps {
  header?: ReactNode
  leftPanel?: ReactNode
  leftPanelClassName?: string
  mainContent: ReactNode
  mainContentClassName?: string
  rightPanel?: ReactNode
  rightPanelClassName?: string
  headerClassName?: string
  isLeftPanelOpen?: boolean
  isRightPanelOpen?: boolean
  onToggleLeftPanel?: () => void
  onToggleRightPanel?: () => void
  leftPanelWidth?: string
  rightPanelWidth?: string
}

export function MainLayout({
  header,
  leftPanel,
  leftPanelClassName = '',
  mainContent,
  mainContentClassName = '',
  rightPanel,
  rightPanelClassName = '',
  headerClassName = '',
  isLeftPanelOpen = true,
  isRightPanelOpen = true,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelWidth = 'w-80',
  rightPanelWidth = 'w-96',
}: MainLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-dungeon">
      {/* Header */}
      {header && (
        <header
          className={`glass-panel h-14 flex items-center px-5 relative ${headerClassName}`}
          style={{ borderBottom: '1.5px solid rgba(212,168,67,0.45)', boxShadow: '0 2px 12px rgba(0,0,0,0.4), 0 0 15px rgba(212,168,67,0.12), inset 0 -1px 0 rgba(155,109,255,0.08)' }}
        >
          {header}
          {/* Rune dots along header bottom border */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-16 pointer-events-none" style={{ transform: 'translateY(50%)' }}>
            {['✶', '✧', '★', '❁', '★', '✧', '✶'].map((glyph, i) => (
              <span key={i} className="animate-rune-pulse" style={{
                fontSize: '7px',
                color: i % 2 === 0 ? 'rgba(212, 168, 67, 0.7)' : 'rgba(155, 109, 255, 0.65)',
                textShadow: i % 2 === 0 ? '0 0 8px rgba(212,168,67,0.5), 0 0 16px rgba(212,168,67,0.2)' : '0 0 8px rgba(155,109,255,0.4), 0 0 16px rgba(155,109,255,0.15)',
                animationDelay: `${i * 0.6}s`,
              }}>{glyph}</span>
            ))}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {leftPanel && (
          <aside
            className={`${leftPanelWidth} bg-cave/80 overflow-hidden transition-all duration-300 relative ${
              isLeftPanelOpen ? 'flex flex-col' : 'hidden'
            } ${leftPanelClassName}`}
            style={{ boxShadow: 'inset -3px 0 15px rgba(0,0,0,0.5), -2px 0 12px rgba(212,168,67,0.1)' }}
          >
            {/* Gold edge gradient line */}
            <div className="h-full w-[2px] absolute right-0 top-0" style={{ background: 'linear-gradient(to bottom, transparent 3%, rgba(212,168,67,0.5) 18%, rgba(212,168,67,0.65) 50%, rgba(212,168,67,0.5) 82%, transparent 97%)', boxShadow: '0 0 8px rgba(212,168,67,0.2)' }} />
            <div className="flex-1 overflow-hidden">
              {leftPanel}
            </div>
          </aside>
        )}

        {/* Center - Main Content */}
        <main className={`flex-1 bg-dungeon/80 flex flex-col overflow-hidden ${mainContentClassName}`}>
          {mainContent}
        </main>

        {/* Right Panel */}
        {rightPanel && (
          <aside
            className={`${rightPanelWidth} bg-cave/80 overflow-hidden transition-all duration-300 relative ${
              isRightPanelOpen ? 'flex flex-col' : 'hidden'
            } ${rightPanelClassName}`}
            style={{ boxShadow: 'inset 3px 0 15px rgba(0,0,0,0.5), 2px 0 12px rgba(212,168,67,0.1)' }}
          >
            {/* Gold edge gradient line */}
            <div className="absolute left-0 top-0 h-full w-[2px]" style={{ background: 'linear-gradient(to bottom, transparent 3%, rgba(212,168,67,0.5) 18%, rgba(212,168,67,0.65) 50%, rgba(212,168,67,0.5) 82%, transparent 97%)', boxShadow: '0 0 8px rgba(212,168,67,0.2)' }} />
            <div className="flex-1 overflow-hidden">
              {rightPanel}
            </div>
          </aside>
        )}
      </div>

      {/* Panel Toggle Buttons */}
      {(onToggleLeftPanel || onToggleRightPanel) && (
        <div className="fixed bottom-4 right-4 flex gap-2 z-40">
          {onToggleLeftPanel && leftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className="p-2.5 bg-cave/90 text-gold/60 border border-gold/15 rounded-lg shadow-panel hover:bg-stone hover:text-gold hover:border-gold/30 transition-all duration-200 cursor-pointer backdrop-blur-sm"
              aria-label={isLeftPanelOpen ? 'Hide left panel' : 'Show left panel'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {isLeftPanelOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                )}
              </svg>
            </button>
          )}
          {onToggleRightPanel && rightPanel && (
            <button
              onClick={onToggleRightPanel}
              className="p-2.5 bg-cave/90 text-gold/60 border border-gold/15 rounded-lg shadow-panel hover:bg-stone hover:text-gold hover:border-gold/30 transition-all duration-200 cursor-pointer backdrop-blur-sm"
              aria-label={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {isRightPanelOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                )}
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
