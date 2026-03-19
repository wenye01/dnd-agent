import { useState, type FormEvent } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'

interface InputBarProps {
  disabled?: boolean
  onSend?: (text: string) => void
}

export default function InputBar({ disabled, onSend }: InputBarProps) {
  const [input, setInput] = useState('')
  const { send } = useWebSocket()

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

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-ink/10">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Connecting...' : 'What do you do?'}
          className="flex-1 px-4 py-2 rounded-lg border border-ink/20 bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-stone-100 disabled:text-ink/30"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Send
        </button>
      </div>
    </form>
  )
}
