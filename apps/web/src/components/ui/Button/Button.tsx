import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../../lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantStyles = {
  primary:
    'bg-gradient-to-b from-gold to-gold-dark text-dungeon border border-gold/60 shadow-[0_0_16px_rgba(212,168,67,0.3),0_0_6px_rgba(155,109,255,0.08),0_2px_8px_rgba(0,0,0,0.4)] hover:from-gold-light hover:to-gold hover:shadow-[0_0_36px_rgba(212,168,67,0.55),0_0_72px_rgba(212,168,67,0.2),0_0_12px_rgba(155,109,255,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] active:scale-[0.98]',
  secondary:
    'bg-transparent text-gold border border-gold/50 shadow-[0_0_10px_rgba(212,168,67,0.12),0_2px_6px_rgba(0,0,0,0.3)] hover:bg-gold/10 hover:border-gold/70 hover:shadow-[0_0_24px_rgba(212,168,67,0.25),0_0_8px_rgba(155,109,255,0.06)] active:bg-cave active:scale-[0.98]',
  danger:
    'bg-blood/15 text-blood border border-blood/30 shadow-[0_0_8px_rgba(180,40,40,0.1)] hover:bg-blood/25 hover:border-blood/50 hover:shadow-[0_0_16px_rgba(180,40,40,0.2)] active:bg-blood/30 active:scale-[0.98]',
  ghost:
    'bg-transparent text-antique hover:bg-white/5 active:bg-white/10',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm tracking-wide',
  md: 'px-4 py-2 text-sm tracking-wider',
  lg: 'px-6 py-3 text-base tracking-widest uppercase',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dungeon disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none'

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
