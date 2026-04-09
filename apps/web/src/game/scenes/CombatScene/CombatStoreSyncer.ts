/**
 * CombatStoreSyncer: manages useCombatStore subscriptions and entity synchronization.
 * Extracted from CombatScene to reduce the god-class footprint.
 */
import { Character } from '../../entities/Character'
import { Enemy } from '../../entities/Enemy'
import { FEET_PER_TILE, DEFAULT_MELEE_RANGE, DEFAULT_SPELL_RANGE, GRID_WIDTH, GRID_HEIGHT } from '../../constants'
import type { GridPosition } from '../../utils/CoordinateUtils'
import { getMoveRange } from '../../utils/PathFinding'
import { isValidCell, buildObstacleGrid } from '../../utils/GridUtils'
import { useCombatStore } from '../../../stores/combatStore'
import type { CombatState } from '../../../types'
import type { CombatScene } from './CombatScene'

export class CombatStoreSyncer {
  private scene: CombatScene

  constructor(scene: CombatScene) {
    this.scene = scene
  }

  subscribe(): void {
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

    this.scene.addUnsubscribe(unsub)
  }

  /** Initial sync with current combat state. */
  syncWithStore(): void {
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
  syncEntities(combat: CombatState | null): void {
    if (!combat) return

    const entities = this.scene.entities
    const currentIds = new Set<string>()

    for (const participant of combat.participants) {
      currentIds.add(participant.id)
      let entity = entities.get(participant.id)

      if (!entity) {
        // Create new entity
        const pos = participant.position ?? this.findEmptyCell()
        if (participant.type === 'player') {
          entity = new Character(this.scene, participant, pos.x, pos.y)
        } else {
          entity = new Enemy(this.scene, participant, pos.x, pos.y)
        }
        entities.set(participant.id, entity)
        this.scene.uiManager.createUI(participant.id, entity, participant)
      } else {
        // Update existing entity
        entity.updateCombatant(participant)
        // Update UI
        this.scene.uiManager.updateHp(participant.id, participant.currentHp, participant.maxHp)
        this.scene.uiManager.updateStatusIcons(participant.id, entity, participant.conditions.map((c) => c.condition))
      }
    }

    // Remove entities no longer in combat
    for (const [id, entity] of entities) {
      if (!currentIds.has(id)) {
        entity.destroy()
        entities.delete(id)
      }
    }
  }

  updateTurnIndicator(unitId: string | null): void {
    this.scene.turnIndicator.clear()
    if (!unitId) return

    const entity = this.scene.entities.get(unitId)
    if (!entity) return

    this.scene.turnIndicator.setActive(entity.x, entity.y)
    this.scene.uiManager.setSelection(unitId, true)

    // Deselect others
    for (const [id] of this.scene.entities) {
      if (id !== unitId) {
        this.scene.uiManager.setSelection(id, false)
      }
    }
  }

  private updateMoveRange(cells: GridPosition[]): void {
    this.scene.moveRange.clear()
    if (cells.length > 0) {
      this.scene.moveRange.show(cells)
    }
  }

  showMoveRangeForUnit(unitId: string): void {
    const entity = this.scene.entities.get(unitId)
    if (!entity) return

    const combat = useCombatStore.getState().combat
    if (!combat) return

    const combatant = combat.participants.find((p) => p.id === unitId)
    if (!combatant) return

    // Calculate speed in grid cells
    const speedCells = Math.floor(combatant.speed / FEET_PER_TILE)

    // Build obstacle grid (occupied cells except the current unit)
    const occupiedCells = Array.from(this.scene.entities.values())
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
    this.scene.targetHighlight.clear()
    if (mode === 'none' || validTargetIds.length === 0) return

    // Calculate attack range based on current unit
    const currentUnitId = useCombatStore.getState().currentUnitId
    if (!currentUnitId) return

    const sourceEntity = this.scene.entities.get(currentUnitId)
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
      const targetEntity = this.scene.entities.get(targetId)
      if (targetEntity) {
        targetPositions.push(targetEntity.gridPosition)
      }
    }

    this.scene.targetHighlight.show(rangeCells, targetPositions)
  }

  /** Find an empty grid cell for placing a new unit. */
  private findEmptyCell(): GridPosition {
    const occupied = new Set<string>()
    for (const entity of this.scene.entities.values()) {
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
}
