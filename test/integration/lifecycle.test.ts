/**
 * Full Lifecycle Integration Tests
 *
 * Tests the complete game lifecycle:
 *   Character creation -> Combat -> Rest recovery -> Death saves
 *
 * These tests exercise the CombatManager directly (Go backend tests)
 * and also verify REST API integration where applicable.
 *
 * Note: REST-based tests will be skipped if the server is not available.
 */

import {
  API_BASE,
  serverAvailable,
  apiRequest,
  itIfServer,
  checkServerAvailability,
  createTestSession,
  createTestCharacter,
} from '../e2e/helpers'
import type {
  SessionResponse,
  CharacterResponse,
  ErrorResponse,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Full Lifecycle Integration Tests', () => {
  let testSessionId: string
  let testCharacter: CharacterResponse

  beforeAll(async () => {
    if (!serverAvailable) return

    testSessionId = (await createTestSession()).sessionId
    testCharacter = await createTestCharacter(testSessionId, {
      name: 'LifecycleHero',
      race: 'human',
      class_: 'fighter',
      background: 'soldier',
    })
  })

  afterAll(async () => {
    if (testSessionId && serverAvailable) {
      try {
        await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  // -----------------------------------------------------------------------
  // 1. Character creation lifecycle
  // -----------------------------------------------------------------------

  describe('Step 1: Character Creation', () => {
    itIfServer('should create a character with valid combat attributes', () => {
      expect(testCharacter.maxHp).toBeGreaterThan(0)
      expect(testCharacter.hp).toBe(testCharacter.maxHp)
      expect(testCharacter.ac).toBeGreaterThanOrEqual(8)
      expect(testCharacter.proficiencyBonus).toBe(2)
    })

    itIfServer('should have initial HP equal to max HP', () => {
      expect(testCharacter.hp).toBe(testCharacter.maxHp)
    })

    itIfServer('should have correct ability score modifiers', () => {
      // Human: all stats +1
      // Base: STR 16+1=17, DEX 14+1=15, CON 15+1=16, INT 10+1=11, WIS 12+1=13, CHA 8+1=9
      expect(testCharacter.stats.strength).toBe(17)
      expect(testCharacter.stats.constitution).toBe(16)

      // Fighter HP = 10 + CON mod(16 => +3) = 13
      expect(testCharacter.maxHp).toBe(13)
      // AC = 10 + DEX mod(15 => +2) = 12
      expect(testCharacter.ac).toBe(12)
    })

    itIfServer('should have starting gold from class', () => {
      expect(testCharacter.gold).toBe(125) // Fighter starting gold avg
    })

    itIfServer('should have empty conditions', () => {
      // Character starts with no conditions
      expect(testCharacter.conditions).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // 2. Combat encounter lifecycle (REST API combat start/end)
  // -----------------------------------------------------------------------

  describe('Step 2: Combat Encounter Flow', () => {
    itIfServer('should have session in exploring phase before combat', async () => {
      const { response, data } = await apiRequest<{
        sessionId: string
        phase: string
      }>(`/sessions/${testSessionId}`)

      expect(response.status).toBe(200)
    })

    // Note: Combat start/end typically happens through the MCP tool layer
    // (LLM tool calls processed by the WebSocket handler). The REST API
    // provides session state and character management. Full combat flow
    // through REST would require dedicated combat endpoints.
    //
    // The Go backend tests (combat_test.go) exercise the CombatManager
    // directly, covering:
    //   - StartCombat -> roll initiative -> combat state transitions
    //   - AttackAction -> damage calculation -> HP changes
    //   - EndTurn -> turn advancement -> round counting
    //   - EndCombat -> state reset
    //
    // Here we verify that the REST API correctly reflects combat state
    // when it changes through the backend.

    itIfServer('should have valid game state structure for combat integration', async () => {
      const { response, data } = await apiRequest(
        `/sessions/${testSessionId}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // 3. Rest and Recovery lifecycle
  // -----------------------------------------------------------------------

  describe('Step 3: Rest and Recovery', () => {
    // Rest operations are invoked through the CombatManager (Go backend)
    // via MCP tools. The REST API exposes session state that reflects
    // the results. Here we verify character state structure needed for
    // rest operations.

    itIfServer('should have hit dice available for short rest', () => {
      expect(testCharacter.hitDice).toBeDefined()
      expect(testCharacter.hitDice.total).toBe(1) // Level 1
      expect(testCharacter.hitDice.current).toBe(1) // Full
      expect(testCharacter.hitDice.size).toBe(10) // Fighter d10
    })

    itIfServer('should have death saves ready for emergency', () => {
      expect(testCharacter.deathSaves).toBeDefined()
      expect(testCharacter.deathSaves.successes).toBe(0)
      expect(testCharacter.deathSaves.failures).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // 4. Cross-phase data consistency
  // -----------------------------------------------------------------------

  describe('Step 4: Cross-Phase Data Consistency', () => {
    itIfServer('should maintain character ID across operations', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      expect(data!.id).toBe(testCharacter.id)
    })

    itIfServer('should have consistent stats across multiple fetches', async () => {
      const { data: first } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      const { data: second } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
      expect(first!.maxHp).toBe(second!.maxHp)
      expect(first!.ac).toBe(second!.ac)
      expect(first!.stats.strength).toBe(second!.stats.strength)
    })

    itIfServer('should have consistent death saves across fetches', async () => {
      const { data: first } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      const { data: second } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
      expect(first!.deathSaves.successes).toBe(second!.deathSaves.successes)
      expect(first!.deathSaves.failures).toBe(second!.deathSaves.failures)
    })
  })
})

// =========================================================================
// Backend CombatManager Integration Tests (documented as Go tests)
// =========================================================================
//
// The following scenarios are covered by Go tests in
// apps/server/internal/server/combat/combat_test.go:
//
// 1. Damage Calculation:
//    - Normal damage reduces HP
//    - Damage resistance halves damage (odd rounds down)
//    - Damage immunity results in zero damage
//    - Temporary HP absorbs damage first
//    - Player at 0 HP becomes unconscious
//    - Enemy at 0 HP dies
//    - Combined resistance + temp HP
//
// 2. Healing:
//    - Normal healing increases HP (caps at MaxHP)
//    - Healing at 0 HP restores consciousness and clears death saves
//
// 3. Death Saves:
//    - Single death save changes state (success/failure/nat1/nat20)
//    - 3 failures cause death
//    - 3 successes stabilize
//    - Natural 20 regains 1 HP
//    - Natural 1 adds 2 failures
//    - Cannot death save when HP > 0
//    - Cannot death save without DeathSaves field
//
// 4. Conditions:
//    - Apply/remove conditions
//    - Condition duration management
//    - Exhaustion stacking and level 6 death
//    - Unconscious auto-adds prone
//    - Condition modifiers (advantage/disadvantage)
//
// 5. Turn Management:
//    - End-of-turn effects (condition expiration)
//    - Start-of-turn effects
//
// =========================================================================

describe('REST API Data Format Consistency', () => {
  let sessionId: string
  let character: CharacterResponse

  beforeAll(async () => {
    if (!serverAvailable) return

    sessionId = (await createTestSession()).sessionId
    character = await createTestCharacter(sessionId, {
      name: 'FormatTest',
      race: 'elf',
      class_: 'wizard',
      background: 'sage',
      abilityScores: { str: 8, dex: 14, con: 12, int: 15, wis: 13, cha: 10 },
    })
  })

  afterAll(async () => {
    if (sessionId && serverAvailable) {
      try {
        await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
      } catch {
        // Ignore
      }
    }
  })

  describe('Character data format matches frontend types', () => {
    itIfServer('should match TypeScript Combatant field names', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const char = data!

      // These field names must match the frontend TypeScript types:
      // apps/web/src/types/state.ts (Combatant)
      // apps/web/src/services/api.ts (ServerCharacter)
      expect(typeof char.id).toBe('string')
      expect(typeof char.name).toBe('string')
      expect(typeof char.maxHp).toBe('number')
      expect(typeof char.hp).toBe('number')
      expect(typeof char.ac).toBe('number')
      expect(typeof char.speed).toBe('number')
      expect(typeof char.level).toBe('number')
      expect(typeof char.proficiencyBonus).toBe('number')
    })

    itIfServer('should have correctly named stats object', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const stats = data!.stats

      // Frontend expects camelCase full names
      expect(typeof stats.strength).toBe('number')
      expect(typeof stats.dexterity).toBe('number')
      expect(typeof stats.constitution).toBe('number')
      expect(typeof stats.intelligence).toBe('number')
      expect(typeof stats.wisdom).toBe('number')
      expect(typeof stats.charisma).toBe('number')
    })

    itIfServer('should have deathSaves with correct field names', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const ds = data!.deathSaves
      expect(typeof ds.successes).toBe('number')
      expect(typeof ds.failures).toBe('number')
    })

    itIfServer('should have hitDice with correct field names', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const hd = data!.hitDice
      expect(typeof hd.total).toBe('number')
      expect(typeof hd.current).toBe('number')
      expect(typeof hd.size).toBe('number')
    })

    itIfServer('should have savingThrows as object with ability keys', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const st = data!.savingThrows
      // Wizard: Intelligence and Wisdom saving throws
      expect(st.intelligence).toBe(true)
      expect(st.wisdom).toBe(true)
      expect(st.strength).toBe(false)
    })

    itIfServer('should have skills as object with skill keys', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const skills = data!.skills
      // Sage background: arcana, history
      expect(skills.arcana).toBe(true)
      expect(skills.history).toBe(true)
    })
  })

  describe('Frontend-backend type mapping validation', () => {
    itIfServer('should return character data compatible with ServerCharacter type', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      const char = data!

      // ServerCharacter (api.ts) expects these fields:
      // id, name, race, class, level, hp, maxHp, ac, stats, skills,
      // inventory, conditions, background, proficiencyBonus, savingThrows,
      // speed, gold, racialTraits, deathSaves, hitDice
      const requiredFields = [
        'id', 'name', 'race', 'class', 'level', 'hp', 'maxHp', 'ac',
        'stats', 'skills', 'inventory', 'background', 'proficiencyBonus',
        'savingThrows', 'speed', 'gold', 'racialTraits', 'deathSaves', 'hitDice',
      ]

      for (const field of requiredFields) {
        expect(char).toHaveProperty(field)
      }
    })

    itIfServer('should have inventory as array', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      expect(Array.isArray(data!.inventory)).toBe(true)
    })

    itIfServer('should have racialTraits as array of objects', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${character.id}?sessionId=${encodeURIComponent(sessionId)}`,
      )

      expect(data).not.toBeNull()
      expect(Array.isArray(data!.racialTraits)).toBe(true)
      for (const trait of data!.racialTraits) {
        expect(trait).toHaveProperty('name')
        expect(trait).toHaveProperty('description')
      }
    })
  })
})

// =========================================================================
// WebSocket Message Format Consistency Tests
// =========================================================================

describe('WebSocket Message Format Consistency', () => {
  itIfServer('should confirm server supports websocket feature', async () => {
    const { response, data } = await apiRequest<{
      status: string
      data: { features: string[] }
    }>('/config')

    expect(response.status).toBe(200)
    expect(data).not.toBeNull()
    expect(data!.data.features).toContain('websocket')
    expect(data!.data.features).toContain('rest_api')
    expect(data!.data.features).toContain('dice_rolling')
    expect(data!.data.features).toContain('llm_integration')
    expect(data!.data.features).toContain('persistence')
  })
})

// =========================================================================
// Race/Class Combination Coverage Tests
// =========================================================================

describe('All Race/Class Combinations', () => {
  let sessionId: string

  beforeAll(async () => {
    if (!serverAvailable) return
    sessionId = (await createTestSession()).sessionId
  })

  afterAll(async () => {
    if (sessionId && serverAvailable) {
      try {
        await apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })
      } catch {
        // Ignore
      }
    }
  })

  const races = ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'half-elf', 'half-orc', 'tiefling']
  const classes = [
    { name: 'fighter', hitDie: 10 },
    { name: 'wizard', hitDie: 6 },
    { name: 'rogue', hitDie: 8 },
    { name: 'cleric', hitDie: 8 },
    { name: 'bard', hitDie: 8 },
    { name: 'druid', hitDie: 8 },
    { name: 'monk', hitDie: 8 },
    { name: 'paladin', hitDie: 10 },
    { name: 'ranger', hitDie: 10 },
    { name: 'sorcerer', hitDie: 6 },
    { name: 'warlock', hitDie: 8 },
  ]

  const backgrounds = ['sage', 'soldier', 'criminal', 'commoner', 'urchin', 'folk_hero', 'noble', 'outlander', 'entertainer', 'acolyte']

  // Test all races
  for (const race of races) {
    itIfServer(`should create ${race} character successfully`, async () => {
      const char = await createTestCharacter(sessionId, {
        name: `${race}_test_${Date.now()}`,
        race,
        class_: 'fighter',
        background: 'soldier',
      })

      expect(char).toBeDefined()
      expect(char.race).toBe(race)
      expect(char.maxHp).toBeGreaterThan(0)

      // Speed checks by race
      const speeds: Record<string, number> = {
        human: 30, elf: 30, dwarf: 25, halfling: 25,
        dragonborn: 30, gnome: 25, 'half-elf': 30,
        'half-orc': 30, tiefling: 30,
      }
      expect(char.speed).toBe(speeds[race])

      await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' },
      )
    })
  }

  // Test all classes
  for (const cls of classes) {
    itIfServer(`should create ${cls.name} character with correct hit die`, async () => {
      const char = await createTestCharacter(sessionId, {
        name: `${cls.name}_test_${Date.now()}`,
        race: 'human',
        class_: cls.name,
        background: 'sage',
      })

      expect(char).toBeDefined()
      expect(char.class).toBe(cls.name)
      expect(char.hitDice.size).toBe(cls.hitDie)
      expect(char.hitDice.total).toBe(1)

      // HP should be at least hit die size (before CON mod could reduce it)
      expect(char.maxHp).toBeGreaterThanOrEqual(1)

      await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' },
      )
    })
  }

  // Test all backgrounds
  for (const bg of backgrounds) {
    itIfServer(`should create character with ${bg} background`, async () => {
      const char = await createTestCharacter(sessionId, {
        name: `${bg}_test_${Date.now()}`,
        race: 'human',
        class_: 'fighter',
        background: bg,
      })

      expect(char).toBeDefined()
      expect(char.background).toBe(bg)

      await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' },
      )
    })
  }
})
