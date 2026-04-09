/**
 * Enemy entity: hostile unit with CR display and red color coding.
 */
import Phaser from 'phaser'
import { BaseEntity } from './BaseEntity'
import { TILE_SIZE, COLORS, ENTITY_RADIUS, ENTITY_BORDER_WIDTH, CR_LABEL_X_OFFSET, CR_LABEL_Y_OFFSET, CR_FONT_SIZE } from '../constants'
import type { Combatant } from '../../types'

export class Enemy extends BaseEntity {
  private bodyGraphic: Phaser.GameObjects.Graphics
  private crLabel: Phaser.GameObjects.Text

  constructor(
    scene: Phaser.Scene,
    combatant: Combatant,
    gridX: number,
    gridY: number,
  ) {
    super(scene, combatant.id, combatant.name, gridX, gridY)
    this.combatant = combatant

    // Draw enemy body (red diamond shape)
    this.bodyGraphic = scene.add.graphics()
    this.drawBody(COLORS.ENEMY)

    // Initial letter
    this.add(this.createInitialLetter())

    // CR label (bottom right)
    const cr = combatant.cr ?? 0
    this.crLabel = scene.add.text(TILE_SIZE / 2 + CR_LABEL_X_OFFSET, TILE_SIZE / 2 + CR_LABEL_Y_OFFSET, `CR${cr}`, {
      fontSize: CR_FONT_SIZE,
      color: '#ffcccc',
      fontFamily: 'monospace',
    })
    this.crLabel.setOrigin(0.5)
    this.add(this.crLabel)
  }

  /** Play hurt flash. */
  playHurt(): void {
    super.playHurtEffect(() => {
      this.bodyGraphic.clear()
      this.drawBody(COLORS.ENEMY)
      this.setAlpha(1)
    })
  }

  private drawBody(color: number): void {
    const r = ENTITY_RADIUS
    this.bodyGraphic.clear()
    this.bodyGraphic.fillStyle(color, 1)
    // Draw diamond shape
    this.bodyGraphic.fillTriangle(0, -r, r, 0, 0, r)
    this.bodyGraphic.fillTriangle(0, -r, -r, 0, 0, r)
    this.bodyGraphic.lineStyle(ENTITY_BORDER_WIDTH, 0xffffff, 0.3)
    this.bodyGraphic.strokeTriangle(0, -r, r, 0, 0, r)
    this.bodyGraphic.strokeTriangle(0, -r, -r, 0, 0, r)
    // Note: bodyGraphic is already added to container in constructor; no need to re-add
  }
}
