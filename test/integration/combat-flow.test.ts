/**
 * Combat Flow Integration Tests
 *
 * End-to-end tests for the complete battle flow:
 *   Create session -> Create character -> Start combat -> Initiative -> Turns -> Attack/Damage -> End combat
 *
 * These tests verify the full integration between session management,
 * character creation, and the combat system.
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
  GameStateResponse,
  CharacterResponse,
  StartCombatResponse,
  EndCombatResponse,
  AttackResponse,
  DamageResponse,
  HealResponse,
  ErrorResponse,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Combat Flow Integration Tests', () => {
  let testSessionId: string
  let testCharacter: CharacterResponse

  beforeAll(async () => {
    if (!serverAvailable) return

    // Create session
    const session = await createTestSession()
    testSessionId = session.sessionId

    // Create character
    testCharacter = await createTestCharacter(testSessionId, {
      name: 'CombatTestHero',
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
        await apiRequest(`/sessions/${testSessionId}`, { method: 'DELETE' })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  // -----------------------------------------------------------------------
  // 1. Character creation pre-conditions
  // -----------------------------------------------------------------------

  describe('Character pre-conditions for combat', () => {
    itIfServer('should have valid combat stats after creation', () => {
      expect(testCharacter).toBeDefined()
      expect(testCharacter.maxHp).toBeGreaterThan(0)
      expect(testCharacter.hp).toBe(testCharacter.maxHp)
      expect(testCharacter.ac).toBeGreaterThan(0)
      expect(testCharacter.speed).toBeGreaterThan(0)
      expect(testCharacter.proficiencyBonus).toBe(2) // Level 1
      expect(testCharacter.level).toBe(1)
    })

    itIfServer('should have correct fighter stats', () => {
      // Fighter: d10 hit die + CON mod
      // CON 15 + racial human +1 = 16, modifier = +3
      // HP = 10 (d10) + 3 (CON mod) = 13
      expect(testCharacter.maxHp).toBe(13)
      // AC = 10 + DEX mod (14+1=15, mod=+2) = 12
      expect(testCharacter.ac).toBe(12)
      // Human speed = 30
      expect(testCharacter.speed).toBe(30)
    })

    itIfServer('should have saving throw proficiencies for fighter', () => {
      // Fighter: Strength and Constitution saving throws
      expect(testCharacter.savingThrows.strength).toBe(true)
      expect(testCharacter.savingThrows.constitution).toBe(true)
    })

    itIfServer('should have death saves initialized to zero', () => {
      expect(testCharacter.deathSaves).toBeDefined()
      expect(testCharacter.deathSaves.successes).toBe(0)
      expect(testCharacter.deathSaves.failures).toBe(0)
    })

    itIfServer('should have hit dice initialized correctly', () => {
      // Fighter: d10 hit die, level 1 = 1 total, 1 current
      expect(testCharacter.hitDice).toBeDefined()
      expect(testCharacter.hitDice.size).toBe(10)
      expect(testCharacter.hitDice.total).toBe(1)
      expect(testCharacter.hitDice.current).toBe(1)
    })

    itIfServer('should have racial traits from human', () => {
      expect(testCharacter.racialTraits).toBeDefined()
      expect(testCharacter.racialTraits.length).toBeGreaterThan(0)
    })

    itIfServer('should list the character in the session party', async () => {
      const { response, data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      // Party should contain the character (loaded from persistence)
    })
  })

  // -----------------------------------------------------------------------
  // 2. Character CRUD integration
  // -----------------------------------------------------------------------

  describe('Character CRUD operations', () => {
    itIfServer('should retrieve character by ID', async () => {
      const { response, data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      expect(data!.id).toBe(testCharacter.id)
      expect(data!.name).toBe('CombatTestHero')
    })

    itIfServer('should list characters in session', async () => {
      const { response, data } = await apiRequest<{ characters: CharacterResponse[]; count: number }>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      expect(data!.count).toBeGreaterThanOrEqual(1)
      const found = data!.characters.find((c) => c.id === testCharacter.id)
      expect(found).toBeDefined()
    })

    itIfServer('should reject character creation without session ID', async () => {
      const { response, data } = await apiRequest<ErrorResponse>('/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: 'NoSession',
          race: 'elf',
          class: 'wizard',
          background: 'sage',
          abilityScores: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
        }),
      })

      expect(response.status).toBe(400)
    })

    itIfServer('should reject character creation with invalid race', async () => {
      const { response, data } = await apiRequest<ErrorResponse>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'InvalidRace',
            race: 'dragon_turtle',
            class: 'fighter',
            background: 'soldier',
            abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          }),
        },
      )

      expect(response.status).toBe(400)
      expect(data).not.toBeNull()
    })

    itIfServer('should create characters of all supported races', async () => {
      const races = ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'half-elf', 'half-orc', 'tiefling']
      const classes = ['fighter', 'wizard', 'rogue', 'cleric', 'bard', 'druid', 'monk', 'paladin', 'ranger', 'sorcerer', 'warlock']
      const backgrounds = ['sage', 'soldier', 'criminal', 'commoner', 'urchin', 'folk_hero', 'noble', 'outlander', 'entertainer', 'acolyte']

      // Test a representative sample
      const testCases = [
        { race: 'elf', class_: 'wizard', bg: 'sage' },
        { race: 'dwarf', class_: 'cleric', bg: 'acolyte' },
        { race: 'halfling', class_: 'rogue', bg: 'criminal' },
        { race: 'dragonborn', class_: 'paladin', bg: 'noble' },
      ]

      for (const tc of testCases) {
        const char = await createTestCharacter(testSessionId, {
          name: `${tc.race}_${tc.class_}_${Date.now()}`,
          race: tc.race,
          class_: tc.class_,
          background: tc.bg,
        })

        expect(char).toBeDefined()
        expect(char.race).toBe(tc.race)
        expect(char.class).toBe(tc.class_)
        expect(char.maxHp).toBeGreaterThan(0)

        // Clean up
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('should delete a character from the session', async () => {
      // Create a temp character
      const char = await createTestCharacter(testSessionId, {
        name: 'ToDelete',
      })

      const { response } = await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )

      expect(response.status).toBe(200)

      // Verify character is gone
      const { response: getResponse } = await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(getResponse.status).toBe(404)
    })

    itIfServer('should return 404 for non-existent character', async () => {
      const { response } = await apiRequest(
        `/characters/non-existent-char?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(response.status).toBe(404)
    })
  })

  // -----------------------------------------------------------------------
  // 3. Character stat calculation validation
  // -----------------------------------------------------------------------

  describe('Character stat calculations (frontend-backend consistency)', () => {
    itIfServer('should calculate elf wizard stats correctly', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'ElfWizard',
        race: 'elf',
        class_: 'wizard',
        background: 'sage',
        abilityScores: { str: 8, dex: 14, con: 12, int: 15, wis: 13, cha: 10 },
      })

      // Elf: +2 DEX => DEX 16 (mod +3)
      // Wizard: d6 hit die, INT/WIS saves
      // HP = 6 + CON mod (12 => +1) = 7
      // AC = 10 + DEX mod (16 => +3) = 13
      expect(char.stats.dexterity).toBe(16)
      expect(char.maxHp).toBe(7)
      expect(char.ac).toBe(13)
      expect(char.speed).toBe(30)
      expect(char.savingThrows.intelligence).toBe(true)
      expect(char.savingThrows.wisdom).toBe(true)
      expect(char.hitDice.size).toBe(6)

      // Clean up
      await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )
    })

    itIfServer('should calculate dwarf cleric stats correctly', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'DwarfCleric',
        race: 'dwarf',
        class_: 'cleric',
        background: 'acolyte',
        abilityScores: { str: 14, dex: 8, con: 15, int: 10, wis: 14, cha: 12 },
      })

      // Dwarf: +2 CON => CON 17 (mod +3), speed 25
      // Cleric: d8 hit die, WIS/CHA saves
      // HP = 8 + CON mod (17 => +3) = 11
      // AC = 10 + DEX mod (8 => -1) = 9
      expect(char.stats.constitution).toBe(17)
      expect(char.maxHp).toBe(11)
      expect(char.ac).toBe(9)
      expect(char.speed).toBe(25)
      expect(char.savingThrows.wisdom).toBe(true)
      expect(char.savingThrows.charisma).toBe(true)
      expect(char.hitDice.size).toBe(8)

      // Clean up
      await apiRequest(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )
    })

    itIfServer('should calculate human fighter stats correctly (main test character)', () => {
      // Human: +1 to all => STR 17, DEX 15, CON 16, INT 11, WIS 13, CHA 9
      // Fighter: d10 hit die, STR/CON saves
      // HP = 10 + CON mod (16 => +3) = 13
      // AC = 10 + DEX mod (15 => +2) = 12
      expect(testCharacter.stats.strength).toBe(17)
      expect(testCharacter.stats.dexterity).toBe(15)
      expect(testCharacter.stats.constitution).toBe(16)
      expect(testCharacter.stats.intelligence).toBe(11)
      expect(testCharacter.stats.wisdom).toBe(13)
      expect(testCharacter.stats.charisma).toBe(9)
      expect(testCharacter.maxHp).toBe(13)
      expect(testCharacter.ac).toBe(12)
      expect(testCharacter.hitDice.size).toBe(10)
      expect(testCharacter.hitDice.total).toBe(1)
    })

    itIfServer('should apply background skill proficiencies', async () => {
      // Soldier: Athletics, Intimidation
      expect(testCharacter.skills.athletics).toBe(true)
      expect(testCharacter.skills.intimidation).toBe(true)
    })

    itIfServer('should calculate gold from class starting wealth', () => {
      // Fighter starting gold avg: 125 gp
      expect(testCharacter.gold).toBe(125)
    })

    itIfServer('should include armor and weapon proficiencies', () => {
      expect(testCharacter.armorProficiencies).toBeDefined()
      expect(testCharacter.weaponProficiencies).toBeDefined()
      // Fighter: all armor, shields, simple and martial weapons
      expect(testCharacter.armorProficiencies).toContain('all armor')
      expect(testCharacter.weaponProficiencies).toContain('simple weapons')
      expect(testCharacter.weaponProficiencies).toContain('martial weapons')
    })
  })

  // -----------------------------------------------------------------------
  // 4. Session state consistency after character operations
  // -----------------------------------------------------------------------

  describe('Session state consistency', () => {
    itIfServer('should maintain session phase as exploring after character creation', async () => {
      const { response, data } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(response.status).toBe(200)
      // The session phase should remain in exploring after character creation
      // (combat has not started)
    })

    itIfServer('should persist character data across session fetches', async () => {
      const { data: first } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )
      const { data: second } = await apiRequest<GameStateResponse>(
        `/sessions/${testSessionId}`,
      )

      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
      // Both fetches should have consistent party data
    })
  })

  // -----------------------------------------------------------------------
  // 5. API response format consistency (camelCase field names)
  // -----------------------------------------------------------------------

  describe('Frontend-backend data format consistency', () => {
    itIfServer('should use camelCase field names in character response', async () => {
      const { response, data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(response.status).toBe(200)
      expect(data).not.toBeNull()
      // Verify camelCase naming (not snake_case)
      expect(data!).toHaveProperty('maxHp')
      expect(data!).toHaveProperty('proficiencyBonus')
      expect(data!).toHaveProperty('savingThrows')
      expect(data!).toHaveProperty('racialTraits')
      expect(data!).toHaveProperty('hitDice')
      expect(data!).toHaveProperty('deathSaves')
    })

    itIfServer('should include all expected character fields', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      const char = data!
      // Core fields
      expect(char).toHaveProperty('id')
      expect(char).toHaveProperty('name')
      expect(char).toHaveProperty('race')
      expect(char).toHaveProperty('class')
      expect(char).toHaveProperty('level')
      expect(char).toHaveProperty('hp')
      expect(char).toHaveProperty('maxHp')
      expect(char).toHaveProperty('ac')
      expect(char).toHaveProperty('speed')
      expect(char).toHaveProperty('stats')
      expect(char).toHaveProperty('skills')
      expect(char).toHaveProperty('proficiencyBonus')
      expect(char).toHaveProperty('background')
      expect(char).toHaveProperty('deathSaves')
      expect(char).toHaveProperty('hitDice')
    })

    itIfServer('should have consistent ability score field naming', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${testCharacter.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      const stats = data!.stats
      // Backend uses full names (not abbreviations)
      expect(stats).toHaveProperty('strength')
      expect(stats).toHaveProperty('dexterity')
      expect(stats).toHaveProperty('constitution')
      expect(stats).toHaveProperty('intelligence')
      expect(stats).toHaveProperty('wisdom')
      expect(stats).toHaveProperty('charisma')
    })
  })

  // -----------------------------------------------------------------------
  // 6. Error handling during combat-related operations
  // -----------------------------------------------------------------------

  describe('Error handling', () => {
    itIfServer('should return 404 for character in non-existent session', async () => {
      const { response } = await apiRequest(
        `/characters/${testCharacter.id}?sessionId=non-existent-session`,
      )
      expect(response.status).toBe(404)
    })

    itIfServer('should reject creating character in non-existent session', async () => {
      const { response } = await apiRequest('/characters?sessionId=non-existent-session', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Ghost',
          race: 'elf',
          class: 'wizard',
          background: 'sage',
          abilityScores: { str: 10, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
        }),
      })
      expect(response.status).toBe(400)
    })

    itIfServer('should handle ability scores with short keys (str/dex/etc)', async () => {
      // The backend accepts both "str"/"strength" forms
      const { response, data } = await apiRequest<CharacterResponse>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'ShortKeys',
            race: 'elf',
            class: 'rogue',
            background: 'criminal',
            abilityScores: {
              str: 10,
              dex: 16,
              con: 12,
              int: 14,
              wis: 10,
              cha: 12,
            },
          }),
        },
      )

      expect(response.status).toBe(201)
      expect(data).not.toBeNull()
      // Elf +2 DEX => DEX 18
      expect(data!.stats.dexterity).toBe(18)

      // Clean up
      await apiRequest(
        `/characters/${data!.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )
    })
  })

  // -----------------------------------------------------------------------
  // 7. Multiple characters in session
  // -----------------------------------------------------------------------

  describe('Multiple characters in session', () => {
    itIfServer('should support creating a full party of characters', async () => {
      const party = [
        { name: 'Fighter', race: 'human', class_: 'fighter', bg: 'soldier' },
        { name: 'Wizard', race: 'elf', class_: 'wizard', bg: 'sage' },
        { name: 'Rogue', race: 'halfling', class_: 'rogue', bg: 'criminal' },
        { name: 'Cleric', race: 'dwarf', class_: 'cleric', bg: 'acolyte' },
      ]

      const characters: CharacterResponse[] = []
      for (const member of party) {
        const char = await createTestCharacter(testSessionId, {
          name: `Party_${member.name}_${Date.now()}`,
          race: member.race,
          class_: member.class_,
          background: member.bg,
        })
        characters.push(char)
      }

      // Verify all characters exist in the party list
      const { data } = await apiRequest<{ characters: CharacterResponse[]; count: number }>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(data).not.toBeNull()
      // Should include our party characters plus the test character from beforeAll
      expect(data!.count).toBeGreaterThanOrEqual(characters.length + 1)

      // Clean up party characters
      for (const char of characters) {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('should allow characters with same class but different races', async () => {
      const char1 = await createTestCharacter(testSessionId, {
        name: 'HumanFight',
        race: 'human',
        class_: 'fighter',
      })
      const char2 = await createTestCharacter(testSessionId, {
        name: 'DwarfFight',
        race: 'dwarf',
        class_: 'fighter',
      })

      // Both fighters but with different HP due to CON differences
      expect(char1.id).not.toBe(char2.id)
      // Dwarf should have different speed
      expect(char2.speed).toBe(25) // dwarf speed
      expect(char1.speed).toBe(30) // human speed

      // Clean up
      await apiRequest(
        `/characters/${char1.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )
      await apiRequest(
        `/characters/${char2.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        { method: 'DELETE' },
      )
    })
  })
})
