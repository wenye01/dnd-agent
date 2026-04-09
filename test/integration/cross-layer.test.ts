/**
 * Cross-Layer Integration Tests
 *
 * Validates that data flows correctly across all layers of the stack:
 *   Go backend (models/handlers) -> REST API (JSON serialization) ->
 *   TypeScript types (test/types.ts) -> Frontend types (api.ts, state.ts)
 *
 * These tests catch integration bugs where:
 * - Backend struct fields are missing from TypeScript interfaces
 * - Field naming conventions differ between layers (snake_case vs camelCase)
 * - Type mismatches (string vs number, array vs object)
 * - Optional fields that should be required (or vice versa)
 *
 * Reference files:
 * - Go model:    apps/server/internal/shared/models/character.go (Character struct)
 * - Frontend API: apps/web/src/services/api.ts (ServerCharacter interface)
 * - Test types:   test/types.ts (CharacterResponse interface)
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
} from '../e2e/helpers'
import type {
  CharacterResponse,
  ErrorResponse,
} from '../types'

beforeAll(async () => {
  await checkServerAvailability()
})

describe('Cross-Layer Integration Tests', () => {
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
  // Layer 1: Go Character struct -> JSON response -> CharacterResponse type
  //
  // The Go Character struct (models/character.go) has these fields:
  //   ID, Name, Race, Class, Level, HP, MaxHP, TemporaryHP, AC, Stats,
  //   Skills, Inventory, Conditions, Background, ProficiencyBonus,
  //   SavingThrows, Speed, Gold, RacialTraits, HitDice, DeathSaves,
  //   DamageResistances, DamageImmunities, IsDead,
  //   ArmorProficiencies, WeaponProficiencies
  //
  // Every field in the Go struct MUST have a corresponding field in
  // CharacterResponse with matching camelCase JSON tag.
  // =========================================================================

  describe('Go Character struct -> CharacterResponse field coverage', () => {
    /**
     * Complete set of fields from the Go Character struct JSON tags.
     * Each entry maps: GoFieldName -> expected JSON key -> TS type.
     */
    const GO_CHARACTER_FIELDS = [
      // Core identity
      { goField: 'ID', jsonKey: 'id', tsType: 'string' },
      { goField: 'Name', jsonKey: 'name', tsType: 'string' },
      { goField: 'Race', jsonKey: 'race', tsType: 'string' },
      { goField: 'Class', jsonKey: 'class', tsType: 'string' },
      { goField: 'Level', jsonKey: 'level', tsType: 'number' },

      // Health
      { goField: 'HP', jsonKey: 'hp', tsType: 'number' },
      { goField: 'MaxHP', jsonKey: 'maxHp', tsType: 'number' },
      { goField: 'TemporaryHP', jsonKey: 'temporaryHp', tsType: 'number' },

      // Combat stats
      { goField: 'AC', jsonKey: 'ac', tsType: 'number' },
      { goField: 'Stats', jsonKey: 'stats', tsType: 'object' },
      { goField: 'Speed', jsonKey: 'speed', tsType: 'number' },

      // Proficiency
      { goField: 'ProficiencyBonus', jsonKey: 'proficiencyBonus', tsType: 'number' },
      { goField: 'SavingThrows', jsonKey: 'savingThrows', tsType: 'object' },
      { goField: 'Skills', jsonKey: 'skills', tsType: 'object' },

      // Equipment / conditions
      { goField: 'Inventory', jsonKey: 'inventory', tsType: 'array' },
      { goField: 'Conditions', jsonKey: 'conditions', tsType: 'array' },
      { goField: 'Background', jsonKey: 'background', tsType: 'string' },

      // Wealth
      { goField: 'Gold', jsonKey: 'gold', tsType: 'number' },

      // Traits
      { goField: 'RacialTraits', jsonKey: 'racialTraits', tsType: 'array' },

      // Combat mechanics
      { goField: 'HitDice', jsonKey: 'hitDice', tsType: 'object' },
      { goField: 'DeathSaves', jsonKey: 'deathSaves', tsType: 'object' },

      // Damage modifiers
      { goField: 'DamageResistances', jsonKey: 'damageResistances', tsType: 'array' },
      { goField: 'DamageImmunities', jsonKey: 'damageImmunities', tsType: 'array' },
      { goField: 'IsDead', jsonKey: 'isDead', tsType: 'boolean' },

      // Proficiency lists
      { goField: 'ArmorProficiencies', jsonKey: 'armorProficiencies', tsType: 'array' },
      { goField: 'WeaponProficiencies', jsonKey: 'weaponProficiencies', tsType: 'array' },
    ]

    itIfServer('every Go Character struct field exists in the API response', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'CrossLayer',
        race: 'human',
        class_: 'fighter',
        background: 'soldier',
      })

      try {
        const { data } = await apiRequest<Record<string, unknown>>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        // Check every Go field is present in the actual API response
        for (const field of GO_CHARACTER_FIELDS) {
          expect(data, `Missing field "${field.jsonKey}" (from Go ${field.goField})`).toHaveProperty(field.jsonKey)
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })

    itIfServer('every Go field has correct JavaScript type in API response', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'TypeCheck',
        race: 'human',
        class_: 'cleric',
        background: 'acolyte',
      })

      try {
        const { data } = await apiRequest<Record<string, unknown>>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        for (const field of GO_CHARACTER_FIELDS) {
          const value = data![field.jsonKey]
          expect(value, `Field "${field.jsonKey}" should be present`).toBeDefined()

          switch (field.tsType) {
            case 'string':
              expect(typeof value, `"${field.jsonKey}" should be string`).toBe('string')
              break
            case 'number':
              expect(typeof value, `"${field.jsonKey}" should be number`).toBe('number')
              break
            case 'boolean':
              expect(typeof value === 'boolean' || value === null || value === undefined,
                `"${field.jsonKey}" should be boolean or null/undefined`).toBe(true)
              break
            case 'object':
              expect(typeof value === 'object' && !Array.isArray(value),
                `"${field.jsonKey}" should be object`).toBe(true)
              break
            case 'array':
              expect(Array.isArray(value), `"${field.jsonKey}" should be array`).toBe(true)
              break
          }
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })
  })

  // =========================================================================
  // Layer 2: CharacterResponse -> ServerCharacter (frontend api.ts)
  //
  // ServerCharacter is the frontend's view of character data from the API.
  // It must be a superset or match of what the API actually returns.
  // =========================================================================

  describe('CharacterResponse <-> ServerCharacter compatibility', () => {
    /**
     * Fields required by ServerCharacter (apps/web/src/services/api.ts).
     * All of these must exist in both the API response and CharacterResponse.
     */
    const SERVER_CHARACTER_REQUIRED_FIELDS = [
      'id', 'name', 'race', 'class', 'level',
      'hp', 'maxHp', 'ac', 'speed',
      'stats', 'skills', 'proficiencyBonus',
      'background', 'savingThrows',
      'inventory', 'gold', 'racialTraits',
    ] as const

    itIfServer('API response contains all ServerCharacter required fields', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'ServerCharCompat',
        race: 'elf',
        class_: 'wizard',
        background: 'sage',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        for (const field of SERVER_CHARACTER_REQUIRED_FIELDS) {
          expect(data, `Missing ServerCharacter field "${field}"`).toHaveProperty(field)
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })

    itIfServer('ServerCharacter optional fields are handled gracefully', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'OptionalFields',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        // These fields are optional on ServerCharacter (marked with ?):
        // deathSaves, equipment, spellSlots
        // They should be present on a fresh character (deathSaves always present)
        expect(data!.deathSaves).toBeDefined()
        expect(typeof data!.deathSaves.successes).toBe('number')
        expect(typeof data!.deathSaves.failures).toBe('number')

        // equipment/spellSlots may be absent for non-equipment/non-spellcaster characters
        // This is acceptable; they're optional in the frontend type
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })
  })

  // =========================================================================
  // Layer 3: AbilityScores sub-object cross-layer consistency
  //
  // Go AbilityScores struct uses full names (Strength, Dexterity, etc.)
  // with camelCase JSON tags. Both frontend and test types must match.
  // =========================================================================

  describe('AbilityScores cross-layer consistency', () => {
    const ABILITY_NAMES = [
      'strength', 'dexterity', 'constitution',
      'intelligence', 'wisdom', 'charisma',
    ] as const

    itIfServer('all 6 ability scores present with correct types', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'AbilityCheck',
        race: 'human',
        class_: 'monk',
        background: 'outlander',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        for (const ability of ABILITY_NAMES) {
          expect(data!.stats, `Missing ability "${ability}"`).toHaveProperty(ability)
          expect(typeof data!.stats[ability], `"${ability}" should be number`).toBe('number')
          // D&D 5e valid range: 3-20 (after racial bonuses)
          expect(data!.stats[ability]).toBeGreaterThanOrEqual(3)
          expect(data!.stats[ability]).toBeLessThanOrEqual(20)
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })

    itIfServer('no abbreviated ability keys exist in response', async () => {
      const char = await createTestCharacter(testSessionId, {
        name: 'NoAbbrev',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<Record<string, unknown>>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()

        const stats = data!['stats'] as Record<string, unknown>
        expect(stats).toBeDefined()

        const abbrevKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
        for (const abbrev of abbrevKeys) {
          expect(stats, `Abbreviated key "${abbrev}" should not exist`).not.toHaveProperty(abbrev)
        }

        // Verify full names ARE present
        for (const full of ABILITY_NAMES) {
          expect(stats, `Full name key "${full}" should exist`).toHaveProperty(full)
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })
  })

  // =========================================================================
  // Layer 4: Complex nested objects (DeathSaves, HitDice, RacialTraits)
  // =========================================================================

  describe('Nested object structure validation', () => {
    itIfServer('DeathSaves matches Go DeathSaves struct shape', async () => {
      /**
       * Go DeathSaves struct:
       *   Successes int `json:"successes"`
       *   Failures  int `json:"failures"`
       */
      const char = await createTestCharacter(testSessionId, {
        name: 'DeathSavesCheck',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()
        const ds = data!.deathSaves

        expect(ds).toBeDefined()
        expect(typeof ds.successes).toBe('number')
        expect(typeof ds.failures).toBe('number')
        expect(ds.successes).toBeGreaterThanOrEqual(0)
        expect(ds.successes).toBeLessThanOrEqual(3)
        expect(ds.failures).toBeGreaterThanOrEqual(0)
        expect(ds.failures).toBeLessThanOrEqual(3)
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })

    itIfServer('HitDice matches Go HitDiceInfo struct shape', async () => {
      /**
       * Go HitDiceInfo struct:
       *   Total   int `json:"total"`
       *   Current int `json:"current"`
       *   Size    int `json:"size"`
       */
      const char = await createTestCharacter(testSessionId, {
        name: 'HitDiceCheck',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()
        const hd = data!.hitDice

        expect(hd).toBeDefined()
        expect(typeof hd.total).toBe('number')
        expect(typeof hd.current).toBe('number')
        expect(typeof hd.size).toBe('number')
        expect(hd.total).toBeGreaterThan(0)
        expect(hd.current).toBeGreaterThan(0)
        expect(hd.size).toBeOneOf([4, 6, 8, 10, 12]) // Valid D&D hit die sizes
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })

    itIfServer('RacialTraits matches Go RaceTrait struct shape', async () => {
      /**
       * Go RaceTrait struct:
       *   Name        string `json:"name"`
       *   Description string `json:"description"`
       */
      const char = await createTestCharacter(testSessionId, {
        name: 'RacialTraitCheck',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()
        expect(Array.isArray(data!.racialTraits)).toBe(true)
        expect(data!.racialTraits.length).toBeGreaterThan(0)

        for (const trait of data!.racialTraits) {
          expect(trait).toHaveProperty('name')
          expect(trait).toHaveProperty('description')
          expect(typeof trait.name).toBe('string')
          expect(typeof trait.description).toBe('string')
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })

    itIfServer('Inventory matches Go Item struct shape', async () => {
      /**
       * Go Item struct:
       *   ID          string `json:"id"`
       *   Name        string `json:"name"`
       *   Description string `json:"description"`
       *   Type        string `json:"type"`
       */
      const char = await createTestCharacter(testSessionId, {
        name: 'InventoryCheck',
        race: 'human',
        class_: 'fighter',
      })

      try {
        const { data } = await apiRequest<CharacterResponse>(
          `/characters/${char.id}?sessionId=${encodeURIComponent(testSessionId)}`,
        )

        expect(data).not.toBeNull()
        expect(Array.isArray(data!.inventory)).toBe(true)

        // At creation, inventory may be empty but must be an array
        for (const item of data!.inventory) {
          expect(item).toHaveProperty('id')
          expect(item).toHaveProperty('name')
          expect(item).toHaveProperty('description')
          expect(item).toHaveProperty('type')
        }
      } finally {
        await deleteTestCharacter(testSessionId, char.id)
      }
    })
  })

  // =========================================================================
  // Layer 5: Enum/value consistency across layers
  // =========================================================================

  describe('Enum and value consistency', () => {
    itIfServer('combat-relevant values are within valid D&D 5e ranges', async () => {
      const testCases = [
        { race: 'human' as const, class_: 'fighter' as const, bg: 'soldier' as const },
        { race: 'elf' as const, class_: 'wizard' as const, bg: 'sage' as const },
        { race: 'dwarf' as const, class_: 'cleric' as const, bg: 'acolyte' as const },
        { race: 'halfling' as const, class_: 'rogue' as const, bg: 'criminal' as const },
      ]

      for (const tc of testCases) {
        const char = await createTestCharacter(testSessionId, {
          name: `Range_${tc.class_}`,
          ...tc,
        })

        try {
          // HP: positive, reasonable for level 1
          expect(char.maxHp).toBeGreaterThan(0)
          expect(char.maxHp).toBeLessThanOrEqual(50) // Reasonable upper bound

          // AC: 8-30 reasonable range
          expect(char.ac).toBeGreaterThanOrEqual(8)
          expect(char.ac).toBeLessThanOrEqual(30)

          // Speed: valid racial speed (20-40 feet)
          expect(char.speed).toBeGreaterThanOrEqual(20)
          expect(char.speed).toBeLessThanOrEqual(40)

          // Proficiency bonus: level 1 = 2
          expect(char.proficiencyBonus).toBe(2)

          // Level: 1 at creation
          expect(char.level).toBe(1)
        } finally {
          await deleteTestCharacter(testSessionId, char.id)
        }
      }
    })
  })
})
