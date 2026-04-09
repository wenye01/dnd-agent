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

const addMessage = (type: ChatMessage['type'], content: string) => (state: { messages: ChatMessage[] }) => ({
  messages: [
    ...state.messages,
    {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: Date.now(),
    },
  ],
})

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
      return true
    } else {
      set({ isStreaming: false })
      return false
    }
  },

  clearMessages: () => set({ messages: [], streamingText: '', isStreaming: false }),
}))
