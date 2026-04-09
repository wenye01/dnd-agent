/**
 * Health bar rendered via Phaser Graphics API.
 * Color transitions green -> yellow -> red based on HP percentage.
 */
import Phaser from 'phaser'
import { HP_BAR_WIDTH, HP_BAR_HEIGHT, COLORS, HP_THRESHOLD_HIGH, HP_THRESHOLD_LOW } from '../constants'

export class HealthBar extends Phaser.GameObjects.Graphics {
  private _maxHp = 1
  private _currentHp = 1

  constructor(scene: Phaser.Scene) {
    super(scene)
    this.draw()
  }

  setHp(current: number, max: number): void {
    this._currentHp = Math.max(0, current)
    this._maxHp = Math.max(1, max)
    this.draw()
  }

  private draw(): void {
    this.clear()

    const pct = this._currentHp / this._maxHp
    const barWidth = HP_BAR_WIDTH * pct

    // Background
    this.fillStyle(COLORS.HP_BG, 0.8)
    this.fillRect(-HP_BAR_WIDTH / 2, 0, HP_BAR_WIDTH, HP_BAR_HEIGHT)

    // HP fill
    const color =
      pct > HP_THRESHOLD_HIGH ? COLORS.HP_GREEN : pct > HP_THRESHOLD_LOW ? COLORS.HP_YELLOW : COLORS.HP_RED
    this.fillStyle(color, 1)
    this.fillRect(-HP_BAR_WIDTH / 2, 0, barWidth, HP_BAR_HEIGHT)

    // Border
    this.lineStyle(1, 0x000000, 0.5) // border: thin black outline
    this.strokeRect(-HP_BAR_WIDTH / 2, 0, HP_BAR_WIDTH, HP_BAR_HEIGHT)
  }
}
