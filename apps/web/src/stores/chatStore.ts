import { create } from 'zustand'

export interface ChatMessage {
  id: string
  type: 'user' | 'dm' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
}

interface ChatStore {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean

  // Actions
  addUserMessage: (content: string) => void
  addDMMessage: (content: string) => void
  addSystemMessage: (content: string) => void
  appendStreamText: (text: string) => void
  finalizeStreamText: () => boolean
  clearMessages: () => void
}

const MAX_MESSAGES = 100

const addMessage = (type: ChatMessage['type'], content: string) => (state: { messages: ChatMessage[] }) => {
  const updated = [
    ...state.messages,
    {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: Date.now(),
    },
  ]
  // Keep at most MAX_MESSAGES to prevent unbounded growth
  return { messages: updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  streamingText: '',
  isStreaming: false,

  addUserMessage: (content) => set(addMessage('user', content)),
  addDMMessage: (content) => set(addMessage('dm', content)),
  addSystemMessage: (content) => set(addMessage('system', content)),

  appendStreamText: (text) =>
    set((state) => ({
      streamingText: state.streamingText + text,
      isStreaming: true,
    })),

  finalizeStreamText: () => {
    const { streamingText, messages } = get()
    if (streamingText) {
      const updated = [
        ...messages,
        {
          id: crypto.randomUUID(),
          type: 'dm' as const,
          content: streamingText,
          timestamp: Date.now(),
        },
      ]
      set({
        messages: updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated,
        streamingText: '',
        isStreaming: false,
      })
      return true
    } else {
      set({ isStreaming: false })
      return false
    }
  },

  clearMessages: () => set({ messages: [], streamingText: '', isStreaming: false }),
}))
