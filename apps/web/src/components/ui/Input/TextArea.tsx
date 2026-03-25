import { forwardRef, useMemo, useEffect, useRef, type TextareaHTMLAttributes } from 'react'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  autoResize?: boolean
  containerClassName?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      error,
      helperText,
      autoResize = false,
      id,
      className = '',
      containerClassName = '',
      rows = 3,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = useMemo(() => id || `textarea-${crypto.randomUUID()}`, [id])
    const errorId = error ? `${inputId}-error` : undefined
    const helperId = helperText ? `${inputId}-helper` : undefined

    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textAreaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    useEffect(() => {
      if (autoResize && textAreaRef.current && value) {
        textAreaRef.current.style.height = 'auto'
        textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`
      }
    }, [value, autoResize, textAreaRef])

    const textAreaStyles = `
      w-full px-4 py-2 rounded-lg border bg-white text-ink placeholder:text-ink/40
      font-body text-base transition-all ${autoResize ? 'overflow-hidden' : 'resize-none'}
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
      disabled:bg-stone-100 disabled:text-ink/30 disabled:cursor-not-allowed
      ${error ? 'border-red-500 focus:ring-red-500' : 'border-ink/20'}
      ${className}
    `

    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-display font-semibold text-ink"
          >
            {label}
          </label>
        )}

        <textarea
          ref={textAreaRef}
          id={inputId}
          disabled={disabled}
          rows={rows}
          value={value}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? errorId : helperId
          }
          className={textAreaStyles}
          {...props}
        />

        {error && (
          <span id={errorId} className="text-sm text-red-600" role="alert">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span id={helperId} className="text-sm text-ink/60">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
