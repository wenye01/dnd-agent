import { Dice5, Package, Sparkles, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'

export function QuickActions() {
  return (
    <div className="p-4">
      <Panel title="Quick Actions" variant="stone" className="space-y-2">
        <Button variant="secondary" className="w-full" size="md">
          <Dice5 className="w-5 h-5" />
          <span>Roll Check</span>
        </Button>
        <Button variant="secondary" className="w-full" size="md">
          <Package className="w-5 h-5" />
          <span>Inventory</span>
        </Button>
        <Button variant="secondary" className="w-full" size="md">
          <Sparkles className="w-5 h-5" />
          <span>Spells</span>
        </Button>
        <Button variant="secondary" className="w-full" size="md">
          <Save className="w-5 h-5" />
          <span>Save Game</span>
        </Button>
      </Panel>
    </div>
  )
}
