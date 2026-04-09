/**
 * Character entity: player-controlled unit with HP bar, status icons,
 * attack/hurt/death animations.
 */
import Phaser from 'phaser'
import { BaseEntity } from './BaseEntity'
import { COLORS, ENTITY_RADIUS, ENTITY_BORDER_WIDTH, ENTITY_BORDER_ALPHA } from '../constants'
import type { Combatant } from '../../types'

export class Character extends BaseEntity {
  private bodyGraphic: Phaser.GameObjects.Graphics

  constructor(
    scene: Phaser.Scene,
    combatant: Combatant,
    gridX: number,
    gridY: number,
  ) {
    super(scene, combatant.id, combatant.name, gridX, gridY)
    this.combatant = combatant

    // Draw character body (blue circle)
    this.bodyGraphic = scene.add.graphics()
    this.bodyGraphic.fillStyle(COLORS.PLAYER, 1)
    this.bodyGraphic.fillCircle(0, 0, ENTITY_RADIUS)
    this.bodyGraphic.lineStyle(ENTITY_BORDER_WIDTH, 0xffffff, ENTITY_BORDER_ALPHA)
    this.bodyGraphic.strokeCircle(0, 0, ENTITY_RADIUS)
    this.add(this.bodyGraphic)

    // Initial letter of name
    this.add(this.createInitialLetter())
  }

  /** Play hurt flash animation. */
  playHurt(): void {
    super.playHurtEffect(() => this.redrawNormal())
  }

  private redrawNormal(): void {
    this.bodyGraphic.clear()
    this.bodyGraphic.fillStyle(COLORS.PLAYER, 1)
    this.bodyGraphic.fillCircle(0, 0, ENTITY_RADIUS)
    this.bodyGraphic.lineStyle(ENTITY_BORDER_WIDTH, 0xffffff, ENTITY_BORDER_ALPHA)
    this.bodyGraphic.strokeCircle(0, 0, ENTITY_RADIUS)
    this.setAlpha(1)
  }
}
