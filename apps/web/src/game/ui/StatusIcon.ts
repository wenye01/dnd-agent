/**
 * Status condition icon drawn as a colored circle with text abbreviation.
 */
import Phaser from 'phaser'
import { STATUS_ICON_SIZE, CONDITION_COLORS, TEXT_STYLES } from '../constants'

/** Condition -> abbreviation text. */
const CONDITION_ABBREV: Record<string, string> = {
  blinded: 'BLD',
  charmed: 'CHM',
  deafened: 'DEF',
  frightened: 'FRT',
  grappled: 'GRP',
  incapacitated: 'INC',
  invisible: 'INV',
  paralyzed: 'PAR',
  petrified: 'PET',
  poisoned: 'PSN',
  prone: 'PRN',
  restrained: 'RST',
  stunned: 'STN',
  unconscious: 'UNC',
  exhaustion: 'EXH',
}

export class StatusIcon extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text
  private _condition: string

  constructor(scene: Phaser.Scene, condition: string) {
    super(scene, 0, 0)
    this._condition = condition

    const color = CONDITION_COLORS[condition] ?? 0x666666
    const abbrev = CONDITION_ABBREV[condition] ?? condition.slice(0, 3).toUpperCase()

    // Background circle
    this.bg = scene.add.graphics()
    this.bg.fillStyle(color, 0.85)
    this.bg.fillCircle(0, 0, STATUS_ICON_SIZE / 2)
    this.bg.lineStyle(1, 0x000000, 0.5)
    this.bg.strokeCircle(0, 0, STATUS_ICON_SIZE / 2)
    this.add(this.bg)

    // Abbreviation text
    this.label = scene.add.text(0, 0, abbrev, TEXT_STYLES.STATUS_ICON)
    this.label.setOrigin(0.5)
    this.add(this.label)

    this.setSize(STATUS_ICON_SIZE, STATUS_ICON_SIZE)
  }

  get condition(): string {
    return this._condition
  }
}
