import Phaser from 'phaser'
import type { SpellSchool } from '../types/combat-scene'
import { SpellSchoolColors, TILE_SIZE, gridToWorld } from '../types/combat-scene'
import type { GridPosition } from '../types/combat-scene'

/**
 * SpellEffect - Visual effects for spell casting.
 *
 * Provides aura, particle burst, and beam effects, with colors
 * that vary by spell school.
 */
export class SpellEffect {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Play a caster aura effect - a brief glowing ring around the caster.
   */
  playAura(x: number, y: number, school: SpellSchool = 'evocation'): void {
    const color = SpellSchoolColors[school]
    const ring = this.scene.add.circle(x, y, 6, color, 0.4)
    ring.setStrokeStyle(2, color, 0.8)
    ring.setDepth(900)

    this.scene.tweens.add({
      targets: ring,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
  }

  /**
   * Play a particle burst at the given world position.
   * Simulated with small circles that scatter outward.
   */
  playParticleBurst(x: number, y: number, school: SpellSchool = 'evocation'): void {
    const color = SpellSchoolColors[school]
    const count = 8

    for (let i = 0; i < count; i++) {
      const particle = this.scene.add.circle(x, y, 3, color, 0.8)
      particle.setDepth(950)

      const angle = (Math.PI * 2 * i) / count
      const dist = 20 + Math.random() * 30

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      })
    }
  }

  /**
   * Play a beam effect from source to target position.
   */
  playBeam(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    school: SpellSchool = 'evocation'
  ): void {
    const color = SpellSchoolColors[school]
    const g = this.scene.add.graphics()
    g.setDepth(900)

    // Draw the beam line
    g.lineStyle(4, color, 0.8)
    g.beginPath()
    g.moveTo(sourceX, sourceY)
    g.lineTo(targetX, targetY)
    g.strokePath()

    // Outer glow
    g.lineStyle(8, color, 0.2)
    g.beginPath()
    g.moveTo(sourceX, sourceY)
    g.lineTo(targetX, targetY)
    g.strokePath()

    // Fade out
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    })
  }

  /**
   * Play an AOE zone indicator effect at a grid center.
   */
  playAOEZone(center: GridPosition, radiusTiles: number, school: SpellSchool = 'evocation'): void {
    const color = SpellSchoolColors[school]
    const worldPos = gridToWorld(center.x, center.y)
    const radiusPx = radiusTiles * TILE_SIZE

    const zone = this.scene.add.circle(worldPos.x, worldPos.y, radiusPx, color, 0.15)
    zone.setStrokeStyle(2, color, 0.5)
    zone.setDepth(800)

    this.scene.tweens.add({
      targets: zone,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => zone.destroy(),
    })
  }
}
