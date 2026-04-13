/**
 * @fileoverview Shared server-to-client character transformation.
 *
 * The Go backend returns characters with a `stats` field, while the frontend
 * expects `abilityScores`.  This module provides a single canonical conversion
 * function used by both the REST path (CharacterCreationDialog) and the
 * WebSocket path (useGameMessages) to avoid the crash described in the P0 bug:
 *
 *   TypeError: Cannot read properties of undefined (reading 'strength')
 *     at CharacterSection  — character.abilityScores.strength
 */

import type { ServerCharacter } from '../services/api'
import type { Character, Ability, Condition, DeathSaves, SpellSlots } from '../types'

/**
 * Convert a raw server character (Go model with `stats`) into the client-side
 * `Character` shape (with `abilityScores`).
 */
export function serverToClientCharacter(char: ServerCharacter): Character {
  return {
    id: char.id,
    name: char.name,
    race: char.race,
    class: char.class,
    level: char.level,
    background: char.background,
    alignment: '',
    abilityScores: {
      strength: char.stats.strength,
      dexterity: char.stats.dexterity,
      constitution: char.stats.constitution,
      intelligence: char.stats.intelligence,
      wisdom: char.stats.wisdom,
      charisma: char.stats.charisma,
    },
    maxHitPoints: char.maxHp,
    currentHitPoints: char.hp,
    temporaryHitPoints: 0,
    armorClass: char.ac,
    speed: char.speed,
    initiative: Math.floor((char.stats.dexterity - 10) / 2),
    proficiencyBonus: char.proficiencyBonus,
    skills: char.skills,
    savingThrows: Object.entries(char.savingThrows)
      .filter(([, v]) => v)
      .map(([k]) => k as Ability),
    conditions: (char.conditions ?? []) as Condition[],
    deathSaves: char.deathSaves as DeathSaves | undefined,
    equipment: char.equipment ?? [],
    inventory: char.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: 1,
      description: item.description,
    })),
    spellSlots: char.spellSlots as SpellSlots | undefined,
  }
}

/**
 * Type guard that returns `true` when a character object uses the raw server
 * shape (has `stats` but no `abilityScores`).
 */
function isServerFormat(char: Record<string, unknown>): boolean {
  return 'stats' in char && !('abilityScores' in char)
}

/**
 * Normalize an array of characters that may be in either server or client
 * format.  Server-format characters are converted via `serverToClientCharacter`;
 * client-format characters are passed through unchanged.
 */
export function normalizePartyCharacters(
  data: unknown[],
): Character[] {
  return data.map((item): Character => {
    const rec = item as Record<string, unknown>
    if (isServerFormat(rec)) {
      return serverToClientCharacter(rec as unknown as ServerCharacter)
    }
    return item as Character
  })
}
