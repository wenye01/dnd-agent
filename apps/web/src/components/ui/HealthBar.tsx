import { cn } from '../../lib/utils'

export interface HealthBarProps {
  current: number
  max: number
  temporary?: number
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Health percentage thresholds for color determination */
const HP_THRESHOLDS = {
  /** Above this percentage shows green (healthy) */
  HIGH: 50,
  /** Above this percentage shows yellow (warning), below shows red (critical) */
  LOW: 25,
} as const

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
}

const textSizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

export function HealthBar({ current, max, temporary = 0, showLabel = true, label = 'HP', size = 'md', className }: HealthBarProps) {
  const effectiveMax = max
  const effectiveCurrent = current + temporary
  const pct = effectiveMax > 0 ? Math.max(0, Math.min(100, (effectiveCurrent / effectiveMax) * 100)) : 0
  const tempPct = effectiveMax > 0 && temporary > 0 ? Math.min(100, (temporary / effectiveMax) * 100) : 0

  // Color based on health percentage using defined thresholds
  const getColor = (percentage: number) => {
    if (percentage > HP_THRESHOLDS.HIGH) return 'bg-green-600'
    if (percentage > HP_THRESHOLDS.LOW) return 'bg-yellow-500'
    return 'bg-red-600'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && <span className={cn(textSizeStyles[size], 'font-medium text-ink/70 min-w-[2rem]')}>{label}</span>}
      <div className="flex-1 bg-stone-200 rounded-full overflow-hidden relative">
        {/* Base HP bar */}
        <div
          className={cn(sizeStyles[size], getColor(pct), 'transition-all duration-300')}
          style={{ width: `${pct}%` }}
        />
        {/* Temporary HP overlay */}
        {temporary > 0 && (
          <div
            className={cn(sizeStyles[size], 'bg-blue-400/60 absolute top-0 left-0 transition-all duration-300')}
            style={{ width: `${tempPct}%` }}
          />
        )}
      </div>
      <span className={cn(textSizeStyles[size], 'text-ink/70 whitespace-nowrap tabular-nums')}>
        {current}
        {temporary > 0 && <span className="text-blue-600"> (+{temporary})</span>}
        <span className="text-ink/40">/{max}</span>
      </span>
    </div>
  )
}
