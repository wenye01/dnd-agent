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

// 背包物品
export interface InventoryItem {
  id: string
  name: string
  quantity: number
  weight?: number
  description?: string
}

// 法术位
export interface SpellSlotLevel {
  max: number
  used: number
}

// 法术位映射 (1-9级)
export type SpellSlots = Record<number, SpellSlotLevel>

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
