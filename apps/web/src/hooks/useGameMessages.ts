import { useEffect, useCallback } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useGameStore } from '../stores/gameStore'
import { useChatStore } from '../stores/chatStore'
import {
  isNarrationPayload,
  isStateUpdatePayload,
  isDiceResultPayload,
  isErrorPayload,
  isCombatEventPayload,
} from '../services/websocket'
import type { ServerMessage } from '../types'
import type { GameState, Character, CombatState } from '../types'

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
  return (
    typeof obj.round === 'number' &&
    typeof obj.turnIndex === 'number' &&
    Array.isArray(obj.initiatives) &&
    Array.isArray(obj.participants)
  )
}

export function useGameMessages() {
  const { subscribe } = useWebSocket()
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
      // Finalize any existing streaming and add complete message
      finalizeStreamText()
      if (text) {
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
        } else if (isCombatData(data)) {
          updateCombat(data)
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
  }, [updateGameState, updateParty, updateCombat])

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

    // Generate human-readable combat event messages
    let eventText = ''
    switch (eventType) {
      case 'combat_start':
        eventText = '⚔️ Combat has started!'
        break
      case 'combat_end':
        eventText = '🏁 Combat has ended.'
        break
      case 'round_start':
        eventText = `📋 Round ${round ?? 1} begins.`
        break
      case 'round_end':
        eventText = `Round ${round ?? 1} ends.`
        break
      case 'turn_start':
        eventText = `Turn starts for ${characterId ?? 'unknown'}.`
        break
      case 'turn_end':
        eventText = `Turn ends for ${characterId ?? 'unknown'}.`
        break
      case 'attack':
        eventText = `Attack action${payload.target ? ` targeting ${payload.target}` : ''}.`
        break
      case 'spell':
        eventText = `Cast spell${payload.target ? ` targeting ${payload.target}` : ''}.`
        break
      case 'item':
        eventText = 'Use item action.'
        break
      case 'move':
        eventText = 'Move action.'
        break
      case 'dodge':
        eventText = 'Dodge action.'
        break
      case 'disengage':
        eventText = 'Disengage action.'
        break
      default:
        eventText = `Combat event: ${eventType}`
    }

    addSystemMessage(eventText)
  }, [addSystemMessage])

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
