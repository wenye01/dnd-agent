import { useState, useEffect, type ReactNode, type ReactElement } from 'react'
import { cn } from '../../lib/utils'

export interface TooltipProps {
  content: string | ReactNode
  children: ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const placementStyles: Record<NonNullable<TooltipProps['placement']>, string> = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
}

const arrowStyles: Record<NonNullable<TooltipProps['placement']>, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
}

export function Tooltip({ content, children, placement = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [timeoutId])

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && (
        <div className={cn('absolute z-50', placementStyles[placement], 'pointer-events-none')}>
          <div className="px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
            {content}
            <div className={cn('absolute w-2 h-2 border-4 border-transparent', arrowStyles[placement])} />
          </div>
        </div>
      )}
    </div>
  )
}
