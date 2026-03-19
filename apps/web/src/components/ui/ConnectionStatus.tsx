import { useWebSocket } from '../../contexts/WebSocketContext'

export default function ConnectionStatus() {
  const { connected } = useWebSocket()

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-ink/10 shadow-sm">
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-xs font-medium text-ink/70">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )
}
