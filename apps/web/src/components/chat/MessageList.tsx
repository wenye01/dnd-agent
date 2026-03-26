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
        <div className="text-xs opacity-50 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-ink/50 italic">
            Welcome, adventurer. Your journey begins...
          </p>
        </div>
      )}

      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      <div ref={scrollRef} />
    </>
  )
}
