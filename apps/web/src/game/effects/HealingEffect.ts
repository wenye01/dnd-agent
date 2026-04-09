/**
 * Healing effect: green glow particles rising from the target.
 */
import Phaser from 'phaser'
import { ANIMATIONS, DEPTH, HEALING_PARTICLE_COUNT, HEALING_PARTICLE_RADIUS, HEALING_PARTICLE_SIZE, HEALING_RISE_DISTANCE, HEALING_DRIFT_RANGE, HEALING_GLOW_RADIUS } from '../constants'

export class HealingEffect {
  /**
   * Play healing particle effect at a world position.
   */
  static play(scene: Phaser.Scene, worldX: number, worldY: number): void {
    const particles: Phaser.GameObjects.Arc[] = []

    for (let i = 0; i < HEALING_PARTICLE_COUNT; i++) {
      const angle = (i / HEALING_PARTICLE_COUNT) * Math.PI * 2
      const x = worldX + Math.cos(angle) * HEALING_PARTICLE_RADIUS
      const y = worldY + Math.sin(angle) * HEALING_PARTICLE_RADIUS

      const particle = scene.add.circle(x, y, HEALING_PARTICLE_SIZE, 0x44ff44, 0.9)
      particle.setDepth(DEPTH.EFFECTS)
      particles.push(particle)

      // Rise and fade
      scene.tweens.add({
        targets: particle,
        y: y - HEALING_RISE_DISTANCE - Math.random() * HEALING_DRIFT_RANGE,
        x: x + (Math.random() - 0.5) * HEALING_DRIFT_RANGE,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: ANIMATIONS.HEALING_DURATION + Math.random() * 200,
        delay: i * 40,
        ease: 'Sine.easeUp',
        onComplete: () => particle.destroy(),
      })
    }

    // Central green glow
    const glow = scene.add.circle(worldX, worldY, HEALING_GLOW_RADIUS, 0x44ff44, 0.3)
    glow.setDepth(DEPTH.EFFECTS - 1)

    scene.tweens.add({
      targets: glow,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: ANIMATIONS.HEALING_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    })
  }
}
