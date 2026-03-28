import { useState } from 'react'
import { Dice5, Package, Sparkles, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Modal } from '../ui/Modal'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useGameStore } from '../../stores/gameStore'
import { useChatStore } from '../../stores/chatStore'

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

function RollCheckDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { send } = useWebSocket()
  const [selectedAbility, setSelectedAbility] = useState<string>('strength')
  const [customFormula, setCustomFormula] = useState('1d20')

  const handleRoll = () => {
    send({
      type: 'user_input',
      payload: {
        text: `Roll a ${selectedAbility} check`,
      },
    })
    onClose()
  }

  const handleCustomRoll = () => {
    send({
      type: 'user_input',
      payload: {
        text: `Roll ${customFormula}`,
      },
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roll Check" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink/70 mb-2">Ability Check</label>
          <div className="grid grid-cols-3 gap-2">
            {ABILITIES.map((ability) => (
              <button
                key={ability}
                type="button"
                onClick={() => setSelectedAbility(ability)}
                className={`px-3 py-2 rounded border-2 text-sm font-medium capitalize transition-colors ${
                  selectedAbility === ability
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-ink/10 hover:border-ink/30 bg-white text-ink/70'
                }`}
              >
                {ability.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={handleRoll}>
          Roll {selectedAbility.slice(0, 3).toUpperCase()} Check (1d20)
        </Button>

        <div className="border-t border-ink/10 pt-4">
          <label className="block text-sm font-semibold text-ink/70 mb-2">Custom Roll</label>
          <input
            type="text"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
            placeholder="e.g. 2d6+3"
            className="w-full px-3 py-2 border border-ink/20 rounded bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button variant="secondary" fullWidth className="mt-2" onClick={handleCustomRoll}>
            Roll Custom Dice
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function InventoryDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const party = useGameStore((s) => s.gameState?.party)
  const [selectedCharIdx, setSelectedCharIdx] = useState(0)

  const character = party?.[selectedCharIdx]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inventory" size="lg">
      <div className="space-y-3">
        {party && party.length > 1 && (
          <div className="flex gap-2 mb-3">
            {party.map((char, idx) => (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedCharIdx(idx)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedCharIdx === idx
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-stone-100 text-ink/60 hover:bg-stone-200'
                }`}
              >
                {char.name}
              </button>
            ))}
          </div>
        )}

        {character ? (
          character.inventory.length > 0 ? (
            <div className="space-y-2">
              {character.inventory.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-stone-50 rounded border border-ink/10">
                  <div>
                    <span className="font-medium text-ink">{item.name}</span>
                    {item.description && (
                      <p className="text-xs text-ink/50">{item.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-ink/40 bg-stone-200 px-2 py-0.5 rounded">
                    {item.quantity ?? 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink/50 text-sm italic">No items in inventory.</p>
          )
        ) : (
          <p className="text-ink/50 text-sm italic">No characters in party.</p>
        )}

        {character && (
          <div className="mt-3 p-2 bg-primary-50 rounded text-sm">
            <span className="font-semibold text-ink">Gold: </span>
            <span className="text-primary-800">{character.inventory.length > 0 ? '' : 'No inventory data'}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

function SpellsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const party = useGameStore((s) => s.gameState?.party)

  const spellcasters = party?.filter((c) =>
    c.class === 'wizard' || c.class === 'cleric' || c.class === 'sorcerer' || c.class === 'bard'
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Spells" size="md">
      <div className="space-y-3">
        {spellcasters && spellcasters.length > 0 ? (
          spellcasters.map((char) => (
            <div key={char.id} className="p-3 bg-stone-50 rounded border border-ink/10">
              <h3 className="font-semibold text-ink mb-1">{char.name}</h3>
              <p className="text-sm text-ink/50 italic">
                Level {char.level} {char.class} -- Spell selection coming soon
              </p>
            </div>
          ))
        ) : (
          <p className="text-ink/50 text-sm italic">
            {party && party.length > 0
              ? 'No spellcasters in the party.'
              : 'No characters in party. Create a character first!'}
          </p>
        )}
      </div>
    </Modal>
  )
}

export function QuickActions() {
  const [showRollCheck, setShowRollCheck] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showSpells, setShowSpells] = useState(false)
  const { send } = useWebSocket()
  const addSystemMessage = useChatStore((s) => s.addSystemMessage)

  const handleSave = () => {
    send({
      type: 'management',
      payload: { action: 'save' },
    })
    addSystemMessage('Save requested...')
  }

  return (
    <>
      <div className="p-4">
        <Panel title="Quick Actions" variant="stone" className="space-y-2">
          <Button variant="secondary" className="w-full" size="md" onClick={() => setShowRollCheck(true)}>
            <Dice5 className="w-5 h-5" />
            <span>Roll Check</span>
          </Button>
          <Button variant="secondary" className="w-full" size="md" onClick={() => setShowInventory(true)}>
            <Package className="w-5 h-5" />
            <span>Inventory</span>
          </Button>
          <Button variant="secondary" className="w-full" size="md" onClick={() => setShowSpells(true)}>
            <Sparkles className="w-5 h-5" />
            <span>Spells</span>
          </Button>
          <Button variant="secondary" className="w-full" size="md" onClick={handleSave}>
            <Save className="w-5 h-5" />
            <span>Save Game</span>
          </Button>
        </Panel>
      </div>

      <RollCheckDialog isOpen={showRollCheck} onClose={() => setShowRollCheck(false)} />
      <InventoryDialog isOpen={showInventory} onClose={() => setShowInventory(false)} />
      <SpellsDialog isOpen={showSpells} onClose={() => setShowSpells(false)} />
    </>
  )
}
