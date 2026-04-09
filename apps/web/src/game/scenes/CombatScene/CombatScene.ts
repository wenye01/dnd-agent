/**
 * CombatScene: the main Phaser battle scene.
 * Renders grid, entities, ranges, and effects.
 * Communicates with React via eventBus and useCombatStore.
 *
 * Orchestrates three handler classes:
 *  - CombatInputHandler   — pointer input (click / hover)
 *  - CombatStoreSyncer    — Zustand store subscriptions + entity sync
 *  - CombatEventHandler   — eventBus listeners for combat lifecycle
 */
import { BaseScene } from '../BaseScene'
import { GridLayer } from './GridLayer'
import { MoveRange } from './MoveRange'
import { TargetHighlight } from './TargetHighlight'
import { TurnIndicator } from './TurnIndicator'
import { EffectManager } from '../../effects/EffectManager'
import { GameUIManager } from '../../ui/GameUIManager'
import { BaseEntity } from '../../entities/BaseEntity'
import { CombatInputHandler } from './CombatInputHandler'
import { CombatStoreSyncer } from './CombatStoreSyncer'
import { CombatEventHandler } from './CombatEventHandler'

export class CombatScene extends BaseScene {
  // Subsystems (initialized in create())
  gridLayer!: GridLayer
  moveRange!: MoveRange
  targetHighlight!: TargetHighlight
  turnIndicator!: TurnIndicator
  effectManager!: EffectManager
  uiManager!: GameUIManager

  // Handlers (initialized in create())
  inputHandler!: CombatInputHandler
  storeSyncer!: CombatStoreSyncer
  eventHandler!: CombatEventHandler

  // Entity map
  entities = new Map<string, BaseEntity>()

  // Guard to prevent double-destroy when COMBAT_END triggers cleanup() before shutdown()
  private _cleaned = false

  constructor() {
    super({ key: 'combat' })
  }

  create(): void {
    // Initialize subsystems
    this.gridLayer = new GridLayer(this)
    this.moveRange = new MoveRange(this)
    this.targetHighlight = new TargetHighlight(this)
    this.turnIndicator = new TurnIndicator(this)
    this.effectManager = new EffectManager(this, {
      getEntity: (id) => this.entities.get(id),
    })
    this.uiManager = new GameUIManager(this)

    // Initialize handlers
    this.inputHandler = new CombatInputHandler(this)
    this.storeSyncer = new CombatStoreSyncer(this)
    this.eventHandler = new CombatEventHandler(this)

    // Wire up all subsystems
    this.inputHandler.setup()
    this.storeSyncer.subscribe()
    this.eventHandler.subscribe()

    // Initial sync with current combat state
    this.storeSyncer.syncWithStore()
  }

  /** Clean up combat state (called on combat_end and shutdown). Guarded against double-destroy. */
  cleanup(): void {
    if (this._cleaned) return
    this._cleaned = true

    for (const [, entity] of this.entities) {
      entity.destroy()
    }
    this.entities.clear()
    this.moveRange.clear()
    this.targetHighlight.clear()
    this.turnIndicator.clear()
    this.uiManager.destroy()
  }

  shutdown(): void {
    this.cleanup()
    this.gridLayer.destroy()
    this.moveRange.destroy()
    this.targetHighlight.destroy()
    this.turnIndicator.destroy()
    this.inputHandler.destroy()
    super.shutdown()
  }
}
