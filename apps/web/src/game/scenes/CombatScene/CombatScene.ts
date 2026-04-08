/**
 * CombatScene: the main Phaser battle scene.
 * Renders grid, entities, ranges, and effects.
 * Communicates with React via eventBus and useCombatStore.
 */
import { BaseScene } from '../BaseScene'
import { GridLayer } from './GridLayer'
import { MoveRange } from './MoveRange'
import { TargetHighlight } from './TargetHighlight'
import { TurnIndicator } from './TurnIndicator'
import { EffectManager } from '../../effects/EffectManager'
import { GameUIManager } from '../../ui/GameUIManager'
import { Character } from '../../entities/Character'
import { Enemy } from '../../entities/Enemy'
import { BaseEntity } from '../../entities/BaseEntity'
import { TILE_SIZE, FEET_PER_TILE, GRID_WIDTH, GRID_HEIGHT, DEFAULT_MELEE_RANGE, DEFAULT_SPELL_RANGE } from '../../constants'
import { worldToGrid, type GridPosition } from '../../utils/CoordinateUtils'
import { getMoveRange } from '../../utils/PathFinding'
import { isValidCell, buildObstacleGrid } from '../../utils/GridUtils'
import { eventBus, GameEvents } from '../../../events'
import { useCombatStore } from '../../../stores/combatStore'
import type { CombatState } from '../../../types'
import type { CombatEventPayload } from '../../../services/websocket'

export class CombatScene extends BaseScene {
  // Subsystems
  private gridLayer!: GridLayer
  private moveRange!: MoveRange
  private targetHighlight!: TargetHighlight
  private turnIndicator!: TurnIndicator
  private effectManager!: EffectManager
  private uiManager!: GameUIManager

  // Entity map
  private entities = new Map<string, BaseEntity>()

  // Interaction state
  private hoveredCell: GridPosition | null = null
  private cellHighlight!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'combat' })
  }

  create(): void {
    // Initialize subsystems
    this.gridLayer = new GridLayer(this)
    this.moveRange = new MoveRange(this)
    this.targetHighlight = new TargetHighlight(this)
    this.turnIndicator = new TurnIndicator(this)
    this.effectManager = new EffectManager(this, { getEntity: (id) => this.entities.get(id) })
    this.uiManager = new GameUIManager(this)
    this.cellHighlight = this.add.graphics()
    this.cellHighlight.setDepth(5)

    // Set up input
    this.setupInput()

    // Set up store subscriptions
    this.setupStoreSubscriptions()

    // Set up eventBus listeners
    this.setupEventListeners()

    // Initial sync with current combat state
    this.syncWithStore()
  }

  // ---------- Input ----------

  private setupInput(): void {
    // Click on the grid
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const cell = worldToGrid(pointer.worldX, pointer.worldY)
      if (!isValidCell(cell)) return
      this.onCellClick(cell)
    })

    // Hover
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const cell = worldToGrid(pointer.worldX, pointer.worldY)
      if (!isValidCell(cell)) return
      if (!this.hoveredCell || this.hoveredCell.x !== cell.x || this.hoveredCell.y !== cell.y) {
        this.hoveredCell = cell
        this.drawCellHighlight(cell)
      }
    })
  }

  private drawCellHighlight(cell: GridPosition): void {
    this.cellHighlight.clear()
    this.cellHighlight.lineStyle(2, 0xffffff, 0.3)
    this.cellHighlight.strokeRect(
      cell.x * TILE_SIZE,
      cell.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
    )
  }

  private onCellClick(cell: GridPosition): void {
    const store = useCombatStore.getState()

    // If in move mode and cell is in move range, request move
    if (this.moveRange.contains(cell)) {
      store.requestMove(cell)
      this.moveRange.clear()
      return
    }

    // If in target mode, check if an entity is at this cell
    if (store.targetMode !== 'none') {
      const clickedEntity = this.getEntityAtCell(cell)
      if (clickedEntity && store.validTargetIds.includes(clickedEntity.id)) {
        store.setSelectedTarget(clickedEntity.id)
        store.requestAttack(clickedEntity.id)
        this.targetHighlight.clear()
        return
      }
    }

    // Emit generic cell click event
    eventBus.emit(GameEvents.COMBAT_CELL_CLICK, { x: cell.x, y: cell.y })
  }

  private getEntityAtCell(cell: GridPosition): BaseEntity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.gridPosition.x === cell.x && entity.gridPosition.y === cell.y) {
        return entity
      }
    }
    return undefined
  }

  // ---------- Store Subscriptions ----------

  private setupStoreSubscriptions(): void {
    // Subscribe to combat state changes
    const unsub = useCombatStore.subscribe((state, prevState) => {
      // Update entities when participants change
      if (state.combat?.participants !== prevState.combat?.participants) {
        this.syncEntities(state.combat)
      }

      // Update turn indicator
      if (state.currentUnitId !== prevState.currentUnitId) {
        this.updateTurnIndicator(state.currentUnitId)
      }

      // Update move range
      if (state.moveRange !== prevState.moveRange) {
        this.updateMoveRange(state.moveRange)
      }

      // Update target mode
      if (state.targetMode !== prevState.targetMode || state.validTargetIds !== prevState.validTargetIds) {
        this.updateTargetHighlight(state.targetMode, state.validTargetIds)
      }
    })

    this.addUnsubscribe(unsub)
  }

  // ---------- Event Bus Listeners ----------

  private setupEventListeners(): void {
    // Listen for effect events dispatched by useGameMessages
    const unsubEffect = eventBus.on(GameEvents.EFFECT_ATTACK, (data) => {
      this.effectManager.handleCombatEvent(data as CombatEventPayload)
    })
    this.addUnsubscribe(unsubEffect)

    const unsubDamage = eventBus.on(GameEvents.EFFECT_DAMAGE, (data) => {
      this.effectManager.handleCombatEvent(data as CombatEventPayload)
    })
    this.addUnsubscribe(unsubDamage)

    const unsubHeal = eventBus.on(GameEvents.EFFECT_HEAL, (data) => {
      this.effectManager.handleCombatEvent(data as CombatEventPayload)
    })
    this.addUnsubscribe(unsubHeal)

    const unsubSpell = eventBus.on(GameEvents.EFFECT_SPELL, (data) => {
      this.effectManager.handleCombatEvent(data as CombatEventPayload)
    })
    this.addUnsubscribe(unsubSpell)

    const unsubStatus = eventBus.on(GameEvents.EFFECT_STATUS, (data) => {
      this.effectManager.handleCombatEvent(data as CombatEventPayload)
    })
    this.addUnsubscribe(unsubStatus)

    const unsubDeath = eventBus.on(GameEvents.EFFECT_DEATH, (data) => {
      this.effectManager.handleCombatEvent(data as CombatEventPayload)
    })
    this.addUnsubscribe(unsubDeath)

    const unsubCombatStart = eventBus.on(GameEvents.COMBAT_START, () => {
      this.syncWithStore()
    })
    this.addUnsubscribe(unsubCombatStart)

    const unsubCombatEnd = eventBus.on(GameEvents.COMBAT_END, () => {
      this.cleanup()
    })
    this.addUnsubscribe(unsubCombatEnd)

    const unsubTurnStart = eventBus.on(GameEvents.COMBAT_TURN_START, (data) => {
      const d = data as { unitId?: string }
      if (d.unitId) {
        useCombatStore.getState().setCurrentUnit(d.unitId)
        this.updateTurnIndicator(d.unitId)
        this.showMoveRangeForUnit(d.unitId)
      }
    })
    this.addUnsubscribe(unsubTurnStart)

    const unsubTurnEnd = eventBus.on(GameEvents.COMBAT_TURN_END, () => {
      this.moveRange.clear()
      this.targetHighlight.clear()
      this.turnIndicator.clear()
    })
    this.addUnsubscribe(unsubTurnEnd)
  }

  // ---------- Sync ----------

  private syncWithStore(): void {
    const combat = useCombatStore.getState().combat
    this.syncEntities(combat)
    if (combat) {
      const currentUnitId = useCombatStore.getState().currentUnitId
      if (currentUnitId) {
        this.updateTurnIndicator(currentUnitId)
      }
    }
  }

  /** Synchronize entities with the current combat state participants. */
  private syncEntities(combat: CombatState | null): void {
    if (!combat) return

    const currentIds = new Set<string>()

    for (const participant of combat.participants) {
      currentIds.add(participant.id)
      let entity = this.entities.get(participant.id)

      if (!entity) {
        // Create new entity
        const pos = participant.position ?? this.findEmptyCell()
        if (participant.type === 'player') {
          entity = new Character(this, participant, pos.x, pos.y)
        } else {
          entity = new Enemy(this, participant, pos.x, pos.y)
        }
        this.entities.set(participant.id, entity)
        this.uiManager.createUI(participant.id, entity, participant)
      } else {
        // Update existing entity
        if (entity instanceof Character || entity instanceof Enemy) {
          entity.updateCombatant(participant)
        }
        // Update UI
        this.uiManager.updateHp(participant.id, participant.currentHp, participant.maxHp)
        this.uiManager.updateStatusIcons(participant.id, entity, participant.conditions.map((c) => c.condition))
      }
    }

    // Remove entities no longer in combat
    for (const [id, entity] of this.entities) {
      if (!currentIds.has(id)) {
        entity.destroy()
        this.entities.delete(id)
      }
    }
  }

  /** Find an empty grid cell for placing a new unit. */
  private findEmptyCell(): GridPosition {
    const occupied = new Set<string>()
    for (const entity of this.entities.values()) {
      occupied.add(`${entity.gridPosition.x},${entity.gridPosition.y}`)
    }

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!occupied.has(`${x},${y}`)) {
          return { x, y }
        }
      }
    }
    return { x: 0, y: 0 }
  }

  // ---------- Updates ----------

  private updateTurnIndicator(unitId: string | null): void {
    this.turnIndicator.clear()
    if (!unitId) return

    const entity = this.entities.get(unitId)
    if (!entity) return

    this.turnIndicator.setActive(entity.x, entity.y)
    this.uiManager.setSelection(unitId, true)

    // Deselect others
    for (const [id] of this.entities) {
      if (id !== unitId) {
        this.uiManager.setSelection(id, false)
      }
    }
  }

  private updateMoveRange(cells: GridPosition[]): void {
    this.moveRange.clear()
    if (cells.length > 0) {
      this.moveRange.show(cells)
    }
  }

  private showMoveRangeForUnit(unitId: string): void {
    const entity = this.entities.get(unitId)
    if (!entity) return

    const combat = useCombatStore.getState().combat
    if (!combat) return

    const combatant = combat.participants.find((p) => p.id === unitId)
    if (!combatant) return

    // Calculate speed in grid cells
    const speedCells = Math.floor(combatant.speed / FEET_PER_TILE)

    // Build obstacle grid (occupied cells except the current unit)
    const occupiedCells = Array.from(this.entities.values())
      .filter((e) => e.id !== unitId)
      .map((e) => ({ unitId: e.id, position: e.gridPosition }))

    const obstacles = buildObstacleGrid(occupiedCells)

    const range = getMoveRange(
      entity.gridPosition,
      speedCells,
      obstacles,
      `${entity.gridPosition.x},${entity.gridPosition.y}`,
    )

    useCombatStore.getState().setMoveRange(range)
  }

  private updateTargetHighlight(mode: string, validTargetIds: string[]): void {
    this.targetHighlight.clear()
    if (mode === 'none' || validTargetIds.length === 0) return

    // Calculate attack range based on current unit
    const currentUnitId = useCombatStore.getState().currentUnitId
    if (!currentUnitId) return

    const sourceEntity = this.entities.get(currentUnitId)
    if (!sourceEntity) return

    // Determine range value: melee attacks use DEFAULT_MELEE_RANGE by default,
    // ranged attacks use DEFAULT_RANGED_RANGE. TODO: read from weapon data.
    const range = mode === 'attack' ? DEFAULT_MELEE_RANGE : DEFAULT_SPELL_RANGE

    // Get range cells.
    // Melee (range <= 2 tiles): use Chebyshev distance for square coverage (8 adjacent cells).
    // Ranged/spell: use Manhattan distance for diamond coverage.
    const isMelee = range <= 2
    const rangeCells: GridPosition[] = []
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue // exclude self
        const inRange = isMelee
          ? Math.max(Math.abs(dx), Math.abs(dy)) <= range
          : Math.abs(dx) + Math.abs(dy) <= range
        if (inRange) {
          const cell = { x: sourceEntity.gridPosition.x + dx, y: sourceEntity.gridPosition.y + dy }
          if (isValidCell(cell)) {
            rangeCells.push(cell)
          }
        }
      }
    }

    // Target positions
    const targetPositions: GridPosition[] = []
    for (const targetId of validTargetIds) {
      const targetEntity = this.entities.get(targetId)
      if (targetEntity) {
        targetPositions.push(targetEntity.gridPosition)
      }
    }

    this.targetHighlight.show(rangeCells, targetPositions)
  }

  // ---------- Cleanup ----------

  private cleanup(): void {
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
    this.cellHighlight.destroy()
    super.shutdown()
  }
}
