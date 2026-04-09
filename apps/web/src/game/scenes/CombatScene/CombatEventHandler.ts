/**
 * CombatEventHandler: manages eventBus subscriptions for CombatScene.
 * Extracted from CombatScene to reduce the god-class footprint.
 */
import { eventBus, GameEvents } from '../../../events'
import { useCombatStore } from '../../../stores/combatStore'
import type { CombatEventPayload } from '../../../services/typeGuards'
import type { CombatScene } from './CombatScene'

export class CombatEventHandler {
  private scene: CombatScene

  constructor(scene: CombatScene) {
    this.scene = scene
  }

  subscribe(): void {
    // Effect events → all routed to EffectManager
    const effectEvents = [
      GameEvents.EFFECT_ATTACK,
      GameEvents.EFFECT_DAMAGE,
      GameEvents.EFFECT_HEAL,
      GameEvents.EFFECT_SPELL,
      GameEvents.EFFECT_STATUS,
      GameEvents.EFFECT_DEATH,
    ]
    for (const evt of effectEvents) {
      this.scene.addUnsubscribe(
        eventBus.on(evt, (data) => {
          this.scene.effectManager.handleCombatEvent(data as CombatEventPayload)
        }),
      )
    }

    const unsubCombatStart = eventBus.on(GameEvents.COMBAT_START, () => {
      this.scene.storeSyncer.syncWithStore()
    })
    this.scene.addUnsubscribe(unsubCombatStart)

    const unsubCombatEnd = eventBus.on(GameEvents.COMBAT_END, () => {
      this.scene.cleanup()
    })
    this.scene.addUnsubscribe(unsubCombatEnd)

    const unsubTurnStart = eventBus.on(GameEvents.COMBAT_TURN_START, (data) => {
      const d = data as { unitId?: string }
      if (d.unitId) {
        useCombatStore.getState().setCurrentUnit(d.unitId)
        this.scene.storeSyncer.updateTurnIndicator(d.unitId)
        this.scene.storeSyncer.showMoveRangeForUnit(d.unitId)
      }
    })
    this.scene.addUnsubscribe(unsubTurnStart)

    const unsubTurnEnd = eventBus.on(GameEvents.COMBAT_TURN_END, () => {
      this.scene.moveRange.clear()
      this.scene.targetHighlight.clear()
      this.scene.turnIndicator.clear()
    })
    this.scene.addUnsubscribe(unsubTurnEnd)
  }
}
