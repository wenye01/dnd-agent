import { useWebSocket } from '../../contexts/WebSocketContext'
import { useChatStore } from '../../stores/chatStore'
import { Panel } from '../ui'
import MessageList from './MessageList'
import InputBar from './InputBar'
import { StreamingNarration } from './StreamingNarration'

export default function ChatPanel() {
  const { connected } = useWebSocket()
  const addUserMessage = useChatStore((s) => s.addUserMessage)

  return (
    <div className="flex flex-col h-full p-4">
      <Panel title="Adventure Log" variant="parchment" className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          <MessageList />
        </div>

        <StreamingNarration />

        <InputBar disabled={!connected} onSend={addUserMessage} />
      </Panel>
    </div>
  )
}
