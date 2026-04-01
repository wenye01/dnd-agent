import { useEffect, type ReactNode, type MouseEvent } from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[8px] p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className={`${sizeStyles[size]} w-full rounded-lg animate-scale-in ${className}`}
        style={{
          background: 'linear-gradient(180deg, rgba(26, 24, 38, 0.98) 0%, rgba(22, 20, 36, 0.99) 100%)',
          border: '1.5px solid rgba(212, 168, 67, 0.35)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 30px rgba(212,168,67,0.12), 0 0 8px rgba(155,109,255,0.06), inset 0 0 20px rgba(0,0,0,0.3)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Decorative top line */}
        <div className="h-[2px]" style={{
          background: 'linear-gradient(to right, transparent 5%, rgba(212,168,67,0.4) 20%, rgba(155,109,255,0.25) 50%, rgba(212,168,67,0.4) 80%, transparent 95%)',
          boxShadow: '0 0 8px rgba(212,168,67,0.15)',
        }} />

        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(212,168,67,0.15)' }}>
            {title && (
              <h2
                id="modal-title"
                className="font-display text-lg font-semibold tracking-wider uppercase text-gold text-glow-gold"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 rounded transition-all duration-200 cursor-pointer text-stone-text/40 hover:text-parchment hover:bg-stone/50"
                aria-label="Close modal"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
