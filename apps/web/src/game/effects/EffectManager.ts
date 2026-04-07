import Phaser from 'phaser'
import { AttackEffect } from './AttackEffect'
import { DamageNumber } from './DamageNumber'
import { SpellEffect } from './SpellEffect'
import { ConditionIcons } from './ConditionIcons'
import type { UnitSprite } from '../objects/UnitSprite'
import type {
  DamageNumberType,
  SpellSchool,
  WeaponType,
  GridPosition,
} from '../types/combat-scene'
import type { Condition } from '../../types/game'

/**
 * EffectManager - Unified coordinator for all combat visual effects.
 *
 * Holds instances of each effect subsystem and exposes a high-level
 * API that the CombatScene can call without worrying about individual
 * effect implementations.
 */
export class EffectManager {
  readonly attackEffect: AttackEffect
  readonly damageNumber: DamageNumber
  readonly spellEffect: SpellEffect
  readonly conditionIcons: ConditionIcons

  constructor(scene: Phaser.Scene) {
    this.attackEffect = new AttackEffect(scene)
    this.damageNumber = new DamageNumber(scene)
    this.spellEffect = new SpellEffect(scene)
    this.conditionIcons = new ConditionIcons(scene)
  }

  /**
   * Play a complete attack sequence: swing trail -> impact -> damage number.
   */
  async playAttackSequence(
    source: UnitSprite,
    target: UnitSprite,
    hit: boolean,
    damage: number,
    critical: boolean = false,
    weaponType: WeaponType = 'melee'
  ): Promise<void> {
    // 1. Weapon swing
    if (weaponType === 'melee' || weaponType === 'magic') {
      this.attackEffect.playMeleeSwing(
        source.x, source.y,
        target.x, target.y,
        weaponType
      )
    }

    // 2. Impact flash
    this.attackEffect.playImpact(target.x, target.y, hit)

    if (hit) {
      // 3. Hit sparks on hit
      this.attackEffect.playHitSparks(target.x, target.y)

      // 4. Damage number
      const dmgType: DamageNumberType = critical ? 'critical' : 'damage'
      this.damageNumber.show(target.x, target.y, damage, dmgType)
    } else {
      this.damageNumber.show(target.x, target.y, 0, 'miss')
    }

    return Promise.resolve()
  }

  /**
   * Play a complete spell cast sequence: aura -> beam/particles -> damage.
   */
  async playSpellSequence(
    caster: UnitSprite,
    target: UnitSprite | null,
    school: SpellSchool = 'evocation',
    damage: number = 0,
    isHeal: boolean = false
  ): Promise<void> {
    // 1. Caster aura
    this.spellEffect.playAura(caster.x, caster.y, school)

    // Wait briefly for the aura to start
    await this.delay(150)

    // 2. Beam to target or particle burst at caster
    if (target) {
      this.spellEffect.playBeam(caster.x, caster.y, target.x, target.y, school)
    } else {
      this.spellEffect.playParticleBurst(caster.x, caster.y, school)
    }

    // 3. Impact effects and number
    if (target) {
      this.spellEffect.playParticleBurst(target.x, target.y, school)
      if (damage > 0) {
        const dmgType: DamageNumberType = isHeal ? 'heal' : 'damage'
        this.damageNumber.show(target.x, target.y, damage, dmgType)
      }
    }
  }

  /**
   * Play an AOE spell effect.
   */
  playAOESpell(center: GridPosition, radius: number, school: SpellSchool = 'evocation'): void {
    this.spellEffect.playAOEZone(center, radius, school)
  }

  /**
   * Update condition icons for a unit.
   */
  updateConditions(unit: UnitSprite, conditions: Condition[]): void {
    this.conditionIcons.updateConditions(unit, conditions)
  }

  /**
   * Remove all condition icons for a unit.
   */
  clearUnitIcons(unitId: string): void {
    this.conditionIcons.clearUnitIcons(unitId)
  }

  /**
   * Clean up all active effects.
   */
  clearAll(): void {
    this.conditionIcons.clearAll()
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      // Use the Phaser scene's time system if available via the
      // attackEffect's scene reference, otherwise use setTimeout.
      setTimeout(resolve, ms)
    })
  }
}
