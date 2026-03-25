import { type ReactNode } from 'react'

export interface PanelProps {
  title?: string
  children: ReactNode
  className?: string
  variant?: 'default' | 'parchment' | 'card'
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
  actions?: ReactNode
  headerClassName?: string
  bodyClassName?: string
}

export function Panel({
  title,
  children,
  className = '',
  variant = 'default',
  collapsible = false,
  collapsed = false,
  onToggle,
  actions,
  headerClassName = '',
  bodyClassName = '',
}: PanelProps) {
  const variantStyles = {
    default: 'bg-white border-ink/20',
    parchment: 'bg-parchment border-ink/10',
    card: 'bg-stone-50 border-ink/10',
  }

  const headerVariantStyles = {
    default: 'bg-stone-50 border-ink/20',
    parchment: 'bg-parchment border-ink/10',
    card: 'bg-stone-100 border-ink/10',
  }

  return (
    <div className={`rounded-lg border shadow-sm ${variantStyles[variant]} ${className}`}>
      {(title || actions || collapsible) && (
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${headerVariantStyles[variant]} ${headerClassName} ${
            collapsible ? 'cursor-pointer select-none' : ''
          }`}
          onClick={collapsible ? onToggle : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggle?.()
                  }
                }
              : undefined
          }
          aria-expanded={collapsible ? !collapsed : undefined}
        >
          <div className="flex items-center gap-2">
            {collapsible && (
              <span
                className="transition-transform text-ink/60"
                style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
              >
                ▼
              </span>
            )}
            {title && (
              <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {!collapsed && (
        <div className={`p-4 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  )
}
