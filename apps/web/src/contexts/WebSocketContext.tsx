/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { WebSocketClient } from '../services/websocket'
import type { ServerMessage, ClientMessage } from '../types'

interface WebSocketContextValue {
  client: WebSocketClient | null
  connected: boolean
  send: (message: ClientMessage) => void
  subscribe: (handler: (message: ServerMessage) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<WebSocketClient | null>(null)
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef<Set<(message: ServerMessage) => void>>(new Set())

  useEffect(() => {
    const wsClient = new WebSocketClient()
    let isMounted = true

    // Set up connection handler
    wsClient.onConnection((isConnected) => {
      if (isMounted) {
        setConnected(isConnected)
      }
    })

    // Set up message handler that notifies all subscribers
    wsClient.onMessage((message) => {
      handlersRef.current.forEach((handler) => {
        try {
          handler(message)
        } catch (error) {
          console.error('Error in message handler:', error)
        }
      })
    })

    // Connect
    wsClient.connect().catch((error) => {
      console.error('Failed to connect WebSocket:', error)
    })

    // Set client after connection attempt (necessary for WebSocket lifecycle)
    if (isMounted) {
      setClient(wsClient)
    }

    return () => {
      isMounted = false
      wsClient.disconnect()
    }
  }, []) // Run only once on mount

  const send = useCallback((message: ClientMessage) => {
    client?.send(message)
  }, [client])

  const subscribe = useCallback((handler: (message: ServerMessage) => void) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  const value: WebSocketContextValue = {
    client,
    connected,
    send,
    subscribe,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}
