# 角色系统组件设计

> **模块名称**: character
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 组件列表和职责

| 组件名称 | 文件 | 职责描述 |
|----------|------|----------|
| **CharacterManager** | manager.go | 角色生命周期管理、查询、更新 |
| **CharacterCreator** | creator.go | 角色创建流程、数据验证 |
| **StatsCalculator** | stats.go | 属性调整值、HP、AC、熟练加值计算 |
| **SkillManager** | skills.go | 技能熟练度管理、技能检定调整值 |
| **ProgressionManager** | progression.go | 升级系统、属性提升、特性获取 |
| **RestManager** | rest.go | 短休息、长休息处理 |
| **DeathManager** | death.go | 死亡豁免、昏迷、复活 |
| **ConditionTracker** | conditions.go | 状态效果追踪和管理 |
| **EffectProcessor** | effects.go | 临时效果应用和移除 |

> **注**：角色数据持久化由 `persistence` 模块统一处理，角色模块通过 `StateManager` 访问内存中的角色数据。

---

## 2. 组件接口定义

### 2.1 CharacterManager

```go
// internal/server/character/manager.go

package character

import (
    "context"
    "time"
)

// CharacterManager 角色管理器
type CharacterManager struct {
    creator      *CharacterCreator
    statsCalc    *StatsCalculator
    skillMgr     *SkillManager
    progression  *ProgressionManager
    restMgr      *RestManager
    deathMgr     *DeathManager
    conditionTrk *ConditionTracker
    effectProc   *EffectProcessor
    stateManager *state.Manager       // 状态管理器（内存数据访问）
    persistence  *persistence.Manager // 持久化管理器（事件记录）
    eventBus     *events.Bus
}

// NewCharacterManager 创建角色管理器
func NewCharacterManager(
    repository CharacterRepository,
    eventBus *events.Bus,
    raceData map[string]*Race,
    classData map[string]*Class,
    backgroundData map[string]*Background,
) *CharacterManager

// CreateCharacter 创建角色
func (m *CharacterManager) CreateCharacter(ctx context.Context, req *CreateCharacterRequest) (*Character, error)

// GetCharacter 获取角色
func (m *CharacterManager) GetCharacter(ctx context.Context, id string) (*Character, error)

// ListCharacters 列出角色
func (m *CharacterManager) ListCharacters(ctx context.Context, filter *CharacterFilter) ([]*Character, error)

// UpdateCharacter 更新角色
func (m *CharacterManager) UpdateCharacter(ctx context.Context, char *Character) error

// DeleteCharacter 删除角色
func (m *CharacterManager) DeleteCharacter(ctx context.Context, id string) error

// ApplyDamage 应用伤害
func (m *CharacterManager) ApplyDamage(ctx context.Context, characterID string, damage int, damageType string) (*DamageResult, error)

// ApplyHealing 应用治疗
func (m *CharacterManager) ApplyHealing(ctx context.Context, characterID string, healing int) (*HealResult, error)

// AddTempHP 添加临时HP
func (m *CharacterManager) AddTempHP(ctx context.Context, characterID string, tempHP int) error

// ModifyAbilityScore 修改属性值
func (m *CharacterManager) ModifyAbilityScore(ctx context.Context, characterID string, ability Ability, modifier int) error

// AddCondition 添加状态效果
func (m *CharacterManager) AddCondition(ctx context.Context, characterID string, condition Condition, duration int) error

// RemoveCondition 移除状态效果
func (m *CharacterManager) RemoveCondition(ctx context.Context, characterID string, condition Condition) error

// CharacterFilter 角色筛选器
type CharacterFilter struct {
    PlayerOwned *bool  `json:"playerOwned,omitempty"`
    MinLevel    *int   `json:"minLevel,omitempty"`
    MaxLevel    *int   `json:"maxLevel,omitempty"`
    ClassID     string `json:"classId,omitempty"`
    RaceID      string `json:"raceId,omitempty"`
}
```

### 2.2 CharacterCreator

```go
// internal/server/character/creator.go

// CharacterCreator 角色创建器
type CharacterCreator struct {
    validator    *CreatorValidator
    statsCalc    *StatsCalculator
    skillMgr     *SkillManager

    // 数据引用
    raceData       map[string]*Race
    classData      map[string]*Class
    backgroundData map[string]*Background
}

// CreatorValidator 创建验证器
type CreatorValidator struct {
    raceData       map[string]*Race
    classData      map[string]*Class
    backgroundData map[string]*Background
}

// NewCharacterCreator 创建角色创建器
func NewCharacterCreator(
    raceData map[string]*Race,
    classData map[string]*Class,
    backgroundData map[string]*Background,
) *CharacterCreator

// CreateCharacterRequest 创建角色请求
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
    FeatID          string         `json:"featId,omitempty"` // 变体人类
    Customization   *Customization `json:"customization,omitempty"`
}

// Customization 自定义选项
type Customization struct {
    Appearance   string `json:"appearance,omitempty"`
    Personality string `json:"personality,omitempty"`
    Backstory   string `json:"backstory,omitempty"`
    Notes       string `json:"notes,omitempty"`
}

// CreateCharacter 创建角色
func (c *CharacterCreator) CreateCharacter(req *CreateCharacterRequest) (*Character, error)

// ValidateRequest 验证创建请求
func (c *CharacterCreator) ValidateRequest(req *CreateCharacterRequest) error

// GetAvailableOptions 获取可用选项
func (c *CharacterCreator) GetAvailableOptions() *AvailableOptions

// AvailableOptions 可用选项
type AvailableOptions struct {
    Races      []*Race      `json:"races"`
    Classes    []*Class     `json:"classes"`
    Backgrounds []*Background `json:"backgrounds"`
}

// GetClassOptions 获取职业选项
func (c *CharacterCreator) GetClassOptions(classID string) (*ClassOptions, error)

// ClassOptions 职业选项
type ClassOptions struct {
    SkillChoices   []Skill `json:"skillChoices"`
    SkillCount     int     `json:"skillCount"`
    ToolChoices    []string `json:"toolChoices,omitempty"`
    ToolCount      int     `json:"toolCount,omitempty"`
    CantripsKnown  int     `json:"cantripsKnown,omitempty"`
    SpellsKnown    int     `json:"spellsKnown,omitempty"`
}
```

### 2.3 StatsCalculator

```go
// internal/server/character/stats.go

// StatsCalculator 属性计算器
type StatsCalculator struct {
    // 无状态组件
}

// NewStatsCalculator 创建属性计算器
func NewStatsCalculator() *StatsCalculator

// GetModifier 计算属性调整值
// 公式: floor((score - 10) / 2)
func (sc *StatsCalculator) GetModifier(score int) int

// GetModifiers 计算所有属性调整值
func (sc *StatsCalculator) GetModifiers(scores AbilityScores) AbilityModifiers

// GetProficiencyBonus 计算熟练加值
// 公式: 2 + floor((level - 1) / 4)
func (sc *StatsCalculator) GetProficiencyBonus(level int) int

// CalculateMaxHP 计算最大HP
func (sc *StatsCalculator) CalculateMaxHP(char *Character) int

// CalculateAC 计算护甲等级
func (sc *StatsCalculator) CalculateAC(char *Character) int

// CalculateInitiative 计算先攻调整值
func (sc *StatsCalculator) CalculateInitiative(char *Character) int

// CalculatePassivePerception 计算被动察觉
func (sc *StatsCalculator) CalculatePassivePerception(char *Character) int

// CalculatePassiveScore 计算被动技能
func (sc *StatsCalculator) CalculatePassiveScore(modifier int) int

// GetAbilityScore 获取属性值（含加值）
func (sc *StatsCalculator) GetAbilityScore(char *Character, ability Ability) int

// CalculateSpeed 计算速度（考虑状态效果）
func (sc *StatsCalculator) CalculateSpeed(char *Character) int

// CalculateCarryingCapacity 计算负重能力
func (sc *StatsCalculator) CalculateCarryingCapacity(str int) float64

// CalculateEncumbrance 计算负重状态
func (sc *StatsCalculator) CalculateEncumbrance(char *Character) EncumbranceStatus

// EncumbranceStatus 负重状态
type EncumbranceStatus string

const (
    EncumbranceNone   EncumbranceStatus = "none"
    EncumbranceMedium EncumbranceStatus = "medium" // 速度 -10
    EncumbranceHeavy  EncumbranceStatus = "heavy"  // 速度 20，劣势
)
```

### 2.4 SkillManager

```go
// internal/server/character/skills.go

// SkillManager 技能管理器
type SkillManager struct {
    statsCalc *StatsCalculator
}

// Skill 技能
type Skill string

const (
    Acrobatics     Skill = "acrobatics"
    AnimalHandling Skill = "animal_handling"
    Arcana        Skill = "arcana"
    Athletics     Skill = "athletics"
    Deception     Skill = "deception"
    History       Skill = "history"
    Insight       Skill = "insight"
    Intimidation  Skill = "intimidation"
    Investigation Skill = "investigation"
    Medicine      Skill = "medicine"
    Nature        Skill = "nature"
    Perception    Skill = "perception"
    Performance   Skill = "performance"
    Persuasion    Skill = "persuasion"
    Religion      Skill = "religion"
    SleightOfHand Skill = "sleight_of_hand"
    Stealth       Skill = "stealth"
    Survival      Skill = "survival"
)

// NewSkillManager 创建技能管理器
func NewSkillManager(statsCalc *StatsCalculator) *SkillManager

// GetSkillModifier 获取技能调整值
func (sm *SkillManager) GetSkillModifier(char *Character, skill Skill) int

// GetSkillAbility 获取技能对应属性
func (sm *SkillManager) GetSkillAbility(skill Skill) Ability

// IsProficient 检查是否熟练
func (sm *SkillManager) IsProficient(char *Character, skill Skill) bool

// HasExpertise 检查是否有专精
func (sm *SkillManager) HasExpertise(char *Character, skill Skill) bool

// AddProficiency 添加熟练
func (sm *SkillManager) AddProficiency(char *Character, skill Skill) error

// RemoveProficiency 移除熟练
func (sm *SkillManager) RemoveProficiency(char *Character, skill Skill) error

// GetProficientSkills 获取熟练技能列表
func (sm *SkillManager) GetProficientSkills(char *Character) []Skill

// SkillAbilityMap 技能属性映射
var SkillAbilityMap = map[Skill]Ability{
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
```

### 2.5 ProgressionManager

```go
// internal/server/character/progression.go

// ProgressionManager 升级管理器
type ProgressionManager struct {
    statsCalc    *StatsCalculator
    skillMgr     *SkillManager
    effectProc   *EffectProcessor

    classData map[string]*Class
    featData  map[string]*Feat
}

// NewProgressionManager 创建升级管理器
func NewProgressionManager(
    statsCalc *StatsCalculator,
    skillMgr *SkillManager,
    effectProc *EffectProcessor,
    classData map[string]*Class,
    featData map[string]*Feat,
) *ProgressionManager

// CanLevelUp 检查是否可以升级
func (pm *ProgressionManager) CanLevelUp(char *Character) bool

// GetXPRequirement 获取升级所需经验值
func (pm *ProgressionManager) GetXPRequirement(level int) int

// AddXP 增加经验值
func (pm *ProgressionManager) AddXP(ctx context.Context, char *Character, xp int) (bool, error)

// LevelUp 升级
func (pm *ProgressionManager) LevelUp(ctx context.Context, char *Character, opts *LevelUpOptions) error

// GetLevelUpOptions 获取升级选项
func (pm *ProgressionManager) GetLevelUpOptions(char *Character) (*LevelUpOptions, error)

// LevelUpOptions 升级选项
type LevelUpOptions struct {
    // 属性提升（每4级可选）
    AbilityImprovement *AbilityImprovement `json:"abilityImprovement,omitempty"`

    // 专长选择（替代属性提升）
    FeatID string `json:"featId,omitempty"`

    // 职业特性选择（如有）
    FeatureChoices map[string]interface{} `json:"featureChoices,omitempty"`

    // 法术选择（施法职业）
    SpellChoices []string `json:"spellChoices,omitempty"`
}

// AbilityImprovement 属性提升
type AbilityImprovement struct {
    FirstAbility  Ability `json:"firstAbility"`
    FirstBonus    int     `json:"firstBonus"`    // 通常 +2
    SecondAbility Ability `json:"secondAbility,omitempty"`
    SecondBonus   int     `json:"secondBonus,omitempty"`
}

// XPRequirements 经验值需求表
var XPRequirements = []int{
    0,      // 1级
    300,    // 2级
    900,    // 3级
    2700,   // 4级
    6500,   // 5级
    14000,  // 6级
    23000,  // 7级
    34000,  // 8级
    48000,  // 9级
    64000,  // 10级
    85000,  // 11级
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

// GetASILevels 获取ASI等级
func (pm *ProgressionManager) GetASILevels(classID string) []int
```

### 2.6 RestManager

```go
// internal/server/character/rest.go

// RestManager 休息管理器
type RestManager struct {
    statsCalc  *StatsCalculator
    deathMgr   *DeathManager
    effectProc *EffectProcessor
}

// NewRestManager 创建休息管理器
func NewRestManager(
    statsCalc *StatsCalculator,
    deathMgr *DeathManager,
    effectProc *EffectProcessor,
) *RestManager

// ShortRestRequest 短休息请求
type ShortRestRequest struct {
    CharacterID string `json:"characterId"`
    UseHitDice  int    `json:"useHitDice"` // 使用生命骰数量
}

// ShortRestResult 短休息结果
type ShortRestResult struct {
    HPHealed      int    `json:"hpHealed"`
    HitDiceUsed   int    `json:"hitDiceUsed"`
    HitDiceRolls  []int  `json:"hitDiceRolls"`
    FeaturesUsed  []string `json:"featuresUsed,omitempty"`
}

// ShortRest 短休息
func (rm *RestManager) ShortRest(ctx context.Context, char *Character, useHitDice int) (*ShortRestResult, error)

// LongRestResult 长休息结果
type LongRestResult struct {
    HPFull         bool              `json:"hpFull"`
    HPRecovered    int               `json:"hpRecovered"`
    HitDiceRecovered int             `json:"hitDiceRecovered"`
    SpellSlotsRecovered SpellSlots    `json:"spellSlotsRecovered"`
    FeaturesRecovered []string       `json:"featuresRecovered"`
    ConditionsRemoved []Condition    `json:"conditionsRemoved"`
}

// LongRest 长休息
func (rm *RestManager) LongRest(ctx context.Context, char *Character) (*LongRestResult, error)

// RollHitDice 掷生命骰
func (rm *RestManager) RollHitDice(char *Character, count int) (int, []int, error)

// RecoverSpellSlots 恢复法术位
func (rm *RestManager) RecoverSpellSlots(char *Character, longRest bool) SpellSlots
```

### 2.7 DeathManager

```go
// internal/server/character/death.go

// DeathManager 死亡管理器
type DeathManager struct {
    roller *dice.Roller
    eventBus *events.Bus
}

// NewDeathManager 创建死亡管理器
func NewDeathManager(roller *dice.Roller, eventBus *events.Bus) *DeathManager

// DeathSaveRequest 死亡豁免请求
type DeathSaveRequest struct {
    CharacterID string `json:"characterId"`
    Advantage   bool   `json:"advantage"`
    Bonus       int    `json:"bonus"`
}

// DeathSaveResult 死亡豁免结果
type DeathSaveResult struct {
    Roll      int  `json:"roll"`
    Total     int  `json:"total"`
    Success   bool `json:"success"`
    Critical  bool `json:"critical"` // 1 = 2 失败, 20 = 恢复 1 HP
    Successes int  `json:"successes"`
    Failures  int  `json:"failures"`
    Stable    bool `json:"stable"` // 3 次成功
    Dead      bool `json:"dead"`   // 3 次失败
    Revived   bool `json:"revived"` // 掷出 20
    HP        int  `json:"hp,omitempty"`
}

// DeathSave 进行死亡豁免
func (dm *DeathManager) DeathSave(ctx context.Context, char *Character, advantage bool, bonus int) (*DeathSaveResult, error)

// Stabilize 稳定角色
func (dm *DeathManager) Stabilize(ctx context.Context, char *Character) error

// Kill 角色死亡
func (dm *DeathManager) Kill(ctx context.Context, char *Character) error

// Revive 复活角色
func (dm *DeathManager) Revive(ctx context.Context, char *Character, hp int) error

// IsDead 检查是否死亡
func (dm *DeathManager) IsDead(char *Character) bool

// IsUnconscious 检查是否昏迷
func (dm *DeathManager) IsUnconscious(char *Character) bool

// IsStable 检查是否稳定
func (dm *DeathManager) IsStable(char *Character) bool

// CheckDeathStatus 检查死亡状态
func (dm *DeathManager) CheckDeathStatus(char *Character) CharacterStatus

// CharacterStatus 角色状态
type CharacterStatus string

const (
    StatusActive      CharacterStatus = "active"
    StatusUnconscious CharacterStatus = "unconscious"
    StatusStable      CharacterStatus = "stable"
    StatusDead        CharacterStatus = "dead"
)
```

### 2.8 ConditionTracker

```go
// internal/server/character/conditions.go

// ConditionTracker 状态效果追踪器
type ConditionTracker struct {
    eventBus *events.Bus
}

// Condition 状态效果
type Condition string

const (
    ConditionBlinded     Condition = "blinded"
    ConditionCharmed     Condition = "charmed"
    ConditionDeafened    Condition = "deafened"
    ConditionExhaustion  Condition = "exhaustion"
    ConditionFrightened  Condition = "frightened"
    ConditionGrappled    Condition = "grappled"
    ConditionInvisible   Condition = "invisible"
    ConditionParalyzed   Condition = "paralyzed"
    ConditionPetrified   Condition = "petrified"
    ConditionPoisoned    Condition = "poisoned"
    ConditionProne       Condition = "prone"
    ConditionRestrained  Condition = "restrained"
    ConditionStunned     Condition = "stunned"
    ConditionUnconscious Condition = "unconscious"
)

// ActiveCondition 活跃状态效果
type ActiveCondition struct {
    Condition   Condition `json:"condition"`
    SourceID    string    `json:"sourceId,omitempty"`
    SourceType  string    `json:"sourceType,omitempty"` // "spell", "feature", "item", "environment"
    Duration    int       `json:"duration"` // 回合数，-1 表示永久，0 表示直到结束
    Remaining   int       `json:"remaining"`
    AppliedAt   time.Time `json:"appliedAt"`
    Value       int       `json:"value,omitempty"` // 用于 exhaustion 等级
}

// NewConditionTracker 创建状态追踪器
func NewConditionTracker(eventBus *events.Bus) *ConditionTracker

// ApplyCondition 应用状态效果
func (ct *ConditionTracker) ApplyCondition(char *Character, condition Condition, sourceID string, duration int) error

// RemoveCondition 移除状态效果
func (ct *ConditionTracker) RemoveCondition(char *Character, condition Condition) error

// HasCondition 检查是否有状态效果
func (ct *ConditionTracker) HasCondition(char *Character, condition Condition) bool

// GetCondition 获取状态效果
func (ct *ConditionTracker) GetCondition(char *Character, condition Condition) *ActiveCondition

// ProcessConditions 处理状态效果（回合开始/结束时调用）
func (ct *ConditionTracker) ProcessConditions(ctx context.Context, char *Character, phase string) error

// DecreaseDurations 减少持续时间
func (ct *ConditionTracker) DecreaseDurations(char *Character)

// GetConditionsByType 按类型获取状态效果
func (ct *ConditionTracker) GetConditionsByType(char *Character) []Condition

// ClearConditions 清除所有状态效果
func (ct *ConditionTracker) ClearConditions(char *Character) error

// GetConditionModifiers 获取状态效果调整值
func (ct *ConditionTracker) GetConditionModifiers(char *Character) ConditionModifiers

// ConditionModifiers 状态效果调整值
type ConditionModifiers struct {
    AttackRoll      int `json:"attackRoll"`
    AbilityCheck    int `json:"abilityCheck"`
    SavingThrow     int `json:"savingThrow"`
    AC              int `json:"ac"`
    Speed           int `json:"speed"`
    AdvantageAttack bool `json:"advantageAttack"` // 攻击有优势
    DisadvantageAttack bool `json:"disadvantageAttack"` // 攻击有劣势
    AdvantageAgainst []string `json:"advantageAgainst,omitempty"` // 对特定目标有优势
    DisadvantageFrom []string `json:"disadvantageFrom,omitempty"` // 特定来源有劣势
}
```

### 2.9 EffectProcessor

```go
// internal/server/character/effects.go

// EffectProcessor 效果处理器
type EffectProcessor struct {
    statsCalc  *StatsCalculator
    skillMgr   *SkillManager
    eventBus   *events.Bus
}

// Effect 效果
type Effect struct {
    ID          string       `json:"id"`
    Type        EffectType   `json:"type"`
    SourceID    string       `json:"sourceId,omitempty"`
    SourceType  string       `json:"sourceType,omitempty"`
    Modifier    EffectModifier `json:"modifier"`
    Duration    int          `json:"duration"` // 回合数
    Remaining   int          `json:"remaining"`
    Stacking    EffectStacking `json:"stacking"`
}

// EffectType 效果类型
type EffectType string

const (
    EffectTypeAbilityBonus   EffectType = "ability_bonus"
    EffectTypeSkillBonus     EffectType = "skill_bonus"
    EffectTypeACBonus        EffectType = "ac_bonus"
    EffectTypeSpeedBonus     EffectType = "speed_bonus"
    EffectTypeDamageBonus    EffectType = "damage_bonus"
    EffectTypeSaveBonus      EffectType = "save_bonus"
    EffectTypeAttackBonus    EffectType = "attack_bonus"
    EffectTypeResistance     EffectType = "resistance"
    EffectTypeImmunity       EffectType = "immunity"
    EffectTypeVulnerability  EffectType = "vulnerability"
)

// EffectModifier 效果调整值
type EffectModifier struct {
    Ability  Ability `json:"ability,omitempty"`
    Skill    Skill   `json:"skill,omitempty"`
    Value    int     `json:"value"`
    Dice     string  `json:"dice,omitempty"` // 用于骰子加值
    DamageType string `json:"damageType,omitempty"`
}

// EffectStacking 效果叠加规则
type EffectStacking string

const (
    StackingNone   EffectStacking = "none"    // 不叠加，取最高值
    StackingAdd    EffectStacking = "add"     // 叠加
    StackingReplace EffectStacking = "replace" // 替换
)

// NewEffectProcessor 创建效果处理器
func NewEffectProcessor(
    statsCalc *StatsCalculator,
    skillMgr *SkillManager,
    eventBus *events.Bus,
) *EffectProcessor

// ApplyEffect 应用效果
func (ep *EffectProcessor) ApplyEffect(char *Character, effect *Effect) error

// RemoveEffect 移除效果
func (ep *EffectProcessor) RemoveEffect(char *Character, effectID string) error

// GetEffects 获取所有效果
func (ep *EffectProcessor) GetEffects(char *Character) []*Effect

// GetEffectsByType 按类型获取效果
func (ep *EffectProcessor) GetEffectsByType(char *Character, effectType EffectType) []*Effect

// CalculateEffectBonus 计算效果加值
func (ep *EffectProcessor) CalculateEffectBonus(char *Character, effectType EffectType, target string) int

// ProcessEffects 处理效果（回合结束时调用）
func (ep *EffectProcessor) ProcessEffects(ctx context.Context, char *Character) error

// DecreaseDurations 减少持续时间
func (ep *EffectProcessor) DecreaseDurations(char *Character)

// ClearExpiredEffects 清除过期效果
func (ep *EffectProcessor) ClearExpiredEffects(char *Character)
```

### 2.10 角色状态存储（内存管理）

角色数据存储在内存中，由共享状态管理器统一管理。持久化由专门的持久化模块负责。

```go
// 角色数据存储在 GameState 中
type GameState struct {
    // ...
    Party   []*Character        `json:"party"`   // 玩家角色列表
    NPCs    map[string]*NPC     `json:"npcs"`    // NPC 字典
    Enemies map[string]*Enemy   `json:"enemies"` // 敌人字典
    // ...
}

// StateManager 提供角色访问方法
func (sm *StateManager) GetCharacter(sessionID, characterID string) *Character
func (sm *StateManager) UpdateCharacter(sessionID string, char *Character) error
func (sm *StateManager) AddCharacter(sessionID string, char *Character) error
func (sm *StateManager) RemoveCharacter(sessionID, characterID string) error

// 持久化由 PersistenceManager 负责
// - SaveState() 定期保存完整状态快照
// - LogStateChange() 记录状态变更事件
```

**存储策略**：
- **运行时**：所有角色数据存储在内存的 GameState 中
- **持久化**：通过 PersistenceManager 定期保存到 JSONL 文件
- **恢复**：启动时从 JSONL 文件加载完整状态

---

## 3. 组件内部结构设计

### 3.1 CharacterManager 内部结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      CharacterManager                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│   │   Character   │  │    Stats      │  │    Skill      │     │
│   │   Creator     │  │   Calculator  │  │   Manager     │     │
│   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘     │
│           │                  │                  │               │
│           └──────────────────┼──────────────────┘               │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │ Progression   │  │     Rest        │  │    Death      │   │
│   │   Manager     │  │    Manager      │  │   Manager     │   │
│   └───────┬───────┘  └─────────────────┘  └───────┬───────┘   │
│           │                                          │           │
│           └──────────────────┬───────────────────────┘           │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │  Condition    │  │     Effect      │  │   Repository  │   │
│   │  Tracker      │  │   Processor     │  │               │   │
│   └───────────────┘  └─────────────────┘  └───────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 角色数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        角色数据流                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                             │
│   │  创建角色    │                                             │
│   └──────┬───────┘                                             │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │  数据验证    │────▶│  应用种族    │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │  应用职业    │────▶│  应用背景    │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │  计算属性    │────▶│  计算HP/AC   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          └─────────┬──────────┘                                 │
│                    ▼                                            │
│          ┌───────────────────┐                                  │
│          │   保存角色数据     │                                  │
│          └─────────┬─────────┘                                  │
│                    ▼                                            │
│          ┌───────────────────┐                                  │
│          │  发布角色创建事件  │                                  │
│          └───────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 组件间通信方式

### 4.1 依赖注入

```go
// CharacterManager 依赖其他组件
type CharacterManager struct {
    creator      *CharacterCreator
    statsCalc    *StatsCalculator
    skillMgr     *SkillManager
    progression  *ProgressionManager
    // ...
}

// 创建时注入依赖
func NewCharacterManager(
    repository CharacterRepository,
    eventBus *events.Bus,
    raceData map[string]*Race,
    classData map[string]*Class,
    backgroundData map[string]*Background,
) *CharacterManager {
    statsCalc := NewStatsCalculator()
    skillMgr := NewSkillManager(statsCalc)
    // ...
    return &CharacterManager{
        statsCalc: statsCalc,
        skillMgr: skillMgr,
        // ...
    }
}
```

### 4.2 事件发布

```go
// 角色创建事件
type CharacterEvent struct {
    Type      CharacterEventType `json:"type"`
    Character *Character         `json:"character"`
    Timestamp int64              `json:"timestamp"`
}

type CharacterEventType string

const (
    CharacterEventCreated  CharacterEventType = "created"
    CharacterEventUpdated  CharacterEventType = "updated"
    CharacterEventDeleted  CharacterEventType = "deleted"
    CharacterEventLeveled  CharacterEventType = "leveled"
    CharacterEventDied     CharacterEventType = "died"
    CharacterEventRevived  CharacterEventType = "revived"
)

// 发布事件
func (m *CharacterManager) publishEvent(eventType CharacterEventType, char *Character) {
    m.eventBus.Publish(CharacterEvent{
        Type:      eventType,
        Character: char,
        Timestamp: time.Now().Unix(),
    })
}
```

### 4.3 回调链

```go
// CreateCharacter 创建角色时的处理链
func (m *CharacterManager) CreateCharacter(ctx context.Context, req *CreateCharacterRequest) (*Character, error) {
    // 1. 验证请求
    if err := m.creator.ValidateRequest(req); err != nil {
        return nil, err
    }

    // 2. 创建基础角色
    char, err := m.creator.CreateCharacter(req)
    if err != nil {
        return nil, err
    }

    // 3. 计算属性
    char.MaxHP = m.statsCalc.CalculateMaxHP(char)
    char.AC = m.statsCalc.CalculateAC(char)

    // 4. 设置技能
    m.skillMgr.SetProficiencies(char, req.SkillChoices)

    // 5. 保存到存储
    if err := m.repository.Save(ctx, char); err != nil {
        return nil, err
    }

    // 6. 发布事件
    m.publishEvent(CharacterEventCreated, char)

    return char, nil
}
```

---

## 5. 状态管理设计

### 5.1 角色状态存储（内存 + JSONL 持久化）

```go
// 角色数据存储在 GameState 中，由 StateManager 统一管理
// 持久化由 PersistenceManager 负责

// StateManager 中的角色操作方法
type StateManager struct {
    // ...
    persistence *persistence.Manager
}

// GetCharacter 获取角色
func (sm *StateManager) GetCharacter(sessionID, characterID string) *Character {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    state := sm.states[sessionID]
    if state == nil {
        return nil
    }

    // 查找玩家角色
    for _, char := range state.Party {
        if char.ID == characterID {
            return char
        }
    }

    // 查找 NPC
    if npc, ok := state.NPCs[characterID]; ok {
        return npc.Character
    }

    // 查找敌人
    if enemy, ok := state.Enemies[characterID]; ok {
        return enemy.Character
    }

    return nil
}

// UpdateCharacter 更新角色
func (sm *StateManager) UpdateCharacter(sessionID string, char *Character) error {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    state := sm.states[sessionID]
    if state == nil {
        return ErrSessionNotFound
    }

    // 更新玩家角色
    for i, c := range state.Party {
        if c.ID == char.ID {
            oldChar := *c // 复制旧值
            state.Party[i] = char

            // 记录变更
            sm.persistence.LogStateChange(sessionID,
                fmt.Sprintf("party.%s", char.ID),
                oldChar, char)

            return nil
        }
    }

    // 更新 NPC
    if npc, ok := state.NPCs[char.ID]; ok {
        oldChar := npc.Character
        npc.Character = char

        sm.persistence.LogStateChange(sessionID,
            fmt.Sprintf("npcs.%s", char.ID),
            oldChar, char)

        return nil
    }

    return ErrCharacterNotFound
}

// AddCharacter 添加角色到队伍
func (sm *StateManager) AddCharacter(sessionID string, char *Character) error {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    state := sm.states[sessionID]
    if state == nil {
        return ErrSessionNotFound
    }

    state.Party = append(state.Party, char)

    // 记录事件
    sm.persistence.LogCharacterCreated(sessionID, char.ID, char.Name, char.RaceID, char.ClassID)

    return nil
}

// RemoveCharacter 从队伍移除角色
func (sm *StateManager) RemoveCharacter(sessionID, characterID string) error {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    state := sm.states[sessionID]
    if state == nil {
        return ErrSessionNotFound
    }

    for i, char := range state.Party {
        if char.ID == characterID {
            state.Party = append(state.Party[:i], state.Party[i+1:]...)
            return nil
        }
    }

    return ErrCharacterNotFound
}
```

### 5.2 状态变更日志

```go
// 变更日志由 PersistenceManager 的事件系统处理
// 参见 persistence-components.md 中的 EventManager

// CharacterManager 中的变更记录
type CharacterManager struct {
    stateManager *state.Manager
    persistence  *persistence.Manager
}

// ApplyDamage 应用伤害并记录
func (cm *CharacterManager) ApplyDamage(sessionID string, char *Character, damage int, damageType string) error {
    oldHP := char.CurrentHP

    char.CurrentHP -= damage
    if char.CurrentHP < 0 {
        char.CurrentHP = 0
    }

    // 更新状态
    if err := cm.stateManager.UpdateCharacter(sessionID, char); err != nil {
        return err
    }

    // 记录变更事件
    return cm.persistence.AppendEvent(sessionID, "damage_applied", map[string]interface{}{
        "characterId": char.ID,
        "damage":      damage,
        "damageType":  damageType,
        "oldHP":       oldHP,
        "newHP":       char.CurrentHP,
    })
}

// Heal 恢复生命值并记录
func (cm *CharacterManager) Heal(sessionID string, char *Character, amount int) error {
    oldHP := char.CurrentHP

    char.CurrentHP += amount
    if char.CurrentHP > char.MaxHP {
        char.CurrentHP = char.MaxHP
    }

    if err := cm.stateManager.UpdateCharacter(sessionID, char); err != nil {
        return err
    }

    return cm.persistence.AppendEvent(sessionID, "healed", map[string]interface{}{
        "characterId": char.ID,
        "amount":      amount,
        "oldHP":       oldHP,
        "newHP":       char.CurrentHP,
    })
}
```

---

## 6. 错误处理设计

### 6.1 错误类型

```go
// CharacterError 角色错误
type CharacterError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Field   string `json:"field,omitempty"`
}

func (e *CharacterError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// 错误代码
const (
    ErrCharacterNotFound    = "CHARACTER_NOT_FOUND"
    ErrInvalidName         = "INVALID_NAME"
    ErrInvalidAbilityScores = "INVALID_ABILITY_SCORES"
    ErrInvalidRace         = "INVALID_RACE"
    ErrInvalidClass        = "INVALID_CLASS"
    ErrInvalidBackground   = "INVALID_BACKGROUND"
    ErrInvalidSkillChoices = "INVALID_SKILL_CHOICES"
    ErrLevelTooLow         = "LEVEL_TOO_LOW"
    ErrLevelTooHigh        = "LEVEL_TOO_HIGH"
    ErrNotEnoughXP         = "NOT_ENOUGH_XP"
    ErrAlreadyMaxLevel     = "ALREADY_MAX_LEVEL"
    ErrCharacterDead       = "CHARACTER_DEAD"
    ErrInvalidCondition    = "INVALID_CONDITION"
)
```

### 6.2 验证链

```go
// ValidationChain 验证链
type ValidationChain struct {
    validators []ValidationErrorFunc
}

type ValidationErrorFunc func() error

// Add 添加验证器
func (vc *ValidationChain) Add(v ValidationErrorFunc) *ValidationChain {
    vc.validators = append(vc.validators, v)
    return vc
}

// Validate 执行验证
func (vc *ValidationChain) Validate() error {
    for _, v := range vc.validators {
        if err := v(); err != nil {
            return err
        }
    }
    return nil
}

// 使用示例
func (c *CharacterCreator) ValidateRequest(req *CreateCharacterRequest) error {
    return NewValidationChain().
        Add(func() error { return c.validateName(req.Name) }).
        Add(func() error { return c.validateRace(req.RaceID) }).
        Add(func() error { return c.validateClass(req.ClassID) }).
        Add(func() error { return c.validateAbilityScores(req.AbilityScores) }).
        Add(func() error { return c.validateSkillChoices(req) }).
        Validate()
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
