import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eventBus } from './eventBus'

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear()
  })

  describe('on / emit', () => {
    it('should invoke listener when event is emitted', () => {
      const handler = vi.fn()
      eventBus.on('test-event', handler)
      eventBus.emit('test-event', { value: 42 })

      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith({ value: 42 })
    })

    it('should invoke multiple listeners for the same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      eventBus.on('test-event', handler1)
      eventBus.on('test-event', handler2)
      eventBus.emit('test-event')

      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })

    it('should not invoke listeners for different events', () => {
      const handler = vi.fn()
      eventBus.on('event-a', handler)
      eventBus.emit('event-b')

      expect(handler).not.toHaveBeenCalled()
    })

    it('should pass undefined data when emit is called without data', () => {
      const handler = vi.fn()
      eventBus.on('test-event', handler)
      eventBus.emit('test-event')

      expect(handler).toHaveBeenCalledWith(undefined)
    })
  })

  describe('unsubscribe', () => {
    it('should return an unsubscribe function from on()', () => {
      const handler = vi.fn()
      const unsub = eventBus.on('test-event', handler)

      unsub()
      eventBus.emit('test-event')

      expect(handler).not.toHaveBeenCalled()
    })

    it('should only remove the specific callback, not all listeners', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const unsub1 = eventBus.on('test-event', handler1)
      eventBus.on('test-event', handler2)

      unsub1()
      eventBus.emit('test-event')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledOnce()
    })
  })

  describe('off', () => {
    it('should remove a specific callback with off()', () => {
      const handler = vi.fn()
      eventBus.on('test-event', handler)
      eventBus.off('test-event', handler)
      eventBus.emit('test-event')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should remove all listeners for a specific event', () => {
      const handlerA = vi.fn()
      const handlerB = vi.fn()
      eventBus.on('event-a', handlerA)
      eventBus.on('event-b', handlerB)

      eventBus.clear('event-a')
      eventBus.emit('event-a')
      eventBus.emit('event-b')

      expect(handlerA).not.toHaveBeenCalled()
      expect(handlerB).toHaveBeenCalledOnce()
    })

    it('should remove all listeners for all events when called without argument', () => {
      const handlerA = vi.fn()
      const handlerB = vi.fn()
      eventBus.on('event-a', handlerA)
      eventBus.on('event-b', handlerB)

      eventBus.clear()
      eventBus.emit('event-a')
      eventBus.emit('event-b')

      expect(handlerA).not.toHaveBeenCalled()
      expect(handlerB).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should catch errors in listeners and not break other listeners', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalHandler = vi.fn()

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      eventBus.on('test-event', errorHandler)
      eventBus.on('test-event', normalHandler)
      eventBus.emit('test-event')

      expect(errorHandler).toHaveBeenCalledOnce()
      expect(normalHandler).toHaveBeenCalledOnce()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })
})
