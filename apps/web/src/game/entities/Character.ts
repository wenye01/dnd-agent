/**
 * Character entity: player-controlled unit with HP bar, status icons,
 * attack/hurt/death animations.
 */
import Phaser from 'phaser'
import { BaseEntity } from './BaseEntity'
import { TILE_SIZE, COLORS } from '../constants'
import type { Combatant } from '../../types'

export class Character extends BaseEntity {
  public combatant: Combatant
  private bodyGraphic: Phaser.GameObjects.Graphics
  private initialLetter: Phaser.GameObjects.Text
  private hurtTween: Phaser.Tweens.Tween | null = null

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
    this.bodyGraphic.fillCircle(0, 0, TILE_SIZE / 2 - 6)
    this.bodyGraphic.lineStyle(2, 0xffffff, 0.4)
    this.bodyGraphic.strokeCircle(0, 0, TILE_SIZE / 2 - 6)
    this.add(this.bodyGraphic)

    // Initial letter of name
    const letter = combatant.name.charAt(0).toUpperCase()
    this.initialLetter = scene.add.text(0, 0, letter, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    })
    this.initialLetter.setOrigin(0.5)
    this.add(this.initialLetter)
  }

  /** Update combatant data (HP, conditions, etc.). */
  updateCombatant(combatant: Combatant): void {
    this.combatant = combatant
  }

  /** Play hurt flash animation. */
  playHurt(): void {
    if (this.hurtTween) this.hurtTween.stop()
    this.bodyGraphic.clear()
    this.bodyGraphic.fillStyle(0xff8888, 1)
    this.bodyGraphic.fillCircle(0, 0, TILE_SIZE / 2 - 6)
    this.bodyGraphic.lineStyle(2, 0xff4444, 0.6)
    this.bodyGraphic.strokeCircle(0, 0, TILE_SIZE / 2 - 6)

    this.hurtTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.redrawNormal()
      },
    })
  }

  /** Play attack lunge toward a target position. */
  playAttack(targetX: number, targetY: number): Promise<void> {
    const origX = this.x
    const origY = this.y
    const lungeX = origX + (targetX - origX) * 0.5
    const lungeY = origY + (targetY - origY) * 0.5

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: lungeX,
        y: lungeY,
        duration: 120,
        ease: 'Quad.easeIn',
        yoyo: true,
        onComplete: () => resolve(),
      })
    })
  }

  private redrawNormal(): void {
    this.bodyGraphic.clear()
    this.bodyGraphic.fillStyle(COLORS.PLAYER, 1)
    this.bodyGraphic.fillCircle(0, 0, TILE_SIZE / 2 - 6)
    this.bodyGraphic.lineStyle(2, 0xffffff, 0.4)
    this.bodyGraphic.strokeCircle(0, 0, TILE_SIZE / 2 - 6)
    this.setAlpha(1)
  }
}
