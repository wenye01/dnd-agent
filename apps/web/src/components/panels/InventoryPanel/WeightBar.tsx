import React from 'react'

export interface WeightBarProps {
  currentWeight: number
  maxWeight: number
  className?: string
}

export const WeightBar = React.memo(function WeightBar({
  currentWeight,
  maxWeight,
  className = '',
}: WeightBarProps) {
  const percentage = maxWeight > 0 ? Math.min(100, (currentWeight / maxWeight) * 100) : 0
  const isEncumbered = percentage >= 100
  const isHeavy = percentage >= 66

  // Color based on weight status
  const getBarColor = () => {
    if (isEncumbered) return 'linear-gradient(90deg, #991B1B, #DC3545, #EF4444)'
    if (isHeavy) return 'linear-gradient(90deg, #92400E, #D97706, #FBBF24)'
    return 'linear-gradient(90deg, #15803D, #22C55E, #4ADE80)'
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-display text-antique/50 tracking-wider uppercase text-[10px]">
          Weight
        </span>
        <span className="font-mono text-xs">
          <span className={isEncumbered ? 'text-blood' : isHeavy ? 'text-warning' : 'text-heal'}>
            {currentWeight}
          </span>
          <span className="text-stone-text/40">/</span>
          <span className="text-stone-text/60">{maxWeight}</span>
          <span className="text-stone-text/40 ml-1">lb</span>
        </span>
      </div>
      <div
        className="w-full h-1.5 rounded-sm overflow-hidden"
        style={{
          background: 'var(--color-metal)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(212, 168, 67, 0.08)',
        }}
      >
        <div
          className="relative transition-all duration-500 ease-out h-full"
          style={{
            width: `${percentage}%`,
            background: getBarColor(),
            borderRadius: percentage === 100 ? '1px' : '1px 0 0 1px',
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            }}
          />
        </div>
      </div>
      {isEncumbered && (
        <p className="text-[9px] text-blood/70 mt-1 font-display tracking-wide uppercase">
          Encumbered - Speed reduced
        </p>
      )}
    </div>
  )
})

export default WeightBar
