import { forwardRef, useRef, useCallback, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  autoResize?: boolean
  minRows?: number
  maxRows?: number
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, autoResize = false, minRows = 1, maxRows = 10, id, onChange, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const hasError = Boolean(error)
    const internalRef = useRef<HTMLTextAreaElement | null>(null)

    const adjustHeight = useCallback((textarea: HTMLTextAreaElement | null) => {
      if (!textarea || !autoResize) return

      // Reset height to get accurate scrollHeight
      textarea.style.height = 'auto'

      // Calculate line height
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
      const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 0
      const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom) || 0
      const borderTop = parseInt(getComputedStyle(textarea).borderTopWidth) || 0
      const borderBottom = parseInt(getComputedStyle(textarea).borderBottomWidth) || 0

      const minHeight = lineHeight * minRows + paddingTop + paddingBottom + borderTop + borderBottom
      const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom + borderTop + borderBottom

      const newHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight))
      textarea.style.height = `${newHeight}px`
    }, [autoResize, minRows, maxRows])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight(e.target)
      onChange?.(e)
    }, [adjustHeight, onChange])

    // Set ref and merge with forwarded ref
    const setRefs = useCallback((element: HTMLTextAreaElement | null) => {
      internalRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
      // Initial height adjustment
      adjustHeight(element)
    }, [ref, adjustHeight])

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm font-semibold text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={inputId}
          className={cn(
            'px-3 py-2 border-2 rounded resize-none',
            'bg-white text-ink font-body',
            'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500',
            'transition-colors',
            hasError ? 'border-red-500 focus:ring-red-300 focus:border-red-500' : 'border-ink/20',
            'disabled:bg-stone-100 disabled:text-ink/30',
            autoResize && 'overflow-hidden',
            className
          )}
          onChange={handleChange}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-600 font-medium">{error}</span>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
