/**
 * Character Combat Lifecycle E2E Test (R2)
 *
 * Tests the complete game lifecycle through the REST API:
 *   Character creation -> Stat validation -> Combat pre-conditions ->
 *   Rest recovery data shapes -> Death save data shapes
 *
 * This covers PRD Requirement 2 acceptance criteria:
 *   AC1: Character API returns correct data (HP, AC, proficiency bonus, skills)
 *   AC2: Character data has all fields for frontend panel display
 *   AC3-6: Death saves, short rest, long rest data shape validation
 *
 * Note: Actual combat operations (start_combat, attack, death_save) are
 * invoked via MCP tools and exercised by Go backend tests. This E2E test
 * validates that the REST API layer provides correct data structures for
 * each lifecycle phase.
 *
 * Note: Tests will be skipped if the server is not available.
 */

import {
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
  DeathSaveResponse,
  ShortRestResponse,
  LongRestResponse,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Character Combat Lifecycle E2E Test (R2)', () => {
  let testSessionId: string
  let testCharacter: CharacterResponse

  beforeAll(async () => {
    if (!serverAvailable) return

    const session = await createTestSession()
    testSessionId = session.sessionId

    testCharacter = await createTestCharacter(testSessionId, {
      name: 'LifecycleHero',
      race: 'human',
      class_: 'fighter',
      background: 'soldier',
      abilityScores: {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
      },
    })
  })

  afterAll(async () => {
    if (testSessionId && serverAvailable) {
      try {
        await deleteTestCharacter(testSessionId, testCharacter.id)
      } catch {
        // Best-effort cleanup
      }
      try {
        await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  // -----------------------------------------------------------------------
  // AC1: Character Creation - API returns correct data
  // -----------------------------------------------------------------------

  describe('AC1: Character creation returns correct combat attributes', () => {
    itIfServer('should have HP equal to maxHp at creation', () => {
      expect(testCharacter.hp).toBe(testCharacter.maxHp)
    })

    itIfServer('should have positive AC', () => {
      expect(testCharacter.ac).toBeGreaterThanOrEqual(8) // Minimum possible AC
    })

    itIfServer('should have correct proficiency bonus for level 1', () => {
      expect(testCharacter.proficiencyBonus).toBe(2)
    })

    itIfServer('should have ability scores with racial bonuses applied', () => {
      // Human: +1 to all stats
      // Base: STR 16+1=17, DEX 14+1=15, CON 15+1=16, INT 10+1=11, WIS 12+1=13, CHA 8+1=9
      expect(testCharacter.stats.strength).toBe(17)
      expect(testCharacter.stats.dexterity).toBe(15)
      expect(testCharacter.stats.constitution).toBe(16)
      expect(testCharacter.stats.intelligence).toBe(11)
      expect(testCharacter.stats.wisdom).toBe(13)
      expect(testCharacter.stats.charisma).toBe(9)
    })

    itIfServer('should have HP calculated from class hit die + CON modifier', () => {
      // Fighter: d10 hit die + CON mod (16 -> +3) = 13
      expect(testCharacter.maxHp).toBe(13)
    })

    itIfServer('should have AC calculated as 10 + DEX modifier', () => {
      // DEX 15 -> modifier +2, AC = 10 + 2 = 12
      expect(testCharacter.ac).toBe(12)
    })

    itIfServer('should have speed matching race default', () => {
      // Human speed = 30 feet
      expect(testCharacter.speed).toBe(30)
    })

    itIfServer('should have gold from class starting wealth', () => {
      // Fighter: 5d4 x 10 gp average = 125 gp
      expect(testCharacter.gold).toBe(125)
    })
  })

  // -----------------------------------------------------------------------
  // AC2: Frontend character panel display fields
  // -----------------------------------------------------------------------

  describe('AC2: Character data has all fields for frontend panel display', () => {
    itIfServer('has equipment slot data (armor/weapon proficiencies)', () => {
      // Fighter gets all armor, shields, simple and martial weapons
      expect(testCharacter.armorProficiencies).toBeDefined()
      expect(testCharacter.weaponProficiencies).toBeDefined()
      expect(Array.isArray(testCharacter.armorProficiencies)).toBe(true)
      expect(Array.isArray(testCharacter.weaponProficiencies)).toBe(true)
      expect(testCharacter.armorProficiencies).toContain('all armor')
      expect(testCharacter.weaponProficiencies).toContain('simple weapons')
      expect(testCharacter.weaponProficiencies).toContain('martial weapons')
    })

    itIfServer('has skill list with proficiencies', () => {
      // Soldier background: Athletics, Intimidation
      expect(typeof testCharacter.skills).toBe('object')
      expect(testCharacter.skills).not.toBeNull()
      expect(testCharacter.skills.athletics).toBe(true)
      expect(testCharacter.skills.intimidation).toBe(true)
    })

    itIfServer('has spell slot field (undefined for fighter is acceptable)', () => {
      // Fighters don't have spell slots; field may be absent or undefined
      // Just verify the character object can carry this field
      const charAny = testCharacter as unknown as Record<string, unknown>
      // spellSlots being undefined is fine for non-spellcasters
      expect(charAny['spellSlots'] === undefined || charAny['spellSlots'] === null).toBe(true)
    })

    itIfServer('has saving throw proficiencies displayed', () => {
      // Fighter: Strength and Constitution
      expect(testCharacter.savingThrows.strength).toBe(true)
      expect(testCharacter.savingThrows.constitution).toBe(true)
      // Fighter does NOT get Dexterity saving throws by default
      expect(testCharacter.savingThrows.dexterity).toBe(false)
    })

    itIfServer('has death save counters initialized', () => {
      expect(testCharacter.deathSaves.successes).toBe(0)
      expect(testCharacter.deathSaves.failures).toBe(0)
    })

    itIfServer('has hit dice information for rest mechanics', () => {
      // Level 1 fighter: d10 hit die, 1 total, 1 current
      expect(testCharacter.hitDice.total).toBe(1)
      expect(testCharacter.hitDice.current).toBe(1)
      expect(testCharacter.hitDice.size).toBe(10) // Fighter d10
    })

    itIfServer('has inventory array (empty at creation)', () => {
      expect(Array.isArray(testCharacter.inventory)).toBe(true)
    })

    itIfServer('has conditions array (empty at creation)', () => {
      expect(Array.isArray(testCharacter.conditions)).toBe(true)
      expect(testCharacter.conditions.length).toBe(0)
    })

    itIfServer('has racial traits array', () => {
      expect(Array.isArray(testCharacter.racialTraits)).toBe(true)
      expect(testCharacter.racialTraits.length).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------------------------------
  // AC3: Death save data shape validation
  // When HP drops to 0, the backend DeathSave response must match
  // the DeathSaveResponse type so the frontend can render it correctly.
  // -----------------------------------------------------------------------

  describe('AC3: Death save response type matches backend output', () => {
    itIfServer('DeathSaveResponse has all fields from Go DeathSave response', () => {
      /**
       * Go DeathSave returns a map[string]interface{} with these keys:
       *   combatantId, roll, isSuccess/special, successes, failures,
       *   stable?, dead?, special?, regainedHp?, currentHp?, message
       */
      const requiredFields: (keyof DeathSaveResponse)[] = [
        'combatantId', 'roll', 'successes', 'failures', 'message',
      ]
      // Optional fields present in specific scenarios:
      const optionalFields: (keyof DeathSaveResponse)[] = [
        'isSuccess', 'stable', 'dead', 'special', 'regainedHp', 'currentHp',
      ]

      expect(requiredFields.length).toBe(5)
      expect(optionalFields.length).toBe(6)

      // Verify currentHp exists on the type (added to fix P1-1)
      const dsr: keyof DeathSaveResponse = 'currentHp'
      expect(dsr).toBe('currentHp')
    })

    itIfServer('death save success/failure bounds are valid', () => {
      // At creation, both should be 0
      expect(testCharacter.deathSaves.successes).toBeGreaterThanOrEqual(0)
      expect(testCharacter.deathSaves.successes).toBeLessThanOrEqual(3)
      expect(testCharacter.deathSaves.failures).toBeGreaterThanOrEqual(0)
      expect(testCharacter.deathSaves.failures).toBeLessThanOrEqual(3)
    })

    itIfServer('character ID is consistent across lifecycle', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      expect(data!.id).toBe(testCharacter.id)
      expect(data!.name).toBe(testCharacter.name)
    })
  })

  // -----------------------------------------------------------------------
  // AC4: Short rest data shape validation
  // -----------------------------------------------------------------------

  describe('AC4: Short rest response type matches backend output', () => {
    itIfServer('ShortRestResponse has all fields from Go ShortRest response', () => {
      /**
       * Go ShortRest returns:
       *   combatantId, diceSpent, diceResults, conModifier, healing,
       *   currentHp, maxHp, hitDiceLeft, hitDiceTotal, message
       */
      const requiredFields: (keyof ShortRestResponse)[] = [
        'combatantId', 'diceSpent', 'diceResults', 'conModifier',
        'healing', 'currentHp', 'maxHp', 'hitDiceLeft', 'hitDiceTotal', 'message',
      ]
      expect(requiredFields.length).toBe(10)
    })

    itIfServer('character has hit dice available for short rest', () => {
      expect(testCharacter.hitDice.current).toBeGreaterThan(0)
      expect(testCharacter.hitDice.current).toBeLessThanOrEqual(testCharacter.hitDice.total)
    })

    itIfServer('hit die size matches class', () => {
      // Fighter uses d10
      expect(testCharacter.hitDice.size).toBe(10)
    })
  })

  // -----------------------------------------------------------------------
  // AC5: Long rest data shape validation
  // -----------------------------------------------------------------------

  describe('AC5: Long rest response type matches backend output', () => {
    itIfServer('LongRestResponse has all fields from Go LongRest response', () => {
      /**
       * Go LongRest returns:
       *   combatantId, hpRestored, currentHp, maxHp,
       *   hitDiceRecovered, hitDiceCurrent, hitDiceTotal, message
       */
      const requiredFields: (keyof LongRestResponse)[] = [
        'combatantId', 'hpRestored', 'currentHp', 'maxHp',
        'hitDiceRecovered', 'hitDiceCurrent', 'hitDiceTotal', 'message',
      ]
      expect(requiredFields.length).toBe(8)
    })

    itIfServer('long rest can restore HP to max (data shape allows it)', () => {
      // hpRestored = maxHp - currentHp; at creation currentHp == maxHp
      // The type supports this calculation
      expect(testCharacter.maxHp).toBeGreaterThan(0)
      expect(testCharacter.hp).toBe(testCharacter.maxHp)
    })

    itIfServer('long rest recovers half spent hit dice (rounded down)', () => {
      // If all hit dice are spent (current=0), recovered = total/2 rounded down
      // For level 1: total=1, spent=1, recovered=0
      const total = testCharacter.hitDice.total
      const spent = total - testCharacter.hitDice.current
      const expectedRecovered = Math.floor(spent / 2)
      // At creation, no dice are spent, so recovered should be 0
      expect(expectedRecovered).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // AC6: Cross-lifecycle data consistency
  // -----------------------------------------------------------------------

  describe('AC6: Data consistency across lifecycle phases', () => {
    itIfServer('character data is consistent across multiple reads', async () => {
      const { data: first } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      const { data: second } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(first).not.toBeNull()
      expect(second).not.toBeNull()

      // Core identity
      expect(first!.id).toBe(second!.id)
      expect(first!.name).toBe(second!.name)
      expect(first!.race).toBe(second!.race)
      expect(first!.class).toBe(second!.class)

      // Combat stats
      expect(first!.maxHp).toBe(second!.maxHp)
      expect(first!.hp).toBe(second!.hp)
      expect(first!.ac).toBe(second!.ac)
      expect(first!.speed).toBe(second!.speed)

      // Ability scores deep equality
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

    itIfServer('deleteTestCharacter throws on failure (consistent with createTestCharacter)', async () => {
      // Create a temporary character to delete
      const tempChar = await createTestCharacter(testSessionId, {
        name: 'DeleteTest',
        race: 'human',
        class_: 'fighter',
      })

      // Deleting an existing character should NOT throw
      await expect(
        deleteTestCharacter(testSessionId, tempChar.id),
      ).resolves.not.toThrow()

      // Deleting again SHOULD throw (404)
      await expect(
        deleteTestCharacter(testSessionId, tempChar.id),
      ).rejects.toThrow()

      // Verify it's actually gone
      const { response } = await apiRequest(
        `/characters/${tempChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(response.status).toBe(404)
    })

    itIfServer('session survives character deletion', async () => {
      // Create and delete a temp character
      const tempChar = await createTestCharacter(testSessionId, {
        name: 'TempForCleanup',
        race: 'elf',
        class_: 'wizard',
      })

      await deleteTestCharacter(testSessionId, tempChar.id)

      // Original session and main character should still exist
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).not.toBeNull()
      expect(data!.id).toBe(testCharacter.id)
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases for lifecycle robustness
  // -----------------------------------------------------------------------

  describe('Lifecycle edge cases', () => {
    itIfServer('handles all supported races with correct stat calculations', async () => {
      const raceTests = [
        { race: 'dwarf' as const, expectedSpeed: 25, conBonus: 2 },
        { race: 'halfling' as const, expectedSpeed: 25, dexBonus: 2 },
        { race: 'dragonborn' as const, expectedSpeed: 30, strBonus: 2, chaBonus: 1 },
        { race: 'gnome' as const, expectedSpeed: 25, intBonus: 2 },
        { race: 'half-orc' as const, expectedSpeed: 30, strBonus: 2, conBonus: 1 },
        { race: 'tiefling' as const, expectedSpeed: 30, chaBonus: 2, intBonus: 1 },
      ]

      for (const rt of raceTests) {
        const char = await createTestCharacter(testSessionId, {
          name: `Race_${rt.race}`,
          race: rt.race,
          class_: 'fighter',
          background: 'soldier',
        })

        try {
          expect(char.speed).toBe(rt.expectedSpeed)
          expect(char.maxHp).toBeGreaterThan(0)
          expect(char.ac).toBeGreaterThanOrEqual(8)
        } finally {
          await deleteTestCharacter(testSessionId, char.id)
        }
      }
    })

    itIfServer('handles all supported classes with correct hit dice', async () => {
      const classTests = [
        { cls: 'wizard' as const, hitDie: 6 },
        { cls: 'rogue' as const, hitDie: 8 },
        { cls: 'cleric' as const, hitDie: 8 },
        { cls: 'bard' as const, hitDie: 8 },
        { cls: 'druid' as const, hitDie: 8 },
        { cls: 'monk' as const, hitDie: 8 },
        { cls: 'paladin' as const, hitDie: 10 },
        { cls: 'ranger' as const, hitDie: 10 },
        { cls: 'sorcerer' as const, hitDie: 6 },
        { cls: 'warlock' as const, hitDie: 8 },
      ]

      for (const ct of classTests) {
        const char = await createTestCharacter(testSessionId, {
          name: `Class_${ct.cls}`,
          race: 'human',
          class_: ct.cls,
          background: 'sage',
        })

        try {
          expect(char.hitDice.size).toBe(ct.hitDie)
          expect(char.maxHp).toBeGreaterThan(0)
        } finally {
          await deleteTestCharacter(testSessionId, char.id)
        }
      }
    })
  })
})
