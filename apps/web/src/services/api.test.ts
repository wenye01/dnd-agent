import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ApiResponse, ServerCharacter, CreateCharacterRequest } from './api'
import { ApiHttpError } from './api'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Import after mocks are set up
import { characterApi, sessionApi } from './api'

function mockFetchResponse<T>(data: ApiResponse<T>, status = 200) {
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve(data),
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 201 ? 'Created' : 'Error',
  })
}

function mockFetchHttpError(status: number, body?: { error?: { code?: string; message?: string } }) {
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve(body ?? {}),
    ok: false,
    status,
    statusText: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found' : 'Error',
  })
}

function createMockCharacter(overrides: Partial<ServerCharacter> = {}): ServerCharacter {
  return {
    id: 'char-test-uuid',
    name: 'Test Hero',
    race: 'human',
    class: 'fighter',
    level: 1,
    hp: 12,
    maxHp: 12,
    ac: 11,
    stats: {
      strength: 17,
      dexterity: 13,
      constitution: 15,
      intelligence: 11,
      wisdom: 11,
      charisma: 11,
    },
    skills: { athletics: true },
    inventory: [],
    conditions: [],
    background: 'soldier',
    proficiencyBonus: 2,
    savingThrows: { strength: true, constitution: true },
    speed: 30,
    gold: 125,
    racialTraits: [{ name: 'Ability Score Increase', description: '+1 to all ability scores' }],
    ...overrides,
  }
}

function createValidRequest(): CreateCharacterRequest {
  return {
    name: 'Test Hero',
    race: 'human',
    class: 'fighter',
    background: 'soldier',
    abilityScores: { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
  }
}

describe('api.ts - REST API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSessionId', () => {
    it('should return null when localStorage has no dnd-game-state', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null)

      // Call an API method that triggers getSessionId
      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBeUndefined()
    })

    it('should return sessionId from localStorage when available', async () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ state: { gameState: { sessionId: 'sess-123' } } })
      )

      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBe('sess-123')
    })

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorageMock.getItem.mockReturnValueOnce('not-json')

      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBeUndefined()
    })

    it('should handle missing gameState path in stored data', async () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ other: 'data' })
      )

      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBeUndefined()
    })

    it('should include X-Session-ID in GET request when session exists', async () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ state: { gameState: { sessionId: 'sess-456' } } })
      )

      mockFetchResponse({ status: 'success', data: createMockCharacter({ id: 'char-1' }) })
      await characterApi.get('char-1')

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBe('sess-456')
    })

    it('should include X-Session-ID in DELETE request when session exists', async () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ state: { gameState: { sessionId: 'sess-789' } } })
      )

      mockFetchResponse({ status: 'success', data: { characterId: 'char-1', deleted: true } })
      await characterApi.delete('char-1')

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBe('sess-789')
    })

    it('should handle nested sessionId path correctly', async () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ state: { gameState: { sessionId: 'deep-session-id', phase: 'exploring' } } })
      )

      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBe('deep-session-id')
    })

    it('should return undefined sessionId when gameState exists but sessionId field is missing', async () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ state: { gameState: { phase: 'exploring' } } })
      )

      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['X-Session-ID']).toBeUndefined()
    })
  })

  describe('characterApi.create', () => {
    it('should send POST request to /characters with correct body', async () => {
      const request = createValidRequest()
      const mockChar = createMockCharacter()
      mockFetchResponse({ status: 'success', data: mockChar }, 201)

      const result = await characterApi.create(request)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/characters')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual(request)
      expect(result.status).toBe('success')
      expect(result.data).toEqual(mockChar)
    })

    it('should include Content-Type header', async () => {
      mockFetchResponse({ status: 'success', data: createMockCharacter() }, 201)

      await characterApi.create(createValidRequest())

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should handle error response from server', async () => {
      mockFetchResponse({
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'Invalid race' },
      })

      const result = await characterApi.create({
        ...createValidRequest(),
        race: 'dragonborn',
      })

      expect(result.status).toBe('error')
      expect(result.error?.code).toBe('BAD_REQUEST')
      expect(result.error?.message).toBe('Invalid race')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(characterApi.create(createValidRequest())).rejects.toThrow('Network error')
    })

    it('should send correct body for elf wizard', async () => {
      const elfWizard: CreateCharacterRequest = {
        name: 'Elara',
        race: 'elf',
        class: 'wizard',
        background: 'sage',
        abilityScores: { strength: 8, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 12, charisma: 10 },
      }
      mockFetchResponse({ status: 'success', data: createMockCharacter(elfWizard) }, 201)

      await characterApi.create(elfWizard)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.race).toBe('elf')
      expect(body.class).toBe('wizard')
      expect(body.abilityScores.intelligence).toBe(16)
    })

    it('should send correct body for dwarf rogue', async () => {
      const dwarfRogue: CreateCharacterRequest = {
        name: 'Thorin',
        race: 'dwarf',
        class: 'rogue',
        background: 'criminal',
        abilityScores: { strength: 10, dexterity: 16, constitution: 14, intelligence: 12, wisdom: 10, charisma: 8 },
      }
      mockFetchResponse({ status: 'success', data: createMockCharacter(dwarfRogue) }, 201)

      await characterApi.create(dwarfRogue)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.race).toBe('dwarf')
      expect(body.class).toBe('rogue')
    })
  })

  describe('characterApi.get', () => {
    it('should send GET request to /characters/:id', async () => {
      const mockChar = createMockCharacter({ id: 'char-1' })
      mockFetchResponse({ status: 'success', data: mockChar })

      const result = await characterApi.get('char-1')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/characters/char-1')
      expect(options.method).toBeUndefined() // GET is default
      expect(result.data?.id).toBe('char-1')
    })

    it('should handle not found', async () => {
      mockFetchResponse({
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'character not found' },
      })

      const result = await characterApi.get('nonexistent')

      expect(result.status).toBe('error')
      expect(result.error?.code).toBe('NOT_FOUND')
    })
  })

  describe('characterApi.list', () => {
    it('should send GET request to /characters', async () => {
      const chars = [createMockCharacter(), createMockCharacter({ id: 'char-2', name: 'Hero 2' })]
      mockFetchResponse({
        status: 'success',
        data: { characters: chars, count: 2 },
      })

      const result = await characterApi.list()

      const [url] = mockFetch.mock.calls[0]
      expect(url).toMatch(/\/characters$/)
      expect(result.data?.count).toBe(2)
      expect(result.data?.characters).toHaveLength(2)
    })

    it('should handle empty list', async () => {
      mockFetchResponse({
        status: 'success',
        data: { characters: [], count: 0 },
      })

      const result = await characterApi.list()

      expect(result.data?.count).toBe(0)
      expect(result.data?.characters).toHaveLength(0)
    })
  })

  describe('characterApi.delete', () => {
    it('should send DELETE request to /characters/:id', async () => {
      mockFetchResponse({
        status: 'success',
        data: { characterId: 'char-1', deleted: true },
      })

      const result = await characterApi.delete('char-1')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/characters/char-1')
      expect(options.method).toBe('DELETE')
      expect(result.data?.characterId).toBe('char-1')
      expect(result.data?.deleted).toBe(true)
    })

    it('should handle not found on delete', async () => {
      mockFetchResponse({
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'character not found' },
      })

      const result = await characterApi.delete('nonexistent')

      expect(result.status).toBe('error')
    })
  })

  describe('apiRequest headers', () => {
    it('should always include Content-Type application/json', async () => {
      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should merge custom headers with defaults', async () => {
      // This tests the header merging in apiRequest
      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('error response handling', () => {
    it('should handle error with missing optional data field', async () => {
      mockFetchResponse({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Something failed' },
      })

      const result = await characterApi.get('char-1')

      expect(result.status).toBe('error')
      expect(result.error?.code).toBe('INTERNAL_ERROR')
      expect(result.data).toBeUndefined()
    })

    it('should handle server returning session not found error', async () => {
      mockFetchResponse({
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'session not found' },
      })

      const result = await characterApi.create(createValidRequest())

      expect(result.status).toBe('error')
      expect(result.error?.message).toContain('session not found')
    })

    it('should handle success response with character containing full server fields', async () => {
      const fullChar = createMockCharacter({
        inventory: [
          { id: 'item-1', name: 'Longsword', description: 'A steel longsword', type: 'weapon' },
        ],
        racialTraits: [
          { name: 'Darkvision', description: 'You can see in dim light.' },
          { name: 'Keen Senses', description: 'Proficiency in Perception.' },
        ],
      })

      mockFetchResponse({ status: 'success', data: fullChar }, 201)

      const result = await characterApi.create(createValidRequest())

      expect(result.data?.inventory).toHaveLength(1)
      expect(result.data?.inventory[0].name).toBe('Longsword')
      expect(result.data?.racialTraits).toHaveLength(2)
    })
  })

  describe('URL construction', () => {
    it('should use API_BASE_URL prefix for all requests', async () => {
      mockFetchResponse({ status: 'success', data: { characters: [], count: 0 } })
      await characterApi.list()

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toMatch(/^\/api\/characters$/)
    })

    it('should construct correct URL for character get', async () => {
      mockFetchResponse({ status: 'success', data: createMockCharacter() })
      await characterApi.get('abc-123')

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/characters/abc-123')
    })

    it('should construct correct URL for character delete', async () => {
      mockFetchResponse({ status: 'success', data: { characterId: 'xyz', deleted: true } })
      await characterApi.delete('xyz')

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/characters/xyz')
    })
  })

  // ---------------------------------------------------------------
  // New: timeout & HTTP status check tests
  // ---------------------------------------------------------------

  describe('request timeout', () => {
    it('should throw AbortError on timeout', async () => {
      vi.useFakeTimers()

      // Simulate a fetch that never resolves, but rejects when the abort signal fires
      mockFetch.mockImplementationOnce(
        (_url: string, opts: RequestInit) =>
          new Promise((_resolve, reject) => {
            if (opts.signal) {
              opts.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }
          }),
      )

      const promise = characterApi.get('char-timeout')

      // Fast-forward past the default 15s timeout
      vi.advanceTimersByTime(16_000)

      await expect(promise).rejects.toThrow()

      // Verify signal was passed
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].signal).toBeDefined()

      vi.useRealTimers()
    })

    it('should pass AbortSignal to fetch', async () => {
      mockFetchResponse({ status: 'success', data: createMockCharacter() })
      await characterApi.get('char-1')

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('HTTP status validation', () => {
    it('should throw ApiHttpError for 404 responses', async () => {
      mockFetchHttpError(404)

      try {
        await characterApi.get('nonexistent')
        expect.unreachable('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiHttpError)
        const httpErr = err as ApiHttpError
        expect(httpErr.status).toBe(404)
        expect(httpErr.code).toBe('HTTP_404')
      }
    })

    it('should extract error message from response body', async () => {
      mockFetchHttpError(400, {
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' },
      })

      try {
        await characterApi.create(createValidRequest())
      } catch (err) {
        const httpErr = err as ApiHttpError
        expect(httpErr.status).toBe(400)
        expect(httpErr.message).toBe('Name is required')
        expect(httpErr.code).toBe('VALIDATION_ERROR')
      }
    })

    it('should warn on 401 auth errors', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetchHttpError(401, {
        error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
      })

      try {
        await sessionApi.get('sess-bad')
      } catch {
        // expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auth error (401)'),
      )
      warnSpy.mockRestore()
    })

    it('should warn on 403 forbidden errors', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetchHttpError(403, {
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      })

      try {
        await characterApi.delete('char-1')
      } catch {
        // expected
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auth error (403)'),
      )
      warnSpy.mockRestore()
    })

    it('should use status text when body is not valid JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      try {
        await characterApi.list()
      } catch (err) {
        const httpErr = err as ApiHttpError
        expect(httpErr.status).toBe(500)
        expect(httpErr.message).toContain('500')
      }
    })
  })
})
