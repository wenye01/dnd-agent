import { forwardRef, useId, type InputHTMLAttributes } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      className = '',
      containerClassName = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = error ? `${inputId}-error` : undefined
    const helperId = helperText ? `${inputId}-helper` : undefined

    const inputStyles = `
      w-full px-4 py-2 rounded-md border bg-metal text-parchment placeholder:text-stone-text
      font-body text-base transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/40
      disabled:bg-iron/50 disabled:text-stone-text disabled:cursor-not-allowed
      ${error ? 'border-blood focus:ring-blood/50' : 'border-gold-dim'}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon ? 'pr-10' : ''}
      ${className}
    `

    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-display font-semibold text-antique tracking-wide uppercase"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-text pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : helperId}
            className={inputStyles}
            {...props}
          />

          {rightIcon && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-text pointer-events-none"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <span id={errorId} className="text-sm text-blood" role="alert">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span id={helperId} className="text-sm text-stone-text">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
