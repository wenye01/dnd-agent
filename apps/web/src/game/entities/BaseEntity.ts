/**
 * Base entity: a Phaser Container with grid position, direction,
 * selection state, and animated movement.
 */
import Phaser from 'phaser'
import { TILE_SIZE, ANIMATIONS, TEXT_STYLES } from '../constants'
import { worldToGrid, gridToWorld, type GridPosition } from '../utils/CoordinateUtils'
import type { Combatant } from '../../types'

export type Direction = 'up' | 'down' | 'left' | 'right'

export abstract class BaseEntity extends Phaser.GameObjects.Container {
  public readonly id: string
  public readonly entityName: string
  public combatant: Combatant
  public gridPosition: GridPosition
  public direction: Direction = 'down'
  public isSelected = false
  protected hurtTween: Phaser.Tweens.Tween | null = null

  constructor(
    scene: Phaser.Scene,
    id: string,
    name: string,
    gridX: number,
    gridY: number,
  ) {
    const worldPos = gridToWorld(gridX, gridY)
    super(scene, worldPos.x, worldPos.y)
    this.id = id
    this.entityName = name
    this.gridPosition = { x: gridX, y: gridY }
    this.setSize(TILE_SIZE, TILE_SIZE)
    scene.add.existing(this)
  }

  /** Animate movement to a grid cell. Returns a promise that resolves on completion. */
  moveToCell(gridX: number, gridY: number, duration: number = ANIMATIONS.MOVE_DURATION): Promise<void> {
    const target = gridToWorld(gridX, gridY)

    // Update direction based on movement
    if (gridX > this.gridPosition.x) this.direction = 'right'
    else if (gridX < this.gridPosition.x) this.direction = 'left'
    else if (gridY > this.gridPosition.y) this.direction = 'down'
    else if (gridY < this.gridPosition.y) this.direction = 'up'

    this.gridPosition = { x: gridX, y: gridY }

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: target.x,
        y: target.y,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => resolve(),
      })
    })
  }

  /** Animate along a path of grid positions. */
  async moveAlongPath(path: GridPosition[], durationPerStep = 200): Promise<void> { // 200ms per step (slightly faster than MOVE_DURATION)
    for (const step of path) {
      await this.moveToCell(step.x, step.y, durationPerStep)
    }
  }

  /** Set selection state (visual feedback handled by subclasses). */
  setSelected(selected: boolean): void {
    this.isSelected = selected
  }

  /** Update grid position instantly (no animation). */
  setGridPosition(gridX: number, gridY: number): void {
    this.gridPosition = { x: gridX, y: gridY }
    const worldPos = gridToWorld(gridX, gridY)
    this.setPosition(worldPos.x, worldPos.y)
  }

  /** Get current grid position from pixel position. */
  getGridPos(): GridPosition {
    return worldToGrid(this.x, this.y)
  }

  /** Play hurt animation (subclass-specific visual). */
  abstract playHurt(): void

  /** Play attack lunge toward a target position. */
  playAttack(targetX: number, targetY: number): Promise<void> {
    const origX = this.x
    const origY = this.y
    const lungeX = origX + (targetX - origX) * 0.5 // halfway lunge toward target
    const lungeY = origY + (targetY - origY) * 0.5

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: lungeX,
        y: lungeY,
        duration: ANIMATIONS.ATTACK_LUNGE,
        ease: 'Quad.easeIn',
        yoyo: true,
        onComplete: () => resolve(),
      })
    })
  }

  /** Update combatant data (HP, conditions, etc.). */
  updateCombatant(combatant: Combatant): void {
    this.combatant = combatant
  }

  /** Create the initial-letter text object from the combatant's name. */
  protected createInitialLetter(): Phaser.GameObjects.Text {
    const letter = this.combatant.name.charAt(0).toUpperCase()
    const text = this.scene.add.text(0, 0, letter, TEXT_STYLES.INITIAL_LETTER)
    text.setOrigin(0.5)
    return text
  }

  /** Internal hurt flash animation. The redrawFn callback redraws the entity in its hurt color. */
  protected playHurtEffect(redrawFn: () => void): void {
    if (this.hurtTween) this.hurtTween.stop()
    redrawFn()

    this.hurtTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 80, // quick flash
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        redrawFn()
        this.setAlpha(1)
      },
    })
  }

  /** Death animation: shrink and fade, then destroy. */
  playDeath(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: ANIMATIONS.DEATH_SHRINK,
        ease: 'Power2',
        onComplete: () => {
          this.destroy()
          resolve()
        },
      })
    })
  }
}
