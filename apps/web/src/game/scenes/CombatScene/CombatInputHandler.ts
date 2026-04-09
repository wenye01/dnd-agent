/**
 * CombatInputHandler: manages pointer input (click / hover) for CombatScene.
 * Extracted from CombatScene to reduce the god-class footprint.
 */
import { TILE_SIZE, DEPTH, HOVER_LINE_WIDTH, HOVER_COLOR, HOVER_ALPHA } from '../../constants'
import { worldToGrid, type GridPosition } from '../../utils/CoordinateUtils'
import { isValidCell } from '../../utils/GridUtils'
import { eventBus, GameEvents } from '../../../events'
import { useCombatStore } from '../../../stores/combatStore'
import type { CombatScene } from './CombatScene'
import type { BaseEntity } from '../../entities/BaseEntity'

export class CombatInputHandler {
  private scene: CombatScene
  private hoveredCell: GridPosition | null = null
  private cellHighlight: Phaser.GameObjects.Graphics

  constructor(scene: CombatScene) {
    this.scene = scene

    this.cellHighlight = scene.add.graphics()
    this.cellHighlight.setDepth(DEPTH.CELL_HOVER)
  }

  setup(): void {
    // Click on the grid
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const cell = worldToGrid(pointer.worldX, pointer.worldY)
      if (!isValidCell(cell)) return
      this.onCellClick(cell)
    })

    // Hover
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
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
    this.cellHighlight.lineStyle(HOVER_LINE_WIDTH, HOVER_COLOR, HOVER_ALPHA)
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
    if (this.scene.moveRange.contains(cell)) {
      store.requestMove(cell)
      this.scene.moveRange.clear()
      return
    }

    // If in target mode, check if an entity is at this cell
    if (store.targetMode !== 'none') {
      const clickedEntity = this.getEntityAtCell(cell)
      if (clickedEntity && store.validTargetIds.includes(clickedEntity.id)) {
        store.setSelectedTarget(clickedEntity.id)
        store.requestAttack(clickedEntity.id)
        this.scene.targetHighlight.clear()
        return
      }
    }

    // Emit generic cell click event
    eventBus.emit(GameEvents.COMBAT_CELL_CLICK, { x: cell.x, y: cell.y })
  }

  // NO-OPT(P1-5): O(n) linear scan over all entities to find one at a given grid cell.
  //   Called once per pointerdown (user click), not per frame. With typical combat having
  //   5-12 entities and <10 clicks/sec, this is ~100-120 comparisons/sec — negligible.
  //   A position index (Map<"x,y", BaseEntity>) would make this O(1) but adds sync
  //   overhead on every entity create/move/destroy. Not worth it until entities exceed ~30.
  private getEntityAtCell(cell: GridPosition): BaseEntity | undefined {
    for (const entity of this.scene.entities.values()) {
      if (entity.gridPosition.x === cell.x && entity.gridPosition.y === cell.y) {
        return entity
      }
    }
    return undefined
  }

  destroy(): void {
    this.cellHighlight.destroy()
  }
}
