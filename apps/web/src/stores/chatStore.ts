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
  finalizeStreamText: () => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  streamingText: '',
  isStreaming: false,

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'user',
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  addDMMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'dm',
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  addSystemMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'system',
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  appendStreamText: (text) =>
    set((state) => ({
      streamingText: state.streamingText + text,
      isStreaming: true,
    })),

  finalizeStreamText: () => {
    const { streamingText, messages } = get()
    if (streamingText) {
      set({
        messages: [
          ...messages,
          {
            id: crypto.randomUUID(),
            type: 'dm',
            content: streamingText,
            timestamp: Date.now(),
          },
        ],
        streamingText: '',
        isStreaming: false,
      })
    } else {
      set({ isStreaming: false })
    }
  },

  clearMessages: () => set({ messages: [], streamingText: '', isStreaming: false }),
}))
