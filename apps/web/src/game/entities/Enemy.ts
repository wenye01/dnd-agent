/**
 * Enemy entity: hostile unit with CR display and red color coding.
 */
import Phaser from 'phaser'
import { BaseEntity } from './BaseEntity'
import { TILE_SIZE, COLORS } from '../constants'
import type { Combatant } from '../../types'

export class Enemy extends BaseEntity {
  public combatant: Combatant
  private bodyGraphic: Phaser.GameObjects.Graphics
  private crLabel: Phaser.GameObjects.Text
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

    // Draw enemy body (red diamond shape)
    this.bodyGraphic = scene.add.graphics()
    this.drawBody(COLORS.ENEMY)

    // Initial letter
    const letter = combatant.name.charAt(0).toUpperCase()
    this.initialLetter = scene.add.text(0, 0, letter, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    })
    this.initialLetter.setOrigin(0.5)
    this.add(this.initialLetter)

    // CR label (bottom right)
    const cr = combatant.cr ?? 0
    this.crLabel = scene.add.text(TILE_SIZE / 2 - 8, TILE_SIZE / 2 - 10, `CR${cr}`, {
      fontSize: '7px',
      color: '#ffcccc',
      fontFamily: 'monospace',
    })
    this.crLabel.setOrigin(0.5)
    this.add(this.crLabel)
  }

  /** Update combatant data. */
  updateCombatant(combatant: Combatant): void {
    this.combatant = combatant
  }

  /** Play hurt flash. */
  playHurt(): void {
    if (this.hurtTween) this.hurtTween.stop()
    this.bodyGraphic.clear()
    this.drawBody(0xff2222)

    this.hurtTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.bodyGraphic.clear()
        this.drawBody(COLORS.ENEMY)
        this.setAlpha(1)
      },
    })
  }

  /** Play attack lunge. */
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

  private drawBody(color: number): void {
    const r = TILE_SIZE / 2 - 6
    this.bodyGraphic.fillStyle(color, 1)
    // Draw diamond shape
    this.bodyGraphic.fillTriangle(0, -r, r, 0, 0, r)
    this.bodyGraphic.fillTriangle(0, -r, -r, 0, 0, r)
    this.bodyGraphic.lineStyle(2, 0xffffff, 0.3)
    this.bodyGraphic.strokeTriangle(0, -r, r, 0, 0, r)
    this.bodyGraphic.strokeTriangle(0, -r, -r, 0, 0, r)
    this.add(this.bodyGraphic)
  }
}
