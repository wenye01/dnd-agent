/**
 * Reusable animation preset configurations for Phaser tweens.
 */
import { ANIMATIONS } from '../constants'

export interface TweenConfig {
  targets: unknown
  x?: number
  y?: number
  alpha?: number
  scaleX?: number
  scaleY?: number
  duration: number
  ease?: string
  yoyo?: boolean
  delay?: number
  onComplete?: () => void
}

/** Move animation: smooth slide from current to target. */
export function moveTween(
  targets: unknown,
  x: number,
  y: number,
  onComplete?: () => void,
): TweenConfig {
  return {
    targets,
    x,
    y,
    duration: ANIMATIONS.MOVE_DURATION,
    ease: 'Sine.easeInOut',
    onComplete,
  }
}

/** Attack lunge: move toward target, then return. */
export function attackLungeTween(
  targets: unknown,
  targetX: number,
  targetY: number,
  currentX: number,
  currentY: number,
  onComplete?: () => void,
): TweenConfig {
  // Move 60% toward target
  const lungeX = currentX + (targetX - currentX) * 0.6
  const lungeY = currentY + (targetY - currentY) * 0.6
  return {
    targets,
    x: lungeX,
    y: lungeY,
    duration: ANIMATIONS.ATTACK_LUNGE,
    ease: 'Quad.easeIn',
    yoyo: true,
    onComplete,
  }
}

/** Damage number: float upward and fade out. */
export function damageFloatTween(
  targets: unknown,
  startY: number,
  onComplete?: () => void,
): TweenConfig {
  return {
    targets,
    y: startY - 40,
    alpha: 0,
    duration: ANIMATIONS.DAMAGE_FLOAT,
    ease: 'Sine.easeUp',
    onComplete,
  }
}

/** Death animation: shrink + fade. */
export function deathTween(
  targets: unknown,
  onComplete?: () => void,
): TweenConfig {
  return {
    targets,
    scaleX: 0,
    scaleY: 0,
    alpha: 0,
    duration: ANIMATIONS.DEATH_SHRINK,
    ease: 'Power2',
    onComplete,
  }
}

/** Selection ring pulse: scale up and down repeatedly. */
export function selectionPulseTween(
  targets: unknown,
): TweenConfig {
  return {
    targets,
    scaleX: 1.3,
    scaleY: 1.3,
    alpha: 0.3,
    duration: ANIMATIONS.SELECTION_PULSE,
    ease: 'Sine.easeInOut',
    yoyo: true,
  }
}

/** Hit flash: briefly tint white. */
export function hitFlashTween(
  targets: unknown,
  onComplete?: () => void,
): TweenConfig {
  return {
    targets,
    alpha: 0.3,
    duration: 80,
    yoyo: true,
    onComplete,
  }
}
