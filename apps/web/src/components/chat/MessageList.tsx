import { useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import type { ChatMessage } from '../../stores/chatStore'

function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-ink/50 italic">{message.content}</span>
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-stone-200 text-ink rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <span className="text-xs font-semibold text-primary-700 block mb-1">
            Dungeon Master
          </span>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  )
}

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const streamingText = useChatStore((s) => s.streamingText)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full">
          <p className="text-ink/50 italic">
            Welcome, adventurer. Your journey begins...
          </p>
        </div>
      )}

      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* Streaming message */}
      {isStreaming && streamingText && (
        <div className="flex justify-start mb-3">
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
      )}

      <div ref={scrollRef} />
    </div>
  )
}
