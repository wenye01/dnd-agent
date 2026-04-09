/**
 * Spell effect: particle-based casting animation, color varies by school/type.
 */
import Phaser from 'phaser'
import { ANIMATIONS, DEPTH, SPELL_PARTICLE_COUNT, SPELL_PARTICLE_RADIUS, SPELL_BURST_RADIUS, SPELL_BURST_SCALE, SPELL_BOLT_RADIUS, SPELL_IMPACT_RADIUS, SPELL_IMPACT_SCALE, SPELL_IMPACT_DURATION } from '../constants'

/** Spell school to color mapping. */
const SCHOOL_COLORS: Record<string, number> = {
  abjuration: 0xaaaaff,
  conjuration: 0x88ff88,
  divination: 0xccccff,
  enchantment: 0xff88ff,
  evocation: 0xff8844,
  illusion: 0xcc88ff,
  necromancy: 0x66aa88,
  transmutation: 0xffaa44,
  default: 0x9b6dff,
}

export class SpellEffect {
  /**
   * Play spell casting effect at a world position.
   */
  static play(
    scene: Phaser.Scene,
    worldX: number,
    worldY: number,
    school?: string,
    targetX?: number,
    targetY?: number,
  ): void {
    const color = SCHOOL_COLORS[school ?? 'default'] ?? SCHOOL_COLORS.default

    // Casting particles converging to caster
    for (let i = 0; i < SPELL_PARTICLE_COUNT; i++) {
      const angle = (i / SPELL_PARTICLE_COUNT) * Math.PI * 2
      const startX = worldX + Math.cos(angle) * SPELL_PARTICLE_RADIUS
      const startY = worldY + Math.sin(angle) * SPELL_PARTICLE_RADIUS

      const particle = scene.add.circle(startX, startY, 2.5, color, 0.8)
      particle.setDepth(DEPTH.EFFECTS)

      scene.tweens.add({
        targets: particle,
        x: worldX,
        y: worldY,
        alpha: 0.4,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: ANIMATIONS.SPELL_DURATION * 0.6,
        delay: i * 30,
        ease: 'Sine.easeIn',
        onComplete: () => particle.destroy(),
      })
    }

    // Central burst glow
    const burst = scene.add.circle(worldX, worldY, SPELL_BURST_RADIUS, color, 0.6)
    burst.setDepth(DEPTH.EFFECTS_OVERLAY)

    scene.tweens.add({
      targets: burst,
      scaleX: SPELL_BURST_SCALE,
      scaleY: SPELL_BURST_SCALE,
      alpha: 0,
      duration: ANIMATIONS.SPELL_DURATION * 0.5,
      delay: ANIMATIONS.SPELL_DURATION * 0.4,
      ease: 'Sine.easeOut',
      onComplete: () => burst.destroy(),
    })

    // If there's a target, send a bolt
    if (targetX !== undefined && targetY !== undefined) {
      const bolt = scene.add.circle(worldX, worldY, SPELL_BOLT_RADIUS, color, 0.9)
      bolt.setDepth(DEPTH.EFFECTS_OVERLAY)

      scene.tweens.add({
        targets: bolt,
        x: targetX,
        y: targetY,
        duration: SPELL_IMPACT_DURATION,
        delay: ANIMATIONS.SPELL_DURATION * 0.5,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Impact
          const impact = scene.add.circle(targetX, targetY, SPELL_IMPACT_RADIUS, color, 0.7)
          impact.setDepth(DEPTH.EFFECTS_OVERLAY)
          scene.tweens.add({
            targets: impact,
            scaleX: SPELL_IMPACT_SCALE,
            scaleY: SPELL_IMPACT_SCALE,
            alpha: 0,
            duration: SPELL_IMPACT_DURATION,
            onComplete: () => impact.destroy(),
          })
          bolt.destroy()
        },
      })
    }
  }
}
