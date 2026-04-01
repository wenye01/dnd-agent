import { useState, useRef, useEffect, type ReactNode } from 'react'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
  disabled?: boolean
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  className = '',
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    if (disabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setIsVisible(true), delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      let top = 0
      let left = 0

      switch (placement) {
        case 'top':
          top = triggerRect.top + scrollTop - tooltipRect.height - 8
          left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2
          break
        case 'bottom':
          top = triggerRect.bottom + scrollTop + 8
          left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2
          break
        case 'left':
          top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2
          left = triggerRect.left + scrollLeft - tooltipRect.width - 8
          break
        case 'right':
          top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2
          left = triggerRect.right + scrollLeft + 8
          break
      }

      // Boundary checks
      const padding = 8
      if (left < padding) left = padding
      if (top < padding) top = padding
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding
      }
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding
      }

      tooltipRef.current.style.top = `${top}px`
      tooltipRef.current.style.left = `${left}px`
    }
  }, [isVisible, placement])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-3 py-1.5 max-w-xs text-sm bg-dungeon text-parchment rounded border border-gold/20 shadow-panel pointer-events-none animate-fade-in ${className}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </>
  )
}
