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
    default: 'border-gold-dim',
    parchment: 'border-gold/30',
    card: 'border-gold-dim',
  }

  const headerVariantStyles = {
    default: 'border-gold/20',
    parchment: 'border-gold/30',
    card: 'border-gold/20',
  }

  const headerInlineStyles = {
    default: {
      background: 'linear-gradient(180deg, rgba(22,20,38,0.95) 0%, rgba(18,16,30,0.9) 100%)',
      boxShadow: 'inset 0 -1px 0 rgba(212,168,67,0.08), 0 2px 8px rgba(0,0,0,0.3)',
    },
    parchment: {
      background: 'linear-gradient(180deg, rgba(212,168,67,0.12) 0%, rgba(155,109,255,0.06) 100%)',
      boxShadow: 'inset 0 -1px 0 rgba(212,168,67,0.15), 0 0 15px rgba(212,168,67,0.08), 0 2px 8px rgba(0,0,0,0.3)',
    },
    card: {
      background: 'linear-gradient(180deg, rgba(26,24,38,0.9) 0%, rgba(20,18,32,0.85) 100%)',
      boxShadow: 'inset 0 -1px 0 rgba(212,168,67,0.06), 0 2px 6px rgba(0,0,0,0.25)',
    },
  }

  const bodyInlineStyles = {
    default: {
      background: 'linear-gradient(180deg, rgba(15,14,26,0.98) 0%, rgba(20,18,32,0.95) 50%, rgba(15,14,26,0.98) 100%)',
    },
    parchment: {
      background: 'linear-gradient(180deg, rgba(22,20,48,0.85) 0%, rgba(26,22,56,0.80) 50%, rgba(22,20,48,0.85) 100%)',
    },
    card: {
      background: 'linear-gradient(180deg, rgba(37,35,55,0.9) 0%, rgba(30,28,44,0.95) 50%, rgba(37,35,55,0.9) 100%)',
    },
  }

  return (
    <div
      className={`rounded-lg border shadow-panel overflow-hidden ${variantStyles[variant]} ${className}`}
      style={bodyInlineStyles[variant]}
    >
      {(title || actions || collapsible) && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b ${headerVariantStyles[variant]} ${headerClassName} ${
            collapsible ? 'cursor-pointer select-none' : ''
          }`}
          style={headerInlineStyles[variant]}
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
          <div className="flex items-center gap-2.5">
            {collapsible && (
              <span
                className="transition-transform duration-200 text-gold/40 text-[10px]"
                style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
              >
                &#9660;
              </span>
            )}
            {title && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(212,168,67,0.75)', boxShadow: '0 0 6px rgba(212,168,67,0.5)' }} />
                <h3 className="font-display text-[13px] font-bold text-gold/90 tracking-wider uppercase" style={{ textShadow: '0 0 10px rgba(212, 168, 67, 0.55)' }}>
                  {title}
                </h3>
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {!collapsed && (
        <div className={bodyClassName}>
          {children}
        </div>
      )}
    </div>
  )
}
