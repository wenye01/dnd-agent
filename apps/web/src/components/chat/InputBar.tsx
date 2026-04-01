import { useState, type FormEvent } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'

interface InputBarProps {
  disabled?: boolean
  onSend?: (text: string) => void
}

export default function InputBar({ disabled, onSend }: InputBarProps) {
  const [input, setInput] = useState('')
  const { send } = useWebSocket()
  const hasInput = input.trim().length > 0

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      send({
        type: 'user_input',
        payload: { text: input.trim() },
      })
      onSend?.(input.trim())
      setInput('')
    }
  }

  const [focused, setFocused] = useState(false)

  return (
    <div className="relative flex-shrink-0">
      {/* Top border - arcane gold line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" style={{ boxShadow: '0 0 8px rgba(212,168,67,0.15)' }} />

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-4 bg-gradient-to-b from-dungeon to-abyss"
      >
        <div className="flex gap-3 items-center">
          {/* Input field */}
          <div className="flex-1 relative">
            {focused && !disabled && (
              <div className="absolute -inset-2 rounded-lg pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.1) 0%, transparent 70%)',
              }} />
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={disabled}
              placeholder={disabled ? 'Connecting to the realm...' : 'Describe your action...'}
              className={`w-full pl-10 pr-4 py-4 rounded-md font-body text-sm text-parchment transition-all duration-200 focus:outline-none disabled:opacity-50 relative border ${
                focused
                  ? 'border-gold/65 bg-dungeon shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_0_20px_rgba(212,168,67,0.15),0_0_6px_rgba(212,168,67,0.25)]'
                  : 'border-gold/28 bg-dungeon shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_0_8px_rgba(212,168,67,0.06)]'
              } ${disabled ? 'border-metal/20 bg-abyss/80' : ''}`}
            />
            {/* Pen/quill icon */}
            {!disabled && (
              <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ${
                focused ? 'text-gold/85 drop-shadow-[0_0_6px_rgba(212,168,67,0.5)]' : 'text-gold/45'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </div>
            )}
          </div>

          {/* Cast button */}
          <button
            type="submit"
            disabled={disabled || !hasInput}
            className={`relative px-7 py-4 rounded-md font-display text-xs font-bold uppercase tracking-[0.18em] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 hover:scale-[1.04] active:scale-[0.97] min-w-[110px] justify-center border ${
              disabled
                ? 'bg-abyss border-metal/15 text-metal/35 opacity-35'
                : hasInput
                  ? 'bg-gradient-to-br from-gold/45 via-gold/20 to-arcane/10 border-gold/70 text-gold-light shadow-[0_0_24px_rgba(212,168,67,0.3),0_0_8px_rgba(212,168,67,0.4),0_3px_10px_rgba(0,0,0,0.5)] text-glow-gold'
                  : 'bg-gradient-to-br from-gold/12 to-gold/5 border-gold/30 text-gold/55 shadow-[0_0_8px_rgba(212,168,67,0.12)]'
            }`}
            aria-label="Send message"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span>Cast</span>
          </button>
        </div>
      </form>
    </div>
  )
}
