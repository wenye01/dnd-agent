import { API_DEFAULT_TIMEOUT_MS } from '../config/constants'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface ApiResponse<T> {
  status: string
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface ServerCharacter {
  id: string
  name: string
  race: string
  class: string
  level: number
  hp: number
  maxHp: number
  ac: number
  stats: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
  skills: Record<string, boolean>
  inventory: Array<{ id: string; name: string; description: string; type: string }>
  conditions: string[] | undefined
  background: string
  proficiencyBonus: number
  savingThrows: Record<string, boolean>
  speed: number
  gold: number
  racialTraits: Array<{ name: string; description: string }>
  deathSaves?: import('../types').DeathSaves
  equipment?: import('../types').EquipmentSlot[]
  spellSlots?: import('../types').SpellSlots
}

export interface CreateCharacterRequest {
  name: string
  race: string
  class: string
  background: string
  abilityScores: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
}

export interface ListCharactersResponse {
  characters: ServerCharacter[]
  count: number
}

/**
 * Error thrown when an HTTP request returns a non-OK status code (outside 200-299).
 * For 401/403 the caller can inspect `status` to trigger session cleanup / re-auth.
 */
export class ApiHttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.code = code
  }
}

/** Options for apiRequest, extending standard RequestInit. */
export interface ApiRequestOptions extends RequestInit {
  /** Request timeout in milliseconds. Defaults to API_DEFAULT_TIMEOUT_MS (15 s). */
  timeoutMs?: number
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = API_DEFAULT_TIMEOUT_MS, ...fetchOptions } = options

  const url = `${API_BASE_URL}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers as Record<string, string>,
  }

  const sessionId = getSessionId()
  if (sessionId) {
    headers['X-Session-ID'] = sessionId
  }

  // AbortController for request timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    // Re-throw AbortError (timeout) distinctly so callers can handle it
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new DOMException(`Request timed out after ${timeoutMs}ms`, 'AbortError')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  // HTTP status validation
  if (!response.ok) {
    let message = `HTTP ${response.status}: ${response.statusText}`
    let code = `HTTP_${response.status}`

    // Try to extract a more descriptive error from the response body
    try {
      const body = await response.json()
      if (typeof body?.error?.message === 'string') {
        message = body.error.message
      }
      if (typeof body?.error?.code === 'string') {
        code = body.error.code
      }
    } catch {
      // Body is not JSON or empty -- stick with status-based message
    }

    // Log auth errors at warn level for visibility
    if (response.status === 401 || response.status === 403) {
      console.warn(`Auth error (${response.status}) on ${path}: ${message}`)
    }

    throw new ApiHttpError(response.status, code, message)
  }

  const data: ApiResponse<T> = await response.json()
  return data
}

function getSessionId(): string | null {
  try {
    const stored = localStorage.getItem('dnd-game-state')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.gameState?.sessionId ?? null
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

export interface CreateSessionResponse {
  sessionId: string
}

async function createSession(): Promise<ApiResponse<CreateSessionResponse>> {
  return apiRequest<CreateSessionResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export const sessionApi = {
  create: createSession,
  get: (id: string) => apiRequest<{ sessionId: string; phase: string }>(`/sessions/${id}`),
}

export const characterApi = {
  create: async (request: CreateCharacterRequest): Promise<ApiResponse<ServerCharacter>> => {
    return apiRequest<ServerCharacter>('/characters', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  get: async (id: string): Promise<ApiResponse<ServerCharacter>> => {
    return apiRequest<ServerCharacter>(`/characters/${id}`)
  },

  list: async (): Promise<ApiResponse<ListCharactersResponse>> => {
    return apiRequest<ListCharactersResponse>('/characters')
  },

  delete: async (id: string): Promise<ApiResponse<{ characterId: string; deleted: boolean }>> => {
    return apiRequest(`/characters/${id}`, { method: 'DELETE' })
  },
}
