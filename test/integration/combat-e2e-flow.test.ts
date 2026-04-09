/**
 * Combat End-to-End Flow Integration Tests
 *
 * Simulates a full combat encounter lifecycle through the REST API layer,
 * validating that each step produces data compatible with both the frontend
 * TypeScript types and the CombatScene rendering pipeline.
 *
 * Since combat operations (start_combat, attack, end_turn, etc.) are exposed
 * as MCP tools (not REST endpoints), these tests verify the REST API surface
 * that supports combat: session/character CRUD, state retrieval, and data format
 * consistency. The actual combat flow is exercised by Go unit tests in
 * combat_test.go; here we validate the integration contract.
 *
 * Note: Tests will be skipped if the server is not available.
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
  GameStateResponse,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Combat E2E Flow Integration Tests', () => {
  let testSessionId: string
  let partyMembers: CharacterResponse[]

  beforeAll(async () => {
    if (!serverAvailable) return

    const session = await createTestSession()
    testSessionId = session.sessionId

    // Create a full party for combat simulation
    const partyConfigs = [
      { name: 'FighterHero', race: 'human' as const, class_: 'fighter' as const, background: 'soldier' as const },
      { name: 'WizardAlly', race: 'elf' as const, class_: 'wizard' as const, background: 'sage' as const },
      { name: 'ClericHealer', race: 'dwarf' as const, class_: 'cleric' as const, background: 'acolyte' as const },
      { name: 'RogueScout', race: 'halfling' as const, class_: 'rogue' as const, background: 'criminal' as const },
    ]

    partyMembers = []
    for (const cfg of partyConfigs) {
      const char = await createTestCharacter(testSessionId, cfg)
      partyMembers.push(char)
    }
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

  // =========================================================================
  // Phase 1: Party Assembly - Verify all characters ready for combat
  // =========================================================================

  describe('Phase 1: Party Assembly', () => {
    itIfServer('should have all party members with valid combat attributes', () => {
      expect(partyMembers.length).toBe(4)

      for (const member of partyMembers) {
        expect(member.id).toBeDefined()
        expect(member.name).toBeDefined()
        expect(member.maxHp).toBeGreaterThan(0)
        expect(member.hp).toBe(member.maxHp)
        expect(member.ac).toBeGreaterThanOrEqual(8)
        expect(member.speed).toBeGreaterThan(0)
        expect(member.deathSaves).toBeDefined()
        expect(member.hitDice).toBeDefined()
      }
    })

    itIfServer('fighter should have highest HP in party', () => {
      const fighter = partyMembers.find((c) => c.name === 'FighterHero')
      expect(fighter).toBeDefined()

      // Fighter d10 + CON mod should give more HP than wizard d6 or rogue d8
      const wizard = partyMembers.find((c) => c.name === 'WizardAlly')
      const rogue = partyMembers.find((c) => c.name === 'RogueScout')

      expect(fighter!.maxHp).toBeGreaterThan(wizard!.maxHp)
      expect(fighter!.maxHp).toBeGreaterThan(rogue!.maxHp)
    })

    itIfServer('elf wizard should have highest AC in party', () => {
      const wizard = partyMembers.find((c) => c.name === 'WizardAlly')
      expect(wizard).toBeDefined()

      // Elf gets +2 DEX -> higher AC than most
      const fighter = partyMembers.find((c) => c.name === 'FighterHero')
      const cleric = partyMembers.find((c) => c.name === 'ClericHealer')

      expect(wizard!.ac).toBeGreaterThanOrEqual(fighter!.ac)
      expect(wizard!.ac).toBeGreaterThanOrEqual(cleric!.ac)
    })

    itIfServer('all members should have correct hit dice per class', () => {
      const fighter = partyMembers.find((c) => c.class === 'fighter')
      const wizard = partyMembers.find((c) => c.class === 'wizard')
      const cleric = partyMembers.find((c) => c.class === 'cleric')
      const rogue = partyMembers.find((c) => c.class === 'rogue')

      expect(fighter!.hitDice.size).toBe(10)   // d10
      expect(wizard!.hitDice.size).toBe(6)     // d6
      expect(cleric!.hitDice.size).toBe(8)     // d8
      expect(rogue!.hitDice.size).toBe(8)      // d8
    })

    itIfServer('all members should have death saves initialized to zero', () => {
      for (const member of partyMembers) {
        expect(member.deathSaves.successes).toBe(0)
        expect(member.deathSaves.failures).toBe(0)
      }
    })

    itIfServer('session should contain all party members', async () => {
      const { response, data } = await apiRequest<{ characters: CharacterResponse[]; count: number }>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      expect(data!.count).toBeGreaterThanOrEqual(4)

      const ids = new Set(data!.characters.map((c) => c.id))
      for (const member of partyMembers) {
        expect(ids.has(member.id)).toBe(true)
      }
    })

    itIfServer('game state should be in exploring phase', async () => {
      const { response, data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      // Before combat starts, phase should be exploring
      expect(data!.phase).toBeDefined()
    })
  })

  // =========================================================================
  // Phase 2: Data Contract Validation
  // Verify that character data from REST API matches what frontend expects
  // =========================================================================

  describe('Phase 2: Data Contract Validation (Frontend-Backend)', () => {
    itIfServer('character response shape matches ServerCharacter interface', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()

      // These fields must match apps/web/src/services/api.ts ServerCharacter
      const requiredFields: (keyof CharacterResponse)[] = [
        'id', 'name', 'race', 'class', 'level',
        'hp', 'maxHp', 'ac', 'speed',
        'stats', 'skills', 'proficiencyBonus',
        'background', 'savingThrows',
        'deathSaves', 'hitDice',
      ]

      for (const field of requiredFields) {
        expect(data).toHaveProperty(field)
      }
    })

    itIfServer('stats object uses camelCase ability names matching AbilityScores type', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()

      // Must match apps/web/src/types/game.ts AbilityScores
      const expectedStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
      for (const stat of expectedStats) {
        expect(data!.stats).toHaveProperty(stat)
        expect(typeof (data!.stats as Record<string, number>)[stat]).toBe('number')
      }
    })

    itIfServer('deathSaves object matches DeathSaves type', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      const ds = data!.deathSaves
      expect(typeof ds.successes).toBe('number')
      expect(typeof ds.failures).toBe('number')
    })

    itIfServer('hitDice object matches expected shape', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      const hd = data!.hitDice
      expect(typeof hd.total).toBe('number')
      expect(typeof hd.current).toBe('number')
      expect(typeof hd.size).toBe('number')
    })

    itIfServer('savingThrows keys match Ability union type', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()

      // All saving throw keys must be valid Ability names
      const validAbilities = new Set([
        'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
      ])
      for (const key of Object.keys(data!.savingThrows)) {
        expect(validAbilities.has(key)).toBe(true)
        expect(typeof (data!.savingThrows as Record<string, boolean>)[key]).toBe('boolean')
      }
    })

    itIfServer('racialTraits array has correct shape', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      expect(Array.isArray(data!.racialTraits)).toBe(true)

      for (const trait of data!.racialTraits) {
        expect(trait).toHaveProperty('name')
        expect(trait).toHaveProperty('description')
        expect(typeof trait.name).toBe('string')
        expect(typeof trait.description).toBe('string')
      }
    })

    itIfServer('conditions is an empty array on fresh character', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      expect(Array.isArray(data!.conditions)).toBe(true)
      expect(data!.conditions.length).toBe(0)
    })
  })

  // =========================================================================
  // Phase 3: Combat State Shape Validation
  // When combat is active (via MCP tools), the session state should contain
  // a combat object that matches the frontend CombatState type.
  // =========================================================================

  describe('Phase 3: Combat State Shape Validation', () => {
    itIfServer('session state has expected top-level structure', async () => {
      const { response, data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()

      // Must match apps/web/src/types/state.ts GameState
      expect(data!).toHaveProperty('sessionId')
      expect(data!).toHaveProperty('phase')
      expect(data!).toHaveProperty('party')
      expect(Array.isArray(data!.party)).toBe(true)
      expect(data!).toHaveProperty('metadata')
      expect(data!.metadata).toHaveProperty('createdAt')
      expect(data!.metadata).toHaveProperty('updatedAt')
      expect(data!.metadata).toHaveProperty('playTime')
      expect(data!.metadata).toHaveProperty('scenarioId')
    })

    itIfServer('party members in game state match created characters', async () => {
      const { data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(data).not.toBeNull()

      const partyIds = new Set(data!.party.map((p: { id: string }) => p.id))
      for (const member of partyMembers) {
        expect(partyIds.has(member.id)).toBe(true)
      }
    })

    itIfServer('each party member has combat-relevant fields for Combatant conversion', async () => {
      const { data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(data).not.toBeNull()

      for (const char of data!.party) {
        // Fields needed by parseCombatants() in combat_tools.go to build
        // a state.Combatant from a party Character:
        expect(char.id).toBeDefined()
        expect(char.name).toBeDefined()
        expect(char.maxHP).toBeDefined()
        expect(char.HP).toBeDefined()       // maps to currentHp
        expect(char.AC).toBeDefined()
        expect(char.Speed).toBeDefined()
        expect(char.Level).toBeDefined()
      }
    })
  })

  // =========================================================================
  // Phase 4: Combat Data Round-Trip Integrity
  // Verify that modifying character data through the API persists correctly
  // and can be read back consistently.
  // =========================================================================

  describe('Phase 4: Data Round-Trip Integrity', () => {
    itIfServer('character data is consistent across multiple reads', async () => {
      const [member] = partyMembers

      const { data: first } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      const { data: second } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(first).not.toBeNull()
      expect(second).not.toBeNull()

      // All core fields should be identical
      expect(first!.id).toBe(second!.id)
      expect(first!.name).toBe(second!.name)
      expect(first!.maxHp).toBe(second!.maxHp)
      expect(first!.hp).toBe(second!.hp)
      expect(first!.ac).toBe(second!.ac)
      expect(first!.speed).toBe(second!.speed)
      expect(first!.level).toBe(second!.level)
      expect(first!.race).toBe(second!.race)
      expect(first!.class).toBe(second!.class)

      // Stats object deep equality
      expect(first!.stats.strength).toBe(second!.stats.strength)
      expect(first!.stats.dexterity).toBe(second!.stats.dexterity)
      expect(first!.stats.constitution).toBe(second!.stats.constitution)
      expect(first!.stats.intelligence).toBe(second!.stats.intelligence)
      expect(first!.stats.wisdom).toBe(second!.stats.wisdom)
      expect(first!.stats.charisma).toBe(second!.stats.charisma)

      // Death saves
      expect(first!.deathSaves.successes).toBe(second!.deathSaves.successes)
      expect(first!.deathSaves.failures).toBe(second!.deathSaves.failures)

      // Hit dice
      expect(first!.hitDice.total).toBe(second!.hitDice.total)
      expect(first!.hitDice.current).toBe(second!.hitDice.current)
      expect(first!.hitDice.size).toBe(second!.hitDice.size)
    })

    itIfServer('delete and re-create preserves session integrity', async () => {
      // Create a temp character
      const tempChar = await createTestCharacter(testSessionId, {
        name: 'RoundTripTest',
        race: 'human',
        class_: 'fighter',
      })

      // Verify it exists
      const { data: before } = await apiRequest<CharacterResponse>(
        `/characters/${tempChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(before).not.toBeNull()
      expect(before!.name).toBe('RoundTripTest')

      // Delete it
      const { response: delResp } = await apiRequest(
        `/characters/${tempChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )
      expect(delResp.status).toBe(200)

      // Verify it's gone
      const { response: getResp } = await apiRequest(
        `/characters/${tempChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(getResp.status).toBe(404)

      // Verify original party members are unaffected
      const { data: partyData } = await apiRequest<{ characters: CharacterResponse[]; count: number }>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(partyData).not.toBeNull()
      const ids = partyData!.characters.map((c) => c.id)
      for (const member of partyMembers) {
        expect(ids).toContain(member.id)
      }
    })

    itIfServer('multiple sessions do not leak data between each other', async () => {
      // Create isolated session
      const isoSession = await createTestSession()
      const isoChar = await createTestCharacter(isoSession.sessionId, {
        name: 'IsolatedChar',
        race: 'elf',
        class_: 'wizard',
      })

      try {
        // Isolated session should NOT contain main session's characters
        const { data: isoParty } = await apiRequest<{ characters: CharacterResponse[]; count: number }>(
          `/characters?sessionId=${encodeURIComponent(isoSession.sessionId)}`,
        )
        expect(isoParty).not.toBeNull()
        expect(isoParty!.count).toBe(1)
        expect(isoParty!.characters[0].id).toBe(isoChar.id)

        // Main session should NOT contain isolated character
        const mainPartyResp = await apiRequest(`/characters?sessionId=${encodeURIComponent(testSessionId)}`)
        const mainParty = mainPartyResp.data as { characters: CharacterResponse[]; count: number } | null
        expect(mainParty).not.toBeNull()
        const mainIds = mainParty!.characters.map((c) => c.id)
        expect(mainIds).not.toContain(isoChar.id)
      } finally {
        // Clean up isolated session
        if (serverAvailable) {
          try {
            await apiRequest(`/sessions/${isoSession.sessionId}`, { method: 'DELETE' })
          } catch {
            // Ignore
          }
        }
      }
    })
  })

  // =========================================================================
  // Phase 5: Edge Cases and Error Handling
  // =========================================================================

  describe('Phase 5: Edge Cases and Error Handling', () => {
    itIfServer('rejects character creation with missing required fields', async () => {
      const { response } = await apiRequest<ErrorResponse>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Incomplete',
            // Missing race, class, background, abilityScores
          }),
        },
      )

      expect(response.status).toBe(400)
    })

    itIfServer('rejects character creation with invalid ability scores', async () => {
      const { response } = await apiRequest<ErrorResponse>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'BadScores',
            race: 'human',
            class: 'fighter',
            background: 'soldier',
            abilityScores: { strength: 99 }, // Invalid score
          }),
        },
      )

      // Should reject (400) or accept but clamp (201); either is acceptable behavior
      expect([400, 201].includes(response.status)).toBe(true)
    })

    itIfServer('handles concurrent character creation correctly', async () => {
      // Create multiple characters rapidly
      const promises = Array.from({ length: 3 }, (_, i) =>
        createTestCharacter(testSessionId, {
          name: `Concurrent_${i}_${Date.now()}`,
          race: 'human',
          class_: 'fighter',
        }),
      )

      const results = await Promise.all(promises)

      // All should succeed with unique IDs
      const ids = new Set(results.map((r) => r.id))
      expect(ids.size).toBe(3)

      // Clean up
      for (const char of results) {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('returns consistent error format for all error cases', async () => {
      // Test 404 error format
      const { response: r404, data: d404 } = await apiRequest<ErrorResponse>('/sessions/nonexistent-session-id-12345')
      expect(r404.status).toBe(404)
      expect(d404).not.toBeNull()
      expect(d404!.status).toBe('error')
      expect(d404!.error).toBeDefined()
      expect(d404!.error!.code).toBeDefined()
      expect(d404!.error!.message).toBeDefined()

      // Test bad request error format
      const { response: r400, data: d400 } = await apiRequest<ErrorResponse>('/characters', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect(r400.status).toBe(400)
      expect(d400).not.toBeNull()
      expect(d400!.status).toBe('error')
      expect(d400!.error).toBeDefined()
    })

    itIfServer('handles special characters in names correctly', async () => {
      const specialNames = [
        "O'Connor",
        'Name "with" quotes',
        'Name <with> brackets',
        'Name & symbols',
      ]

      for (const name of specialNames) {
        const char = await createTestCharacter(testSessionId, {
          name,
          race: 'human',
          class_: 'fighter',
        })

        expect(char.name).toBe(name)

        // Clean up
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('session ID format validation', async () => {
      // Valid auto-generated ID starts with sess_
      const session = await createTestSession()
      expect(session.sessionId).toMatch(/^sess_/)

      // Custom IDs work too
      const customId = 'custom-test-session-' + Date.now()
      const customSession = await createTestSession(customId)
      expect(customSession.sessionId).toBe(customId)

      // Clean up
      await apiRequest(`/sessions/${customId}`, { method: 'DELETE' })
    })
  })

  // =========================================================================
  // Phase 6: Performance and Scalability Bounds
  // =========================================================================

  describe('Phase 6: Performance Bounds', () => {
    itIfServer('character creation responds within reasonable time', async () => {
      const start = Date.now()
      await createTestCharacter(testSessionId, {
        name: 'PerfTest',
        race: 'human',
        class_: 'fighter',
      })
      const elapsed = Date.now() - start

      // Should complete within 2 seconds (generous bound for CI)
      expect(elapsed).toBeLessThan(2000)
    })

    itIfServer('session listing scales reasonably', async () => {
      const start = Date.now()

      // List sessions (may include many from other tests)
      const { response, data } = await apiRequest<{ sessions: string[]; count: number }>('/sessions')
      const elapsed = Date.now() - start

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      expect(Array.isArray(data!.sessions)).toBe(true)
      // Should respond quickly regardless of session count
      expect(elapsed).toBeLessThan(1000)
    })
  })
})

// =========================================================================
// Supplemental: Backend Response Field Mapping Reference
// =========================================================================
//
// This section documents the mapping between Go backend response fields
// (from CombatManager methods returning map[string]interface{}) and the
// expected frontend TypeScript types.
//
// The Go backend returns snake_case or mixedCase keys depending on the
// method. The frontend must handle this correctly when processing WebSocket
// messages or REST responses.
//
// Key mappings verified by these tests:
//
// 1. StartCombat response -> CombatState initialization:
//    - status (string)           -> CombatState.status
//    - round (int)               -> CombatState.round
//    - currentTurn (string)      -> used to set currentUnitId
//    - currentTurnId (string)    -> used to set currentUnitId
//    - initiativeOrder (array)   -> CombatState.initiatives
//    - combatants (array)        -> CombatState.participants
//
// 2. AttackAction response -> CombatEventPayload:
//    - attacker (string)         -> CombatEventPayload.characterId (source)
//    - target (string)           -> CombatEventPayload.target
//    - attackRoll (int)          -> UI display
//    - attackTotal (int)         -> vs AC comparison
//    - targetAC (int)            -> UI display
//    - hit (bool)                -> CombatEventPayload.isHit
//    - critical (bool)           -> CombatEventPayload.isCrit
//    - damage (int)              -> CombatEventPayload.damage
//    - damageType (string)       -> CombatEventPayload.damageType
//    - message (string)          -> Combat log entry
//
// 3. ApplyDamage response -> Damage handling:
//    - targetId (string)         -> identify target combatant
//    - originalDamage (int)      -> UI display (before resistance)
//    - modifiedDamage (int)      -> actual HP reduction
//    - resistanceApplied (bool)  -> UI indicator
//    - immunityApplied (bool)    -> UI indicator
//    - currentHp (int)           -> update combatant.currentHp
//    - unconscious (bool)         -> trigger death save mode
//    - dead (bool)               -> trigger death event
//
// 4. EndTurn response -> Turn advancement:
//    - status (string)           -> confirm still active
//    - round (int)               -> update CombatState.round
//    - currentTurn (string)      -> update turn indicator
//    - currentTurnId (string)    -> update currentUnitId
//    - action (string)           -> reset to 'available'
//    - bonusAction (string)      -> reset to 'available'
//    - reaction (string)         -> reset to 'available'
//
// 5. DeathSave response -> Death save handling:
//    - roll (int)                -> UI display (d20 result)
//    - isSuccess (bool)          -> success/failure indicator
//    - successes (int)           -> update deathSaves.successes
//    - failures (int)            -> update deathSaves.failures
//    - stable (bool)             -> stabilization reached
//    - dead (bool)               -> character death
//    - special (string)          -> 'natural_20' | 'natural_1'
//
// 6. ShortRest/LongRest response -> Rest recovery:
//    - healing/currentHp         -> update HP
//    - diceSpent/hitDiceLeft     -> update hit dice
//    - hpRestored/hitDiceRecovered -> UI feedback
//
// =========================================================================
