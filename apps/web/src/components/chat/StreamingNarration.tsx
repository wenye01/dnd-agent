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
    <div className={`flex justify-start mb-3 ${className}`}>
      <div className="max-w-[75%] rounded-lg px-4 py-2 bg-stone-200 text-ink rounded-bl-sm">
        <span className="text-xs font-semibold text-primary-700 block mb-1">
          Dungeon Master
        </span>
        <p className="text-sm whitespace-pre-wrap break-words">
          {streamingText}
          <span className="inline-block w-2 h-4 bg-ink/30 ml-1 animate-pulse" />
        </p>
      </div>
    </div>
  )
}

export default StreamingNarration
