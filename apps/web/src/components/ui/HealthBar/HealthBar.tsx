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
  const effectiveCurrent = Math.max(0, Math.min(current + temporary, max + temporary))
  const effectiveTotal = max + temporary

  const percentage = (effectiveCurrent / effectiveTotal) * 100

  // Determine color based on health percentage
  const getColor = () => {
    if (percentage > 50) return 'bg-green-500'
    if (percentage > 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={`w-full ${className}`}>
      {(label || showText) && (
        <div className="flex justify-between text-xs text-ink/70 mb-1">
          {label && <span>{label}</span>}
          {showText && (
            <span>
              {current}
              {temporary > 0 && ` (+${temporary})`} / {max}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-stone-200 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${getColor()} ${sizeStyles[size]} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
    </div>
  )
}

export default HealthBar
