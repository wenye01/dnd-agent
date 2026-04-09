import type {
  ClientMessage,
  ServerMessage,
  NarrationPayload,
  DiceResultPayload,
  ErrorPayload,
} from '../types'
import {
  WS_DEFAULT_URL,
  WS_DEFAULT_RECONNECT_INTERVAL,
  WS_DEFAULT_MAX_RECONNECT_ATTEMPTS,
  WS_DEFAULT_HEARTBEAT_INTERVAL,
  WS_MAX_QUEUE_SIZE,
} from '../config/constants'

export interface WebSocketOptions {
  url?: string
  /** Callback invoked on every connect/reconnect to obtain the current sessionId. */
  getSessionId?: () => string | undefined
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export type MessageHandler = (message: ServerMessage) => void
export type ConnectionHandler = (connected: boolean) => void

// State update payload type (from backend spec)
export interface StateUpdatePayload {
  stateType: 'game' | 'party' | 'combat' | 'map' | 'notification'
  data: unknown
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private options: Required<WebSocketOptions>
  private messageHandlers: Set<MessageHandler> = new Set()
  private connectionHandlers: Set<ConnectionHandler> = new Set()
  private reconnectAttempts = 0
  private heartbeatTimer: number | null = null
  private isManualClose = false
  private messageQueue: ClientMessage[] = []
  private maxQueueSize = WS_MAX_QUEUE_SIZE

  constructor(options: WebSocketOptions = {}) {
    this.options = {
      url: WS_DEFAULT_URL,
      reconnectInterval: WS_DEFAULT_RECONNECT_INTERVAL,
      maxReconnectAttempts: WS_DEFAULT_MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: WS_DEFAULT_HEARTBEAT_INTERVAL,
      ...options,
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isManualClose = false
      this.ws = new WebSocket(this.buildUrl())

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.notifyConnectionHandlers(true)
        this.flushMessageQueue()
        resolve()
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        this.stopHeartbeat()
        this.notifyConnectionHandlers(false)

        if (!this.isManualClose && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }

      this.ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : ''
        const lines = data.split('\n').filter(line => line.trim())
        for (const line of lines) {
          try {
            const message: ServerMessage = JSON.parse(line)
            this.notifyMessageHandlers(message)
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }
      }
    })
  }

  disconnect(): void {
    this.isManualClose = true
    this.stopHeartbeat()
    this.ws?.close()
    this.ws = null
    this.messageQueue = []
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.queueMessage(message)
    }
  }

  sendMessage(text: string, characterId?: string): void {
    if (!text || text.trim() === '') {
      console.warn('Cannot send empty message')
      return
    }
    this.send({
      type: 'user_input',
      payload: { text, characterId },
    })
  }

  private queueMessage(message: ClientMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message')
      this.messageQueue.shift()
    }
    this.messageQueue.push(message)
    console.log('Message queued (not connected):', message)
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return

    console.log(`Sending ${this.messageQueue.length} queued messages`)
    const messages = [...this.messageQueue]
    this.messageQueue = []

    messages.forEach((message) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      } else {
        // Connection lost again, re-queue
        this.queueMessage(message)
      }
    })
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping', payload: {} })
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    console.log(
      `Reconnecting in ${this.options.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    )
    setTimeout(() => this.connect(), this.options.reconnectInterval)
  }

  private notifyMessageHandlers(message: ServerMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message)
      } catch (error) {
        console.error('Error in message handler:', error)
      }
    })
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected)
      } catch (error) {
        console.error('Error in connection handler:', error)
      }
    })
  }

  /**
   * Build the full WebSocket URL, appending ?session_id=xxx when available.
   * Uses the base URL from options and queries the optional getSessionId callback.
   */
  private buildUrl(): string {
    const baseUrl = this.options.url
    const sessionId = this.options.getSessionId?.()
    if (sessionId) {
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}session_id=${encodeURIComponent(sessionId)}`
    }
    return baseUrl
  }
}

// Type guard for partial game state update
export function isPartialGameState(data: unknown): data is { sessionId?: string; phase?: string; currentMapId?: string } {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  // Check that any present fields have the correct type
  if ('sessionId' in obj && typeof obj.sessionId !== 'string') {
    return false
  }
  if ('phase' in obj && typeof obj.phase !== 'string') {
    return false
  }
  if ('currentMapId' in obj && typeof obj.currentMapId !== 'string') {
    return false
  }

  return true
}

// Type guard for Character array
export function isCharacterArray(data: unknown): data is Array<{ id: string; name: string }> {
  return Array.isArray(data) && data.every((item) =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  )
}

// Type guard for CombatState
export function isCombatState(data: unknown): data is { round: number; turnIndex: number; initiatives: unknown[]; participants: string[]; activeEffects: unknown[] } {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  return (
    typeof obj.round === 'number' &&
    typeof obj.turnIndex === 'number' &&
    Array.isArray(obj.initiatives) &&
    Array.isArray(obj.participants) &&
    obj.participants.every((p) => typeof p === 'string') &&
    Array.isArray(obj.activeEffects)
  )
}

// Type guards for payload validation
export function isNarrationPayload(payload: unknown): payload is NarrationPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'text' in payload &&
    typeof payload.text === 'string' &&
    'isStreaming' in payload &&
    typeof payload.isStreaming === 'boolean'
  )
}

export function isStateUpdatePayload(payload: unknown): payload is StateUpdatePayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('stateType' in payload) ||
    !('data' in payload)
  ) {
    return false
  }

  const { stateType } = payload as { stateType: unknown }
  const VALID_STATE_TYPES = ['game', 'party', 'combat', 'map', 'notification'] as const

  return (
    typeof stateType === 'string' &&
    VALID_STATE_TYPES.includes(stateType as typeof VALID_STATE_TYPES[number])
  )
}

export function isDiceResultPayload(payload: unknown): payload is DiceResultPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('formula' in payload) ||
    !('total' in payload) ||
    !('dice' in payload) ||
    !('modifier' in payload)
  ) {
    return false
  }

  const { formula, total, dice, modifier, isCrit, isFumble } = payload as {
    formula: unknown
    total: unknown
    dice: unknown
    modifier: unknown
    isCrit?: unknown
    isFumble?: unknown
  }

  // Check optional fields are correct type if present
  if (isCrit !== undefined && typeof isCrit !== 'boolean') {
    return false
  }
  if (isFumble !== undefined && typeof isFumble !== 'boolean') {
    return false
  }

  return (
    typeof formula === 'string' &&
    typeof total === 'number' &&
    Array.isArray(dice) &&
    dice.every((d) => typeof d === 'number') &&
    typeof modifier === 'number'
  )
}

export function isErrorPayload(payload: unknown): payload is ErrorPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('code' in payload) ||
    !('message' in payload)
  ) {
    return false
  }

  const { code, message } = payload as { code: unknown; message: unknown }
  return (
    typeof code === 'string' &&
    typeof message === 'string'
  )
}

// Combat event types (matches backend combat.CombatEventType)
export type CombatEventType =
  | 'combat_start' | 'combat_end'
  | 'initiative_rolled'
  | 'turn_start' | 'turn_end'
  | 'round_start' | 'round_end'
  | 'attack' | 'damage' | 'heal' | 'death' | 'unconscious'
  | 'condition_applied' | 'condition_removed'
  | 'opportunity_attack'
  | 'move' | 'spell' | 'item' | 'dodge' | 'disengage'

// Combat event payload type (from backend spec)
export interface CombatEventPayload {
  eventType: CombatEventType
  characterId?: string
  round?: number
  data?: unknown
  target?: string
  // Attack event data
  damage?: number
  damageType?: string
  isCrit?: boolean
  isHit?: boolean
  // Heal event data
  amount?: number
  // Condition event data
  condition?: string
  // Move event data
  position?: { x: number; y: number }
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  // Initiative
  initiatives?: Array<{ characterId: string; initiative: number }>
}

export function isCombatEventPayload(payload: unknown): payload is CombatEventPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('eventType' in payload)
  ) {
    return false
  }

  const { eventType } = payload as { eventType: unknown }
  const validEventTypes: string[] = [
    'combat_start', 'combat_end',
    'initiative_rolled',
    'turn_start', 'turn_end',
    'round_start', 'round_end',
    'attack', 'damage', 'heal', 'death', 'unconscious',
    'condition_applied', 'condition_removed',
    'opportunity_attack',
    'move', 'spell', 'item', 'dodge', 'disengage',
  ]

  return (
    typeof eventType === 'string' &&
    validEventTypes.includes(eventType)
  )
}

// User input payload type guard
export interface UserInputPayload {
  text: string
  characterId?: string
}

export function isUserInputPayload(payload: unknown): payload is UserInputPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('text' in payload)
  ) {
    return false
  }

  const { text, characterId } = payload as { text: unknown; characterId?: unknown }

  if (typeof text !== 'string') {
    return false
  }

  if (characterId !== undefined && typeof characterId !== 'string') {
    return false
  }

  return true
}
