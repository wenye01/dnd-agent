import type { ReactNode } from 'react'
import { ConnectionStatus } from '../../ui'

export interface GameHeaderProps {
  title?: string
  showConnectionStatus?: boolean
  leftActions?: ReactNode
  rightActions?: ReactNode
  className?: string
}

export function GameHeader({
  title = 'Dungeons & Dragons',
  showConnectionStatus = true,
  leftActions,
  rightActions,
  className = '',
}: GameHeaderProps) {
  return (
    <div className={`h-14 border-b border-ink/10 flex items-center justify-between px-4 bg-white/50 ${className}`}>
      {/* Left side */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
        {leftActions}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {showConnectionStatus && <ConnectionStatus />}
        {rightActions}
      </div>
    </div>
  )
}
