import { useEffect, useCallback } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useGameStore } from '../stores/gameStore'
import { useChatStore } from '../stores/chatStore'
import { useCombatStore } from '../stores/combatStore'
import {
  isNarrationPayload,
  isStateUpdatePayload,
  isDiceResultPayload,
  isErrorPayload,
  isCombatEventPayload,
  isGameStateData,
  isPartyData,
  isCombatData,
  isSpellCastPayload,
  isItemUsePayload,
  isEquipPayload,
  isUnequipPayload,
  isMapInteractPayload,
  isMapSwitchPayload,
} from '../services/typeGuards'
import type { CombatEventPayload, CombatEventType } from '../services/typeGuards'
import type { CombatLogEntry } from '../stores/combatStore'
import type { ServerMessage, ClientMessage } from '../types'
import { eventBus, GameEvents } from '../events'

export function useGameMessages() {
  const { subscribe, send } = useWebSocket()
  const updateGameState = useGameStore((s) => s.updateGameState)
  const updateParty = useGameStore((s) => s.updateParty)
  const updateCombat = useGameStore((s) => s.updateCombat)
  const addDMMessage = useChatStore((s) => s.addDMMessage)
  const appendStreamText = useChatStore((s) => s.appendStreamText)
  const finalizeStreamText = useChatStore((s) => s.finalizeStreamText)
  const addSystemMessage = useChatStore((s) => s.addSystemMessage)

  // Handler functions with useCallback to maintain stable references
  const handleNarration = useCallback((payload: unknown) => {
    if (!isNarrationPayload(payload)) {
      console.error('Invalid narration payload:', payload)
      return
    }

    const { text, isStreaming } = payload

    if (isStreaming) {
      // For streaming, append text character by character or chunk by chunk
      appendStreamText(text)
    } else {
      // Final message: finalize the stream. Only add as a new DM message if there
      // was no streaming content to finalize (handles non-streaming responses that
      // arrive as a single final message).
      const hadStreamContent = finalizeStreamText()
      if (!hadStreamContent && text) {
        addDMMessage(text)
      }
    }
  }, [appendStreamText, finalizeStreamText, addDMMessage])

  const handleStateUpdate = useCallback((payload: unknown) => {
    if (!isStateUpdatePayload(payload)) {
      console.error('Invalid state update payload:', payload)
      return
    }

    const { stateType, data } = payload

    switch (stateType) {
      case 'game':
        // For game state, we validate it's a valid GameState object
        // The server should send complete GameState, so we use a type guard
        if (isGameStateData(data)) {
          updateGameState(data)
        } else {
          console.error('Invalid game state data:', data)
        }
        break
      case 'party':
        if (isPartyData(data)) {
          updateParty(data)
        } else {
          console.error('Invalid party data:', data)
        }
        break
      case 'combat':
        if (data === null) {
          updateCombat(null)
          useCombatStore.getState().setCombat(null)
        } else if (isCombatData(data)) {
          updateCombat(data)
          // Sync to combatStore
          useCombatStore.getState().setCombat(data)
        } else {
          console.error('Invalid combat state data:', data)
        }
        break
      case 'map':
        // Map updates would be handled separately
        console.log('Map update received:', data)
        break
      case 'notification':
        // Server notifications (e.g. history cleared)
        if (typeof data === 'object' && data !== null && 'status' in data) {
          const status = (data as { status: string }).status
          addSystemMessage(`Server: ${status}`)
        }
        break
      default:
        console.warn('Unknown state type:', stateType)
    }
  }, [updateGameState, updateParty, updateCombat, addSystemMessage])

  const handleDiceResult = useCallback((payload: unknown) => {
    if (!isDiceResultPayload(payload)) {
      console.error('Invalid dice result payload:', payload)
      return
    }

    const { formula, dice, modifier, total, isCrit, isFumble } = payload

    let resultText = `🎲 ${formula}: [${dice.join(', ')}]`
    if (modifier !== 0) {
      resultText += modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`
    }
    resultText += ` = **${total}**`

    if (isCrit) {
      resultText += ' 🎯 CRITICAL HIT!'
    } else if (isFumble) {
      resultText += ' 💀 FUMBLE!'
    }

    addSystemMessage(resultText)
  }, [addSystemMessage])

  const handleError = useCallback((payload: unknown) => {
    if (!isErrorPayload(payload)) {
      console.error('Invalid error payload:', payload)
      return
    }

    const { code, message, details } = payload
    console.error('Server error:', code, message, details)
    addSystemMessage(`Error: ${message}`)
  }, [addSystemMessage])

  /**
   * Pure function: generate human-readable text and log type for a combat event.
   * No side effects -- only computes values from the payload.
   */
  function formatCombatEventMessage(
    payload: CombatEventPayload,
  ): { text: string; logType: CombatLogEntry['type'] } {
    const { eventType, characterId, round } = payload

    switch (eventType) {
      case 'combat_start':
        return { text: 'Combat has started!', logType: 'system' }
      case 'combat_end':
        return { text: 'Combat has ended.', logType: 'system' }
      case 'round_start':
        return { text: `Round ${round ?? 1} begins.`, logType: 'system' }
      case 'round_end':
        return { text: `Round ${round ?? 1} ends.`, logType: 'system' }
      case 'turn_start':
        return { text: `Turn starts for ${characterId ?? 'unknown'}.`, logType: 'turn' }
      case 'turn_end':
        return { text: `Turn ends for ${characterId ?? 'unknown'}.`, logType: 'turn' }
      case 'attack': {
        const hitStatus = payload.isHit === false ? ' (MISS)' : payload.isCrit ? ' (CRIT!)' : ''
        return {
          text: `${characterId ?? 'Unknown'} attacks ${payload.target ?? 'target'}${hitStatus}`,
          logType: 'damage',
        }
      }
      case 'damage': {
        const amount = payload.damage ?? payload.amount ?? 0
        let text = `${payload.target ?? characterId ?? 'Unknown'} takes ${amount} damage`
        if (payload.damageType) text += ` (${payload.damageType})`
        return { text, logType: 'damage' }
      }
      case 'heal':
        return { text: `${characterId ?? 'Unknown'} heals ${payload.amount ?? 0} HP`, logType: 'heal' }
      case 'death':
        return { text: `${characterId ?? 'Unknown'} has fallen!`, logType: 'damage' }
      case 'unconscious':
        return { text: `${characterId ?? 'Unknown'} has been knocked unconscious!`, logType: 'damage' }
      case 'opportunity_attack':
        return {
          text: `${characterId ?? 'Unknown'} makes an opportunity attack on ${payload.target ?? 'target'}!`,
          logType: 'damage',
        }
      case 'condition_applied':
        return { text: `${characterId ?? 'Unknown'} gains condition: ${payload.condition ?? 'unknown'}`, logType: 'status' }
      case 'condition_removed':
        return { text: `${characterId ?? 'Unknown'} loses condition: ${payload.condition ?? 'unknown'}`, logType: 'status' }
      case 'initiative_rolled':
        return { text: `Initiative rolled for round ${round ?? 1}.`, logType: 'system' }
      case 'move':
        return { text: `${characterId ?? 'Unknown'} moves.`, logType: 'info' }
      case 'spell':
        return {
          text: `${characterId ?? 'Unknown'} casts a spell${payload.target ? ` targeting ${payload.target}` : ''}.`,
          logType: 'info',
        }
      case 'item':
        return { text: 'Use item action.', logType: 'info' }
      case 'dodge':
        return { text: `${characterId ?? 'Unknown'} dodges.`, logType: 'info' }
      case 'disengage':
        return { text: `${characterId ?? 'Unknown'} disengages.`, logType: 'info' }
      default:
        return { text: `Combat event: ${eventType}`, logType: 'info' }
    }
  }

  /**
   * Sync combat event to Zustand stores (chatStore + combatStore).
   * Handles HP mutations, combat state, current unit, and log entries.
   */
  const syncCombatEventToStores = useCallback((
    payload: CombatEventPayload,
    text: string,
    logType: CombatLogEntry['type'],
  ): void => {
    const combatStore = useCombatStore.getState()
    const { eventType, characterId } = payload

    // Event-specific store mutations
    switch (eventType) {
      case 'combat_end':
        combatStore.setCombat(null)
        break
      case 'turn_start':
        combatStore.setCurrentUnit(characterId ?? null)
        break
      case 'damage': {
        const amount = payload.damage ?? payload.amount ?? 0
        if (payload.target) {
          combatStore.applyDamage(payload.target, amount)
        }
        break
      }
      case 'heal': {
        const healAmount = payload.amount ?? 0
        if (characterId) {
          combatStore.applyHeal(characterId, healAmount)
        }
        break
      }
    }

    // Always write to both stores
    addSystemMessage(text)
    combatStore.addLogEntry(text, logType)
  }, [addSystemMessage])

  /**
   * Emit eventBus effects for combat events.
   * Phaser scenes and other consumers listen on these events.
   */
  function emitCombatEventEffects(payload: CombatEventPayload): void {
    const { eventType, characterId } = payload

    const eventMap: Partial<Record<CombatEventType, [string, unknown]>> = {
      combat_start: [GameEvents.COMBAT_START, payload],
      combat_end: [GameEvents.COMBAT_END, payload],
      turn_start: [GameEvents.COMBAT_TURN_START, { unitId: characterId }],
      turn_end: [GameEvents.COMBAT_TURN_END, { unitId: characterId }],
      death: [GameEvents.EFFECT_DEATH, payload],
      unconscious: [GameEvents.EFFECT_DEATH, payload],
      spell: [GameEvents.EFFECT_SPELL, payload],
      condition_applied: [GameEvents.EFFECT_STATUS, payload],
      condition_removed: [GameEvents.EFFECT_STATUS, payload],
    }

    // Emit mapped event if present
    const mapped = eventMap[eventType]
    if (mapped) {
      eventBus.emit(mapped[0], mapped[1])
    }

    // Some events need additional emissions beyond the primary mapping
    if (eventType === 'attack' || eventType === 'opportunity_attack') {
      eventBus.emit(GameEvents.EFFECT_ATTACK, payload)
    }
    if (eventType === 'damage') {
      eventBus.emit(GameEvents.EFFECT_DAMAGE, payload)
    }
    if (eventType === 'heal') {
      eventBus.emit(GameEvents.EFFECT_HEAL, payload)
    }
  }

  /** Thin coordinator: validate -> format -> sync stores -> emit events. */
  const handleCombatEvent = useCallback((payload: unknown) => {
    if (!isCombatEventPayload(payload)) {
      console.error('Invalid combat event payload:', payload)
      return
    }

    const { text, logType } = formatCombatEventMessage(payload)
    syncCombatEventToStores(payload, text, logType)
    emitCombatEventEffects(payload)
  }, [syncCombatEventToStores])

  // --- v0.4 Phase 4: New event type handlers ---

  /** Handle spell_cast server messages. */
  const handleSpellCastEvent = useCallback((payload: unknown) => {
    if (!isSpellCastPayload(payload)) {
      console.error('Invalid spell_cast payload:', payload)
      return
    }

    const { characterId, spellName, damage, healing, damageType, targetId } = payload

    // Update gameStore with spell slot usage
    useGameStore.getState().handleSpellCast(payload)

    // If in combat, update combatStore
    if (useCombatStore.getState().isCombatActive) {
      useCombatStore.getState().handleCombatSpellCast(payload)
    }

    // Emit EventBus event for Phaser spell animation
    eventBus.emit(GameEvents.SPELL_CAST, payload)

    // Build notification text
    let text = `${characterId} casts ${spellName}`
    if (damage) {
      text += ` dealing ${damage}${damageType ? ` ${damageType}` : ''} damage to ${targetId ?? 'target'}`
    }
    if (healing) {
      text += ` healing ${healing} HP`
    }
    addSystemMessage(text)
  }, [addSystemMessage])

  /** Handle item_use server messages. */
  const handleItemUseEvent = useCallback((payload: unknown) => {
    if (!isItemUsePayload(payload)) {
      console.error('Invalid item_use payload:', payload)
      return
    }

    const { characterId, itemName, consumed, healing, damage } = payload

    // Update gameStore (removes consumed items from inventory)
    useGameStore.getState().handleItemUse(payload)

    // If in combat, also update combatStore with item effects
    if (useCombatStore.getState().isCombatActive) {
      useCombatStore.getState().handleCombatItemUse(payload)
    }

    // Emit EventBus event for Phaser item use animation
    eventBus.emit(GameEvents.ITEM_USE, payload)

    // Build notification text
    let text = `${characterId} uses ${itemName}`
    if (consumed) text += ' (consumed)'
    if (healing) text += ` restoring ${healing} HP`
    if (damage) text += ` dealing ${damage} damage`
    addSystemMessage(text)
  }, [addSystemMessage])

  /** Handle equip server messages. */
  const handleEquipEvent = useCallback((payload: unknown) => {
    if (!isEquipPayload(payload)) {
      console.error('Invalid equip payload:', payload)
      return
    }

    const { characterId, itemName, slot, acBonus } = payload

    // Update gameStore (updates equipment and AC)
    useGameStore.getState().handleEquip(payload)

    // Emit EventBus event for Phaser visual update
    eventBus.emit(GameEvents.EQUIP_CHANGE, payload)

    let text = `${characterId} equips ${itemName} in ${slot} slot`
    if (acBonus) text += ` (+${acBonus} AC)`
    addSystemMessage(text)
  }, [addSystemMessage])

  /** Handle unequip server messages. */
  const handleUnequipEvent = useCallback((payload: unknown) => {
    if (!isUnequipPayload(payload)) {
      console.error('Invalid unequip payload:', payload)
      return
    }

    const { characterId, itemName, slot } = payload

    // Update gameStore (returns item to inventory)
    useGameStore.getState().handleUnequip(payload)

    // Emit EventBus event for Phaser visual update
    eventBus.emit(GameEvents.UNEQUIP_CHANGE, payload)

    addSystemMessage(`${characterId} unequips ${itemName} from ${slot} slot`)
  }, [addSystemMessage])

  /** Handle map_interact server messages. */
  const handleMapInteractEvent = useCallback((payload: unknown) => {
    if (!isMapInteractPayload(payload)) {
      console.error('Invalid map_interact payload:', payload)
      return
    }

    const { characterId, interactableType, action } = payload

    // Emit EventBus event for Phaser map interaction
    eventBus.emit(GameEvents.MAP_INTERACT, payload)

    addSystemMessage(`${characterId} ${action}s ${interactableType} on the map`)
  }, [addSystemMessage])

  /** Handle map_switch server messages. */
  const handleMapSwitchEvent = useCallback((payload: unknown) => {
    if (!isMapSwitchPayload(payload)) {
      console.error('Invalid map_switch payload:', payload)
      return
    }

    const { toMapId, fromMapId } = payload

    // Update gameStore with new map
    useGameStore.getState().handleMapSwitch(payload)

    // Emit EventBus event for Phaser map transition animation
    eventBus.emit(GameEvents.MAP_SWITCH, payload)

    addSystemMessage(`Map changed from ${fromMapId} to ${toMapId}`)
  }, [addSystemMessage])

  // Forward combat actions from eventBus to WebSocket
  const sendCombatAction = useCallback((payload: Record<string, unknown>) => {
    const message: ClientMessage = {
      type: 'combat_action',
      payload,
    }
    send(message)
  }, [send])

  // Forward map actions from eventBus to WebSocket
  const sendMapAction = useCallback((payload: Record<string, unknown>) => {
    const message: ClientMessage = {
      type: 'map_action',
      payload,
    }
    send(message)
  }, [send])

  useEffect(() => {
    const unsubMove = eventBus.on(GameEvents.COMBAT_MOVE_CONFIRM, (data) => {
      const d = data as { unitId?: string; position?: { x: number; y: number } }
      sendCombatAction({ action: 'move', unitId: d.unitId, position: d.position })
    })

    const unsubAttack = eventBus.on(GameEvents.COMBAT_TARGET_SELECT, (data) => {
      const d = data as { sourceId?: string; targetId?: string }
      sendCombatAction({ action: 'attack', sourceId: d.sourceId, targetId: d.targetId })
    })

    const unsubAction = eventBus.on(GameEvents.COMBAT_UNIT_SELECT, (data) => {
      const d = data as Record<string, unknown>
      sendCombatAction(d)
    })

    // v0.4 Phase 4: Forward spell/item/map events from eventBus to WebSocket
    const unsubSpellCast = eventBus.on(GameEvents.SPELL_CAST, (data) => {
      const d = data as Record<string, unknown>
      if (d.source !== 'server') {
        sendCombatAction({ action: 'spell', ...d })
      }
    })

    const unsubItemUse = eventBus.on(GameEvents.ITEM_USE, (data) => {
      const d = data as Record<string, unknown>
      if (d.source !== 'server') {
        sendCombatAction({ action: 'item', ...d })
      }
    })

    const unsubMapInteract = eventBus.on(GameEvents.MAP_INTERACT, (data) => {
      const d = data as Record<string, unknown>
      if (d.source !== 'server') {
        sendMapAction({ action: 'interact', ...d })
      }
    })

    const unsubMapSwitch = eventBus.on(GameEvents.MAP_SWITCH, (data) => {
      const d = data as Record<string, unknown>
      if (d.source !== 'server') {
        sendMapAction({ action: 'switch_map', ...d })
      }
    })

    return () => {
      unsubMove()
      unsubAttack()
      unsubAction()
      unsubSpellCast()
      unsubItemUse()
      unsubMapInteract()
      unsubMapSwitch()
    }
  }, [sendCombatAction, sendMapAction])

  useEffect(() => {
    const unsubscribe = subscribe((message: ServerMessage) => {
      switch (message.type) {
        case 'narration':
          handleNarration(message.payload)
          break
        case 'state_update':
          handleStateUpdate(message.payload)
          break
        case 'dice_result':
          handleDiceResult(message.payload)
          break
        case 'error':
          handleError(message.payload)
          break
        case 'combat_event':
          handleCombatEvent(message.payload)
          break
        case 'pong':
          // Heartbeat response, no action needed
          break
        // v0.4 Phase 4: New event types
        case 'spell_cast':
          handleSpellCastEvent(message.payload)
          break
        case 'item_use':
          handleItemUseEvent(message.payload)
          break
        case 'equip':
          handleEquipEvent(message.payload)
          break
        case 'unequip':
          handleUnequipEvent(message.payload)
          break
        case 'map_interact':
          handleMapInteractEvent(message.payload)
          break
        case 'map_switch':
          handleMapSwitchEvent(message.payload)
          break
        default: {
          // Use exhaustive check for unknown message types
          const unknownType = (message as ServerMessage & { type: string }).type
          console.warn('Unknown message type:', unknownType)
        }
      }
    })

    return unsubscribe
  }, [
    subscribe,
    handleNarration,
    handleStateUpdate,
    handleDiceResult,
    handleError,
    handleCombatEvent,
    handleSpellCastEvent,
    handleItemUseEvent,
    handleEquipEvent,
    handleUnequipEvent,
    handleMapInteractEvent,
    handleMapSwitchEvent,
  ])
}
