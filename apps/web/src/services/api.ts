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
}

export interface CreateCharacterRequest {
  name: string
  race: string
  class: string
  background: string
  abilityScores: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
}

export interface ListCharactersResponse {
  characters: ServerCharacter[]
  count: number
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  const sessionId = getSessionId()
  if (sessionId) {
    headers['X-Session-ID'] = sessionId
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

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
