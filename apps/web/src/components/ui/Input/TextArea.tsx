import { forwardRef, useId, useEffect, useRef, type TextareaHTMLAttributes } from 'react'

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
    const generatedId = useId()
    const inputId = id || generatedId
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
      w-full px-4 py-2 rounded-md border bg-metal text-parchment placeholder:text-stone-text
      font-body text-base transition-all duration-200 ${autoResize ? 'overflow-hidden' : 'resize-none'}
      focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/40
      disabled:bg-iron/50 disabled:text-stone-text disabled:cursor-not-allowed
      ${error ? 'border-blood focus:ring-blood/50' : 'border-gold-dim'}
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

        <textarea
          ref={textAreaRef}
          id={inputId}
          disabled={disabled}
          rows={rows}
          value={value}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : helperId}
          className={textAreaStyles}
          {...props}
        />

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

TextArea.displayName = 'TextArea'
