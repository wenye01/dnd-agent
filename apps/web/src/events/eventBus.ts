/**
 * Type-safe event bus for Phaser <-> React decoupled communication.
 * Phaser scenes emit interaction events; React components listen and respond.
 * Stores emit effect events; Phaser scenes listen and play visual effects.
 */

type EventCallback = (data: unknown) => void

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>()

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data)
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err)
      }
    })
  }

  /** Remove all listeners for a specific event, or all events if no event given. */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

/** Singleton event bus instance. */
export const eventBus = new EventBus()
