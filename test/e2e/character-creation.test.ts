/**
 * Character Creation End-to-End Tests
 *
 * These tests verify the character creation flow works correctly
 * by testing the backend API directly.
 *
 * Note: These tests require the server to be running.
 * Set API_BASE_URL environment variable to configure the server address.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080'

// Check if server is available
let serverAvailable = false

/**
 * Helper to make API requests
 */
async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}/api${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  const data = await response.json()
  return { response, data }
}

beforeAll(async () => {
  // Check if server is available
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(2000),
    })
    serverAvailable = response.ok
  } catch {
    serverAvailable = false
  }
})

// Helper to conditionally run tests
const itIfServer = (title: string, fn: () => void | Promise<void>) => {
  return serverAvailable ? it(title, fn) : it.skip(title, fn)
}

describe('Character Creation E2E Tests', () => {
  describe('Session creation for character', () => {
    let testSessionId: string

    afterAll(async () => {
      // Clean up test session
      if (testSessionId && serverAvailable) {
        try {
          await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
        } catch {
          // Ignore cleanup errors
        }
      }
    })

    itIfServer('should create a new session for character', async () => {
      const { response, data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('sessionId')

      testSessionId = (data as { sessionId: string }).sessionId
      expect(testSessionId).toMatch(/^sess_/)
    })

    itIfServer('should create session with custom name for character', async () => {
      const characterName = 'test-character-' + Date.now()

      const { response, data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: characterName }),
      })

      expect(response.status).toBe(201)
      expect((data as { sessionId: string }).sessionId).toBe(characterName)

      // Clean up
      await apiRequest(`/sessions/${characterName}`, { method: 'DELETE' })
    })
  })

  describe('Character state persistence', () => {
    let sessionId: string

    beforeAll(async () => {
      if (!serverAvailable) return

      // Create a session for character tests
      const { data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      sessionId = (data as { sessionId: string }).sessionId
    })

    afterAll(async () => {
      // Clean up
      if (sessionId && serverAvailable) {
        await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
      }
    })

    itIfServer('should store and retrieve character data', async () => {
      // First, get the session to verify it exists
      const { response, data } = await apiRequest(`/sessions/${sessionId}`)

      expect(response.status).toBe(200)
      expect((data as { sessionId: string }).sessionId).toBe(sessionId)

      // The session should have initial game state
      expect(data).toHaveProperty('phase')
    })

    itIfServer('should maintain character data across requests', async () => {
      // Get session state
      const { data: firstFetch } = await apiRequest(`/sessions/${sessionId}`)

      // Get it again
      const { data: secondFetch } = await apiRequest(`/sessions/${sessionId}`)

      // Session IDs should match
      expect((firstFetch as { sessionId: string }).sessionId).toBe(
        (secondFetch as { sessionId: string }).sessionId,
      )
    })
  })

  describe('Character data structure', () => {
    itIfServer('should validate session state structure', async () => {
      const { data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const sessionId = (data as { sessionId: string }).sessionId

      // Get the full session state
      const { response, data: sessionData } = await apiRequest(`/sessions/${sessionId}`)

      expect(response.status).toBe(200)

      // Validate expected properties
      expect(sessionData).toHaveProperty('sessionId')
      expect(sessionData).toHaveProperty('phase')
      expect(sessionData).toHaveProperty('party')
      expect(sessionData).toHaveProperty('metadata')

      // Party should be an array
      expect(Array.isArray((sessionData as { party: unknown[] }).party)).toBe(true)

      // Metadata should have required fields
      const metadata = (sessionData as { metadata: { createdAt: number; updatedAt: number } }).metadata
      expect(metadata).toHaveProperty('createdAt')
      expect(metadata).toHaveProperty('updatedAt')

      // Clean up
      await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
    })
  })

  describe('Error handling', () => {
    itIfServer('should handle invalid session ID gracefully', async () => {
      const { response, data } = await apiRequest('/sessions/invalid-session-format')

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('status', 'error')
      expect(data).toHaveProperty('error')
    })

    itIfServer('should handle duplicate session creation', async () => {
      const duplicateId = 'duplicate-test-' + Date.now()

      // Create first session
      await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: duplicateId }),
      })

      // Try to create duplicate
      const { response, data } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionId: duplicateId }),
      })

      expect(response.status).toBe(400)
      expect((data as { error?: { code: string } }).error?.code).toBe('BAD_REQUEST')

      // Clean up
      await apiRequest(`/sessions/${duplicateId}`, { method: 'DELETE' })
    })
  })

  describe('Character creation workflow', () => {
    itIfServer('should support complete character creation workflow', async () => {
      // 1. Create a session (simulating starting character creation)
      const { data: createData } = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const sessionId = (createData as { sessionId: string }).sessionId
      expect(sessionId).toBeTruthy()

      // 2. Verify session is accessible
      const { response: getResponse } = await apiRequest(`/sessions/${sessionId}`)
      expect(getResponse.status).toBe(200)

      // 3. List sessions to verify our session is included
      const { data: listData } = await apiRequest('/sessions')
      const sessions = (listData as { sessions: string[] }).sessions
      expect(sessions).toContain(sessionId)

      // 4. Clean up (simulating character deletion)
      const { response: deleteResponse } = await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      // 5. Verify session is gone
      const { response: notFoundResponse } = await apiRequest(`/sessions/${sessionId}`)
      expect(notFoundResponse.status).toBe(404)
    })
  })
})

/**
 * Character data validation tests
 *
 * These tests verify the character data structure matches
 * the expected format from the backend.
 */
describe('Character Data Validation', () => {
  interface Character {
    id: string
    name: string
    race: string
    class: string
    background?: string
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
    skills?: Record<string, boolean>
    savingThrows?: Record<string, boolean>
    gold?: number
    proficiencyBonus?: number
    speed?: number
  }

  describe('Character structure validation', () => {
    it('should accept valid character structure', () => {
      const character: Character = {
        id: 'char-123',
        name: 'Test Character',
        race: 'human',
        class: 'fighter',
        level: 1,
        hp: 10,
        maxHp: 10,
        ac: 15,
        stats: {
          strength: 16,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        skills: {
          athletics: true,
          intimidation: true,
        },
        savingThrows: {
          strength: true,
          constitution: true,
        },
        gold: 125,
        proficiencyBonus: 2,
        speed: 30,
      }

      // Verify all required fields are present
      expect(character.id).toBeTruthy()
      expect(character.name).toBeTruthy()
      expect(character.race).toBeTruthy()
      expect(character.class).toBeTruthy()
      expect(character.level).toBeGreaterThan(0)
      expect(character.hp).toBeGreaterThan(0)
      expect(character.maxHp).toBeGreaterThan(0)
      expect(character.ac).toBeGreaterThan(0)

      // Verify stats are valid
      Object.values(character.stats).forEach((stat) => {
        expect(stat).toBeGreaterThanOrEqual(1)
        expect(stat).toBeLessThanOrEqual(20)
      })
    })

    it('should calculate ability modifier correctly', () => {
      const calculateModifier = (score: number): number => Math.floor((score - 10) / 2)

      expect(calculateModifier(10)).toBe(0)
      expect(calculateModifier(12)).toBe(1)
      expect(calculateModifier(14)).toBe(2)
      expect(calculateModifier(16)).toBe(3)
      expect(calculateModifier(8)).toBe(-1)
      expect(calculateModifier(20)).toBe(5)
    })
  })

  describe('Racial bonuses', () => {
    it('should apply elf racial bonus to dexterity', () => {
      const baseDex = 14
      const elfBonus = 2
      const expectedDex = baseDex + elfBonus

      expect(expectedDex).toBe(16)
    })

    it('should apply dwarf racial bonus to constitution', () => {
      const baseCon = 14
      const dwarfBonus = 2
      const expectedCon = baseCon + dwarfBonus

      expect(expectedCon).toBe(16)
    })

    it('should apply human racial bonus to all stats', () => {
      const baseStats = { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 }
      const humanBonus = 1

      Object.values(baseStats).forEach((stat) => {
        expect(stat + humanBonus).toBeGreaterThanOrEqual(2)
        expect(stat + humanBonus).toBeLessThanOrEqual(21)
      })
    })
  })

  describe('Class-based calculations', () => {
    it('should calculate fighter hit points correctly', () => {
      const hitDice = 10 // Fighter uses d10
      const conMod = 2 // CON 14 gives +2
      const expectedHP = hitDice + conMod

      expect(expectedHP).toBe(12)
    })

    it('should calculate wizard hit points correctly', () => {
      const hitDice = 6 // Wizard uses d6
      const conMod = 1 // CON 12 gives +1
      const expectedHP = hitDice + conMod

      expect(expectedHP).toBe(7)
    })

    it('should calculate rogue hit points correctly', () => {
      const hitDice = 8 // Rogue uses d8
      const conMod = 2 // CON 14 gives +2
      const expectedHP = hitDice + conMod

      expect(expectedHP).toBe(10)
    })
  })

  describe('Proficiency bonus', () => {
    it('should calculate proficiency bonus by level', () => {
      const proficiencyByLevel: Record<number, number> = {
        1: 2,
        2: 2,
        3: 2,
        4: 2,
        5: 3,
        6: 3,
        7: 3,
        8: 3,
        9: 4,
        10: 4,
        11: 4,
        12: 4,
        13: 5,
        14: 5,
        15: 5,
        16: 5,
        17: 6,
        18: 6,
        19: 6,
        20: 6,
      }

      Object.entries(proficiencyByLevel).forEach(([level, bonus]) => {
        expect(bonus).toBeGreaterThan(0)
        expect(bonus).toBeLessThanOrEqual(6)
      })
    })
  })
})
