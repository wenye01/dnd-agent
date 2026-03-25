import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface PanelProps {
  title?: string
  children: ReactNode
  className?: string
  onClose?: () => void
  actions?: ReactNode
  variant?: 'default' | 'parchment' | 'stone'
}

const variantStyles: Record<NonNullable<PanelProps['variant']>, string> = {
  default: 'bg-white border border-ink/10',
  parchment: 'bg-parchment border border-ink/10',
  stone: 'bg-stone-50 border border-ink/10',
}

export function Panel({ title, children, className, onClose, actions, variant = 'parchment' }: PanelProps) {
  return (
    <div className={cn('rounded-lg shadow-sm', variantStyles[variant], className)}>
      {(title || onClose || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            {onClose && (
              <button
                onClick={onClose}
                className="text-ink/60 hover:text-ink transition-colors p-1 hover:bg-stone-100 rounded"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
