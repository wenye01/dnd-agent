/**
 * Whitebox tests for v0.4 Phase 3 type additions in character.ts
 * Validates that all new types are properly exported and have correct structure.
 */
import { describe, it, expect } from 'vitest'
import type {
  ItemType,
  ItemRarity,
  InventoryItem,
  SpellSchool,
  Spell,
  SpellSlotLevel,
  SpellSlots,
  ConcentrationState,
  Character,
} from './character'

describe('v0.4 Phase 3 - character.ts types', () => {
  describe('ItemType', () => {
    it('should accept all valid item type values', () => {
      const types: ItemType[] = [
        'weapon', 'armor', 'shield', 'potion', 'scroll', 'wand',
        'ring', 'amulet', 'cloak', 'tool', 'gear', 'treasure', 'ammo',
      ]
      expect(types).toHaveLength(13)
    })
  })

  describe('ItemRarity', () => {
    it('should accept all valid rarity values', () => {
      const rarities: ItemRarity[] = ['common', 'uncommon', 'rare', 'very-rare', 'legendary']
      expect(rarities).toHaveLength(5)
    })
  })

  describe('InventoryItem', () => {
    it('should support a complete weapon item with all optional fields', () => {
      const weapon: InventoryItem = {
        id: 'longsword-001',
        name: 'Longsword +1',
        quantity: 1,
        weight: 3,
        description: 'A finely crafted longsword with a faint magical glow.',
        type: 'weapon',
        rarity: 'uncommon',
        value: 500,
        damage: '1d8+1',
        damageType: 'slashing',
        equipSlot: 'main_hand',
        icon: 'sword',
      }
      expect(weapon.type).toBe('weapon')
      expect(weapon.rarity).toBe('uncommon')
      expect(weapon.damage).toBe('1d8+1')
      expect(weapon.equipSlot).toBe('main_hand')
    })

    it('should support a potion item with charges', () => {
      const potion: InventoryItem = {
        id: 'potion-healing-001',
        name: 'Potion of Healing',
        quantity: 3,
        weight: 0.5,
        type: 'potion',
        rarity: 'common',
        value: 50,
        charges: 1,
        maxCharges: 1,
      }
      expect(potion.type).toBe('potion')
      expect(potion.quantity).toBe(3)
    })

    it('should support a scroll with spell properties', () => {
      const scroll: InventoryItem = {
        id: 'scroll-fireball',
        name: 'Scroll of Fireball',
        quantity: 1,
        type: 'scroll',
        spellLevel: 3,
        spellId: 'fireball',
      }
      expect(scroll.spellLevel).toBe(3)
      expect(scroll.spellId).toBe('fireball')
    })

    it('should support minimal required fields only', () => {
      const item: InventoryItem = {
        id: 'minimal-item',
        name: 'Some Item',
        quantity: 1,
      }
      expect(item.id).toBe('minimal-item')
      expect(item.type).toBeUndefined()
      expect(item.rarity).toBeUndefined()
      expect(item.weight).toBeUndefined()
    })

    it('should support armor with armorClass', () => {
      const armor: InventoryItem = {
        id: 'chainmail-001',
        name: 'Chain Mail',
        quantity: 1,
        weight: 55,
        type: 'armor',
        rarity: 'common',
        armorClass: 16,
        equipSlot: 'body',
      }
      expect(armor.armorClass).toBe(16)
    })
  })

  describe('SpellSchool', () => {
    it('should accept all 8 schools of magic', () => {
      const schools: SpellSchool[] = [
        'abjuration', 'conjuration', 'divination', 'enchantment',
        'evocation', 'illusion', 'necromancy', 'transmutation',
      ]
      expect(schools).toHaveLength(8)
    })
  })

  describe('Spell', () => {
    it('should define a complete cantrip', () => {
      const cantrip: Spell = {
        id: 'fire_bolt',
        name: 'Fire Bolt',
        level: 0,
        school: 'evocation',
        castingTime: '1 action',
        range: '120 feet',
        duration: 'Instantaneous',
        components: 'V, S',
        description: 'A mote of fire streaks toward a creature.',
        ritual: false,
        concentration: false,
        damage: '1d10',
        damageType: 'fire',
        higherLevel: 'The damage increases by 1d10 at 5th level.',
      }
      expect(cantrip.level).toBe(0)
      expect(cantrip.concentration).toBe(false)
      expect(cantrip.ritual).toBe(false)
    })

    it('should define a concentration spell', () => {
      const spell: Spell = {
        id: 'hold_person',
        name: 'Hold Person',
        level: 2,
        school: 'enchantment',
        castingTime: '1 action',
        range: '60 feet',
        duration: 'Concentration, up to 1 minute',
        components: 'V, S, M',
        description: 'Paralyze a humanoid.',
        ritual: false,
        concentration: true,
        saveType: 'wisdom',
      }
      expect(spell.concentration).toBe(true)
      expect(spell.saveType).toBe('wisdom')
    })

    it('should define a ritual spell', () => {
      const ritual: Spell = {
        id: 'identify',
        name: 'Identify',
        level: 1,
        school: 'divination',
        castingTime: '1 minute',
        range: 'Touch',
        duration: 'Instantaneous',
        components: 'V, S, M',
        description: 'Reveals properties of a magical item.',
        ritual: true,
        concentration: false,
      }
      expect(ritual.ritual).toBe(true)
    })
  })

  describe('SpellSlots', () => {
    it('should define spell slots for levels 1-9', () => {
      const slots: SpellSlots = {
        1: { max: 4, used: 1 },
        2: { max: 3, used: 0 },
        3: { max: 3, used: 2 },
        4: { max: 3, used: 0 },
        5: { max: 2, used: 0 },
        6: { max: 1, used: 0 },
        7: { max: 1, used: 0 },
        8: { max: 1, used: 0 },
        9: { max: 1, used: 0 },
      }
      expect(Object.keys(slots)).toHaveLength(9)
      expect(slots[1].max - slots[1].used).toBe(3)
    })

    it('should track used slots accurately', () => {
      const slotLevel: SpellSlotLevel = { max: 4, used: 3 }
      expect(slotLevel.max - slotLevel.used).toBe(1)
    })
  })

  describe('ConcentrationState', () => {
    it('should define a concentration state with all fields', () => {
      const conc: ConcentrationState = {
        spellId: 'hold_person',
        spellName: 'Hold Person',
        casterId: 'wizard-001',
        targetId: 'goblin-001',
        remainingRounds: 5,
      }
      expect(conc.spellId).toBe('hold_person')
      expect(conc.remainingRounds).toBe(5)
    })

    it('should allow optional targetId and remainingRounds', () => {
      const conc: ConcentrationState = {
        spellId: 'mage_armor',
        spellName: 'Mage Armor',
        casterId: 'wizard-001',
      }
      expect(conc.targetId).toBeUndefined()
      expect(conc.remainingRounds).toBeUndefined()
    })
  })

  describe('Character v0.4 extensions', () => {
    it('should support knownSpells, preparedSpells, and concentration', () => {
      const character: Character = {
        id: 'wizard-001',
        name: 'Gandalf',
        race: 'Human',
        class: 'Wizard',
        level: 5,
        background: 'Sage',
        alignment: 'Neutral Good',
        abilityScores: {
          strength: 10, dexterity: 14, constitution: 12,
          intelligence: 18, wisdom: 13, charisma: 11,
        },
        maxHitPoints: 28,
        currentHitPoints: 28,
        temporaryHitPoints: 0,
        armorClass: 13,
        speed: 30,
        initiative: 2,
        proficiencyBonus: 3,
        skills: {},
        savingThrows: ['intelligence', 'wisdom'],
        conditions: [],
        equipment: [],
        inventory: [],
        spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, 3: { max: 2, used: 0 } },
        knownSpells: ['fire_bolt', 'magic_missile', 'fireball'],
        preparedSpells: ['fire_bolt', 'magic_missile'],
        concentration: null,
      }
      expect(character.knownSpells).toHaveLength(3)
      expect(character.preparedSpells).toHaveLength(2)
      expect(character.concentration).toBeNull()
    })
  })
})
