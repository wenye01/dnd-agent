# 法术系统设计

> **模块名称**: spell
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

法术系统负责 D&D 5e 法术规则的实施：
- 法术数据管理（法术列表、效果定义）
- 法术位管理
- 施法处理（施法检定、效果应用）
- 专注管理
- 法术效果持续时间追踪

### 1.2 模块边界

**包含**：
- 法术数据模型和效果定义
- 法术位计算和消耗
- 施法过程（攻击检定、豁免、效果）
- 专注规则实现
- 法术持续时间管理

**不包含**：
- 角色属性计算（由角色系统负责）
- 伤害数字计算（由战斗系统负责）
- 地图效果渲染（由前端负责）

---

## 2. 目录结构

```
internal/server/spell/
├── spell.go               # 法术模型定义
├── casting.go             # 施法处理
├── slots.go               # 法术位管理
├── concentration.go       # 专注管理
├── effects.go             # 法术效果定义
├── duration.go            # 持续时间管理
├── schools.go             # 法术学派
├── components.go          # 法术成分
└── loader.go              # 法术数据加载
```

---

## 3. 数据模型

### 3.1 法术模型

```go
// internal/server/spell/spell.go

type Spell struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Level       int           `json:"level"`      // 0-9，0 为戏法
    School      SpellSchool   `json:"school"`
    CastingTime CastingTime   `json:"castingTime"`
    Range       SpellRange    `json:"range"`
    Components  Components    `json:"components"`
    Duration    Duration      `json:"duration"`
    Concentration bool        `json:"concentration"`
    Ritual      bool          `json:"ritual"`

    // 效果描述
    Description string        `json:"description"`
    HigherLevels string       `json:"higherLevels,omitempty"`

    // 效果定义
    Effects     []SpellEffect `json:"effects"`

    // 职业/种族限制
    Classes     []string      `json:"classes"`
}

type SpellID string
```

### 3.2 法术学派

```go
// internal/server/spell/schools.go

type SpellSchool string

const (
    SchoolAbjuration    SpellSchool = "abjuration"    // 防护
    SchoolConjuration   SpellSchool = "conjuration"   // 咒法
    SchoolDivination   SpellSchool = "divination"     // 预言
    SchoolEnchantment  SpellSchool = "enchantment"    // 附魔
    SchoolEvocation    SpellSchool = "evocation"      // 塑能
    SchoolIllusion     SpellSchool = "illusion"       // 幻术
    SchoolNecromancy   SpellSchool = "necromancy"     // 死灵
    SchoolTransmutation SpellSchool = "transmutation" // 变化
)
```

### 3.3 施法时间

```go
type CastingTime struct {
    Type   CastingTimeType `json:"type"`
    Value  int             `json:"value"`
}

type CastingTimeType string

const (
    CastingTimeAction      CastingTimeType = "action"
    CastingTimeBonusAction CastingTimeType = "bonus_action"
    CastingTimeReaction    CastingTimeType = "reaction"
    CastingTimeMinute      CastingTimeType = "minute"
    CastingTimeHour        CastingTimeType = "hour"
)
```

### 3.4 法术范围

```go
type SpellRange struct {
    Type   RangeType `json:"type"`
    Value  int       `json:"value,omitempty"`  // 英尺数
    Shape  *Shape    `json:"shape,omitempty"`  // 范围形状
}

type RangeType string

const (
    RangeSelf     RangeType = "self"
    RangeTouch    RangeType = "touch"
    RangeFeet     RangeType = "feet"
    RangeSight    RangeType = "sight"
    RangeUnlimited RangeType = "unlimited"
)

type Shape struct {
    Type   ShapeType `json:"type"`
    Size   int       `json:"size"`   // 半径/边长等
    Height int       `json:"height,omitempty"`
}

type ShapeType string

const (
    ShapeSphere   ShapeType = "sphere"
    ShapeCylinder ShapeType = "cylinder"
    ShapeCone     ShapeType = "cone"
    ShapeLine     ShapeType = "line"
    ShapeCube     ShapeType = "cube"
)
```

### 3.5 法术成分

```go
// internal/server/spell/components.go

type Components struct {
    Verbal    bool     `json:"verbal"`
    Somatic   bool     `json:"somatic"`
    Material  *Material `json:"material,omitempty"`
}

type Material struct {
    Components []string `json:"components"` // 材料描述
    Cost      int      `json:"cost,omitempty"` // 金币价值
    Consumed  bool     `json:"consumed,omitempty"` // 是否消耗
}
```

### 3.6 持续时间

```go
type Duration struct {
    Type        DurationType `json:"type"`
    Value       int          `json:"value,omitempty"` // 回合数或分钟数
    Dismissable bool         `json:"dismissable,omitempty"` // 是否可主动结束
}

type DurationType string

const (
    DurationInstantaneous DurationType = "instantaneous"
    DurationRounds        DurationType = "rounds"
    DurationMinutes       DurationType = "minutes"
    DurationHours         DurationType = "hours"
    DurationDays          DurationType = "days"
    DurationUntilDispelled DurationType = "until_dispelled"
    DurationSpecial       DurationType = "special"
)
```

### 3.7 法术效果

```go
// internal/server/spell/effects.go

type SpellEffect struct {
    Type        EffectType   `json:"type"`
    Target      TargetType   `json:"target"`
    Save        *Save        `json:"save,omitempty"`
    Damage      *DamageEffect `json:"damage,omitempty"`
    Heal        *HealEffect  `json:"heal,omitempty"`
    Buff        *BuffEffect  `json:"buff,omitempty"`
    Debuff      *DebuffEffect `json:"debuff,omitempty"`
    Summon      *SummonEffect `json:"summon,omitempty"`
    AreaEffect  *AreaEffect  `json:"areaEffect,omitempty"`
    Special     *SpecialEffect `json:"special,omitempty"`
}

type EffectType string

const (
    EffectTypeDamage   EffectType = "damage"
    EffectTypeHeal     EffectType = "heal"
    EffectTypeBuff     EffectType = "buff"
    EffectTypeDebuff   EffectType = "debuff"
    EffectTypeSummon   EffectType = "summon"
    EffectTypeUtility  EffectType = "utility"
    EffectTypeSpecial  EffectType = "special"
)

type Save struct {
    Ability     Ability     `json:"ability"`
    DCModifier  string      `json:"dcModifier"` // "spell", "fixed", etc.
    EffectOnSave SaveEffect `json:"effectOnSave"`
}

type SaveEffect string

const (
    SaveEffectNone       SaveEffect = "none"       // 成功无效
    SaveEffectHalf       SaveEffect = "half"       // 成功减半
    SaveEffectNegates    SaveEffect = "negates"    // 成功抵消
    SaveEffectPartial    SaveEffect = "partial"    // 部分效果
)

type DamageEffect struct {
    Dice       string     `json:"dice"`       // 基础骰子
    Bonus      int        `json:"bonus"`      // 固定加值
    Type       DamageType `json:"type"`       // 伤害类型
    Scaling    *Scaling   `json:"scaling,omitempty"` // 升环加值
}

type HealEffect struct {
    Dice       string     `json:"dice"`
    Bonus      int        `json:"bonus"`
    Scaling    *Scaling   `json:"scaling,omitempty"`
}

type BuffEffect struct {
    StatBonus  []StatBonus `json:"statBonus,omitempty"`
    Conditions []Condition `json:"conditions,omitempty"` // 赋予的免疫
}

type DebuffEffect struct {
    Conditions []Condition `json:"conditions"`
}

type Scaling struct {
    Type       ScalingType `json:"type"`
    Interval   int         `json:"interval"`  // 每几环增加
    Additional interface{} `json:"additional"` // 增加的内容
}

type ScalingType string

const (
    ScalingDamage ScalingType = "damage"
    ScalingDice   ScalingType = "dice"
    ScalingTarget ScalingType = "target"
)
```

### 3.8 法术位

```go
// internal/server/spell/slots.go

type SpellSlots map[int]int // level -> count

// 职业法术位表（按等级）
var ClassSpellSlots = map[int]SpellSlots{
    1: {1: 2},
    2: {1: 3},
    3: {1: 4, 2: 2},
    4: {1: 4, 2: 3},
    5: {1: 4, 2: 3, 3: 2},
    // ... 完整表格
}
```

### 3.9 专注状态

```go
// internal/server/spell/concentration.go

type Concentration struct {
    SpellID     string    `json:"spellId"`
    SpellName   string    `json:"spellName"`
    StartedAt   time.Time `json:"startedAt"`
    CasterID    string    `json:"casterId"`
    TargetID    string    `json:"targetId,omitempty"`
}
```

---

## 4. 对外接口

### 4.1 施法管理器

```go
// internal/server/spell/casting.go

type CastingManager struct {
    spellData     map[string]*Spell
    slotManager   *SlotManager
    concManager   *ConcentrationManager
    roller        *dice.Roller
    eventBus      *events.Bus
}

func NewCastingManager(
    spellData map[string]*Spell,
    slotManager *SlotManager,
    concManager *ConcentrationManager,
    roller *dice.Roller,
    eventBus *events.Bus,
) *CastingManager

// 施放法术
func (cm *CastingManager) CastSpell(req *CastSpellRequest) (*CastSpellResult, error)

// 检查是否可以施法
func (cm *CastingManager) CanCastSpell(caster *character.Character, spellID string, level int) (bool, string)

// 仪式施法
func (cm *CastingManager) CastRitual(req *CastSpellRequest) (*CastSpellResult, error)

type CastSpellRequest struct {
    CasterID    string     `json:"casterId"`
    SpellID     string     `json:"spellId"`
    Level       int        `json:"level,omitempty"` // 升环施法
    TargetID    string     `json:"targetId,omitempty"`
    Position    *Position  `json:"position,omitempty"` // 范围法术中心
}

type CastSpellResult struct {
    SpellID     string          `json:"spellId"`
    Level       int             `json:"level"`
    Success     bool            `json:"success"`
    AttackRoll  *DiceResult     `json:"attackRoll,omitempty"`
    SaveResult  *SaveResult     `json:"saveResult,omitempty"`
    Effects     []AppliedEffect `json:"effects"`
    Concentrating bool          `json:"concentrating"`
}
```

### 4.2 法术位管理器

```go
// internal/server/spell/slots.go

type SlotManager struct{}

func NewSlotManager() *SlotManager

// 获取角色的法术位
func (sm *SlotManager) GetSpellSlots(char *character.Character) SpellSlots

// 消耗法术位
func (sm *SlotManager) ConsumeSlot(char *character.Character, level int) error

// 恢复法术位
func (sm *SlotManager) RestoreSlots(char *character.Character, levels []int)

// 恢复所有法术位
func (sm *SlotManager) RestoreAllSlots(char *character.Character)

// 检查是否有可用法术位
func (sm *SlotManager) HasAvailableSlot(char *character.Character, level int) bool
```

### 4.3 专注管理器

```go
// internal/server/spell/concentration.go

type ConcentrationManager struct {
    active    map[string]*Concentration // casterID -> Concentration
    roller    *dice.Roller
}

func NewConcentrationManager(roller *dice.Roller) *ConcentrationManager

// 开始专注
func (cm *ConcentrationManager) StartConcentration(casterID, spellID, targetID string) error

// 结束专注
func (cm *ConcentrationManager) EndConcentration(casterID string) error

// 进行专注检定
func (cm *ConcentrationManager) ConcentrationCheck(casterID string, damage int) (bool, error)

// 获取当前专注的法术
func (cm *ConcentrationManager) GetActiveConcentration(casterID string) *Concentration

// 受到伤害时检查专注
func (cm *ConcentrationManager) OnDamageReceived(casterID string, damage int) error
```

---

## 5. 组件划分

### 5.1 施法处理器

```go
// internal/server/spell/casting.go

func (cm *CastingManager) CastSpell(req *CastSpellRequest) (*CastSpellResult, error) {
    spell, ok := cm.spellData[req.SpellID]
    if !ok {
        return nil, ErrSpellNotFound
    }

    // 获取施法者
    caster, err := cm.getCharacter(req.CasterID)
    if err != nil {
        return nil, err
    }

    // 确定施法环阶
    level := req.Level
    if level == 0 {
        level = spell.Level
    }

    // 戏法不需要法术位
    if spell.Level > 0 {
        // 检查并消耗法术位
        if err := cm.slotManager.ConsumeSlot(caster, level); err != nil {
            return nil, err
        }
    }

    result := &CastSpellResult{
        SpellID: req.SpellID,
        Level:   level,
        Success: true,
    }

    // 处理专注
    if spell.Concentration {
        if err := cm.handleConcentration(caster, spell); err != nil {
            return nil, err
        }
        result.Concentrating = true
    }

    // 应用效果
    for _, effect := range spell.Effects {
        applied := cm.applyEffect(caster, spell, effect, req, level)
        result.Effects = append(result.Effects, applied)
    }

    return result, nil
}

func (cm *CastingManager) handleConcentration(caster *character.Character, spell *Spell) error {
    // 结束现有专注
    if caster.Concentration != nil {
        cm.concManager.EndConcentration(string(caster.ID))
    }

    // 开始新专注
    return cm.concManager.StartConcentration(
        string(caster.ID),
        spell.ID,
        "", // 目标在应用效果时设置
    )
}
```

### 5.2 效果应用器（无 Combat 依赖版本）

> **层次依赖规则**：Spell 模块（第2层）不应直接依赖 Combat 模块（第3层）。
> **解决方案**：Spell 模块只计算和返回效果数据，由调用方（Combat 或上层服务）负责应用效果。

```go
// internal/server/spell/effects.go

// EffectApplier 只负责计算效果，不直接修改战斗状态
type EffectApplier struct {
    roller *dice.Roller
    // ❌ 移除对 combat.Manager 的依赖
    // combatMgr *combat.Manager
}

// EffectResult 是 Spell 模块返回给调用方的结构化效果数据
// 调用方（Combat 模块或上层服务）负责应用这些效果
type EffectResult struct {
    Type       EffectType
    TargetID   string

    // 伤害效果
    Damage     *DamageResult
    // 治疗效果
    Healing    *HealingResult
    // 状态效果
    Conditions []ConditionResult

    // 描述文本
    Description string

    // 原始效果数据（供调用方参考）
    RawEffect  SpellEffect
}

type DamageResult struct {
    TotalDamage  int
    DamageType   types.DamageType
    SaveResult   *SaveResult  // 豁免结果（如有）
}

type HealingResult struct {
    TotalHealing int
}

type ConditionResult struct {
    Condition types.Condition
    Duration  int  // 回合数
}

// ApplyEffect 计算效果并返回结构化数据，不直接应用
func (ea *EffectApplier) ApplyEffect(
    caster *character.Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) EffectResult {
    switch effect.Type {
    case EffectTypeDamage:
        return ea.calculateDamageEffect(caster, spell, effect, req, level)
    case EffectTypeHeal:
        return ea.calculateHealEffect(caster, spell, effect, req, level)
    case EffectTypeBuff, EffectTypeDebuff:
        return ea.calculateConditionEffect(caster, spell, effect, req, level)
    default:
        return EffectResult{Type: effect.Type, Description: "Special effect"}
    }
}

// calculateDamageEffect 计算伤害效果，返回数据而非直接应用
func (ea *EffectApplier) calculateDamageEffect(
    caster *character.Character,
    spell *Spell,
    effect SpellEffect,
    req *CastSpellRequest,
    level int,
) EffectResult {
    result := EffectResult{
        Type:     EffectTypeDamage,
        TargetID: req.TargetID,
    }

    // 计算伤害骰
    dice := effect.Damage.Dice
    bonus := effect.Damage.Bonus

    // 添加施法属性调整值
    bonus += (caster.AbilityScores.GetScore(caster.Class.Spellcasting.Ability) - 10) / 2

    // 升环加值
    if effect.Damage.Scaling != nil && level > spell.Level {
        dice = ea.applyScaling(dice, effect.Damage.Scaling, level, spell.Level)
    }

    rollResult := ea.roller.Roll(dice + "+" + strconv.Itoa(bonus))

    result.Damage = &DamageResult{
        TotalDamage: rollResult.Total,
        DamageType:  effect.Damage.Type,
    }

    // 处理豁免（如果有目标）
    if effect.Save != nil && req.TargetID != "" {
        dc := 8 + ea.getProficiencyBonus(caster.Level) +
            (caster.AbilityScores.GetScore(caster.Class.Spellcasting.Ability)-10)/2
        // 豁免 DC 返回给调用方，由调用方获取目标并执行豁免
        result.Damage.SaveResult = &SaveResult{
            Required: true,
            DC:       dc,
            SaveType: effect.Save.Ability,
        }
    }

    return result
}
```

### 5.2.1 调用方应用效果示例

```go
// internal/server/combat/combat.go 或 internal/client/tools/handlers/spell.go

// CastSpellHandler 处理施法工具调用，应用 Spell 模块返回的效果
func (h *CastSpellHandler) Handle(ctx context.Context, args map[string]interface{}) (*ToolResult, error) {
    // 1. 执行施法检定
    spellResult := h.spellService.CastSpell(ctx, casterID, spellID, targetID, level)

    // 2. 遍历效果结果，应用伤害/治疗/状态
    for _, effectResult := range spellResult.Effects {
        switch {
        case effectResult.Damage != nil:
            // 应用伤害（由 Combat 模块负责）
            h.combatService.ApplyDamage(
                effectResult.TargetID,
                effectResult.Damage.TotalDamage,
                effectResult.Damage.DamageType,
            )

        case effectResult.Healing != nil:
            // 应用治疗
            h.characterService.ApplyHealing(
                effectResult.TargetID,
                effectResult.Healing.TotalHealing,
            )

        case len(effectResult.Conditions) > 0:
            // 应用状态效果
            for _, cond := range effectResult.Conditions {
                h.characterService.ApplyCondition(
                    effectResult.TargetID,
                    cond.Condition,
                    cond.Duration,
                )
            }
        }
    }

    return &ToolResult{Success: true, Data: spellResult}, nil
}
```

### 5.2.2 修正后的层次依赖图

```
修正前（违规）：
┌────────────┐
│   Spell    │ ──── 直接依赖 ────▶ ┌────────────┐
│  (第2层)   │                     │   Combat   │
└────────────┘                     │  (第3层)   │ ◀── 层次违规！
                                   └────────────┘

修正后（正确）：
┌────────────┐                     ┌────────────┐
│   Spell    │ ──▶ 返回 EffectResult │   Combat   │
│  (第2层)   │                     │  (第3层)   │
└────────────┘                     └──────┬─────┘
                                         │
                                         │ 调用 Spell 获取效果，自行应用
                                         ▼
                                   ┌────────────┐
                                   │  效果应用  │
                                   │ ApplyDamage│
                                   │ ApplyHeal  │
                                   │ ApplyCond  │
                                   └────────────┘
```
```

### 5.3 专注检定处理器

```go
// internal/server/spell/concentration.go

func (cm *ConcentrationManager) ConcentrationCheck(casterID string, damage int) (bool, error) {
    conc := cm.active[casterID]
    if conc == nil {
        return true, nil // 没有专注中的法术
    }

    // 计算 DC = 10 或 damage/2，取较高者
    dc := 10
    if damage/2 > dc {
        dc = damage / 2
    }

    // 进行体质豁免
    caster := cm.getCharacter(casterID)
    modifier := (caster.AbilityScores.Constitution - 10) / 2
    if caster.SavingThrowProficiencies[Constitution] {
        modifier += getProficiencyBonus(caster.Level)
    }

    roll := cm.roller.Roll("1d20+" + strconv.Itoa(modifier))

    if roll.Total >= dc {
        return true, nil // 专注保持
    }

    // 专注中断，结束法术
    cm.EndConcentration(casterID)
    return false, nil
}
```

---

## 6. 状态设计

### 6.1 活跃法术效果

```go
// 追踪需要持续时间的法术效果
type ActiveSpellEffect struct {
    ID          string    `json:"id"`
    SpellID     string    `json:"spellId"`
    CasterID    string    `json:"casterId"`
    TargetID    string    `json:"targetId"`
    Effect      SpellEffect `json:"effect"`
    StartedAt   time.Time `json:"startedAt"`
    Duration    Duration  `json:"duration"`
    Remaining   int       `json:"remaining"` // 剩余回合数
}
```

### 6.2 专注状态

```go
// 全局专注追踪
type ConcentrationState struct {
    mu         sync.RWMutex
    active     map[string]*Concentration // casterID -> Concentration
    byTarget   map[string][]string       // targetID -> []casterID
}
```

---

## 7. 模块间通信

### 7.1 与角色系统通信

```go
// 检查角色是否可以施放法术
func (cm *CastingManager) CanCastSpell(char *character.Character, spellID string, level int) (bool, string) {
    spell := cm.spellData[spellID]

    // 检查是否已知/准备该法术
    if !cm.knowsOrPrepared(char, spell) {
        return false, "Spell not known or prepared"
    }

    // 检查法术位
    if spell.Level > 0 && !cm.slotManager.HasAvailableSlot(char, level) {
        return false, "No available spell slot"
    }

    // 检查专注（如果要施放专注法术）
    if spell.Concentration && char.Concentration != nil {
        // 可以施放，但会中断现有专注
    }

    return true, ""
}
```

### 7.2 与战斗系统通信

```go
// 法术攻击使用战斗系统的攻击处理
func (ea *EffectApplier) applySpellAttack(
    caster *character.Character,
    target *character.Character,
    spell *Spell,
) (bool, int) {
    // 计算攻击加值
    modifier := (caster.AbilityScores.GetScore(caster.Class.Spellcasting.Ability) - 10) / 2
    modifier += getProficiencyBonus(caster.Level)

    // 掷骰
    roll := ea.roller.Roll("1d20+" + strconv.Itoa(modifier))

    // 判定命中
    hit := roll.Total >= target.GetAC()
    critical := roll.Rolls[0] == 20

    return hit, roll.Total
}
```

### 7.3 与事件总线通信

```go
// 发布施法事件
func (cm *CastingManager) publishCastEvent(result *CastSpellResult, caster *character.Character) {
    cm.eventBus.Publish(SpellEvent{
        Type:      SpellEventCast,
        CasterID:  string(caster.ID),
        SpellID:   result.SpellID,
        Level:     result.Level,
        Effects:   result.Effects,
    })
}

// 发布专注中断事件
func (cm *ConcentrationManager) publishBreakEvent(casterID string, conc *Concentration) {
    cm.eventBus.Publish(SpellEvent{
        Type:      SpellEventConcentrationBroken,
        CasterID:  casterID,
        SpellID:   conc.SpellID,
    })
}
```

---

## 8. 法术数据示例

### 8.1 火球术

```json
{
  "id": "fireball",
  "name": "Fireball",
  "level": 3,
  "school": "evocation",
  "castingTime": {
    "type": "action",
    "value": 1
  },
  "range": {
    "type": "feet",
    "value": 150
  },
  "components": {
    "verbal": true,
    "somatic": true,
    "material": {
      "components": ["a tiny ball of bat guano and sulfur"]
    }
  },
  "duration": {
    "type": "instantaneous"
  },
  "concentration": false,
  "description": "A bright streak flashes...",
  "effects": [
    {
      "type": "damage",
      "target": "area",
      "areaEffect": {
        "shape": "sphere",
        "size": 20
      },
      "save": {
        "ability": "dexterity",
        "effectOnSave": "half"
      },
      "damage": {
        "dice": "8d6",
        "type": "fire",
        "scaling": {
          "type": "dice",
          "interval": 1,
          "additional": "1d6"
        }
      }
    }
  ],
  "classes": ["sorcerer", "wizard"]
}
```

### 8.2 祝福术

```json
{
  "id": "bless",
  "name": "Bless",
  "level": 1,
  "school": "enchantment",
  "castingTime": {
    "type": "action",
    "value": 1
  },
  "range": {
    "type": "feet",
    "value": 30
  },
  "components": {
    "verbal": true,
    "somatic": true,
    "material": {
      "components": ["a sprinkling of holy water"]
    }
  },
  "duration": {
    "type": "minutes",
    "value": 1,
    "dismissable": true
  },
  "concentration": true,
  "description": "You bless up to three creatures...",
  "effects": [
    {
      "type": "buff",
      "target": "multiple",
      "maxTargets": 3,
      "buff": {
        "statBonus": [
          {
            "type": "roll_bonus",
            "value": "1d4",
            "appliesTo": ["attack_roll", "saving_throw"]
          }
        ]
      }
    }
  ],
  "classes": ["cleric", "paladin"]
}
```

---

## 9. 配置项

```yaml
spell:
  # 法术数据路径
  data_path: "./data/spells"

  # 专注检定
  concentration:
    base_dc: 10
    use_damage_half: true

  # 仪式施法
  ritual:
    enabled: true
    extra_time_multiplier: 10
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
