/**
 * Central effect manager: dispatches, plays, and cleans up visual effects.
 * The CombatScene owns an instance and calls handleCombatEvent for each event.
 */
import type Phaser from 'phaser'
import { DamageNumber } from './DamageNumber'
import { AttackEffect } from './AttackEffect'
import { HealingEffect } from './HealingEffect'
import { SpellEffect } from './SpellEffect'
import { StatusEffect } from './StatusEffect'
import type { CombatEventPayload } from '../../services/websocket'
import type { Character } from '../entities/Character'
import type { Enemy } from '../entities/Enemy'
import type { BaseEntity } from '../entities/BaseEntity'
import { MELEE_RANGE_THRESHOLD_PX } from '../constants'

interface EntityLookup {
  getEntity(id: string): BaseEntity | undefined
}

/** Extract the magic school from an opaque event data payload. */
function extractSchool(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'school' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).school as string
  }
  return undefined
}

export class EffectManager {
  private scene: Phaser.Scene
  private entityLookup: EntityLookup

  constructor(scene: Phaser.Scene, entityLookup: EntityLookup) {
    this.scene = scene
    this.entityLookup = entityLookup
  }

  /**
   * Handle a structured combat event and play appropriate effects.
   */
  handleCombatEvent(event: CombatEventPayload): void {
    switch (event.eventType) {
      case 'attack':
        this.onAttack(event)
        break
      case 'damage':
        this.onDamage(event)
        break
      case 'heal':
        this.onHeal(event)
        break
      case 'death':
        this.onDeath(event)
        break
      case 'condition_applied':
        this.onConditionApplied(event)
        break
      case 'condition_removed':
        this.onConditionRemoved(event)
        break
      case 'spell':
        this.onSpell(event)
        break
    }
  }

  private onAttack(event: CombatEventPayload): void {
    const source = this.entityLookup.getEntity(event.characterId ?? '')
    const target = this.entityLookup.getEntity(event.target ?? '')
    if (!source || !target) return

    // Determine if melee or ranged (simple heuristic: distance)
    const dx = Math.abs(source.x - target.x)
    const dy = Math.abs(source.y - target.y)
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > MELEE_RANGE_THRESHOLD_PX) {
      // Ranged
      AttackEffect.projectile(this.scene, source.x, source.y, target.x, target.y)
    } else {
      // Melee
      AttackEffect.meleeSwing(this.scene, source.x, source.y, target.x, target.y)
    }

    // Source entity attack animation
    const entity = source as Character | Enemy
    if ('playAttack' in entity) {
      entity.playAttack(target.x, target.y)
    }

    // Check for miss
    if (event.isHit === false) {
      DamageNumber.show(this.scene, target.x, target.y, 0, 'miss')
    }
  }

  private onDamage(event: CombatEventPayload): void {
    const target = this.entityLookup.getEntity(event.target ?? event.characterId ?? '')
    if (!target) return

    const amount = event.damage ?? event.amount ?? 0
    const type = event.isCrit ? 'crit' : 'damage'
    DamageNumber.show(this.scene, target.x, target.y, amount, type)

    // Target hurt animation
    const entity = target as Character | Enemy
    if ('playHurt' in entity) {
      entity.playHurt()
    }
  }

  private onHeal(event: CombatEventPayload): void {
    const target = this.entityLookup.getEntity(event.characterId ?? '')
    if (!target) return

    const amount = event.amount ?? 0
    DamageNumber.show(this.scene, target.x, target.y, amount, 'heal')
    HealingEffect.play(this.scene, target.x, target.y)
  }

  private onDeath(event: CombatEventPayload): void {
    const entity = this.entityLookup.getEntity(event.characterId ?? '')
    if (!entity) return
    entity.playDeath()
  }

  private onConditionApplied(event: CombatEventPayload): void {
    const target = this.entityLookup.getEntity(event.characterId ?? '')
    if (!target || !event.condition) return
    StatusEffect.gained(this.scene, target.x, target.y, event.condition)
  }

  private onConditionRemoved(event: CombatEventPayload): void {
    const target = this.entityLookup.getEntity(event.characterId ?? '')
    if (!target || !event.condition) return
    StatusEffect.removed(this.scene, target.x, target.y, event.condition)
  }

  private onSpell(event: CombatEventPayload): void {
    const source = this.entityLookup.getEntity(event.characterId ?? '')
    const target = this.entityLookup.getEntity(event.target ?? '')
    if (!source) return

    SpellEffect.play(
      this.scene,
      source.x,
      source.y,
      extractSchool(event.data),
      target?.x,
      target?.y,
    )
  }
}
