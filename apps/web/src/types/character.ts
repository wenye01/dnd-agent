import type { Ability, AbilityScores, Condition } from './game'

// 死亡豁免
export interface DeathSaves {
  successes: number
  failures: number
}

// 技能熟练
export interface SkillProficiencies {
  [skill: string]: boolean
}

// 装备槽
export interface EquipmentSlot {
  slot: string
  itemId: string | null
}

// 物品类型
export type ItemType =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'ring'
  | 'amulet'
  | 'cloak'
  | 'tool'
  | 'gear'
  | 'treasure'
  | 'ammo'

// 物品稀有度
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary'

// 背包物品
export interface InventoryItem {
  id: string
  name: string
  quantity: number
  weight?: number
  description?: string
  type?: ItemType
  rarity?: ItemRarity
  value?: number
  // Weapon properties
  damage?: string
  damageType?: string
  // Armor properties
  armorClass?: number
  // Consumable properties
  charges?: number
  maxCharges?: number
  // Spell properties (scrolls, wands)
  spellLevel?: number
  spellId?: string
  // Equipment slot this item fits into
  equipSlot?: string
  // Display
  icon?: string
}

// 法术学派
export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

// 法术定义
export interface Spell {
  id: string
  name: string
  level: number
  school: SpellSchool
  castingTime: string
  range: string
  duration: string
  components: string
  description: string
  ritual: boolean
  concentration: boolean
  // Higher level casting
  higherLevel?: string
  // Damage info
  damage?: string
  damageType?: string
  // Save info
  saveType?: string
  saveDc?: number
  // Display
  icon?: string
}

// 法术位
export interface SpellSlotLevel {
  max: number
  used: number
}

// 法术位映射 (1-9级)
export type SpellSlots = Record<number, SpellSlotLevel>

// 专注状态
export interface ConcentrationState {
  spellId: string
  spellName: string
  casterId: string
  targetId?: string
  remainingRounds?: number
}

// 角色定义
export interface Character {
  id: string
  name: string
  race: string
  class: string
  level: number
  background: string
  alignment: string

  // 属性
  abilityScores: AbilityScores

  // 战斗属性
  maxHitPoints: number
  currentHitPoints: number
  temporaryHitPoints: number
  armorClass: number
  speed: number
  initiative: number
  proficiencyBonus: number

  // 技能
  skills: SkillProficiencies
  savingThrows: Ability[]

  // 状态
  conditions: Condition[]
  deathSaves?: DeathSaves

  // 装备
  equipment: EquipmentSlot[]
  inventory: InventoryItem[]

  // 法术位
  spellSlots?: SpellSlots

  // 已知法术
  knownSpells?: string[]
  // 已准备法术
  preparedSpells?: string[]
  // 专注状态
  concentration?: ConcentrationState | null
}

// 怪物/NPC (简化版角色)
export interface Monster {
  id: string
  name: string
  type: string
  cr: number // Challenge Rating

  // 战斗属性
  maxHitPoints: number
  currentHitPoints: number
  armorClass: number
  speed: number
  initiative: number

  // 状态
  conditions: Condition[]
}
