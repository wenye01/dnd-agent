import { useState } from 'react'
import { Dice5, Package, Sparkles, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useGameStore } from '../../stores/gameStore'
import { useChatStore } from '../../stores/chatStore'

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

const SPELLCASTER_CLASSES = [
  'wizard', 'sorcerer', 'cleric', 'bard', 'druid', 'warlock', 'paladin', 'ranger',
]

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
      <div className="space-y-5">
        {/* Ability Check */}
        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/80 mb-2.5 tracking-wider uppercase">
            Ability Check
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ABILITIES.map((ability) => (
              <button
                key={ability}
                type="button"
                onClick={() => setSelectedAbility(ability)}
                className={`px-3 py-2.5 rounded-md border text-sm font-display font-medium uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  selectedAbility === ability
                    ? 'border-gold/50 bg-gold/10 text-gold shadow-[0_0_12px_rgba(212,168,67,0.08)]'
                    : 'border-gold/8 bg-metal/20 text-antique/60 hover:border-gold/20 hover:bg-metal/40 hover:text-antique'
                }`}
              >
                {ability.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={handleRoll} leftIcon={<Dice5 className="w-4 h-4" />}>
          Roll {selectedAbility.slice(0, 3).toUpperCase()} Check (1d20)
        </Button>

        {/* Custom Roll */}
        <div className="rune-separator">
          <span className="text-gold/20 text-xs">&#9670;</span>
        </div>

        <div>
          <label className="block text-[11px] font-display font-semibold text-antique/80 mb-2 tracking-wider uppercase">
            Custom Formula
          </label>
          <input
            type="text"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
            placeholder="e.g. 2d6+3"
            className="w-full px-4 py-2.5 rounded-md border border-gold/12 bg-metal/30 text-parchment placeholder:text-stone-text/50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/25 transition-all duration-200"
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
      <div className="space-y-4">
        {party && party.length > 1 && (
          <div className="flex gap-2">
            {party.map((char, idx) => (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedCharIdx(idx)}
                className={`px-3 py-1.5 rounded-md text-sm font-display font-medium transition-all duration-200 cursor-pointer ${
                  selectedCharIdx === idx
                    ? 'bg-gold/10 text-gold border border-gold/30'
                    : 'bg-metal/20 text-antique/60 border border-gold/8 hover:border-gold/15 hover:text-antique'
                }`}
              >
                {char.name}
              </button>
            ))}
          </div>
        )}

        {character ? (
          character.inventory.length > 0 ? (
            <div className="space-y-1.5">
              {character.inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-cave/40 rounded-md border border-gold/6 hover:border-gold/12 transition-all duration-200"
                >
                  <div>
                    <span className="text-sm text-parchment font-medium">{item.name}</span>
                    {item.description && (
                      <p className="text-[11px] text-stone-text/60 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.quantity > 1 && (
                    <span className="text-[11px] font-mono text-gold/80 bg-gold/8 px-2 py-0.5 rounded">
                      x{item.quantity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Package className="w-8 h-8 text-gold/10 mx-auto mb-2" />
              <p className="text-stone-text/50 italic text-sm">
                Inventory is empty.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-10">
            <p className="text-stone-text/50 italic text-sm">
              No character selected.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function SpellsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const party = useGameStore((s) => s.gameState?.party)

  const spellcasters = party?.filter((c) =>
    SPELLCASTER_CLASSES.includes(c.class.toLowerCase())
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Spellbook" size="md">
      <div className="space-y-3">
        {spellcasters && spellcasters.length > 0 ? (
          spellcasters.map((char) => (
            <div key={char.id} className="px-4 py-3 bg-cave/40 rounded-md border border-gold/6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-arcane/40" />
                <h3 className="font-display font-semibold text-parchment text-sm">{char.name}</h3>
              </div>
              <p className="text-[11px] text-stone-text/50 italic mt-1 ml-6">
                Level {char.level} {char.class} &mdash; Spell slots coming in v0.4
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <Sparkles className="w-8 h-8 text-arcane/10 mx-auto mb-2" />
            <p className="text-stone-text/50 italic text-sm">
              {party && party.length > 0
                ? 'No spellcasters in the party.'
                : 'Create a character first to view spells.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function QuickActions() {
  const [showRollCheck, setShowRollCheck] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showSpells, setShowSpells] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Save')
  const party = useGameStore((s) => s.gameState?.party)
  const addSystemMessage = useChatStore((s) => s.addSystemMessage)

  const spellcasters = party?.filter((c) =>
    SPELLCASTER_CLASSES.includes(c.class.toLowerCase())
  )

  const actions = [
    {
      icon: Dice5,
      label: 'Roll',
      onClick: () => setShowRollCheck(true),
      disabled: false,
    },
    {
      icon: Package,
      label: 'Items',
      onClick: () => setShowInventory(true),
      disabled: false,
    },
    {
      icon: Sparkles,
      label: 'Spells',
      onClick: () => setShowSpells(true),
      disabled: !spellcasters || spellcasters.length === 0,
    },
    {
      icon: Save,
      label: saveLabel,
      onClick: () => {
        const { gameState } = useGameStore.getState()
        // Zustand persist auto-saves to localStorage; trigger a feedback pulse
        addSystemMessage('Game saved successfully.')
        setSaveLabel('Saved!')
        setTimeout(() => setSaveLabel('Save'), 2000)
        // Force persist flush by writing a timestamp update
        if (gameState) {
          useGameStore.getState().updateGameState({
            metadata: { ...gameState.metadata, updatedAt: Date.now() },
          })
        }
      },
      disabled: false,
    },
  ]

  return (
    <>
      <div className="px-3 py-2.5 relative bg-gradient-to-b from-cave/85 to-abyss/95 border-t border-gold/35" style={{ boxShadow: 'inset 0 1px 0 rgba(212, 168, 67, 0.06), 0 0 12px rgba(212, 168, 67, 0.08)' }}>
        {/* Subtle label */}
        <div className="flex items-center gap-2 mb-2 px-0.5">
          <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
          <span className="text-[10px] font-display font-bold text-gold/50 tracking-[0.2em] uppercase">Quick Actions</span>
          <div className="h-px flex-1 bg-gradient-to-l from-gold/30 to-transparent" />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={action.disabled}
                className="flex flex-col items-center gap-1.5 px-1.5 py-2.5 rounded-md border border-gold/15 bg-cave/60 text-antique/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-95 hover:scale-[1.04] hover:border-gold/55 hover:bg-gold/12 hover:shadow-[0_0_18px_rgba(212,168,67,0.25),inset_0_0_10px_rgba(212,168,67,0.05)] group relative overflow-hidden"
                title={action.label}
              >
                <Icon className="w-5 h-5 text-gold/75 group-hover:text-gold transition-colors duration-200" />
                <span className="text-[10px] font-display font-semibold tracking-widest uppercase text-antique/90 group-hover:text-parchment transition-colors duration-200">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <RollCheckDialog isOpen={showRollCheck} onClose={() => setShowRollCheck(false)} />
      <InventoryDialog isOpen={showInventory} onClose={() => setShowInventory(false)} />
      <SpellsDialog isOpen={showSpells} onClose={() => setShowSpells(false)} />
    </>
  )
}
