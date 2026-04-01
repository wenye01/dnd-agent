import { useWebSocket } from '../../contexts/WebSocketContext'
import { useChatStore } from '../../stores/chatStore'
import { Panel } from '../ui'
import MessageList from './MessageList'
import InputBar from './InputBar'
import { StreamingNarration } from './StreamingNarration'
import { ScrollText } from 'lucide-react'

export default function ChatPanel() {
  const { connected } = useWebSocket()
  const addUserMessage = useChatStore((s) => s.addUserMessage)

  return (
    <div className="flex flex-col h-full relative">
      {/* Left edge glow */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] pointer-events-none z-10" style={{
        background: 'linear-gradient(to bottom, transparent 3%, rgba(155,109,255,0.7) 18%, rgba(212,168,67,0.8) 50%, rgba(155,109,255,0.7) 82%, transparent 97%)',
        boxShadow: '0 0 20px rgba(212,168,67,0.4), 0 0 40px rgba(155,109,255,0.2)',
        animation: 'breathe 4s ease-in-out infinite',
      }} />
      {/* Right edge glow */}
      <div className="absolute right-0 top-0 bottom-0 w-[2px] pointer-events-none z-10" style={{
        background: 'linear-gradient(to bottom, transparent 5%, rgba(212,168,67,0.5) 20%, rgba(155,109,255,0.6) 50%, rgba(212,168,67,0.5) 80%, transparent 95%)',
        boxShadow: '0 0 15px rgba(212,168,67,0.3), 0 0 30px rgba(155,109,255,0.15)',
        animation: 'breathe 4s ease-in-out infinite 2s',
      }} />

      <Panel
        title="Adventure Log"
        variant="parchment"
        className="flex flex-col h-full rounded-none border-0 border-b-0"
        bodyClassName="flex-1 flex flex-col overflow-hidden p-0"
        actions={
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-arcane/80 animate-pulse" style={{ boxShadow: '0 0 8px rgba(155,109,255,0.6)' }} />
            <ScrollText className="w-4 h-4 text-gold/80" style={{ filter: 'drop-shadow(0 0 10px rgba(212,168,67,0.6))' }} />
            <span className="text-[10px] font-display text-arcane/60 tracking-wider uppercase" style={{ textShadow: '0 0 6px rgba(155,109,255,0.3)' }}>Live</span>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 scroll-smooth relative bg-gradient-to-b from-dungeon via-cave/50 to-dungeon">
          {/* Atmospheric overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 15%, rgba(155,109,255,0.18) 0%, transparent 45%), radial-gradient(ellipse at 30% 85%, rgba(212,168,67,0.14) 0%, transparent 40%), radial-gradient(ellipse at 70% 60%, rgba(155,109,255,0.10) 0%, transparent 40%)',
          }} />
          {/* Top vignette */}
          <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none bg-gradient-to-b from-dungeon/50 to-transparent" />
          {/* Bottom vignette */}
          <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-dungeon/40 to-transparent" />
          <MessageList />
        </div>

        <StreamingNarration />

        <InputBar disabled={!connected} onSend={addUserMessage} />
      </Panel>
    </div>
  )
}
