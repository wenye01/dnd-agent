import type {
  ClientMessage,
  ServerMessage,
} from '../types'

import {
  WS_DEFAULT_URL,
  WS_DEFAULT_RECONNECT_INTERVAL,
  WS_DEFAULT_MAX_RECONNECT_ATTEMPTS,
  WS_DEFAULT_HEARTBEAT_INTERVAL,
  WS_MAX_QUEUE_SIZE,
} from '../config/constants'

// Re-export from typeGuards for backward compatibility
export type { StateUpdatePayload, CombatEventPayload, UserInputPayload } from './typeGuards'
export {
  isPartialGameState,
  isCharacterArray,
  isCombatState,
  isNarrationPayload,
  isStateUpdatePayload,
  isDiceResultPayload,
  isErrorPayload,
  isCombatEventPayload,
  isUserInputPayload,
} from './typeGuards'

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
