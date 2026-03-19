# 法术系统组件设计

> **模块名称**: spell
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 组件列表和职责

| 组件名称 | 文件 | 职责描述 |
|----------|------|----------|
| **SpellManager** | spell.go | 法术数据管理、查询、验证 |
| **CastingManager** | casting.go | 施法处理、施法检定、效果应用 |
| **SlotManager** | slots.go | 法术位计算、消耗、恢复 |
| **ConcentrationManager** | concentration.go | 专注管理、专注检定、中断处理 |
| **EffectApplier** | effects.go | 法术效果应用、豁免处理、持续时间 |
| **DurationManager** | duration.go | 持续时间追踪、过期处理 |
| **SpellLoader** | loader.go | 法术数据加载（从 JSON 文件） |
| **SpellValidator** | validation.go | 法术数据验证、施法条件检查 |
| **MagicClassManager** | magic_class.go | 施法职业管理、法术列表 |

> **注**：法术静态数据从 JSON 文件加载到内存，运行时状态（已学法术、法术位）存储在 GameState 中，持久化由 `persistence` 模块统一处理。

---

## 2. 组件接口定义

### 2.1 SpellManager

```go
// internal/server/spell/spell.go

package spell

import (
    "context"
)

// SpellManager 法术管理器
type SpellManager struct {
    loader        *SpellLoader
    validator     *SpellValidator
    magicClassMgr *MagicClassManager
    castingMgr    *CastingManager
    slotMgr       *SlotManager
    concMgr       *ConcentrationManager
    effectApplier *EffectApplier
    durationMgr   *DurationManager
    stateManager  *state.Manager       // 状态管理器（访问内存中的角色数据）
    persistence   *persistence.Manager // 持久化管理器（事件记录）
    eventBus      *events.Bus
}

// NewSpellManager 创建法术管理器
func NewSpellManager(
    stateManager *state.Manager,
    persistence *persistence.Manager,
    eventBus *events.Bus,
    dataPath string,
) *SpellManager

// GetSpell 获取法术
func (m *SpellManager) GetSpell(ctx context.Context, spellID string) (*Spell, error)

// ListSpells 列出法术
func (m *SpellManager) ListSpells(ctx context.Context, filter *SpellFilter) ([]*Spell, error)

// GetSpellsByLevel 按等级获取法术
func (m *SpellManager) GetSpellsByLevel(ctx context.Context, level int) ([]*Spell, error)

// GetSpellsBySchool 按学派获取法术
func (m *SpellManager) GetSpellsBySchool(ctx context.Context, school SpellSchool) ([]*Spell, error)

// GetSpellsByClass 按职业获取法术
func (m *SpellManager) GetSpellsByClass(ctx context.Context, classID string) ([]*Spell, error)

// SearchSpells 搜索法术
func (m *SpellManager) SearchSpells(ctx context.Context, query string) ([]*Spell, error)

// CanCastSpell 检查是否可以施法
func (m *SpellManager) CanCastSpell(ctx context.Context, caster *Character, spellID string, level int) (bool, string)

// CastSpell 施放法术
func (m *SpellManager) CastSpell(ctx context.Context, req *CastSpellRequest) (*CastSpellResult, error)

// CastRitual 仪式施法
func (m *SpellManager) CastRitual(ctx context.Context, req *CastSpellRequest) (*CastSpellResult, error)

// SpellFilter 法术筛选器
type SpellFilter struct {
    Level     *int          `json:"level,omitempty"`
    School    *SpellSchool  `json:"school,omitempty"`
    Class     string        `json:"class,omitempty"`
    Ritual    *bool         `json:"ritual,omitempty"`
    Concentration *bool     `json:"concentration,omitempty"`
}
```

### 2.2 CastingManager

```go
// internal/server/spell/casting.go

// CastingManager 施法管理器
type CastingManager struct {
    spellMgr      *SpellManager
    slotMgr       *SlotManager
    concMgr       *ConcentrationManager
    effectApplier *EffectApplier
    validator     *SpellValidator
    roller        *dice.Roller
    charService   CharacterService
    combatService CombatService
    eventBus      *events.Bus
}

// CharacterService 角色服务接口
type CharacterService interface {
    GetCharacter(id string) (*Character, error)
    UpdateCharacter(char *Character) error
    GetAbilityScore(char *Character, ability Ability) int
    GetProficiencyBonus(level int) int
}

// CombatService 战斗服务接口
type CombatService interface {
    GetCombatant(combatID, combatantID string) (*Combatant, error)
    ApplyDamage(combatID, combatantID string, damage int, damageType DamageType) error
    IsInCombat(combatantID string) (bool, string)
}

// NewCastingManager 创建施法管理器
func NewCastingManager(
    spellMgr *SpellManager,
    slotMgr *SlotManager,
    concMgr *ConcentrationManager,
    effectApplier *EffectApplier,
    roller *dice.Roller,
    charSvc CharacterService,
    combatSvc CombatService,
    eventBus *events.Bus,
) *CastingManager

// CastSpellRequest 施法请求
type CastSpellRequest struct {
    CasterID    string   `json:"casterId"`
    SpellID     string   `json:"spellId"`
    Level       int      `json:"level,omitempty"` // 升环施法
    TargetIDs   []string `json:"targetIds,omitempty"`
    Position    *Position `json:"position,omitempty"` // 范围法术中心
    IsRitual    bool     `json:"isRitual"`
    Advantage   AdvantageType `json:"advantage"`
}

// CastSpellResult 施法结果
type CastSpellResult struct {
    SpellID       string           `json:"spellId"`
    Level         int              `json:"level"`
    Success       bool             `json:"success"`
    AttackRoll    *DiceResult      `json:"attackRoll,omitempty"`
    SaveResults   map[string]*SaveResult `json:"saveResults,omitempty"`
    Effects       []AppliedEffect  `json:"effects"`
    Concentrating bool             `json:"concentrating"`
    SlotsUsed     int              `json:"slotsUsed"`
    Message       string           `json:"message"`
}

// AppliedEffect 应用的效果
type AppliedEffect struct {
    Type        EffectType `json:"type"`
    TargetID    string     `json:"targetId,omitempty"`
    Damage      int        `json:"damage,omitempty"`
    DamageType  DamageType `json:"damageType,omitempty"`
    Healing     int        `json:"healing,omitempty"`
    Conditions  []Condition `json:"conditions,omitempty"`
    Duration    int        `json:"duration,omitempty"`
    Description string     `json:"description"`
}

// CastSpell 施放法术
func (cm *CastingManager) CastSpell(ctx context.Context, req *CastSpellRequest) (*CastSpellResult, error)

// ValidateCasting 验证施法条件
func (cm *CastingManager) ValidateCasting(ctx context.Context, req *CastSpellRequest) error

// CheckComponents 检查法术成分
func (cm *CastingManager) CheckComponents(caster *Character, spell *Spell) (*ComponentCheckResult, error)

// ComponentCheckResult 成分检查结果
type ComponentCheckResult struct {
    HasVerbal    bool `json:"hasVerbal"`
    HasSomatic   bool `json:"hasSomatic"`
    HasMaterial  bool `json:"hasMaterial"`
    MaterialCost int  `json:"materialCost,omitempty"`
    Consumed     bool `json:"consumed"`
}

// CalculateSpellDC 计算法术DC
func (cm *CastingManager) CalculateSpellDC(caster *Character) int
```

### 2.3 SlotManager

```go
// internal/server/spell/slots.go

// SlotManager 法术位管理器
type SlotManager struct {
    magicClassMgr *MagicClassManager
}

// SpellSlots 法术位 (level -> count)
type SpellSlots map[int]int

// NewSlotManager 创建法术位管理器
func NewSlotManager(magicClassMgr *MagicClassManager) *SlotManager

// GetSpellSlots 获取角色的法术位
func (sm *SlotManager) GetSpellSlots(char *Character) SpellSlots

// CalculateSpellSlots 计算法术位
func (sm *SlotManager) CalculateSpellSlots(char *Character) SpellSlots

// HasAvailableSlot 检查是否有可用法术位
func (sm *SlotManager) HasAvailableSlot(char *Character, level int) bool

// ConsumeSlot 消耗法术位
func (sm *SlotManager) ConsumeSlot(char *Character, level int) error

// RestoreSlots 恢复法术位
func (sm *SlotManager) RestoreSlots(char *Character, levels []int)

// RestoreAllSlots 恢复所有法术位
func (sm *SlotManager) RestoreAllSlots(char *Character)

// GetMaxSlots 获取最大法术位数
func (sm *SlotManager) GetMaxSlots(classID string, level int) SpellSlots

// ClassSpellSlots 职业法术位表
var ClassSpellSlots = map[string]map[int]SpellSlots{
    "wizard": {
        1:  {1: 2},
        2:  {1: 3},
        3:  {1: 4, 2: 2},
        4:  {1: 4, 2: 3},
        5:  {1: 4, 2: 3, 3: 2},
        // ... 完整表格
    },
    "cleric": {
        1:  {1: 2},
        2:  {1: 3},
        3:  {1: 4, 2: 2},
        // ... 完整表格
    },
    // ... 其他职业
}

// WarlockSlots 术士法术位（特殊规则）
func (sm *SlotManager) WarlockSlots(level int) SpellSlots {
    slots := make(SpellSlots)
    slotLevel := (level + 1) / 2
    slots[slotLevel] = 1 // 等级 1-2: 1个1环, 等级 3-4: 1个2环, 等等
    if level >= 11 {
        slots[slotLevel] = 2 // 等级 11+: 2个
    }
    if level >= 17 {
        // Mystic Arcanum 特殊处理
    }
    return slots
}
```

### 2.4 ConcentrationManager

```go
// internal/server/spell/concentration.go

// ConcentrationManager 专注管理器
type ConcentrationManager struct {
    active   map[string]*Concentration // casterID -> Concentration
    roller   *dice.Roller
    eventBus *events.Bus
    charSvc  CharacterService
    mu       sync.RWMutex
}

// Concentration 专注状态
type Concentration struct {
    SpellID     string    `json:"spellId"`
    SpellName   string    `json:"spellName"`
    CasterID    string    `json:"casterId"`
    TargetID    string    `json:"targetId,omitempty"`
    StartedAt   time.Time `json:"startedAt"`
    Duration    int       `json:"duration"` // 回合数，-1 表示直到取消
    Remaining   int       `json:"remaining"`
    BreakDC     int       `json:"breakDc"` // 当前中断DC
}

// NewConcentrationManager 创建专注管理器
func NewConcentrationManager(
    roller *dice.Roller,
    charSvc CharacterService,
    eventBus *events.Bus,
) *ConcentrationManager

// StartConcentration 开始专注
func (cm *ConcentrationManager) StartConcentration(ctx context.Context, casterID, spellID, targetID string) error

// EndConcentration 结束专注
func (cm *ConcentrationManager) EndConcentration(ctx context.Context, casterID string) error

// ConcentrationCheck 专注检定
func (cm *ConcentrationManager) ConcentrationCheck(ctx context.Context, casterID string, damage int) (bool, error)

// OnDamageReceived 受到伤害时检查
func (cm *ConcentrationManager) OnDamageReceived(ctx context.Context, casterID string, damage int) error

// GetActiveConcentration 获取当前专注
func (cm *ConcentrationManager) GetActiveConcentration(casterID string) *Concentration

// IsConcentrating 检查是否在专注
func (cm *ConcentrationManager) IsConcentrating(casterID string) bool

// GetBreakDC 获取中断DC
func (cm *ConcentrationManager) GetBreakDC(damage int) int

// ProcessConcentration 处理专注（回合结束时）
func (cm *ConcentrationManager) ProcessConcentration(ctx context.Context, casterID string) error
```

### 2.5 EffectApplier

```go
// internal/server/spell/effects.go

// EffectApplier 效果应用器
type EffectApplier struct {
    roller        *dice.Roller
    charSvc       CharacterService
    combatSvc     CombatService
    concMgr       *ConcentrationManager
    durationMgr   *DurationManager
    eventBus      *events.Bus
}

// NewEffectApplier 创建效果应用器
func NewEffectApplier(
    roller *dice.Roller,
    charSvc CharacterService,
    combatSvc CombatService,
    concMgr *ConcentrationManager,
    durationMgr *DurationManager,
    eventBus *events.Bus,
) *EffectApplier

// ApplyEffect 应用效果
func (ea *EffectApplier) ApplyEffect(
    ctx context.Context,
    caster *Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) (*AppliedEffect, error)

// ApplyDamageEffect 应用伤害效果
func (ea *EffectApplier) ApplyDamageEffect(
    ctx context.Context,
    caster *Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) (*AppliedEffect, error)

// ApplyHealEffect 应用治疗效果
func (ea *EffectApplier) ApplyHealEffect(
    ctx context.Context,
    caster *Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) (*AppliedEffect, error)

// ApplyBuffEffect 应用增益效果
func (ea *EffectApplier) ApplyBuffEffect(
    ctx context.Context,
    caster *Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) (*AppliedEffect, error)

// ApplySummonEffect 应用召唤效果
func (ea *EffectApplier) ApplySummonEffect(
    ctx context.Context,
    caster *Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) (*AppliedEffect, error)

// HandleSave 处理豁免
func (ea *EffectApplier) HandleSave(
    ctx context.Context,
    target *Character,
    save Save,
    dc int,
    advantage AdvantageType,
) *SaveResult

// SaveResult 豁免结果
type SaveResult struct {
    Ability    Ability     `json:"ability"`
    Roll       int         `json:"roll"`
    Modifier   int         `json:"modifier"`
    Total      int         `json:"total"`
    DC         int         `json:"dc"`
    Success    bool        `json:"success"`
    Critical   bool        `json:"critical"`
    Effect     SaveEffect  `json:"effect"`
}

// CalculateDiceWithScaling 计算升环骰子
func (ea *EffectApplier) CalculateDiceWithScaling(
    baseDice string,
    scaling *Scaling,
    spellLevel int,
    castLevel int,
) string
```

### 2.6 DurationManager

```go
// internal/server/spell/duration.go

// DurationManager 持续时间管理器
type DurationManager struct {
    activeEffects map[string]*ActiveSpellEffect // effectID -> effect
    eventBus      *events.Bus
    mu            sync.RWMutex
}

// ActiveSpellEffect 活跃法术效果
type ActiveSpellEffect struct {
    ID          string        `json:"id"`
    SpellID     string        `json:"spellId"`
    CasterID    string        `json:"casterId"`
    TargetIDs   []string      `json:"targetIds"`
    Effect      SpellEffect   `json:"effect"`
    Duration    Duration      `json:"duration"`
    Remaining   int           `json:"remaining"` // 剩余回合数
    StartedAt   time.Time     `json:"startedAt"`
    TicksAt     time.Time     `json:"ticksAt"`   // 下一次tick时间
}

// NewDurationManager 创建持续时间管理器
func NewDurationManager(eventBus *events.Bus) *DurationManager

// AddEffect 添加效果
func (dm *DurationManager) AddEffect(effect *ActiveSpellEffect) error

// RemoveEffect 移除效果
func (dm *DurationManager) RemoveEffect(effectID string) error

// GetEffectsByCaster 获取施法者的所有效果
func (dm *DurationManager) GetEffectsByCaster(casterID string) []*ActiveSpellEffect

// GetEffectsByTarget 获取目标的所有效果
func (dm *DurationManager) GetEffectsByTarget(targetID string) []*ActiveSpellEffect

// TickEffects 时间流逝处理
func (dm *DurationManager) TickEffects(ctx context.Context) error

// ProcessRoundEnd 处理回合结束
func (dm *DurationManager) ProcessRoundEnd(ctx context.Context, combatantID string) error

// ClearExpiredEffects 清除过期效果
func (dm *DurationManager) ClearExpiredEffects(ctx context.Context) error

// ExtendEffect 延长效果持续时间
func (dm *DurationManager) ExtendEffect(effectID string, additionalRounds int) error

// DismissEffect 主动结束效果
func (dm *DurationManager) DismissEffect(ctx context.Context, effectID string) error
```

### 2.7 SpellLoader

```go
// internal/server/spell/loader.go

// SpellLoader 法术加载器
type SpellLoader struct {
    cache     map[string]*Spell
    dataPath  string
    watchers  []SpellWatcher
    mu        sync.RWMutex
}

// SpellWatcher 法术变化监听器
type SpellWatcher interface {
    OnSpellLoaded(spell *Spell)
    OnSpellUpdated(spell *Spell)
    OnSpellDeleted(spellID string)
}

// NewSpellLoader 创建法术加载器
func NewSpellLoader(dataPath string) *SpellLoader

// LoadSpell 加载单个法术
func (sl *SpellLoader) LoadSpell(spellID string) (*Spell, error)

// LoadAll 加载所有法术
func (sl *SpellLoader) LoadAll() (map[string]*Spell, error)

// Reload 重新加载法术
func (sl *SpellLoader) Reload(spellID string) error

// Watch 监听法术文件变化
func (sl *SpellLoader) Watch(ctx context.Context) error

// AddWatcher 添加监听器
func (sl *SpellLoader) AddWatcher(watcher SpellWatcher)

// GetFromCache 从缓存获取法术
func (sl *SpellLoader) GetFromCache(spellID string) (*Spell, bool)

// PopulateCache 填充缓存
func (sl *SpellLoader) PopulateCache() error
```

### 2.8 法术数据存储（内存管理）

法术数据分为两类：
- **静态法术数据**：从 JSON 文件加载，只读
- **运行时状态**：角色已学法术、法术位使用情况等，存储在内存中

```go
// 法术静态数据由 SpellLoader 从文件加载到内存
type SpellLoader struct {
    spellData map[string]*Spell // 法术定义数据（只读）
    mu        sync.RWMutex
}

// GetSpell 获取法术定义
func (sl *SpellLoader) GetSpell(spellID string) *Spell {
    sl.mu.RLock()
    defer sl.mu.RUnlock()
    return sl.spellData[spellID]
}

// GetSpellsByLevel 获取指定等级的法术
func (sl *SpellLoader) GetSpellsByLevel(level int) []*Spell {
    sl.mu.RLock()
    defer sl.mu.RUnlock()

    var result []*Spell
    for _, spell := range sl.spellData {
        if spell.Level == level {
            result = append(result, spell)
        }
    }
    return result
}

// GetSpellsByClass 获取职业可用法术
func (sl *SpellLoader) GetSpellsByClass(classID string) []*Spell {
    sl.mu.RLock()
    defer sl.mu.RUnlock()

    var result []*Spell
    for _, spell := range sl.spellData {
        for _, class := range spell.Classes {
            if class == classID {
                result = append(result, spell)
                break
            }
        }
    }
    return result
}

// 角色的法术状态存储在 Character 结构体中
type Character struct {
    // ...
    KnownSpells    []string          `json:"knownSpells"`    // 已学法术 ID
    PreparedSpells []string          `json:"preparedSpells"` // 准备的法术 ID
    SpellSlots     map[int]int       `json:"spellSlots"`     // 各环阶剩余法术位
    Concentration  *ConcentrationInfo `json:"concentration"` // 专注状态
}

// 法术位管理由 SpellSlotManager 负责（见 2.4 节）
// 施法状态由 SpellManager 通过 StateManager 更新
// 持久化由 PersistenceManager 统一处理
```

### 2.9 SpellValidator

```go
// internal/server/spell/validation.go

// SpellValidator 法术验证器
type SpellValidator struct {
    spellData map[string]*Spell
}

// NewSpellValidator 创建法术验证器
func NewSpellValidator(spellData map[string]*Spell) *SpellValidator

// ValidateSpell 验证法术数据
func (sv *SpellValidator) ValidateSpell(spell *Spell) error

// ValidateCastingConditions 验证施法条件
func (sv *SpellValidator) ValidateCastingConditions(
    caster *Character,
    spell *Spell,
    level int,
) error

// ValidateTarget 验证目标
func (sv *SpellValidator) ValidateTarget(
    spell *Spell,
    caster *Character,
    targets []string,
) error

// ValidateRange 验证范围
func (sv *SpellValidator) ValidateRange(
    spell *Spell,
    caster *Character,
    targets []string,
    position *Position,
) error

// ValidateComponents 验证法术成分
func (sv *SpellValidator) ValidateComponents(
    caster *Character,
    spell *Spell,
) error

// ValidateKnowsSpell 验证是否已知法术
func (sv *SpellValidator) ValidateKnowsSpell(
    caster *Character,
    spell *Spell,
) error

// ValidateSpellSlot 验证法术位
func (sv *SpellValidator) ValidateSpellSlot(
    caster *Character,
    spell *Spell,
    level int,
) error

// ValidationError 验证错误
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}
```

### 2.10 MagicClassManager

```go
// internal/server/spell/magic_class.go

// MagicClassManager 施法职业管理器
type MagicClassManager struct {
    classData map[string]*MagicClass
}

// MagicClass 施法职业
type MagicClass struct {
    ID               string            `json:"id"`
    Name             string            `json:"name"`
    SpellcastingType SpellcastingType  `json:"spellcastingType"`
    SpellcastingAbility Ability        `json:"spellcastingAbility"`
    CantripsKnown    map[int]int       `json:"cantripsKnown"`
    SpellsKnown      map[int]int       `json:"spellsKnown"` // -1 表示所有
    SpellPreparation bool              `json:"spellPreparation"`
    Spellbook        bool              `json:"spellbook"`
    RitualCasting    bool              `json:"ritualCasting"`
}

// SpellcastingType 施法类型
type SpellcastingType string

const (
    SpellcastingFull     SpellcastingType = "full"      // 牧师、法师
    SpellcastingHalf     SpellcastingType = "half"      // 圣武士、游侠
    SpellcastingThird    SpellcastingType = "third"     // 术士、邪术师
    SpellcastingPact     SpellcastingType = "pact"      // 术士特殊
    SpellcastingPrepared SpellcastingType = "prepared"  // 需要准备
)

// NewMagicClassManager 创建施法职业管理器
func NewMagicClassManager(classData map[string]*MagicClass) *MagicClassManager

// GetMagicClass 获取施法职业
func (mcm *MagicClassManager) GetMagicClass(classID string) (*MagicClass, error)

// GetCantripsKnown 获取已知戏法数量
func (mcm *MagicClassManager) GetCantripsKnown(classID string, level int) int

// GetSpellsKnown 获取已知法术数量
func (mcm *MagicClassManager) GetSpellsKnown(classID string, level int) int

// IsSpellcastingClass 检查是否是施法职业
func (mcm *MagicClassManager) IsSpellcastingClass(classID string) bool

// GetSpellcastingAbility 获取施法属性
func (mcm *MagicClassManager) GetSpellcastingAbility(classID string) Ability

// 默认施法职业数据
var DefaultMagicClasses = map[string]*MagicClass{
    "wizard": {
        ID:                 "wizard",
        Name:               "Wizard",
        SpellcastingType:   SpellcastingFull,
        SpellcastingAbility: Intelligence,
        CantripsKnown:      map[int]int{1: 3, 4: 4, 10: 5},
        SpellsKnown:        -1, // 法术书系统
        SpellPreparation:   true,
        Spellbook:          true,
        RitualCasting:      true,
    },
    "cleric": {
        ID:                 "cleric",
        Name:               "Cleric",
        SpellcastingType:   SpellcastingFull,
        SpellcastingAbility: Wisdom,
        CantripsKnown:      map[int]int{1: 3, 4: 4, 10: 5},
        SpellsKnown:        -1, // 准备所有
        SpellPreparation:   true,
        Spellbook:          false,
        RitualCasting:      true,
    },
    // ... 其他职业
}
```

---

## 3. 组件内部结构设计

### 3.1 SpellManager 内部结构

```
┌─────────────────────────────────────────────────────────────────┐
│                       SpellManager                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│   │    Spell      │  │    Casting    │  │     Slot      │     │
│   │    Loader     │  │   Manager     │  │   Manager     │     │
│   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘     │
│           │                  │                  │               │
│           └──────────────────┼──────────────────┘               │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │ Concentration │  │     Effect      │  │   Duration    │   │
│   │   Manager     │  │   Applier       │  │   Manager     │   │
│   └───────┬───────┘  └─────────────────┘  └───────┬───────┘   │
│           │                                          │           │
│           └──────────────────┬───────────────────────┘           │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │    Spell      │  │  Magic Class    │  │   Repository  │   │
│   │  Validator    │  │   Manager       │  │               │   │
│   └───────────────┘  └─────────────────┘  └───────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 施法流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         施法流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                             │
│   │ 施法请求     │                                             │
│   └──────┬───────┘                                             │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 验证施法条件 │────▶│ 检查法术位   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 检查法术成分 │────▶│ 消耗法术位   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 处理专注     │────▶│ 应用法术效果 │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 处理豁免     │────▶│ 处理持续时间 │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          └─────────┬──────────┘                                 │
│                    ▼                                            │
│          ┌───────────────────┐                                  │
│          │  返回施法结果      │                                  │
│          └───────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 组件间通信方式

### 4.1 依赖注入

```go
// CastingManager 依赖其他组件
type CastingManager struct {
    spellMgr      *SpellManager
    slotMgr       *SlotManager
    concMgr       *ConcentrationManager
    effectApplier *EffectApplier
    // ...
}

// 施法时调用其他组件
func (cm *CastingManager) CastSpell(ctx context.Context, req *CastSpellRequest) (*CastSpellResult, error) {
    // 获取法术数据
    spell, err := cm.spellMgr.GetSpell(ctx, req.SpellID)
    if err != nil {
        return nil, err
    }

    // 获取施法者
    caster, err := cm.charSvc.GetCharacter(req.CasterID)
    if err != nil {
        return nil, err
    }

    // 检查并消耗法术位
    if spell.Level > 0 {
        if err := cm.slotMgr.ConsumeSlot(caster, req.Level); err != nil {
            return nil, err
        }
    }

    // 处理专注
    if spell.Concentration {
        if err := cm.concMgr.StartConcentration(ctx, req.CasterID, spell.ID, ""); err != nil {
            return nil, err
        }
    }

    // 应用效果
    result := &CastSpellResult{}
    for _, effect := range spell.Effects {
        applied, err := cm.effectApplier.ApplyEffect(ctx, caster, spell, effect, req, req.Level)
        if err != nil {
            return nil, err
        }
        result.Effects = append(result.Effects, *applied)
    }

    return result, nil
}
```

### 4.2 事件发布

```go
// 法术事件类型
type SpellEventType string

const (
    SpellEventCast          SpellEventType = "cast"
    SpellEventConcentrating SpellEventType = "concentrating"
    SpellEventConcentrationBroken SpellEventType = "concentration_broken"
    SpellEventEffectApplied SpellEventType = "effect_applied"
    SpellEventEffectExpired SpellEventType = "effect_expired"
)

// SpellEvent 法术事件
type SpellEvent struct {
    Type      SpellEventType `json:"type"`
    SpellID   string         `json:"spellId"`
    CasterID  string         `json:"casterId"`
    TargetIDs []string       `json:"targetIds,omitempty"`
    Level     int            `json:"level"`
    Timestamp int64          `json:"timestamp"`
    Data      interface{}    `json:"data,omitempty"`
}

// 发布施法事件
func (cm *CastingManager) publishCastEvent(result *CastSpellResult, casterID string) {
    cm.eventBus.Publish(SpellEvent{
        Type:      SpellEventCast,
        SpellID:   result.SpellID,
        CasterID:  casterID,
        Level:     result.Level,
        Timestamp: time.Now().Unix(),
        Data:      result,
    })
}
```

### 4.3 回调处理

```go
// EffectApplier 处理豁免时的回调
func (ea *EffectApplier) HandleSave(
    ctx context.Context,
    target *Character,
    save Save,
    dc int,
    advantage AdvantageType,
) *SaveResult {
    // 计算豁免调整值
    modifier := ea.charSvc.GetAbilityScore(target, save.Ability) - 10
    if ea.charSvc.HasProficiency(target, save.Ability) {
        modifier += ea.charSvc.GetProficiencyBonus(target.Level)
    }

    // 掷骰
    var rollResult *DiceResult
    switch advantage {
    case AdvantageAdvantage:
        rollResult = ea.roller.RollWithAdvantage("1d20")
    case AdvantageDisadvantage:
        rollResult = ea.roller.RollWithDisadvantage("1d20")
    default:
        rollResult = ea.roller.Roll("1d20")
    }

    total := rollResult.Total + modifier
    success := total >= dc
    critical := rollResult.Rolls[0] == 20

    // 处理豁免效果
    if critical {
        success = true
    } else if rollResult.Rolls[0] == 1 {
        success = false
    }

    return &SaveResult{
        Ability:  save.Ability,
        Roll:     rollResult.Rolls[0],
        Modifier: modifier,
        Total:    total,
        DC:       dc,
        Success:  success,
        Critical: critical,
        Effect:   save.EffectOnSave,
    }
}
```

---

## 5. 状态管理设计

### 5.1 法术状态存储

```go
// ActiveSpellState 活跃法术状态
type ActiveSpellState struct {
    mu             sync.RWMutex
    concentrations map[string]*Concentration
    effects        map[string]*ActiveSpellEffect
}

// GetState 获取状态快照
func (state *ActiveSpellState) GetState() *ActiveSpellStateSnapshot {
    state.mu.RLock()
    defer state.mu.RUnlock()

    snapshot := &ActiveSpellStateSnapshot{
        Concentrations: make(map[string]*Concentration),
        Effects:        make(map[string]*ActiveSpellEffect),
    }

    for k, v := range state.concentrations {
        snapshot.Concentrations[k] = v
    }

    for k, v := range state.effects {
        snapshot.Effects[k] = v
    }

    return snapshot
}

// RestoreFromSnapshot 从快照恢复
func (state *ActiveSpellState) RestoreFromSnapshot(snapshot *ActiveSpellStateSnapshot) {
    state.mu.Lock()
    defer state.mu.Unlock()

    state.concentrations = snapshot.Concentrations
    state.effects = snapshot.Effects
}
```

### 5.2 法术效果追踪

```go
// EffectTracker 效果追踪器
type EffectTracker struct {
    byCaster map[string][]*ActiveSpellEffect // 施法者 -> 效果
    byTarget map[string][]*ActiveSpellEffect // 目标 -> 效果
    mu       sync.RWMutex
}

// Add 添加效果追踪
func (et *EffectTracker) Add(effect *ActiveSpellEffect) {
    et.mu.Lock()
    defer et.mu.Unlock()

    et.byCaster[effect.CasterID] = append(et.byCaster[effect.CasterID], effect)
    for _, targetID := range effect.TargetIDs {
        et.byTarget[targetID] = append(et.byTarget[targetID], effect)
    }
}

// Remove 移除效果追踪
func (et *EffectTracker) Remove(effectID string) {
    et.mu.Lock()
    defer et.mu.Unlock()

    // 从施法者索引中移除
    for casterID, effects := range et.byCaster {
        for i, effect := range effects {
            if effect.ID == effectID {
                et.byCaster[casterID] = append(effects[:i], effects[i+1:]...)
                break
            }
        }
    }

    // 从目标索引中移除
    for targetID, effects := range et.byTarget {
        for i, effect := range effects {
            if effect.ID == effectID {
                et.byTarget[targetID] = append(effects[:i], effects[i+1:]...)
                break
            }
        }
    }
}
```

---

## 6. 错误处理设计

### 6.1 错误类型

```go
// SpellError 法术错误
type SpellError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    SpellID string `json:"spellId,omitempty"`
}

func (e *SpellError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// 错误代码
const (
    ErrSpellNotFound      = "SPELL_NOT_FOUND"
    ErrSpellNotKnown      = "SPELL_NOT_KNOWN"
    ErrNoSpellSlot        = "NO_SPELL_SLOT"
    ErrAlreadyConcentrating = "ALREADY_CONCENTRATING"
    ErrComponentsMissing  = "COMPONENTS_MISSING"
    ErrInvalidTarget      = "INVALID_TARGET"
    ErrOutOfRange         = "OUT_OF_RANGE"
    ErrConcentrationBroken = "CONCENTRATION_BROKEN"
    ErrSilenced           = "SILENCED" // 无法施法
)
```

### 6.2 错误恢复

```go
// ErrorHandler 错误处理器
type ErrorHandler struct {
    logger *log.Logger
}

// Handle 施法错误处理
func (eh *ErrorHandler) Handle(ctx context.Context, err error, casterID string) *SpellError {
    switch e := err.(type) {
    case *SpellError:
        return e
    case *ValidationError:
        return &SpellError{
            Code:    "VALIDATION_ERROR",
            Message: e.Message,
        }
    default:
        eh.logger.Error("Unknown spell error", "error", err, "caster", casterID)
        return &SpellError{
            Code:    "INTERNAL_ERROR",
            Message: "An internal error occurred",
        }
    }
}

// Rollback 回滚施法
func (cm *CastingManager) Rollback(ctx context.Context, casterID string, slotLevel int) error {
    // 恢复法术位
    caster, _ := cm.charSvc.GetCharacter(casterID)
    if caster != nil {
        cm.slotMgr.RestoreSlots(caster, []int{slotLevel})
    }

    // 清理专注状态（如果已设置）
    cm.concMgr.EndConcentration(ctx, casterID)

    return nil
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
