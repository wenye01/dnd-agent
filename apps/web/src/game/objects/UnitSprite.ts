import Phaser from 'phaser'
import { TILE_SIZE, GridColors } from '../types/combat-scene'
import type { CombatUnitData, GridPosition, UnitTeam } from '../types/combat-scene'
import { gridToWorld } from '../types/combat-scene'

/**
 * UnitSprite - A combat unit displayed as a colored circle with a name label,
 * health bar, and turn indicator glow.
 *
 * Built as a Phaser Container for easy positioning and child management.
 */
export class UnitSprite extends Phaser.GameObjects.Container {
  readonly unitId: string
  readonly team: UnitTeam

  private bodyCircle: Phaser.GameObjects.Arc
  private nameLabel: Phaser.GameObjects.Text
  private hpBarBg: Phaser.GameObjects.Graphics
  private hpBarFill: Phaser.GameObjects.Graphics
  private turnIndicator: Phaser.GameObjects.Arc | null = null

  private _gridPosition: GridPosition
  private _hp: number
  private _maxHp: number
  private _isCurrentTurn: boolean = false

  constructor(scene: Phaser.Scene, data: CombatUnitData) {
    const worldPos = gridToWorld(data.gridPosition.x, data.gridPosition.y)
    super(scene, worldPos.x, worldPos.y)

    this.unitId = data.id
    this.team = data.team
    this._gridPosition = { ...data.gridPosition }
    this._hp = data.hp
    this._maxHp = data.maxHp

    // Color by team
    const fillColor = this.getTeamColor(data.team)

    // Main body circle
    this.bodyCircle = scene.add.circle(0, 0, TILE_SIZE / 2 - 6, fillColor)
    this.bodyCircle.setStrokeStyle(2, 0xffffff, 0.6)
    this.add(this.bodyCircle)

    // Name label above the unit
    this.nameLabel = scene.add.text(0, -(TILE_SIZE / 2 + 8), data.name, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
    })
    this.nameLabel.setOrigin(0.5, 1)
    this.add(this.nameLabel)

    // HP bar background
    this.hpBarBg = scene.add.graphics()
    this.add(this.hpBarBg)

    // HP bar fill
    this.hpBarFill = scene.add.graphics()
    this.add(this.hpBarFill)

    this.drawHpBar()

    // Enable interaction on the container
    this.setSize(TILE_SIZE, TILE_SIZE)
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, TILE_SIZE / 2 - 4),
      Phaser.Geom.Circle.Contains
    )

    scene.add.existing(this)
  }

  /** Update unit data (hp, conditions, etc.) without recreating */
  updateData(data: Partial<CombatUnitData>): void {
    if (data.hp !== undefined) {
      this._hp = data.hp
    }
    if (data.maxHp !== undefined) {
      this._maxHp = data.maxHp
    }
    if (data.name !== undefined) {
      this.nameLabel.setText(data.name)
    }
    this.drawHpBar()
  }

  /** Set whether this unit is the current turn unit */
  setCurrentTurn(isCurrent: boolean): void {
    this._isCurrentTurn = isCurrent
    if (isCurrent) {
      this.showTurnIndicator()
    } else {
      this.hideTurnIndicator()
    }
  }

  get gridPosition(): GridPosition {
    return { ...this._gridPosition }
  }

  get isCurrentTurn(): boolean {
    return this._isCurrentTurn
  }

  /** Set grid position without animation (for instant updates) */
  setGridPosition(pos: GridPosition): void {
    this._gridPosition = { ...pos }
    const worldPos = gridToWorld(pos.x, pos.y)
    this.setPosition(worldPos.x, worldPos.y)
  }

  /** Animate movement to a new grid position */
  tweenToPosition(pos: GridPosition, duration: number = 300): Promise<void> {
    this._gridPosition = { ...pos }
    const worldPos = gridToWorld(pos.x, pos.y)
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: worldPos.x,
        y: worldPos.y,
        duration,
        ease: 'Power2',
        onComplete: () => resolve(),
      })
    })
  }

  /** Flash the unit briefly (e.g. on being hit) */
  flash(color: number = 0xffffff, duration: number = 150): void {
    const originalColor = this.bodyCircle.fillColor
    this.bodyCircle.setFillStyle(color)
    this.scene.time.delayedCall(duration, () => {
      this.bodyCircle.setFillStyle(originalColor)
    })
  }

  /** Play death animation - fade out and shrink */
  playDeath(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0.3,
        scale: 0.6,
        duration: 500,
        ease: 'Power2',
        onComplete: () => resolve(),
      })
    })
  }

  private showTurnIndicator(): void {
    if (this.turnIndicator) return

    const glowColor = this.team === 'player'
      ? GridColors.currentPlayerGlow
      : GridColors.currentEnemyGlow

    this.turnIndicator = this.scene.add.circle(0, 0, TILE_SIZE / 2, glowColor, 0.25)
    this.addAt(this.turnIndicator, 0)

    // Pulsing tween for the indicator
    this.scene.tweens.add({
      targets: this.turnIndicator,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private hideTurnIndicator(): void {
    if (!this.turnIndicator) return
    this.scene.tweens.killTweensOf(this.turnIndicator)
    this.turnIndicator.destroy()
    this.turnIndicator = null
  }

  private drawHpBar(): void {
    const barWidth = TILE_SIZE - 8
    const barHeight = 4
    const yOffset = TILE_SIZE / 2 - 10

    // Background
    this.hpBarBg.clear()
    this.hpBarBg.fillStyle(0x000000, 0.6)
    this.hpBarBg.fillRect(-barWidth / 2, yOffset, barWidth, barHeight)

    // Fill
    this.hpBarFill.clear()
    const hpRatio = this._maxHp > 0 ? this._hp / this._maxHp : 0
    const fillColor = this.getHpColor(hpRatio)
    this.hpBarFill.fillStyle(fillColor, 0.9)
    this.hpBarFill.fillRect(-barWidth / 2, yOffset, barWidth * hpRatio, barHeight)
  }

  private getHpColor(ratio: number): number {
    if (ratio > 0.6) return 0x44ff44  // green
    if (ratio > 0.3) return 0xffaa00  // yellow
    return 0xff4444                    // red
  }

  private getTeamColor(team: UnitTeam): number {
    switch (team) {
      case 'player': return GridColors.playerUnit
      case 'enemy': return GridColors.enemyUnit
      case 'neutral': return GridColors.neutralUnit
    }
  }

  override destroy(fromScene?: boolean): void {
    if (this.turnIndicator) {
      this.scene.tweens.killTweensOf(this.turnIndicator)
    }
    super.destroy(fromScene)
  }
}
