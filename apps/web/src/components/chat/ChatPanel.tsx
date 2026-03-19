import { useWebSocket } from '../../contexts/WebSocketContext'
import { useChatStore } from '../../stores/chatStore'
import MessageList from './MessageList'
import InputBar from './InputBar'

export default function ChatPanel() {
  const { connected } = useWebSocket()
  const addUserMessage = useChatStore((s) => s.addUserMessage)

  return (
    <div className="flex flex-col h-full bg-stone-50 rounded-lg border border-ink/10">
      <div className="px-4 py-3 border-b border-ink/10 bg-parchment rounded-t-lg">
        <h2 className="font-display text-lg font-semibold text-ink">Adventure Log</h2>
      </div>

      <MessageList />

      <InputBar disabled={!connected} onSend={addUserMessage} />
    </div>
  )
}
