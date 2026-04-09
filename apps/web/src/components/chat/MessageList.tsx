import React, { useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import type { ChatMessage } from '../../stores/chatStore'
import { EmptyMessageState } from './EmptyMessageState'

const MessageItem = React.memo(function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="w-1 h-1 rounded-full bg-gold/20" />
          <span className="text-[10px] text-stone-text/45 italic font-body">{message.content}</span>
          <div className="w-1 h-1 rounded-full bg-gold/20" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2.5 animate-slide-up`}>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${
          isUser
            ? 'rounded-br-sm'
            : 'rounded-bl-sm'
        }`}
        style={isUser ? {
          background: 'linear-gradient(135deg, rgba(48, 45, 70, 0.85), rgba(37, 35, 55, 0.75))',
          border: '1px solid rgba(155, 109, 255, 0.2)',
          borderLeft: '2.5px solid rgba(155, 109, 255, 0.45)',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)',
        } : {
          background: 'linear-gradient(135deg, rgba(212, 168, 67, 0.08) 0%, rgba(26, 24, 40, 0.92) 100%)',
          border: '1px solid rgba(212, 168, 67, 0.22)',
          borderLeft: '2.5px solid rgba(212, 168, 67, 0.6)',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        {/* DM label */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(212,168,67,0.7)', boxShadow: '0 0 4px rgba(212,168,67,0.4)' }} />
            <span className="text-[10px] font-display font-semibold text-gold/80 tracking-wider uppercase" style={{ textShadow: '0 0 5px rgba(212, 168, 67, 0.3)' }}>
              Dungeon Master
            </span>
          </div>
        )}

        {/* Content */}
        <p className="text-base whitespace-pre-wrap break-words leading-relaxed font-body text-parchment" style={{ textShadow: '0 0 4px rgba(232,220,200,0.1)' }}>
          {message.content}
        </p>

        {/* Timestamp */}
        <div className="text-[12px] text-stone-text/40 mt-1.5 text-right">
          {new Date(message.timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
})

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      {messages.length === 0 && <EmptyMessageState />}

      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      <div ref={scrollRef} />
    </>
  )
}
