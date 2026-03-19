# 角色系统设计

> **模块名称**: character
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

角色系统负责 D&D 5e 角色的完整生命周期管理：
- 角色创建（种族、职业、背景、属性）
- 属性和调整值计算
- 技能熟练度管理
- 角色升级和成长
- HP、临时状态管理
- 休息恢复机制

### 1.2 模块边界

**包含**：
- 角色数据模型和验证
- 属性计算逻辑（调整值、熟练加值）
- 升级系统（HD、属性提升、特性获取）
- 休息机制（短休息、长休息）
- 死亡豁免规则

**不包含**：
- 战斗行动（由战斗系统负责）
- 法术施放（由法术系统负责）
- 物品管理（由物品系统负责）

---

## 2. 目录结构

```
internal/server/character/
├── character.go           # 角色模型定义
├── creator.go             # 角色创建器
├── stats.go               # 属性计算
├── skills.go              # 技能管理
├── progression.go         # 升级系统
├── rest.go                # 休息机制
├── death.go               # 死亡豁免
├── validation.go          # 数据验证
└── effects.go             # 状态效果应用
```

---

## 3. 数据模型

### 3.1 核心角色模型

```go
// internal/server/character/character.go

type Character struct {
    // 基础信息
    ID          CharacterID `json:"id"`
    Name        string      `json:"name"`
    PlayerOwned bool        `json:"playerOwned"` // 是否玩家角色

    // 种族和职业
    Race        *Race       `json:"race"`
    Class       *Class      `json:"class"`
    Background  *Background `json:"background"`
    Level       int         `json:"level"`

    // 属性
    AbilityScores   AbilityScores   `json:"abilityScores"`
    AbilityImprovements int         `json:"abilityImprovements"` // 已用属性提升次数

    // 生命值
    MaxHP           int `json:"maxHp"`
    CurrentHP       int `json:"currentHp"`
    TemporaryHP     int `json:"temporaryHp"`
    HitDice         HitDice `json:"hitDice"`

    // 死亡豁免（仅 0 HP 时使用）
    DeathSaves      DeathSaves `json:"deathSaves"`

    // 速度和体型
    Speed           int    `json:"speed"`
    Size            Size   `json:"size"`

    // 技能和熟练
    SkillProficiencies  map[Skill]bool `json:"skillProficiencies"`
    SavingThrowProficiencies map[Ability]bool `json:"savingThrowProficiencies"`
    ToolProficiencies   map[string]bool `json:"toolProficiencies"`
    Languages          []string `json:"languages"`

    // 特性
    Features        []Feature   `json:"features"`
    Feats           []Feat      `json:"feats"`

    // 法术相关
    SpellSlots      SpellSlots  `json:"spellSlots"`
    SpellsKnown     []string    `json:"spellsKnown"`
    SpellsPrepared  []string    `json:"spellsPrepared"`
    Concentration   *Concentration `json:"concentration,omitempty"`

    // 装备和物品
    Equipment       Equipment   `json:"equipment"`
    Inventory       *Inventory  `json:"inventory"`

    // 位置
    Position        *Position   `json:"position,omitempty"`

    // 状态效果
    Conditions      []Condition `json:"conditions"`

    // 经验值
    ExperiencePoints int `json:"experiencePoints"`
}

type CharacterID string
```

### 3.2 属性定义

```go
type Ability string

const (
    Strength     Ability = "strength"
    Dexterity    Ability = "dexterity"
    Constitution Ability = "constitution"
    Intelligence Ability = "intelligence"
    Wisdom       Ability = "wisdom"
    Charisma     Ability = "charisma"
)

type AbilityScores struct {
    Strength     int `json:"strength"`
    Dexterity    int `json:"dexterity"`
    Constitution int `json:"constitution"`
    Intelligence int `json:"intelligence"`
    Wisdom       int `json:"wisdom"`
    Charisma     int `json:"charisma"`
}

type AbilityModifiers struct {
    Strength     int `json:"strength"`
    Dexterity    int `json:"dexterity"`
    Constitution int `json:"constitution"`
    Intelligence int `json:"intelligence"`
    Wisdom       int `json:"wisdom"`
    Charisma     int `json:"charisma"`
}
```

### 3.3 种族定义

```go
type Race struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    Description string   `json:"description"`
    Size        Size     `json:"size"`
    Speed       int      `json:"speed"`

    // 属性加值
    AbilityBonus AbilityScoreBonus `json:"abilityBonus"`

    // 种族特性
    Traits []RaceTrait `json:"traits"`

    // 语言
    Languages []string `json:"languages"`

    // 子种族
    Subraces []Subrace `json:"subraces,omitempty"`
}

type AbilityScoreBonus struct {
    Type    string          // "fixed" 或 "choice"
    Fixed   AbilityScores   `json:"fixed,omitempty"`
    Choices []AbilityChoice `json:"choices,omitempty"` // 如半精灵、提夫林
}

type AbilityChoice struct {
    Ability Ability `json:"ability"`
    Bonus   int     `json:"bonus"`
}

type RaceTrait struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Effect      Effect `json:"effect,omitempty"`
}
```

### 3.4 职业定义

```go
type Class struct {
    ID             string `json:"id"`
    Name           string `json:"name"`
    Description    string `json:"description"`
    HitDie         int    `json:"hitDie"` // 6, 8, 10, 12

    // 主要属性
    PrimaryAbilities []Ability `json:"primaryAbilities"`

    // 豁免熟练
    SavingThrowProficiencies []Ability `json:"savingThrowProficiencies"`

    // 护甲和武器熟练
    ArmorProficiencies   []string `json:"armorProficiencies"`
    WeaponProficiencies  []string `json:"weaponProficiencies"`

    // 技能选择
    SkillChoices struct {
        Count int      `json:"count"` // 可选数量
        From  []Skill `json:"from"`  // 可选列表
    } `json:"skillChoices"`

    // 职业特性（按等级）
    Features map[int][]ClassFeature `json:"features"`

    // 法术相关
    Spellcasting *SpellcastingInfo `json:"spellcasting,omitempty"`
}

type ClassFeature struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Level       int    `json:"level"`
    Effect      Effect `json:"effect,omitempty"`
}

type SpellcastingInfo struct {
    Ability          Ability `json:"ability"`           // 施法属性
    RitualCasting    bool    `json:"ritualCasting"`     // 仪式施法
    Spellbook        bool    `json:"spellbook"`         // 是否有法术书
    SpellsKnown      map[int]int `json:"spellsKnown"`   // 各等级已知法术
    CantripsKnown    int     `json:"cantripsKnown"`     // 戏法数量
    SpellPreparation bool    `json:"spellPreparation"`  // 是否需要准备
}
```

### 3.5 背景定义

```go
type Background struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"`

    // 技能熟练
    SkillProficiencies []Skill `json:"skillProficiencies"`

    // 工具熟练
    ToolProficiencies []string `json:"toolProficiencies"`

    // 语言
    Languages int `json:"languages"` // 额外语言数量

    // 背景特性
    Feature BackgroundFeature `json:"feature"`

    // 起始装备
    Equipment []EquipmentItem `json:"equipment"`
}

type BackgroundFeature struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Effect      Effect `json:"effect,omitempty"`
}
```

### 3.6 生命骰

```go
type HitDice struct {
    Total   int `json:"total"`   // 总数 = 等级
    Current int `json:"current"` // 剩余可用
    Size    int `json:"size"`    // 骰子大小 (6, 8, 10, 12)
}
```

### 3.7 死亡豁免

```go
type DeathSaves struct {
    Successes int `json:"successes"` // 成功次数（3 次稳定）
    Failures  int `json:"failures"`  // 失败次数（3 次死亡）
}
```

---

## 4. 对外接口

### 4.1 角色创建器

```go
// internal/server/character/creator.go

type Creator struct {
    raceData       map[string]*Race
    classData      map[string]*Class
    backgroundData map[string]*Background
}

func NewCreator(raceData, classData, backgroundData interface{}) *Creator

// 创建角色
func (c *Creator) CreateCharacter(req *CreateCharacterRequest) (*Character, error)

// 获取可用选项
func (c *Creator) GetAvailableRaces() []*Race
func (c *Creator) GetAvailableClasses() []*Class
func (c *Creator) GetAvailableBackgrounds() []*Background
func (c *Creator) GetClassSkillOptions(classID string) ([]Skill, int)

type CreateCharacterRequest struct {
    Name            string         `json:"name"`
    RaceID          string         `json:"raceId"`
    SubraceID       string         `json:"subraceId,omitempty"`
    ClassID         string         `json:"classId"`
    BackgroundID    string         `json:"backgroundId"`
    AbilityScores   AbilityScores  `json:"abilityScores"`
    SkillChoices    []Skill        `json:"skillChoices"`
    ToolChoices     []string       `json:"toolChoices,omitempty"`
    LanguageChoices []string       `json:"languageChoices,omitempty"`
}
```

### 4.2 属性计算

```go
// internal/server/character/stats.go

type StatsCalculator struct{}

func NewStatsCalculator() *StatsCalculator

// 计算属性调整值
func (sc *StatsCalculator) GetModifier(score int) int

// 计算所有属性调整值
func (sc *StatsCalculator) GetModifiers(scores AbilityScores) AbilityModifiers

// 计算熟练加值
func (sc *StatsCalculator) GetProficiencyBonus(level int) int

// 计算最大 HP
func (sc *StatsCalculator) CalculateMaxHP(char *Character) int

// 计算护甲等级
func (sc *StatsCalculator) CalculateAC(char *Character) int

// 计算先攻调整值
func (sc *StatsCalculator) CalculateInitiative(char *Character) int

// 计算被动察觉
func (sc *StatsCalculator) CalculatePassivePerception(char *Character) int
```

### 4.3 升级系统

```go
// internal/server/character/progression.go

type ProgressionManager struct {
    calculator *StatsCalculator
}

func NewProgressionManager(calculator *StatsCalculator) *ProgressionManager

// 升级
func (pm *ProgressionManager) LevelUp(char *Character, opts *LevelUpOptions) error

// 检查是否可以升级
func (pm *ProgressionManager) CanLevelUp(char *Character) bool

// 获取升级所需经验值
func (pm *ProgressionManager) GetXPRequirement(level int) int

// 增加经验值
func (pm *ProgressionManager) AddXP(char *Character, xp int) (leveledUp bool)

type LevelUpOptions struct {
    // 属性提升（每 4 级可选）
    AbilityImprovement *AbilityImprovement `json:"abilityImprovement,omitempty"`

    // 专长选择（替代属性提升）
    FeatID string `json:"featId,omitempty"`

    // 职业特性选择（如有）
    FeatureChoices map[string]interface{} `json:"featureChoices,omitempty"`
}

type AbilityImprovement struct {
    Ability Ability `json:"ability"`
    Bonus   int     `json:"bonus"` // 通常 +2 一个属性或 +1 两个属性
}
```

### 4.4 休息机制

```go
// internal/server/character/rest.go

type RestManager struct {
    calculator *StatsCalculator
}

func NewRestManager(calculator *StatsCalculator) *RestManager

// 短休息
func (rm *RestManager) ShortRest(char *Character, spentHD []int) (*ShortRestResult, error)

// 长休息
func (rm *RestManager) LongRest(char *Character) (*LongRestResult, error)

type ShortRestResult struct {
    HPHealed    int `json:"hpHealed"`
    HitDiceUsed int `json:"hitDiceUsed"`
}

type LongRestResult struct {
    HPRecovered     int `json:"hpRecovered"`
    HitDiceRecovered int `json:"hitDiceRecovered"`
    FeaturesRecovered []string `json:"featuresRecovered"`
    SpellSlotsRecovered SpellSlots `json:"spellSlotsRecovered"`
}
```

### 4.5 死亡豁免

```go
// internal/server/character/death.go

type DeathManager struct {
    roller *dice.Roller
}

func NewDeathManager(roller *dice.Roller) *DeathManager

// 进行死亡豁免
func (dm *DeathManager) DeathSave(char *Character) (*DeathSaveResult, error)

// 稳定角色
func (dm *DeathManager) Stabilize(char *Character)

// 角色死亡
func (dm *DeathManager) Kill(char *Character)

// 复活角色
func (dm *DeathManager) Revive(char *Character, hp int)

type DeathSaveResult struct {
    Roll       int  `json:"roll"`
    Success    bool `json:"success"`
    Critical   bool `json:"critical"` // 1 = 2 失败, 20 = 恢复 1 HP
    Stable     bool `json:"stable"`   // 3 次成功
    Dead       bool `json:"dead"`     // 3 次失败
    Revived    bool `json:"revived"`  // 掷出 20
}
```

---

## 5. 组件划分

### 5.1 属性计算器

```go
// internal/server/character/stats.go

// GetModifier 计算属性调整值
// 公式: floor((score - 10) / 2)
func (sc *StatsCalculator) GetModifier(score int) int {
    return (score - 10) / 2
}

// GetProficiencyBonus 计算熟练加值
// 公式: 2 + ((level - 1) / 4)
func (sc *StatsCalculator) GetProficiencyBonus(level int) int {
    return 2 + ((level - 1) / 4)
}

// CalculateMaxHP 计算 HP
// 公式: HD + CON_mod + sum(HD_roll + CON_mod) for each level after 1
func (sc *StatsCalculator) CalculateMaxHP(char *Character) int {
    conMod := sc.GetModifier(char.AbilityScores.Constitution)
    baseHP := char.Class.HitDie + conMod

    // 后续等级使用平均值或掷骰
    for i := 2; i <= char.Level; i++ {
        baseHP += (char.Class.HitDie / 2 + 1) + conMod
    }

    return baseHP
}

// CalculateAC 计算 AC
func (sc *StatsCalculator) CalculateAC(char *Character) int {
    armor := char.Equipment.Armor
    dexMod := sc.GetModifier(char.AbilityScores.Dexterity)

    if armor == nil {
        // 无甲: 10 + DEX mod
        return 10 + dexMod
    }

    // 根据护甲类型计算
    switch armor.ArmorType {
    case "light":
        return armor.AC + dexMod
    case "medium":
        return armor.AC + min(dexMod, 2)
    case "heavy":
        return armor.AC
    default:
        return 10 + dexMod
    }
}
```

### 5.2 技能管理器

```go
// internal/server/character/skills.go

type Skill string

const (
    Acrobatics     Skill = "acrobatics"     // DEX
    AnimalHandling Skill = "animal_handling" // WIS
    Arcana        Skill = "arcana"         // INT
    Athletics     Skill = "athletics"      // STR
    Deception     Skill = "deception"      // CHA
    History       Skill = "history"        // INT
    Insight       Skill = "insight"        // WIS
    Intimidation  Skill = "intimidation"   // CHA
    Investigation Skill = "investigation"  // INT
    Medicine      Skill = "medicine"       // WIS
    Nature        Skill = "nature"         // INT
    Perception    Skill = "perception"     // WIS
    Performance   Skill = "performance"    // CHA
    Persuasion    Skill = "persuasion"     // CHA
    Religion      Skill = "religion"       // INT
    SleightOfHand Skill = "sleight_of_hand" // DEX
    Stealth       Skill = "stealth"        // DEX
    Survival      Skill = "survival"       // WIS
)

// 技能对应属性映射
var SkillAbilities = map[Skill]Ability{
    Acrobatics:     Dexterity,
    AnimalHandling: Wisdom,
    Arcana:        Intelligence,
    Athletics:     Strength,
    Deception:     Charisma,
    History:       Intelligence,
    Insight:       Wisdom,
    Intimidation:  Charisma,
    Investigation: Intelligence,
    Medicine:      Wisdom,
    Nature:        Intelligence,
    Perception:    Wisdom,
    Performance:   Charisma,
    Persuasion:    Charisma,
    Religion:      Intelligence,
    SleightOfHand: Dexterity,
    Stealth:       Dexterity,
    Survival:      Wisdom,
}

// GetSkillModifier 获取技能调整值
func (sc *StatsCalculator) GetSkillModifier(char *Character, skill Skill) int {
    ability := SkillAbilities[skill]
    modifier := sc.GetModifier(char.GetAbilityScore(ability))

    if char.SkillProficiencies[skill] {
        modifier += sc.GetProficiencyBonus(char.Level)
    }

    return modifier
}
```

### 5.3 升级管理器

```go
// internal/server/character/progression.go

// 经验值需求表（PHB 第15页）
var XPRequirements = []int{
    0,     // 1级
    300,   // 2级
    900,   // 3级
    2700,  // 4级
    6500,  // 5级
    14000, // 6级
    23000, // 7级
    34000, // 8级
    48000, // 9级
    64000, // 10级
    85000, // 11级
    100000, // 12级
    120000, // 13级
    140000, // 14级
    165000, // 15级
    195000, // 16级
    225000, // 17级
    265000, // 18级
    305000, // 19级
    355000, // 20级
}

func (pm *ProgressionManager) LevelUp(char *Character, opts *LevelUpOptions) error {
    newLevel := char.Level + 1

    // 检查属性提升（战士和游荡者有额外机会）
    asiLevels := pm.getASILevels(char.Class.ID)
    if contains(asiLevels, newLevel) {
        if opts.AbilityImprovement != nil {
            pm.applyAbilityImprovement(char, opts.AbilityImprovement)
        } else if opts.FeatID != "" {
            pm.applyFeat(char, opts.FeatID)
        } else {
            return errors.New("ASI level requires ability improvement or feat")
        }
    }

    // 增加生命骰
    char.HitDice.Total++
    char.HitDice.Current++

    // 更新等级
    char.Level = newLevel

    // 获取新等级特性
    if features, ok := char.Class.Features[newLevel]; ok {
        char.Features = append(char.Features, features...)
    }

    // 更新法术位
    if char.Class.Spellcasting != nil {
        char.SpellSlots = pm.calculateSpellSlots(char)
    }

    // 重新计算 HP
    char.MaxHP = pm.calculator.CalculateMaxHP(char)

    return nil
}
```

---

## 6. 状态设计

### 6.1 角色状态

```go
type CharacterStatus string

const (
    StatusActive    CharacterStatus = "active"     // 正常
    StatusUnconscious CharacterStatus = "unconscious" // 昏迷 (0 HP)
    StatusStable    CharacterStatus = "stable"     // 稳定
    StatusDead      CharacterStatus = "dead"       // 死亡
)
```

### 6.2 HP 变化规则

```go
// ApplyDamage 应用伤害
func (char *Character) ApplyDamage(damage int) {
    // 先扣除临时 HP
    if char.TemporaryHP > 0 {
        if char.TemporaryHP >= damage {
            char.TemporaryHP -= damage
            return
        }
        damage -= char.TemporaryHP
        char.TemporaryHP = 0
    }

    // 扣除实际 HP
    char.CurrentHP -= damage

    // HP 不能为负
    if char.CurrentHP < 0 {
        char.CurrentHP = 0
    }
}

// ApplyHealing 应用治疗
func (char *Character) ApplyHealing(healing int) {
    char.CurrentHP += healing
    if char.CurrentHP > char.MaxHP {
        char.CurrentHP = char.MaxHP
    }

    // 恢复意识
    if char.CurrentHP > 0 {
        char.DeathSaves = DeathSaves{}
    }
}

// AddTemporaryHP 添加临时 HP
func (char *Character) AddTemporaryHP(tempHP int) {
    // 临时 HP 不能叠加，取较高值
    if tempHP > char.TemporaryHP {
        char.TemporaryHP = tempHP
    }
}
```

---

## 7. 模块间通信

### 7.1 与战斗系统通信

```go
// 战斗系统获取角色数据
func (char *Character) GetCombatData() *CombatantData {
    return &CombatantData{
        ID:          char.ID,
        Name:        char.Name,
        MaxHP:       char.MaxHP,
        CurrentHP:   char.CurrentHP,
        AC:          char.GetAC(),
        Initiative:  char.GetInitiative(),
        Speed:       char.Speed,
        Position:    char.Position,
        Conditions:  char.Conditions,
    }
}
```

### 7.2 与检定系统通信

```go
// 获取属性检定调整值
func (char *Character) GetAbilityCheckModifier(ability Ability, proficiency bool) int {
    mod := (char.AbilityScores.GetScore(ability) - 10) / 2
    if proficiency {
        mod += GetProficiencyBonus(char.Level)
    }
    return mod
}

// 获取豁免调整值
func (char *Character) GetSavingThrowModifier(ability Ability) int {
    mod := (char.AbilityScores.GetScore(ability) - 10) / 2
    if char.SavingThrowProficiencies[ability] {
        mod += GetProficiencyBonus(char.Level)
    }
    return mod
}
```

### 7.3 与法术系统通信

```go
// 检查是否可以施法
func (char *Character) CanCastSpell(spellLevel int) bool {
    if char.SpellSlots == nil {
        return false
    }
    return char.SpellSlots[spellLevel] > 0
}

// 消耗法术位
func (char *Character) ConsumeSpellSlot(level int) error {
    if !char.CanCastSpell(level) {
        return errors.New("no available spell slot")
    }
    char.SpellSlots[level]--
    return nil
}
```

---

## 8. 验证规则

### 8.1 角色创建验证

```go
// internal/server/character/validation.go

type Validator struct{}

func (v *Validator) ValidateCreateRequest(req *CreateCharacterRequest) error {
    // 验证属性值范围 (通常 3-20)
    if err := v.validateAbilityScores(req.AbilityScores); err != nil {
        return err
    }

    // 验证种族存在
    if !v.raceExists(req.RaceID) {
        return errors.New("invalid race")
    }

    // 验证职业存在
    if !v.classExists(req.ClassID) {
        return errors.New("invalid class")
    }

    // 验证技能选择数量
    if err := v.validateSkillChoices(req); err != nil {
        return err
    }

    return nil
}
```

### 8.2 属性值验证

```go
func (v *Validator) validateAbilityScores(scores AbilityScores) error {
    // 标准购点：总分 72-78，单属性 3-18
    for _, score := range []int{
        scores.Strength,
        scores.Dexterity,
        scores.Constitution,
        scores.Intelligence,
        scores.Wisdom,
        scores.Charisma,
    } {
        if score < 3 || score > 20 {
            return errors.New("ability score must be between 3 and 20")
        }
    }
    return nil
}
```

---

## 9. 测试用例

### 9.1 属性计算测试

```go
func TestGetModifier(t *testing.T) {
    tests := []struct {
        score    int
        expected int
    }{
        {1, -5},
        {10, 0},
        {14, 2},
        {18, 4},
        {20, 5},
    }

    calc := NewStatsCalculator()
    for _, tt := range tests {
        result := calc.GetModifier(tt.score)
        assert.Equal(t, tt.expected, result)
    }
}

func TestProficiencyBonus(t *testing.T) {
    tests := []struct {
        level    int
        expected int
    }{
        {1, 2},
        {4, 2},
        {5, 3},
        {9, 4},
        {13, 5},
        {17, 6},
    }

    calc := NewStatsCalculator()
    for _, tt := range tests {
        result := calc.GetProficiencyBonus(tt.level)
        assert.Equal(t, tt.expected, result)
    }
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
