import { cn } from '../../../lib/utils'

export interface HealthBarProps {
  current: number
  max: number
  temporary?: number
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

export function HealthBar({
  current,
  max,
  temporary = 0,
  showText = true,
  size = 'md',
  className = '',
  label,
}: HealthBarProps) {
  const clampedCurrent = Math.max(0, current)
  const hasTemporary = temporary > 0

  // Calculate percentages
  const basePercentage = max > 0 ? Math.min(100, (clampedCurrent / max) * 100) : 0
  const tempPercentage = max > 0 ? Math.min(100 - basePercentage, (temporary / max) * 100) : 0

  // Determine color based on HP percentage - spec-compliant colors
  const getBarStyle = () => {
    if (basePercentage > 60) {
      return { background: 'linear-gradient(90deg, #15803D, #22C55E, #4ADE80)' }
    }
    if (basePercentage > 35) {
      return { background: 'linear-gradient(90deg, #92400E, #D97706, #FBBF24)' }
    }
    if (basePercentage > 15) {
      return { background: 'linear-gradient(90deg, #991B1B, #DC3545, #EF4444)' }
    }
    return { background: 'linear-gradient(90deg, #7F1D1D, #991B1B, #B91C1C)' }
  }

  // Size for bar height - spec: sm(8px), md(12px), lg(16px)
  const sizeMap = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showText) && (
        <div className="flex justify-between items-baseline mb-1">
          {label && (
            <span className="font-display text-antique/50 tracking-wider uppercase text-[10px]">
              {label}
            </span>
          )}
          {showText && (
            <span className="font-mono text-xs">
              <span className={cn(
                basePercentage > 60 ? 'text-heal' :
                basePercentage > 35 ? 'text-warning' :
                'text-blood'
              )}>
                {current}
              </span>
              {hasTemporary && (
                <span className="text-frost text-[10px]"> (+{temporary})</span>
              )}
              <span className="text-stone-text/40">/</span>
              <span className="text-stone-text/60">{max}</span>
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-sm overflow-hidden flex',
          sizeMap[size]
        )}
        style={{
          background: 'var(--color-metal)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(212, 168, 67, 0.08)',
        }}
      >
        {/* Base HP bar with shine effect */}
        <div
          className="relative transition-all duration-500 ease-out"
          style={{
            width: `${basePercentage}%`,
            ...getBarStyle(),
            borderRadius: basePercentage === 100 ? '1px' : '1px 0 0 1px',
          }}
        >
          {/* Shine highlight on the bar */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            }}
          />
        </div>
        {/* Temporary HP bar */}
        {hasTemporary && (
          <div
            className="relative transition-all duration-500 ease-out"
            style={{
              width: `${tempPercentage}%`,
              background: 'linear-gradient(90deg, #2563EB, #3B82F6, #60A5FA)',
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthBar
