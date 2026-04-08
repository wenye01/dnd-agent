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
} from '../services/websocket'
import type { ServerMessage, ClientMessage } from '../types'
import type { GameState, Character, CombatState } from '../types'
import { eventBus, GameEvents } from '../events'

// Helper type guards for state update data
// These are more permissive than the full types since the server may send partial updates
// They're defined outside the component to avoid ESLint "accessed before declared" errors
function isGameStateData(data: unknown): data is Partial<GameState> {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  // A valid game state should at least have sessionId
  return 'sessionId' in obj && typeof obj.sessionId === 'string'
}

function isPartyData(data: unknown): data is Character[] {
  return Array.isArray(data) && data.every((item) =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    'race' in item &&
    'class' in item &&
    'level' in item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  )
}

function isCombatData(data: unknown): data is CombatState {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  // participants can be string[] (old) or Combatant[] (new)
  if (!Array.isArray(obj.participants)) return false
  return (
    typeof obj.round === 'number' &&
    typeof obj.turnIndex === 'number' &&
    Array.isArray(obj.initiatives) &&
    ('status' in obj && typeof obj.status === 'string')
  )
}

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

  const handleCombatEvent = useCallback((payload: unknown) => {
    if (!isCombatEventPayload(payload)) {
      console.error('Invalid combat event payload:', payload)
      return
    }

    const { eventType, characterId, round } = payload
    const combatStore = useCombatStore.getState()

    // Generate human-readable combat event messages
    let eventText = ''
    let logType: 'info' | 'damage' | 'heal' | 'status' | 'turn' | 'system' = 'info'

    switch (eventType) {
      case 'combat_start':
        eventText = 'Combat has started!'
        logType = 'system'
        eventBus.emit(GameEvents.COMBAT_START, payload)
        break
      case 'combat_end':
        eventText = 'Combat has ended.'
        logType = 'system'
        eventBus.emit(GameEvents.COMBAT_END, payload)
        combatStore.setCombat(null)
        break
      case 'round_start':
        eventText = `Round ${round ?? 1} begins.`
        logType = 'system'
        break
      case 'round_end':
        eventText = `Round ${round ?? 1} ends.`
        logType = 'system'
        break
      case 'turn_start':
        eventText = `Turn starts for ${characterId ?? 'unknown'}.`
        logType = 'turn'
        combatStore.setCurrentUnit(characterId ?? null)
        eventBus.emit(GameEvents.COMBAT_TURN_START, { unitId: characterId })
        break
      case 'turn_end':
        eventText = `Turn ends for ${characterId ?? 'unknown'}.`
        logType = 'turn'
        eventBus.emit(GameEvents.COMBAT_TURN_END, { unitId: characterId })
        break
      case 'attack': {
        const hitStatus = payload.isHit === false ? ' (MISS)' : payload.isCrit ? ' (CRIT!)' : ''
        eventText = `${characterId ?? 'Unknown'} attacks ${payload.target ?? 'target'}${hitStatus}`
        logType = 'damage'
        eventBus.emit(GameEvents.EFFECT_ATTACK, payload)
        break
      }
      case 'damage': {
        const amount = payload.damage ?? payload.amount ?? 0
        eventText = `${payload.target ?? characterId ?? 'Unknown'} takes ${amount} damage`
        if (payload.damageType) eventText += ` (${payload.damageType})`
        logType = 'damage'
        // Update combatant HP using functional update to avoid race conditions
        if (payload.target) {
          combatStore.applyDamage(payload.target, amount)
        }
        eventBus.emit(GameEvents.EFFECT_DAMAGE, payload)
        break
      }
      case 'heal': {
        const healAmount = payload.amount ?? 0
        eventText = `${characterId ?? 'Unknown'} heals ${healAmount} HP`
        logType = 'heal'
        if (characterId) {
          combatStore.applyHeal(characterId, healAmount)
        }
        eventBus.emit(GameEvents.EFFECT_HEAL, payload)
        break
      }
      case 'death':
        eventText = `${characterId ?? 'Unknown'} has fallen!`
        logType = 'damage'
        eventBus.emit(GameEvents.EFFECT_DEATH, payload)
        break
      case 'unconscious':
        eventText = `${characterId ?? 'Unknown'} has been knocked unconscious!`
        logType = 'damage'
        eventBus.emit(GameEvents.EFFECT_DEATH, payload)
        break
      case 'opportunity_attack':
        eventText = `${characterId ?? 'Unknown'} makes an opportunity attack on ${payload.target ?? 'target'}!`
        logType = 'damage'
        eventBus.emit(GameEvents.EFFECT_ATTACK, payload)
        break
      case 'condition_applied':
        eventText = `${characterId ?? 'Unknown'} gains condition: ${payload.condition ?? 'unknown'}`
        logType = 'status'
        eventBus.emit(GameEvents.EFFECT_STATUS, payload)
        break
      case 'condition_removed':
        eventText = `${characterId ?? 'Unknown'} loses condition: ${payload.condition ?? 'unknown'}`
        logType = 'status'
        eventBus.emit(GameEvents.EFFECT_STATUS, payload)
        break
      case 'initiative_rolled':
        eventText = `Initiative rolled for round ${round ?? 1}.`
        logType = 'system'
        break
      case 'move':
        eventText = `${characterId ?? 'Unknown'} moves.`
        logType = 'info'
        break
      case 'spell':
        eventText = `${characterId ?? 'Unknown'} casts a spell${payload.target ? ` targeting ${payload.target}` : ''}.`
        logType = 'info'
        eventBus.emit(GameEvents.EFFECT_SPELL, payload)
        break
      case 'item':
        eventText = 'Use item action.'
        logType = 'info'
        break
      case 'dodge':
        eventText = `${characterId ?? 'Unknown'} dodges.`
        logType = 'info'
        break
      case 'disengage':
        eventText = `${characterId ?? 'Unknown'} disengages.`
        logType = 'info'
        break
      default:
        eventText = `Combat event: ${eventType}`
        logType = 'info'
    }

    addSystemMessage(eventText)
    combatStore.addLogEntry(eventText, logType)
  }, [addSystemMessage])

  // Forward combat actions from eventBus to WebSocket
  const sendCombatAction = useCallback((payload: Record<string, unknown>) => {
    const message: ClientMessage = {
      type: 'combat_action',
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

    return () => {
      unsubMove()
      unsubAttack()
      unsubAction()
    }
  }, [sendCombatAction])

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
  ])
}
