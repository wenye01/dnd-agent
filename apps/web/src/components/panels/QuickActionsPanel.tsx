import { Button } from '../ui'
import { useWebSocket } from '../../contexts/WebSocketContext'

export interface QuickAction {
  id: string
  label: string
  icon: string
  action: () => void
  disabled?: boolean
}

const defaultQuickActions: QuickAction[] = [
  {
    id: 'check',
    label: 'Check',
    icon: '🔍',
    action: () => {
      // TODO: Implement check action
      console.log('Check action')
    },
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: '📦',
    action: () => {
      // TODO: Open inventory dialog
      console.log('Inventory action')
    },
  },
  {
    id: 'spells',
    label: 'Spells',
    icon: '🔮',
    action: () => {
      // TODO: Open spellbook dialog
      console.log('Spells action')
    },
  },
  {
    id: 'rest',
    label: 'Rest',
    icon: '🏕️',
    action: () => {
      // TODO: Implement rest action
      console.log('Rest action')
    },
  },
]

export function QuickActionsPanel({ actions = defaultQuickActions }) {
  const { connected } = useWebSocket()

  const handleAction = (action: QuickAction) => {
    if (!connected) return
    action.action()
  }

  return (
    <div className="p-4 space-y-2">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="secondary"
          className="w-full justify-start"
          leftIcon={action.icon}
          onClick={() => handleAction(action)}
          disabled={!connected || action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export default QuickActionsPanel
