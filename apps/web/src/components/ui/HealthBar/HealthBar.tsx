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
  // Clamp current HP to valid range for display
  const clampedCurrent = Math.max(0, current)
  const hasTemporary = temporary > 0

  // Calculate percentages
  const basePercentage = max > 0 ? Math.min(100, (clampedCurrent / max) * 100) : 0
  const tempPercentage = max > 0 ? Math.min(100 - basePercentage, (temporary / max) * 100) : 0

  // Determine color based on base HP percentage
  const getBaseColor = () => {
    if (basePercentage > 50) return 'bg-green-500'
    if (basePercentage > 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showText) && (
        <div className="flex justify-between text-xs text-ink/70 mb-1">
          {label && <span>{label}</span>}
          {showText && (
            <span>
              {current}
              {hasTemporary && <span className="text-blue-600"> (+{temporary})</span>} / {max}
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-stone-200 rounded-full overflow-hidden flex', sizeStyles[size])}>
        {/* Base HP bar */}
        <div
          className={cn(getBaseColor(), 'transition-all duration-300')}
          style={{ width: `${basePercentage}%` }}
        />
        {/* Temporary HP bar (separate segment) */}
        {hasTemporary && (
          <div
            className="bg-blue-400 transition-all duration-300"
            style={{ width: `${tempPercentage}%` }}
          />
        )}
      </div>
    </div>
  )
}

export default HealthBar
