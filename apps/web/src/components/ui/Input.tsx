import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const hasError = Boolean(error)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm font-semibold text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'px-3 py-2 border-2 rounded bg-white text-ink font-body',
            'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500',
            'transition-colors',
            hasError ? 'border-red-500 focus:ring-red-300 focus:border-red-500' : 'border-ink/20',
            'disabled:bg-stone-100 disabled:text-ink/30',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-600 font-medium">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
