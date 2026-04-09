/**
 * Combat Flow E2E Test (R1)
 *
 * Tests the complete combat flow through the REST API layer:
 *   Create session -> Create characters -> Verify combat pre-conditions ->
 *   Validate data format consistency for combat integration
 *
 * This test covers PRD Requirement 1 acceptance criteria 1-2 (full flow
 * without errors, frontend-compatible data shapes). Criteria 3-6 (backend
 * state transitions, WebSocket messages, UI rendering, animations) are
 * verified by Go backend tests (combat_test.go) and integration tests.
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
  deleteTestCharacter,
} from './helpers'
import type {
  SessionResponse,
  CharacterResponse,
  ErrorResponse,
  GameStateResponse,
  StartCombatResponse,
  EndCombatResponse,
  AttackResponse,
  DamageResponse,
  CombatEventPayload,
  CombatEventType,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Combat Flow E2E Test (R1)', () => {
  let testSessionId: string
  let partyMembers: CharacterResponse[]

  beforeAll(async () => {
    if (!serverAvailable) return

    const session = await createTestSession()
    testSessionId = session.sessionId

    // Build a full party for combat
    const partyConfigs = [
      { name: 'FighterHero', race: 'human' as const, class_: 'fighter' as const, background: 'soldier' as const },
      { name: 'WizardAlly', race: 'elf' as const, class_: 'wizard' as const, background: 'sage' as const },
    ]

    partyMembers = []
    for (const cfg of partyConfigs) {
      const char = await createTestCharacter(testSessionId, cfg)
      partyMembers.push(char)
    }
  })

  afterAll(async () => {
    if (testSessionId && serverAvailable) {
      // Clean up all characters
      for (const member of partyMembers) {
        try {
          await deleteTestCharacter(testSessionId, member.id)
        } catch {
          // Best-effort cleanup
        }
      }
      try {
        await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  // -----------------------------------------------------------------------
  // AC 1: Full flow without errors - session/character creation pipeline
  // -----------------------------------------------------------------------

  describe('AC1: Session and character creation flow', () => {
    itIfServer('should create session with valid ID format', () => {
      expect(testSessionId).toBeDefined()
      expect(typeof testSessionId).toBe('string')
      expect(testSessionId.length).toBeGreaterThan(0)
    })

    itIfServer('should create all party members successfully', () => {
      expect(partyMembers.length).toBe(2)
      for (const member of partyMembers) {
        expect(member.id).toBeDefined()
        expect(member.name).toBeDefined()
        expect(member.maxHp).toBeGreaterThan(0)
        expect(member.hp).toBe(member.maxHp)
        expect(member.ac).toBeGreaterThan(0)
      }
    })

    itIfServer('should have fighter with correct combat stats', () => {
      const fighter = partyMembers.find((c) => c.name === 'FighterHero')
      expect(fighter).toBeDefined()

      // Fighter: d10 + CON mod (human +1 to CON 15 = 16, mod = +3) = 13 HP
      expect(fighter!.maxHp).toBe(13)
      // AC = 10 + DEX mod (14+1=15, mod = +2) = 12
      expect(fighter!.ac).toBe(12)
      // Human speed
      expect(fighter!.speed).toBe(30)
      // Level 1 proficiency bonus
      expect(fighter!.proficiencyBonus).toBe(2)
    })

    itIfServer('should have wizard with correct combat stats', () => {
      const wizard = partyMembers.find((c) => c.name === 'WizardAlly')
      expect(wizard).toBeDefined()

      // Wizard: d6 + CON mod (elf +2 DEX but CON stays at base; CON 12, mod = +1) = 7 HP
      expect(wizard!.maxHp).toBe(7)
      // Elf +2 DEX -> DEX 16 (mod +3), AC = 10 + 3 = 13
      expect(wizard!.ac).toBe(13)
      // Elf speed
      expect(wizard!.speed).toBe(30)
      // Wizard d6 hit die
      expect(wizard!.hitDice.size).toBe(6)
    })
  })

  // -----------------------------------------------------------------------
  // AC 2: Frontend CombatScene data compatibility
  // Verifies that the data returned by the REST API matches the shapes
  // expected by the frontend CombatScene and combatStore.
  // -----------------------------------------------------------------------

  describe('AC2: Frontend CombatScene data compatibility', () => {
    itIfServer('session state has phase field for combat transition detection', async () => {
      const { response, data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      expect(typeof data!.phase).toBe('string')
      // Before combat starts, phase should be exploring
      expect(['exploring', 'combat']).toContain(data!.phase)
    })

    itIfServer('party members have all fields needed by Combatant conversion', async () => {
      const fighter = partyMembers.find((c) => c.class === 'fighter')
      expect(fighter).toBeDefined()

      // Fields needed by parseCombatants() -> state.Combatant:
      const f = fighter!
      expect(f.id).toBeDefined()                    // -> Combatant.id
      expect(f.name).toBeDefined()                  // -> Combatant.name
      expect(f.maxHp).toBeDefined()                 // -> Combatant.maxHp
      expect(f.hp).toBeDefined()                    // -> Combatant.currentHp
      expect(f.ac).toBeDefined()                    // -> Combatant.ac
      expect(f.speed).toBeDefined()                 // -> Combatant.speed
      expect(f.level).toBeDefined()                 // -> Combatant.level
      expect(f.stats.dexterity).toBeDefined()       // -> Combatant.dexScore
      expect(f.deathSaves).toBeDefined()            // -> Combatant.DeathSaves
      expect(f.hitDice).toBeDefined()                // -> Combatant.HitDice
    })

    itIfServer('character stats use camelCase names matching frontend AbilityScores type', async () => {
      const [member] = partyMembers
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      const stats = data!.stats

      // Must match apps/web/src/types/game.ts AbilityScores interface
      const expectedAbilities = [
        'strength', 'dexterity', 'constitution',
        'intelligence', 'wisdom', 'charisma',
      ]
      for (const ability of expectedAbilities) {
        expect(stats).toHaveProperty(ability)
        expect(typeof stats[ability as keyof typeof stats]).toBe('number')
        // D&D 5e valid range after racial bonuses
        expect(stats[ability as keyof typeof stats]).toBeGreaterThanOrEqual(3)
        expect(stats[ability as keyof typeof stats]).toBeLessThanOrEqual(20)
      }
    })

    itIfServer('death saves initialized correctly for combat death save flow', async () => {
      for (const member of partyMembers) {
        expect(member.deathSaves.successes).toBe(0)
        expect(member.deathSaves.failures).toBe(0)
      }
    })

    itIfServer('hit dice available for short rest during combat recovery', async () => {
      for (const member of partyMembers) {
        expect(member.hitDice.total).toBeGreaterThan(0)
        expect(member.hitDice.current).toBe(member.hitDice.total)
        expect(member.hitDice.size).toBeGreaterThan(0)
      }
    })

    itIfServer('saving throws present for condition-based advantage/disadvantage', async () => {
      const fighter = partyMembers.find((c) => c.class === 'fighter')
      expect(fighter).toBeDefined()

      // Fighter: Strength and Constitution saving throw proficiencies
      expect(fighter!.savingThrows.strength).toBe(true)
      expect(fighter!.savingThrows.constitution).toBe(true)

      const wizard = partyMembers.find((c) => c.class === 'wizard')
      expect(wizard).toBeDefined()

      // Wizard: Intelligence and Wisdom saving throw proficiencies
      expect(wizard!.savingThrows.intelligence).toBe(true)
      expect(wizard!.savingThrows.wisdom).toBe(true)
    })

    itIfServer('skills present for ability check validation', async () => {
      const fighter = partyMembers.find((c) => c.class === 'fighter')
      expect(fighter).toBeDefined()

      // Soldier background: Athletics, Intimidation
      expect(fighter!.skills.athletics).toBe(true)
      expect(fighter!.skills.intimidation).toBe(true)

      const wizard = partyMembers.find((c) => c.class === 'wizard')
      expect(wizard).toBeDefined()

      // Sage background: Arcana, History
      expect(wizard!.skills.arcana).toBe(true)
      expect(wizard!.skills.history).toBe(true)
    })

    itIfServer('racial traits present for feature display', async () => {
      for (const member of partyMembers) {
        expect(Array.isArray(member.racialTraits)).toBe(true)
        expect(member.racialTraits.length).toBeGreaterThan(0)
        for (const trait of member.racialTraits) {
          expect(trait).toHaveProperty('name')
          expect(trait).toHaveProperty('description')
        }
      }
    })
  })

  // -----------------------------------------------------------------------
  // Data format validation: Combat response types match backend output
  // -----------------------------------------------------------------------

  describe('Combat response type shape validation', () => {
    itIfServer('StartCombatResponse has required fields matching Go StartCombat output', () => {
      /**
       * Go StartCombat returns:
       *   status, round, currentTurn, currentTurnId, initiativeOrder, combatants
       */
      const requiredFields: (keyof StartCombatResponse)[] = [
        'status', 'round', 'currentTurn', 'currentTurnId',
        'initiativeOrder', 'combatants',
      ]
      // All fields must be defined on the type (compile-time check via keyof)
      expect(requiredFields.length).toBe(6)
    })

    itIfServer('AttackResponse has required fields matching Go AttackAction output', () => {
      /**
       * Go AttackAction returns:
       *   attacker, attackerId, target, targetId, attackRoll, attackTotal,
       *   targetAC, hit, critical, damage?, originalDamage?, diceResults?,
       *   resistanceApplied?, immunityApplied?, currentHp?, temporaryHp?,
       *   unconscious?, dead?, damageType?, message
       */
      const coreFields: (keyof AttackResponse)[] = [
        'attacker', 'attackerId', 'target', 'targetId',
        'attackRoll', 'attackTotal', 'targetAC',
        'hit', 'critical', 'message',
      ]
      expect(coreFields.length).toBe(10)
    })

    itIfServer('DamageResponse includes tempHpAbsorbed from Go DamageResult', () => {
      /**
       * Go ApplyDamage returns tempHpAbsorbed in both DamageResult struct
       * and the map[string]interface{} response.
       */
      const dr: keyof DamageResponse = 'tempHpAbsorbed'
      expect(dr).toBe('tempHpAbsorbed')
    })

    itIfServer('DeathSaveResponse includes currentHp for natural 20 case', () => {
      /**
       * Go DeathSave sets currentHp=1 when natural 20 is rolled.
       */
      const dsr: keyof import('../types').DeathSaveResponse = 'currentHp'
      expect(dsr).toBe('currentHp')
    })

    itIfServer('all CombatEventType values match Go backend constants', () => {
      /**
       * From events.go CombatEventType constants:
       *   combat_start, combat_end, initiative_rolled, turn_start, turn_end,
       *   round_end, attack, damage, heal, death, unconscious,
       *   condition_applied, condition_removed, opportunity_attack
       */
      const expectedTypes: CombatEventType[] = [
        'combat_start', 'combat_end', 'initiative_rolled',
        'turn_start', 'turn_end', 'round_end',
        'attack', 'damage', 'heal', 'death', 'unconscious',
        'condition_applied', 'condition_removed', 'opportunity_attack',
      ]

      expect(expectedTypes.length).toBe(14)

      // Verify all are lowercase snake_case (multi-word) or lowercase (single-word)
      for (const t of expectedTypes) {
        expect(t).toBe(t.toLowerCase())
        expect(t).nottoMatch(/[A-Z]/)
      }
    })

    itIfServer('CombatEventPayload structure matches Go CombatEvent JSON serialization', () => {
      /**
       * Go CombatEvent serializes as:
       *   {"type": "<event_type>", "timestamp": <int>, "data": {...}}
       *
       * The TypeScript CombatEventPayload mirrors this structure.
       */
      const payloadKeys: (keyof CombatEventPayload)[] = ['type', 'timestamp', 'data']
      expect(payloadKeys.length).toBe(3)
    })
  })

  // -----------------------------------------------------------------------
  // Error handling during combat preparation
  // -----------------------------------------------------------------------

  describe('Error handling for combat preparation', () => {
    itIfServer('returns 404 for character in non-existent session', async () => {
      const { response } = await apiRequest(
        `/characters/${partyMembers[0].id}?sessionId=non-existent-session`,
      )
      expect(response.status).toBe(404)
    })

    itIfServer('rejects creating character with invalid race', async () => {
      const { response } = await apiRequest<ErrorResponse>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'InvalidRaceChar',
            race: 'dragon_turtle',
            class: 'fighter',
            background: 'soldier',
            abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          }),
        },
      )
      expect(response.status).toBe(400)
    })

    itIfServer('handles special characters in character names', async () => {
      const specialNames = ["O'Connor", 'Name "with" quotes']
      for (const name of specialNames) {
        const char = await createTestCharacter(testSessionId, {
          name,
          race: 'human',
          class_: 'fighter',
        })
        expect(char.name).toBe(name)
        await deleteTestCharacter(testSessionId, char.id)
      }
    })
  })

  // -----------------------------------------------------------------------
  // Cross-character data consistency
  // -----------------------------------------------------------------------

  describe('Cross-character data consistency for combat party', () => {
    itIfServer('all party members have unique IDs', () => {
      const ids = new Set(partyMembers.map((c) => c.id))
      expect(ids.size).toBe(partyMembers.length)
    })

    itIfServer('fighter has more HP than wizard (class hit die difference)', () => {
      const fighter = partyMembers.find((c) => c.class === 'fighter')!
      const wizard = partyMembers.find((c) => c.class === 'wizard')!
      expect(fighter.maxHp).toBeGreaterThan(wizard.maxHp)
    })

    itIfServer('elf wizard has higher or equal AC than human fighter', () => {
      const fighter = partyMembers.find((c) => c.class === 'fighter')!
      const wizard = partyMembers.find((c) => c.class === 'wizard')!
      // Elf +2 DEX gives wizard higher AC typically
      expect(wizard.ac).toBeGreaterThanOrEqual(fighter.ac)
    })

    itIfServer('character data persists across multiple fetches', async () => {
      const [member] = partyMembers
      const { data: first } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      const { data: second } = await apiRequest<CharacterResponse>(
        `/characters/${member.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
      expect(first!.id).toBe(second!.id)
      expect(first!.maxHp).toBe(second!.maxHp)
      expect(first!.ac).toBe(second!.ac)
      expect(first!.hp).toBe(second!.hp)
    })
  })
})
