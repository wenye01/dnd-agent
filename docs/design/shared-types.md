# 共享类型定义

> **版本**: v1.0
> **创建日期**: 2026-03-17
> **目的**: 统一前后端类型定义，避免重复

---

## 1. 概述

本文档定义了 D&D 游戏系统中所有模块共享的基础类型。所有模块设计文档应引用本定义，不得重复定义。

**唯一真实来源原则**：
- 接口文档 (`interfaces.md`) 定义协议层类型
- 本文档定义业务层共享类型
- 各模块文档引用本定义，不重复定义

---

## 2. 基础类型

### 2.1 位置和坐标

```typescript
// 2D 坐标位置
interface Position {
  x: number;
  y: number;
}
```

```go
// Go 后端定义
type Position struct {
    X int `json:"x"`
    Y int `json:"y"`
}
```

### 2.2 属性系统

```typescript
// 六大属性
type Ability =
  | 'strength'      // 力量
  | 'dexterity'     // 敏捷
  | 'constitution'  // 体质
  | 'intelligence'  // 智力
  | 'wisdom'        // 感知
  | 'charisma';     // 魅力

// 属性值集合
interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// 属性调整值集合
interface AbilityModifiers {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}
```

```go
// Go 后端定义
type Ability string

const (
    AbilityStrength     Ability = "strength"
    AbilityDexterity    Ability = "dexterity"
    AbilityConstitution Ability = "constitution"
    AbilityIntelligence Ability = "intelligence"
    AbilityWisdom       Ability = "wisdom"
    AbilityCharisma     Ability = "charisma"
)

type AbilityScores struct {
    Strength     int `json:"strength"`
    Dexterity    int `json:"dexterity"`
    Constitution int `json:"constitution"`
    Intelligence int `json:"intelligence"`
    Wisdom       int `json:"wisdom"`
    Charisma     int `json:"charisma"`
}

// AbilityModifiers 属性调整值集合
type AbilityModifiers struct {
    Strength     int `json:"strength"`
    Dexterity    int `json:"dexterity"`
    Constitution int `json:"constitution"`
    Intelligence int `json:"intelligence"`
    Wisdom       int `json:"wisdom"`
    Charisma     int `json:"charisma"`
}
```

### 2.3 技能系统

```typescript
// 18 种技能及其关联属性
type Skill =
  | 'acrobatics'        // DEX - 杂技
  | 'animal_handling'   // WIS - 驯兽
  | 'arcana'            // INT - 奥秘
  | 'athletics'         // STR - 运动
  | 'deception'         // CHA - 欺瞒
  | 'history'           // INT - 历史
  | 'insight'           // WIS - 洞悉
  | 'intimidation'      // CHA - 威吓
  | 'investigation'     // INT - 调查
  | 'medicine'          // WIS - 医药
  | 'nature'            // INT - 自然
  | 'perception'        // WIS - 察觉
  | 'performance'       // CHA - 表演
  | 'persuasion'        // CHA - 说服
  | 'religion'          // INT - 宗教
  | 'sleight_of_hand'   // DEX - 巧手
  | 'stealth'           // DEX - 潜行
  | 'survival';         // WIS - 生存

// 技能-属性映射
const SKILL_ABILITY_MAP: Record<Skill, Ability> = {
  acrobatics: 'dexterity',
  animal_handling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleight_of_hand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};
```

```go
// Go 后端定义 - 技能-属性映射
var SkillAbilityMap = map[Skill]Ability{
    SkillAcrobatics:     AbilityDexterity,
    SkillAnimalHandling: AbilityWisdom,
    SkillArcana:         AbilityIntelligence,
    SkillAthletics:      AbilityStrength,
    SkillDeception:      AbilityCharisma,
    SkillHistory:        AbilityIntelligence,
    SkillInsight:        AbilityWisdom,
    SkillIntimidation:   AbilityCharisma,
    SkillInvestigation:  AbilityIntelligence,
    SkillMedicine:       AbilityWisdom,
    SkillNature:         AbilityIntelligence,
    SkillPerception:     AbilityWisdom,
    SkillPerformance:    AbilityCharisma,
    SkillPersuasion:     AbilityCharisma,
    SkillReligion:       AbilityIntelligence,
    SkillSleightOfHand:  AbilityDexterity,
    SkillStealth:        AbilityDexterity,
    SkillSurvival:       AbilityWisdom,
}
```

---

## 3. 战斗相关类型

### 3.1 伤害类型

```typescript
// 13 种伤害类型
type DamageType =
  | 'acid'        // 酸
  | 'bludgeoning' // 钝击
  | 'cold'        // 寒冷
  | 'fire'        // 火焰
  | 'force'       // 力场
  | 'lightning'   // 闪电
  | 'necrotic'    // 死灵
  | 'piercing'    // 穿刺
  | 'poison'      // 毒素
  | 'psychic'     // 心灵
  | 'radiant'     // 光耀
  | 'slashing'    // 斩击
  | 'thunder';    // 雷鸣
```

```go
// Go 后端定义
type DamageType string

const (
    DamageTypeAcid        DamageType = "acid"
    DamageTypeBludgeoning DamageType = "bludgeoning"
    DamageTypeCold        DamageType = "cold"
    DamageTypeFire        DamageType = "fire"
    DamageTypeForce       DamageType = "force"
    DamageTypeLightning   DamageType = "lightning"
    DamageTypeNecrotic    DamageType = "necrotic"
    DamageTypePiercing    DamageType = "piercing"
    DamageTypePoison      DamageType = "poison"
    DamageTypePsychic     DamageType = "psychic"
    DamageTypeRadiant     DamageType = "radiant"
    DamageTypeSlashing    DamageType = "slashing"
    DamageTypeThunder     DamageType = "thunder"
)
```

### 3.2 状态效果

```typescript
// 15 种标准状态效果
type Condition =
  | 'blinded'       // 目盲
  | 'charmed'       // 魅惑
  | 'deafened'      // 耳聋
  | 'exhausted'     // 力竭
  | 'frightened'    // 恐惧
  | 'grappled'      // 擒抱
  | 'incapacitated' // 失能
  | 'invisible'     // 隐形
  | 'paralyzed'     // 麻痹
  | 'petrified'     // 石化
  | 'poisoned'      // 中毒
  | 'prone'         // 倒地
  | 'restrained'    // 束缚
  | 'stunned'       // 震慑
  | 'unconscious';  // 昏迷
```

```go
// Go 后端定义
type Condition string

const (
    ConditionBlinded       Condition = "blinded"
    ConditionCharmed       Condition = "charmed"
    ConditionDeafened      Condition = "deafened"
    ConditionExhausted     Condition = "exhausted"
    ConditionFrightened    Condition = "frightened"
    ConditionGrappled      Condition = "grappled"
    ConditionIncapacitated Condition = "incapacitated"
    ConditionInvisible     Condition = "invisible"
    ConditionParalyzed     Condition = "paralyzed"
    ConditionPetrified     Condition = "petrified"
    ConditionPoisoned      Condition = "poisoned"
    ConditionProne         Condition = "prone"
    ConditionRestrained    Condition = "restrained"
    ConditionStunned       Condition = "stunned"
    ConditionUnconscious   Condition = "unconscious"
)
```

### 3.3 单位状态

```typescript
// 战斗单位状态
type UnitStatus =
  | 'active'        // 正常行动
  | 'delayed'       // 延迟行动
  | 'ready'         // 准备行动
  | 'dead'          // 已死亡
  | 'incapacitated'; // 失能
```

```go
// Go 后端定义
type UnitStatus string

const (
    UnitStatusActive       UnitStatus = "active"
    UnitStatusDelayed      UnitStatus = "delayed"
    UnitStatusReady        UnitStatus = "ready"
    UnitStatusDead         UnitStatus = "dead"
    UnitStatusIncapacitated UnitStatus = "incapacitated"
)
```

### 3.4 生物体型

```typescript
// 生物体型（影响战斗规则）
type Size =
  | 'tiny'        // 微型
  | 'small'       // 小型
  | 'medium'      // 中型
  | 'large'       // 大型
  | 'huge'        // 超大型
  | 'gargantuan'; // 巨型
```

```go
// Go 后端定义
type Size string

const (
    SizeTiny       Size = "tiny"
    SizeSmall      Size = "small"
    SizeMedium     Size = "medium"
    SizeLarge      Size = "large"
    SizeHuge       Size = "huge"
    SizeGargantuan Size = "gargantuan"
)
```

### 3.5 物品类型

```typescript
// 物品类型
type ItemType =
  | 'weapon'      // 武器
  | 'armor'       // 护甲
  | 'shield'      // 盾牌
  | 'potion'      // 药水
  | 'scroll'      // 卷轴
  | 'wondrous'    // 奇物
  | 'ring'        // 戒指
  | 'wand'        // 魔杖
  | 'rod'         // 法杖
  | 'staff'       // 长杖
  | 'ammunition'  // 弹药
  | 'tool'        // 工具
  | 'gear'        // 装备
  | 'treasure';   // 宝物
```

```go
// Go 后端定义
type ItemType string

const (
    ItemTypeWeapon     ItemType = "weapon"
    ItemTypeArmor      ItemType = "armor"
    ItemTypeShield     ItemType = "shield"
    ItemTypePotion     ItemType = "potion"
    ItemTypeScroll     ItemType = "scroll"
    ItemTypeWondrous   ItemType = "wondrous"
    ItemTypeRing       ItemType = "ring"
    ItemTypeWand       ItemType = "wand"
    ItemTypeRod        ItemType = "rod"
    ItemTypeStaff      ItemType = "staff"
    ItemTypeAmmunition ItemType = "ammunition"
    ItemTypeTool       ItemType = "tool"
    ItemTypeGear       ItemType = "gear"
    ItemTypeTreasure   ItemType = "treasure"
)
```

### 3.6 物品稀有度

```typescript
// 物品稀有度
type Rarity =
  | 'common'      // 普通
  | 'uncommon'    // 非普通
  | 'rare'        // 稀有
  | 'very_rare'   // 极稀有
  | 'legendary'   // 传说
  | 'artifact';   // 神器
```

```go
// Go 后端定义
type Rarity string

const (
    RarityCommon    Rarity = "common"
    RarityUncommon  Rarity = "uncommon"
    RarityRare      Rarity = "rare"
    RarityVeryRare  Rarity = "very_rare"
    RarityLegendary Rarity = "legendary"
    RarityArtifact  Rarity = "artifact"
)
```

---

## 4. 检定相关类型

### 4.1 掷骰类型

```typescript
// 掷骰检定类型
type DiceRollType =
  | 'ability_check'  // 属性检定
  | 'saving_throw'   // 豁免检定
  | 'attack'         // 攻击检定
  | 'damage'         // 伤害掷骰
  | 'skill_check'    // 技能检定
  | 'initiative'     // 先攻检定
  | 'death_save'     // 死亡豁免
  | 'custom';        // 自定义
```

### 4.2 优劣势

```typescript
// 优劣势类型
type AdvantageType =
  | 'normal'    // 正常
  | 'advantage' // 优势（取两次中较高）
  | 'disadvantage'; // 劣势（取两次中较低）
```

```go
// Go 后端定义
type AdvantageType string

const (
    AdvantageNormal       AdvantageType = "normal"
    AdvantageAdvantage    AdvantageType = "advantage"
    AdvantageDisadvantage AdvantageType = "disadvantage"
)
```

---

## 5. 法术相关类型

### 5.1 法术学派

```typescript
// 8 种法术学派
type SpellSchool =
  | 'abjuration'     // 防护
  | 'conjuration'    // 咒法
  | 'divination'     // 预言
  | 'enchantment'    // 附魔
  | 'evocation'      // 塑能
  | 'illusion'       // 幻术
  | 'necromancy'     // 死灵
  | 'transmutation'; // 变化
```

### 5.2 法术组件

```typescript
// 法术组件
interface SpellComponents {
  verbal: boolean;    // 言语
  somatic: boolean;   // 姿势
  material?: {        // 材料
    components: string[];
    cost?: number;
    consumed?: boolean;
  };
}
```

---

## 6. 时间相关类型

### 6.1 游戏时间

```typescript
// 游戏内时间
interface GameTime {
  days: number;
  hours: number;
  minutes: number;
}
```

```go
// Go 后端定义
type GameTime struct {
    Days    int `json:"days"`
    Hours   int `json:"hours"`
    Minutes int `json:"minutes"`
}
```

---

## 7. 模块引用规范

### 7.1 后端模块引用

所有后端模块应从 `internal/shared/types/` 导入共享类型：

```go
// 正确示例
import (
    "dnd-game/internal/shared/types"
)

// 使用共享类型
func (c *Character) GetAbilityModifier(ability types.Ability) int {
    // ...
}
```

### 7.2 前端模块引用

所有前端模块应从 `types/shared.ts` 导入共享类型：

```typescript
// 正确示例
import { Ability, DamageType, Condition } from '@/types/shared';

// 使用共享类型
function calculateModifier(scores: AbilityScores, ability: Ability): number {
  // ...
}
```

### 7.3 禁止行为

❌ **禁止重复定义**：
- 各模块文档不得重复定义本文档中的类型
- 各模块代码不得在本地重新定义共享类型

✅ **正确做法**：
- 引用本文档或 `shared/types/` 包
- 如需扩展，使用类型组合或继承

---

## 8. 类型定义位置索引

| 类型 | 定义位置 | 使用模块 |
|------|----------|----------|
| Position | 本文档 §2.1 | Map, Character, Combat, Scenario |
| Ability | 本文档 §2.2 | Character, Dice, Spell, Combat |
| AbilityScores | 本文档 §2.2 | Character |
| Skill | 本文档 §2.3 | Character, Dice |
| DamageType | 本文档 §3.1 | Combat, Spell, Item |
| Condition | 本文档 §3.2 | Character, Combat, Spell |
| UnitStatus | 本文档 §3.3 | Combat |
| Size | 本文档 §3.4 | Character, Combat |
| ItemType | 本文档 §3.5 | Item, Inventory |
| Rarity | 本文档 §3.6 | Item, Loot |
| DiceRollType | 本文档 §4.1 | Dice, API |
| AdvantageType | 本文档 §4.2 | Dice, Combat |
| SpellSchool | 本文档 §5.1 | Spell |
| SpellComponents | 本文档 §5.2 | Spell |
| GameTime | 本文档 §6.1 | State, Scenario |

---

**文档版本**：v1.0
**创建日期**：2026-03-17
**维护者**：架构设计师
