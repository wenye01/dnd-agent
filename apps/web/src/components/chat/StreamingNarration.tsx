import { useChatStore } from '../../stores/chatStore'

export interface StreamingNarrationProps {
  className?: string
}

export function StreamingNarration({ className = '' }: StreamingNarrationProps) {
  const streamingText = useChatStore((s) => s.streamingText)
  const isStreaming = useChatStore((s) => s.isStreaming)

  if (!isStreaming || !streamingText) {
    return null
  }

  return (
    <div className={`px-4 pb-2 animate-fade-in ${className}`}>
      <div className="msg-dm rounded-lg px-4 py-3 rounded-bl-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-gold/70 animate-pulse" style={{ boxShadow: '0 0 6px rgba(212,168,67,0.5)' }} />
          <span className="text-[12px] font-display font-semibold text-gold/80 tracking-wider uppercase text-glow-gold">
            Dungeon Master
          </span>
        </div>
        <p className="text-base text-parchment whitespace-pre-wrap break-words leading-relaxed font-body">
          {streamingText}
          <span
            className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom rounded-sm bg-gold/60"
            style={{ boxShadow: '0 0 4px rgba(212,168,67,0.4)', animation: 'cursor-blink 1s infinite' }}
          />
        </p>
      </div>
    </div>
  )
}

export default StreamingNarration
