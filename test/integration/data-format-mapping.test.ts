/**
 * Frontend-Backend Data Format Mapping Tests
 *
 * Validates that the data produced by the Go backend REST API is fully
 * compatible with the TypeScript type definitions used by the frontend.
 *
 * This catches integration bugs from:
 * - snake_case vs camelCase field naming mismatches
 * - Missing fields that the frontend expects
 * - Type mismatches (string vs number, array vs object)
 * - Structural differences between ServerCharacter and CharacterResponse
 *
 * Reference files:
 * - Frontend types: apps/web/src/types/state.ts (CombatState, Combatant, InitiativeEntry)
 * - Frontend types: apps/web/src/types/character.ts (Character, DeathSaves, SkillProficiencies)
 * - Frontend types: apps/web/src/types/game.ts (AbilityScores, Condition, DamageType, ActiveEffect)
 * - Frontend API:   apps/web/src/services/api.ts (ServerCharacter interface)
 * - Test types:      test/types.ts (CharacterResponse, CombatantResponse, etc.)
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
} from '../e2e/helpers'
import type {
  CharacterResponse,
  ErrorResponse,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Frontend-Backend Data Format Mapping', () => {
  let testSessionId: string

  beforeAll(async () => {
    if (!serverAvailable) return
    testSessionId = (await createTestSession()).sessionId
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
  // 1. Field Naming Convention: camelCase (not snake_case)
  // The frontend uses camelCase throughout. Backend must match.
  // =========================================================================

  describe('Field naming convention (camelCase)', () => {
    let char: CharacterResponse

    beforeAll(async () => {
      if (!serverAvailable) return
      char = await createTestCharacter(testSessionId, {
        name: 'FormatCheck',
        race: 'human',
        class_: 'fighter',
        background: 'soldier',
        abilityScores: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 8 },
      })
    })

    afterAll(async () => {
      if (char && serverAvailable) {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('uses maxHp (not max_hp or maxHP)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('maxHp')
      expect(data).not.toHaveProperty('max_hp')
      expect(data).not.toHaveProperty('maxHP')
    })

    itIfServer('uses currentHp field as hp (character response)', async () => {
      // NOTE: The character REST API returns 'hp' for current HP (matching the
      // Go Character struct's HP field), while combat state uses 'currentHp'.
      // This is a known mapping point.
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('hp')
      expect(typeof data!.hp).toBe('number')
    })

    itIfServer('uses proficiencyBonus (not proficiency_bonus)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('proficiencyBonus')
      expect(data).not.toHaveProperty('proficiency_bonus')
    })

    itIfServer('uses savingThrows (not saving_throws)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('savingThrows')
      expect(data).not.toHaveProperty('saving_throws')
    })

    itIfServer('uses deathSaves (not death_saves)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('deathSaves')
      expect(data).not.toHaveProperty('death_saves')
    })

    itIfServer('uses hitDice (not hit_dice)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('hitDice')
      expect(data).not.toHaveProperty('hit_dice')
    })

    itIfServer('uses racialTraits (not racial_traits)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      expect(data).toHaveProperty('racialTraits')
      expect(data).not.toHaveProperty('racial_traits')
    })

    itIfServer('uses armorProficiencies and weaponProficiencies', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )
      // These are fighter-specific fields added during creation
      expect(data).toHaveProperty('armorProficiencies')
      expect(data).toHaveProperty('weaponProficiencies')
    })

    itIfServer('stats sub-object uses full camelCase names', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      const stats = data!.stats
      // Must NOT use abbreviations like str, dex, con, etc.
      expect(stats).toHaveProperty('strength')
      expect(stats).toHaveProperty('dexterity')
      expect(stats).toHaveProperty('constitution')
      expect(stats).toHaveProperty('intelligence')
      expect(stats).toHaveProperty('wisdom')
      expect(stats).toHaveProperty('charisma')

      // Verify no abbreviated keys exist
      const abbrevKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
      for (const key of abbrevKeys) {
        expect(stats).not.toHaveProperty(key)
      }
    })
  })

  // =========================================================================
  // 2. Type Compatibility: Each field has the expected JavaScript type
  // =========================================================================

  describe('Type compatibility', () => {
    let char: CharacterResponse

    beforeAll(async () => {
      if (!serverAvailable) return
      char = await createTestCharacter(testSessionId, {
        name: 'TypeCheck',
        race: 'elf',
        class_: 'wizard',
        background: 'sage',
        abilityScores: { str: 8, dex: 14, con: 12, int: 15, wis: 13, cha: 10 },
      })
    })

    afterAll(async () => {
      if (char && serverAvailable) {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('all string fields are actually strings', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      const stringFields: (keyof CharacterResponse)[] = [
        'id', 'name', 'race', 'class', 'background',
      ]
      for (const field of stringFields) {
        expect(typeof data![field]).toBe('string')
      }
    })

    itIfServer('all numeric fields are numbers (not strings)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      const numericFields = [
        'level', 'hp', 'maxHp', 'ac', 'speed',
        'proficiencyBonus', 'gold',
      ]
      for (const field of numericFields) {
        expect(typeof (data as Record<string, unknown>)[field]).toBe('number')
      }
    })

    itIfServer('stats values are all numbers', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      for (const value of Object.values(data!.stats)) {
        expect(typeof value).toBe('number')
      }
    })

    itIfServer('skills is an object with boolean values', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(typeof data!.skills).toBe('object')
      expect(data!.skills).not.toBeNull()
      expect(Array.isArray(data!.skills)).toBe(false)

      for (const value of Object.values(data!.skills)) {
        expect(typeof value).toBe('boolean')
      }
    })

    itIfServer('savingThrows is an object with boolean values', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(typeof data!.savingThrows).toBe('object')
      expect(data!.savingThrows).not.toBeNull()
      expect(Array.isArray(data!.savingThrows)).toBe(false)

      for (const value of Object.values(data!.savingThrows)) {
        expect(typeof value).toBe('boolean')
      }
    })

    itIfServer('deathSaves has correct inner structure', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      const ds = data!.deathSaves
      expect(typeof ds).toBe('object')
      expect(typeof ds.successes).toBe('number')
      expect(typeof ds.failures).toBe('number')
    })

    itIfServer('hitDice has correct inner structure', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      const hd = data!.hitDice
      expect(typeof hd).toBe('object')
      expect(typeof hd.total).toBe('number')
      expect(typeof hd.current).toBe('number')
      expect(typeof hd.size).toBe('number')
    })

    itIfServer('racialTraits is an array of objects with name/description', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(Array.isArray(data!.racialTraits)).toBe(true)
      for (const trait of data!.racialTraits) {
        expect(typeof trait.name).toBe('string')
        expect(typeof trait.description).toBe('string')
      }
    })

    itIfServer('conditions is an array (empty or populated)', async () => {
      const { data } = await apiRequest<CharacterResponse>(
        `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
      )

      expect(Array.isArray(data!.conditions)).toBe(true)
    })
  })

  // =========================================================================
  // 3. Cross-Type Consistency:
  // ServerCharacter (api.ts) vs CharacterResponse (test/types.ts)
  // vs Character (types/character.ts) vs Combatant (types/state.ts)
  // =========================================================================

  describe('Cross-type consistency', () => {
    itIfServer('ServerCharacter required fields exist in API response', async () => {
      /**
       * ServerCharacter (apps/web/src/services/api.ts) requires:
       * id, name, race, class, level, hp, maxHp, ac, stats, skills,
       * inventory, conditions, background, proficiencyBonus, savingThrows,
       * speed, gold, racialTraits, deathSaves?, hitDice?
       */
      const char = await createTestCharacter(testSessionId, {
        name: 'CrossType',
        race: 'human',
        class_: 'cleric',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        // Core identity fields
        const coreFields = ['id', 'name', 'race', 'class', 'level', 'background']
        for (const f of coreFields) {
          expect(data!).toHaveProperty(f)
        }

        // Combat stat fields
        const combatFields = ['hp', 'maxHp', 'ac', 'speed', 'proficiencyBonus']
        for (const f of combatFields) {
          expect(data!).toHaveProperty(f)
        }

        // Complex object fields
        const objectFields = ['stats', 'skills', 'savingThrows', 'deathSaves', 'hitDice']
        for (const f of objectFields) {
          expect(data!).toHaveProperty(f)
        }

        // Array fields
        const arrayFields = ['inventory', 'conditions', 'racialTraits']
        for (const f of arrayFields) {
          expect(data!).toHaveProperty(f)
          expect(Array.isArray((data as Record<string, unknown>)[f])).toBe(true)
        }
      } finally {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('Combatant type fields can be derived from character + combat state', async () => {
      /**
       * Combatant (apps/web/src/types/state.ts) needs:
       * id, name, type, maxHp, currentHp, temporaryHp, ac, speed, dexScore,
       * action, bonusAction, reaction, conditions[], damageResistances?,
       * damageImmunities?, deathSaves?, hitDice?, position?, level?, conModifier?
       *
       * Mapping from Character -> Combatant (done in parseCombatants):
       * - Character.id -> Combatant.id
       * - Character.name -> Combatant.name
       * - "player"/"enemy"/"npc" -> Combatant.type (from combatant type param)
       * - Character.maxHP -> Combatant.maxHp
       * - Character.HP -> Combatant.currentHp
       * - 0 -> Combatant.temporaryHp (initially)
       * - Character.AC -> Combatant.ac
       * - Character.Speed -> Combatant.speed
       * - DEX score from stats -> Combatant.dexScore
       * - "available" -> action/bonusAction/reaction (initially)
       */
      const char = await createTestCharacter(testSessionId, {
        name: 'CombatantMap',
        race: 'human',
        class_: 'fighter',
        abilityScores: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 8 },
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        // Verify all source fields needed for Combatant conversion exist
        expect(data!.id).toBeDefined()                    // -> Combatant.id
        expect(data!.name).toBeDefined()                  // -> Combatant.name
        expect(data!.maxHp).toBeDefined()                // -> Combatant.maxHp
        expect(data!.hp).toBeDefined()                   // -> Combatant.currentHp
        expect(data!.ac).toBeDefined()                   // -> Combatant.ac
        expect(data!.speed).toBeDefined()                // -> Combatant.speed
        expect(data!.stats.dexterity).toBeDefined()     // -> Combatant.dexScore (with racial mod)
        expect(data!.level).toBeDefined()               // -> Combatant.level
        // conMod derived from stats.constitution
        expect(data!.stats.constitution).toBeDefined()
      } finally {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })
  })

  // =========================================================================
  // 4. Value Range Validation
  // Ensure computed values fall within valid D&D 5e bounds
  // =========================================================================

  describe('Value range validation (D&D 5e rules)', () => {
    itIfServer('ability scores are within 3-20 range (after racial bonuses)', async () => {
      const testCases = [
        { race: 'human' as const, baseStr: 10 },   // Human +1 -> 11
        { race: 'elf' as const, baseDex: 18 },     // Elf +2 -> 20 (cap)
        { race: 'half-orc' as const, baseStr: 19 }, // Half-Orc +2 -> 20 (cap)
        { race: 'dwarf' as const, baseCon: 18 },    // Dwarf +2 -> 20 (cap)
      ]

      for (const tc of testCases) {
        const scores: Record<string, number> = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }
        if (tc.baseStr !== undefined) scores.strength = tc.baseStr
        if (tc.baseDex !== undefined) scores.dexterity = tc.baseDex
        if (tc.baseCon !== undefined) scores.constitution = tc.baseCon

        const char = await createTestCharacter(testSessionId, {
          name: `Range_${tc.race}`,
          race: tc.race,
          class_: 'fighter',
          abilityScores: scores,
        })

        try {
          const { data } = await apiRequest<CharacterResponse>(
            `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          )

          expect(data).not.toBeNull()

          for (const [stat, value] of Object.entries(data!.stats)) {
            expect(value).toBeGreaterThanOrEqual(3)
            expect(value).toBeLessThanOrEqual(20)
          }
        } finally {
          await apiRequest(
            `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
            { method: 'DELETE' },
          )
        }
      }
    })

    itIfServer('AC is within valid range (1-30 reasonable bound)', async () => {
      // Create characters with extreme DEX to test AC bounds
      const highDexChar = await createTestCharacter(testSessionId, {
        name: 'HighAC',
        race: 'elf',           // +2 DEX
        class_: 'wizard',
        abilityScores: { str: 8, dex: 18, con: 10, int: 14, wis: 12, cha: 10 },
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${highDexChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )
        expect(data).not.toBeNull()
        // Base AC 10 + DEX mod (20 -> +5) = 15
        expect(data!.ac).toBeGreaterThanOrEqual(1)
        expect(data!.ac).toBeLessThanOrEqual(30)
      } finally {
        await apiRequest(
          `/characters/${highDexChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('HP is positive and does not exceed reasonable maximum', async () => {
      // High CON barbarian-like character
      const highConChar = await createTestCharacter(testSessionId, {
        name: 'HighHP',
        race: 'half-orc',       // +2 STR, +1 CON
        class_: 'fighter',      // d10
        abilityScores: { str: 16, dex: 10, con: 18, int: 8, wis: 10, cha: 8 },
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${highConChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )
        expect(data).not.toBeNull()
        expect(data!.maxHp).toBeGreaterThan(0)
        // Level 1 fighter d10 + CON mod(19 -> +4) = 14; reasonable upper bound
        expect(data!.maxHp).toBeLessThanOrEqual(50)
        expect(data!.hp).toBe(data!.maxHp) // Full HP at creation
      } finally {
        await apiRequest(
          `/characters/${highConChar.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('speed matches racial defaults', async () => {
      const speedByRace: Record<string, number> = {
        human: 30, elf: 30, dwarf: 25, halfling: 25,
        dragonborn: 30, gnome: 25, 'half-elf': 30,
        'half-orc': 30, tiefling: 30,
      }

      for (const [race, expectedSpeed] of Object.entries(speedByRace)) {
        const char = await createTestCharacter(testSessionId, {
          name: `Speed_${race}`,
          race: race as 'human' | 'elf' | 'dwarf' | 'halfling' | 'dragonborn' | 'gnome' | 'half-elf' | 'half-orc' | 'tiefling',
          class_: 'fighter',
        })

        try {
          const { data } = await apiRequest<CharacterResponse>(
            `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          )
          expect(data).not.toBeNull()
          expect(data!.speed).toBe(expectedSpeed)
        } finally {
          await apiRequest(
            `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
            { method: 'DELETE' },
          )
        }
      }
    })

    itIfServer('proficiency bonus is correct for level 1', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'ProfCheck',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )
        expect(data).not.toBeNull()
        // Level 1 proficiency bonus = 2
        expect(data!.proficiencyBonus).toBe(2)
      } finally {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('hit die size matches class Hit Die table', async () => {
      const classHitDice: Record<string, number> = {
        fighter: 10, wizard: 6, rogue: 8, cleric: 8,
        bard: 8, druid: 8, monk: 8, paladin: 10,
        ranger: 10, sorcerer: 6, warlock: 8,
      }

      for (const [cls, expectedDie] of Object.entries(classHitDice)) {
        const char = await createTestCharacter(testSessionId, {
          name: `HD_${cls}`,
          race: 'human',
          class_: cls as 'fighter' | 'wizard' | 'rogue' | 'cleric' | 'bard' | 'druid' | 'monk' | 'paladin' | 'ranger' | 'sorcerer' | 'warlock',
        })

        try {
          const { data } = await apiRequest<CharacterResponse>(
            `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          )
          expect(data).not.toBeNull()
          expect(data!.hitDice.size).toBe(expectedDie)
          expect(data!.hitDice.total).toBe(1) // Level 1
          expect(data!.hitDice.current).toBe(1) // Full at creation
        } finally {
          await apiRequest(
            `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
            { method: 'DELETE' },
          )
        }
      }
    })
  })

  // =========================================================================
  // 5. Integration Bug Detection: Known Problem Areas
  // =========================================================================

  describe('Integration bug detection (known problem areas)', () => {
    itIfServer('no extra unexpected fields that could confuse frontend', async () => {
      // This test ensures no new fields were added to the backend response
      // that the frontend TypeScript types don't account for.
      // We don't fail on extra fields (that would be too brittle), but we log them.
      const char = await createTestCharacter(testSessionId, {
        name: 'FieldAudit',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<Record<string, unknown>>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        // Known fields from CharacterResponse / ServerCharacter
        const knownFields = new Set([
          'id', 'name', 'race', 'class', 'level', 'hp', 'maxHp', 'ac', 'speed',
          'stats', 'skills', 'proficiencyBonus', 'background', 'savingThrows',
          'deathSaves', 'hitDice', 'inventory', 'conditions', 'gold',
          'racialTraits', 'armorProficiencies', 'weaponProficiencies',
        ])

        const actualFields = new Set(Object.keys(data!))
        const extraFields = [...actualFields].filter((f) => !knownFields.has(f))

        // Log any extra fields for review (don't fail - just document)
        if (extraFields.length > 0) {
          console.log(`[INFO] Extra fields in character response: ${extraFields.join(', ')}`)
        }

        // All KNOWN fields must be present
        for (const field of knownFields) {
          expect(actualFields.has(field)).toBe(true)
        }
      } finally {
        await apiRequest(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })

    itIfServer('session ID is consistent across all endpoints', async () => {
      const session = await createTestSession()
      const char = await createTestCharacter(session.sessionId, {
        name: 'SessionConsistency',
        race: 'human',
        class_: 'fighter',
      })

      try {
        // Session get should return same ID
        const { data: sessData } = await apiRequest<{ sessionId: string }>(
          `/sessions/${session.sessionId}`,
        )
        expect(sessData).not.toBeNull()
        expect(sessData!.sessionId).toBe(session.sessionId)

        // Character list should be under this session
        const { data: charList } = await apiRequest<{ characters: Array<{ id: string }>; count: number }>(
          `/characters?sessionId=${encodeURIComponent(session.sessionId)}`,
        )
        expect(charList).not.toBeNull()
        expect(charList!.characters.some((c) => c.id === char.id)).toBe(true)
      } finally {
        await apiRequest(`/sessions/${session.sessionId}`, { method: 'DELETE' })
      }
    })

    itIfServer('empty ability scores use defaults correctly', async () => {
      // Some frontends might send minimal ability score objects
      const { response, data } = await apiRequest<CharacterResponse>(
        `/characters?sessionId=${encodeURIComponent(testSessionId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'MinimalScores',
            race: 'human',
            class: 'fighter',
            background: 'soldier',
            abilityScores: {}, // Empty - backend should use defaults
          }),
        },
      )

      // Should either succeed with defaults or reject gracefully
      expect([201, 400].includes(response.status)).toBe(true)

      if (response.status === 201 && data) {
        // If accepted, all stats should have valid values
        for (const value of Object.values(data.stats)) {
          expect(typeof value).toBe('number')
          expect(value).toBeGreaterThan(0)
        }
      }

      // Clean up on success
      if (response.status === 201 && data) {
        await apiRequest(
          `/characters/${data.id}?sessionId=${encodeURIComponent(testSessionId)}`,
          { method: 'DELETE' },
        )
      }
    })
  })
})
