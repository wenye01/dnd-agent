import { useWebSocket } from '../../contexts/WebSocketContext'

export default function ConnectionStatus() {
  const { connected } = useWebSocket()

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${
      connected
        ? 'bg-heal/8 border-heal/30 shadow-[0_0_10px_rgba(74,222,128,0.15)]'
        : 'bg-blood/6 border-blood/25'
    }`}>
      <span className="relative flex h-1.5 w-1.5">
        {connected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-heal/60 opacity-50" />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
          connected ? 'bg-heal/85 shadow-[0_0_4px_rgba(74,222,128,0.5)]' : 'bg-blood/70'
        }`} />
      </span>
      <span className={`text-[10px] font-display font-medium tracking-wider uppercase ${
        connected ? 'text-heal/85' : 'text-blood/65'
      }`}>
        {connected ? 'Linked' : 'Offline'}
      </span>
    </div>
  )
}
