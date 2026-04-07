/**
 * Healing effect: green glow particles rising from the target.
 */
import Phaser from 'phaser'
import { ANIMATIONS } from '../constants'

export class HealingEffect {
  /**
   * Play healing particle effect at a world position.
   */
  static play(scene: Phaser.Scene, worldX: number, worldY: number): void {
    const particleCount = 8
    const particles: Phaser.GameObjects.Arc[] = []

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 10
      const x = worldX + Math.cos(angle) * radius
      const y = worldY + Math.sin(angle) * radius

      const particle = scene.add.circle(x, y, 3, 0x44ff44, 0.9)
      particle.setDepth(500)
      particles.push(particle)

      // Rise and fade
      scene.tweens.add({
        targets: particle,
        y: y - 30 - Math.random() * 20,
        x: x + (Math.random() - 0.5) * 20,
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
    const glow = scene.add.circle(worldX, worldY, 20, 0x44ff44, 0.3)
    glow.setDepth(499)

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
