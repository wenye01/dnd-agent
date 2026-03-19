# 战斗系统组件设计

> **模块名称**: combat
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 组件列表和职责

| 组件名称 | 文件 | 职责描述 |
|----------|------|----------|
| **CombatManager** | combat.go | 战斗生命周期管理，战斗状态初始化和清理 |
| **InitiativeManager** | initiative.go | 先攻掷骰、排序、当前行动单位管理 |
| **TurnManager** | turn.go | 回合开始/结束控制，回合资源重置 |
| **ActionManager** | action.go | 战斗行动处理（攻击、移动、技能） |
| **AttackHandler** | attack.go | 攻击检定、命中判定、伤害计算 |
| **DamageCalculator** | damage.go | 伤害计算、抗性/免疫应用、HP修改 |
| **MovementManager** | movement.go | 战斗移动、机会攻击触发 |
| **ReactionManager** | reactions.go | 反应动作管理（机会攻击、护盾等） |
| **ConditionManager** | conditions.go | 状态效果应用、移除、持续时间管理 |
| **CombatEventBus** | events.go | 战斗事件发布和订阅 |

---

## 2. 组件接口定义

### 2.1 CombatManager

```go
// internal/server/combat/combat.go

package combat

import (
    "context"
    "time"

    "github.com/project/dnd/internal/server/dice"
    "github.com/project/dnd/internal/server/events"
)

// CombatManager 战斗管理器
type CombatManager struct {
    roller           *dice.Roller
    initiativeMgr    *InitiativeManager
    turnMgr          *TurnManager
    actionMgr        *ActionManager
    damageCalc       *DamageCalculator
    movementMgr      *MovementManager
    reactionMgr      *ReactionManager
    conditionMgr     *ConditionManager
    eventBus         *events.Bus

    // 依赖注入
    characterService CharacterService
    spellService     SpellService
    itemService      ItemService
    mapService       MapService
}

// CharacterService 角色服务接口
type CharacterService interface {
    GetCharacter(id string) (*Character, error)
    UpdateCharacter(char *Character) error
    GetAC(char *Character) int
}

// SpellService 法术服务接口
type SpellService interface {
    CastSpell(req *CastSpellRequest) (*CastSpellResult, error)
}

// ItemService 物品服务接口
type ItemService interface {
    UseItem(req *UseItemRequest) (*UseItemResult, error)
}

// MapService 地图服务接口
type MapService interface {
    GetDistance(from, to *Position) (int, error)
    HasLineOfSight(from, to *Position) (bool, error)
    GetCover(from, to *Position) (CoverType, error)
}

// NewCombatManager 创建战斗管理器
func NewCombatManager(
    roller *dice.Roller,
    eventBus *events.Bus,
    charSvc CharacterService,
    spellSvc SpellService,
    itemSvc ItemService,
    mapSvc MapService,
) *CombatManager

// InitiateCombatRequest 初始化战斗请求
type InitiateCombatRequest struct {
    MapID          string   `json:"mapId"`
    ParticipantIDs []string `json:"participantIds"`
    SurpriseRound  bool     `json:"surpriseRound"`
}

// Combat 战斗状态
type Combat struct {
    ID              string            `json:"id"`
    Active          bool              `json:"active"`
    Round           int               `json:"round"`
    InitiativeOrder []InitiativeEntry `json:"initiativeOrder"`
    CurrentTurn     int               `json:"currentTurn"`
    Combatants      map[string]*Combatant `json:"combatants"`
    MapID           string            `json:"mapId"`
    StartedAt       time.Time         `json:"startedAt"`
    EndedAt         *time.Time        `json:"endedAt,omitempty"`
}

// InitiateCombat 初始化战斗
func (m *CombatManager) InitiateCombat(ctx context.Context, req *InitiateCombatRequest) (*Combat, error)

// EndCombat 结束战斗
func (m *CombatManager) EndCombat(ctx context.Context, combatID string) (*CombatResult, error)

// GetCombat 获取战斗状态
func (m *CombatManager) GetCombat(ctx context.Context, combatID string) (*Combat, error)

// GetCombatant 获取参战单位
func (m *CombatManager) GetCombatant(ctx context.Context, combatID, combatantID string) (*Combatant, error)

// UpdateCombatant 更新参战单位状态
func (m *CombatManager) UpdateCombatant(ctx context.Context, combatID string, combatant *Combatant) error
```

### 2.2 InitiativeManager

```go
// internal/server/combat/initiative.go

// InitiativeManager 先攻管理器
type InitiativeManager struct {
    roller *dice.Roller
}

// UnitStatus 单位状态
type UnitStatus string

const (
    UnitStatusActive        UnitStatus = "active"        // 正常，可行动
    UnitStatusDelayed       UnitStatus = "delayed"       // 延迟行动
    UnitStatusReady         UnitStatus = "ready"         // 准备行动
    UnitStatusDead          UnitStatus = "dead"          // 已死亡
    UnitStatusIncapacitated UnitStatus = "incapacitated" // 失能
)

// InitiativeEntry 先攻条目
type InitiativeEntry struct {
    CombatantID string     `json:"combatantId"`
    Initiative  int        `json:"initiative"`
    Dexterity   int        `json:"dexterity"` // 平局时比较
    Status      UnitStatus `json:"status"`
}

// NewInitiativeManager 创建先攻管理器
func NewInitiativeManager(roller *dice.Roller) *InitiativeManager

// RollInitiative 掷先攻
func (m *InitiativeManager) RollInitiative(combatants []*Combatant) ([]InitiativeEntry, error)

// SortInitiative 排序先攻顺序
func (m *InitiativeManager) SortInitiative(entries []InitiativeEntry) []InitiativeEntry

// GetCurrentCombatant 获取当前行动单位
func (m *InitiativeManager) GetCurrentCombatant(combat *Combat) *Combatant

// NextTurn 前进到下一个单位
func (m *InitiativeManager) NextTurn(combat *Combat) (*Combatant, bool, error)

// DelayAction 延迟行动
func (m *InitiativeManager) DelayAction(combat *Combat, combatantID string, newPosition int) error

// ReadyAction 准备行动
func (m *InitiativeManager) ReadyAction(combat *Combat, combatantID string, trigger ReadyAction) error

// ReadyAction 准备动作定义
type ReadyAction struct {
    Type   string `json:"type"`   // "attack", "spell", "move"
    Target string `json:"target"` // 触发条件目标
    SpellID string `json:"spellId,omitempty"`
}
```

### 2.3 TurnManager

```go
// internal/server/combat/turn.go

// TurnManager 回合管理器
type TurnManager struct {
    combatMgr    *CombatManager
    conditionMgr *ConditionManager
    eventBus     *events.Bus
}

// NewTurnManager 创建回合管理器
func NewTurnManager(combatMgr *CombatManager, conditionMgr *ConditionManager, eventBus *events.Bus) *TurnManager

// StartTurn 开始回合
func (m *TurnManager) StartTurn(ctx context.Context, combat *Combat, combatantID string) error

// EndTurn 结束回合
func (m *TurnManager) EndTurn(ctx context.Context, combat *Combat, combatantID string) error

// IsTurnOf 检查是否轮到该单位
func (m *TurnManager) IsTurnOf(combat *Combat, combatantID string) bool

// ProcessTurnStartEffects 处理回合开始效果
func (m *TurnManager) ProcessTurnStartEffects(ctx context.Context, combat *Combat, combatant *Combatant) error

// ProcessTurnEndEffects 处理回合结束效果
func (m *TurnManager) ProcessTurnEndEffects(ctx context.Context, combat *Combat, combatant *Combatant) error

// CanPerformAction 检查是否可以执行行动
func (m *TurnManager) CanPerformAction(combatant *Combatant, actionType ActionType) bool
```

### 2.4 ActionManager

```go
// internal/server/combat/action.go

// ActionManager 行动管理器
type ActionManager struct {
    combatMgr    *CombatManager
    attackHdl    *AttackHandler
    movementMgr  *MovementManager
    spellSvc     SpellService
    itemSvc      ItemService
}

// ActionType 行动类型
type ActionType string

const (
    ActionTypeAttack       ActionType = "attack"
    ActionTypeCastSpell    ActionType = "cast_spell"
    ActionTypeUseItem      ActionType = "use_item"
    ActionTypeMove         ActionType = "move"
    ActionTypeDisengage    ActionType = "disengage"
    ActionTypeDodge        ActionType = "dodge"
    ActionTypeHelp         ActionType = "help"
    ActionTypeHide         ActionType = "hide"
    ActionTypeSearch       ActionType = "search"
    ActionTypeReady        ActionType = "ready"
)

// NewActionManager 创建行动管理器
func NewActionManager(
    combatMgr *CombatManager,
    attackHdl *AttackHandler,
    movementMgr *MovementManager,
    spellSvc SpellService,
    itemSvc ItemService,
) *ActionManager

// PerformAction 执行行动
func (m *ActionManager) PerformAction(ctx context.Context, req *ActionRequest) (*ActionResult, error)

// ActionRequest 行动请求
type ActionRequest struct {
    CombatID    string      `json:"combatId"`
    CombatantID string      `json:"combatantId"`
    ActionType  ActionType  `json:"actionType"`
    TargetID    string      `json:"targetId,omitempty"`
    Position    *Position   `json:"position,omitempty"`
    SpellID     string      `json:"spellId,omitempty"`
    ItemID      string      `json:"itemId,omitempty"`
    WeaponID    string      `json:"weaponId,omitempty"`
    Advantage   AdvantageType `json:"advantage"`
}

// ActionResult 行动结果
type ActionResult struct {
    Success      bool              `json:"success"`
    ActionType   ActionType        `json:"actionType"`
    Message      string            `json:"message"`
    AttackResult *AttackResult     `json:"attackResult,omitempty"`
    SpellResult  *CastSpellResult  `json:"spellResult,omitempty"`
    ItemResult   *UseItemResult    `json:"itemResult,omitempty"`
    MoveResult   *MoveResult       `json:"moveResult,omitempty"`
}

// Attack 执行攻击动作
func (m *ActionManager) Attack(ctx context.Context, req *AttackRequest) (*AttackResult, error)

// Disengage 执行撤离动作
func (m *ActionManager) Disengage(ctx context.Context, combat *Combat, combatantID string) error

// Dodge 执行闪避动作
func (m *ActionManager) Dodge(ctx context.Context, combat *Combat, combatantID string) error

// Help 执行协助动作
func (m *ActionManager) Help(ctx context.Context, combat *Combat, combatantID, targetID string) error

// Hide 执行躲藏动作
func (m *ActionManager) Hide(ctx context.Context, combat *Combat, combatantID string) (*SkillCheckResult, error)

// Search 执行搜索动作
func (m *ActionManager) Search(ctx context.Context, combat *Combat, combatantID string) (*SkillCheckResult, error)

// Ready 执行预备动作
func (m *ActionManager) Ready(ctx context.Context, combat *Combat, combatantID string, trigger string, action ReadyAction) error
```

### 2.5 AttackHandler

```go
// internal/server/combat/attack.go

// AttackHandler 攻击处理器
type AttackHandler struct {
    roller       *dice.Roller
    damageCalc   *DamageCalculator
    mapSvc       MapService
    eventBus     *events.Bus
}

// AdvantageType 优势类型
type AdvantageType string

const (
    AdvantageNormal      AdvantageType = "normal"
    AdvantageAdvantage   AdvantageType = "advantage"
    AdvantageDisadvantage AdvantageType = "disadvantage"
)

// NewAttackHandler 创建攻击处理器
func NewAttackHandler(
    roller *dice.Roller,
    damageCalc *DamageCalculator,
    mapSvc MapService,
    eventBus *events.Bus,
) *AttackHandler

// AttackRequest 攻击请求
type AttackRequest struct {
    AttackerID string        `json:"attackerId"`
    TargetID   string        `json:"targetId"`
    WeaponID   string        `json:"weaponId,omitempty"`
    Advantage  AdvantageType `json:"advantage"`
}

// AttackResult 攻击结果
type AttackResult struct {
    AttackerID  string     `json:"attackerId"`
    TargetID    string     `json:"targetId"`
    WeaponName  string     `json:"weaponName"`
    AttackRoll  int        `json:"attackRoll"`
    TargetAC    int        `json:"targetAc"`
    Hit         bool       `json:"hit"`
    Critical    bool       `json:"critical"`
    Fumble      bool       `json:"fumble"`
    Damage      int        `json:"damage,omitempty"`
    DamageType  DamageType `json:"damageType,omitempty"`
}

// ExecuteAttack 执行攻击
func (h *AttackHandler) ExecuteAttack(ctx context.Context, combat *Combat, req *AttackRequest) (*AttackResult, error)

// CalculateAttackRoll 计算攻击检定
func (h *AttackHandler) CalculateAttackRoll(attacker *Combatant, weapon *Weapon, advantage AdvantageType) *DiceRollResult

// CheckHit 检查命中
func (h *AttackHandler) CheckHit(attackRoll int, target *Combatant, cover CoverType) bool

// CheckCover 检查掩护
func (h *AttackHandler) CheckCover(attacker, target *Combatant) (CoverType, error)

// CoverType 掩护类型
type CoverType int

const (
    CoverNone          CoverType = iota
    CoverHalf          // +2 AC
    CoverThreeQuarters // +5 AC
    CoverFull          // 不能被选为目标
)
```

### 2.6 DamageCalculator

```go
// internal/server/combat/damage.go

// DamageCalculator 伤害计算器
type DamageCalculator struct {
    roller *dice.Roller
}

// NewDamageCalculator 创建伤害计算器
func NewDamageCalculator(roller *dice.Roller) *DamageCalculator

// CalculateDamage 计算伤害
func (dc *DamageCalculator) CalculateDamage(damageRoll DamageRoll, critical bool) (int, error)

// ApplyDamage 应用伤害
func (dc *DamageCalculator) ApplyDamage(combatant *Combatant, damage int, damageType DamageType) *DamageResult

// ApplyResistances 应用抗性/免疫
func (dc *DamageCalculator) ApplyResistances(combatant *Combatant, damage int, damageType DamageType) int

// ApplyHealing 应用治疗
func (dc *DamageCalculator) ApplyHealing(combatant *Combatant, healing int) *HealResult

// DamageResult 伤害结果
type DamageResult struct {
    OriginalDamage    int        `json:"originalDamage"`
    ModifiedDamage    int        `json:"modifiedDamage"`
    ResistanceApplied bool       `json:"resistanceApplied"`
    ImmunityApplied   bool       `json:"immunityApplied"`
    CurrentHP         int        `json:"currentHp"`
    TemporaryHP       int        `json:"temporaryHp"`
    Unconscious       bool       `json:"unconscious"`
    Dead              bool       `json:"dead"`
    DeathSaveTriggered bool      `json:"deathSaveTriggered"`
}

// HealResult 治疗结果
type HealResult struct {
    Healing   int  `json:"healing"`
    CurrentHP int  `json:"currentHp"`
    Conscious bool `json:"conscious"`
}

// DamageRoll 伤害掷骰
type DamageRoll struct {
    BaseDice string `json:"baseDice"` // 如 "1d8"
    Bonus    int    `json:"bonus"`    // 固定加值
}

// DamageType 伤害类型
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

### 2.7 MovementManager

```go
// internal/server/combat/movement.go

// MovementManager 移动管理器
type MovementManager struct {
    mapSvc       MapService
    reactionMgr  *ReactionManager
    eventBus     *events.Bus
}

// NewMovementManager 创建移动管理器
func NewMovementManager(
    mapSvc MapService,
    reactionMgr *ReactionManager,
    eventBus *events.Bus,
) *MovementManager

// MoveRequest 移动请求
type MoveRequest struct {
    CombatID    string   `json:"combatId"`
    CombatantID string   `json:"combatantId"`
    Path        []Position `json:"path"`
    Disengage   bool     `json:"disengage"` // 是否使用撤离动作
}

// MoveResult 移动结果
type MoveResult struct {
    Success          bool       `json:"success"`
    MovedDistance    int        `json:"movedDistance"`
    RemainingSpeed   int        `json:"remainingSpeed"`
    OpportunityAttacks []*OpportunityAttackEvent `json:"opportunityAttacks,omitempty"`
}

// Move 移动
func (m *MovementManager) Move(ctx context.Context, combat *Combat, req *MoveRequest) (*MoveResult, error)

// CalculateMovementCost 计算移动消耗
func (m *MovementManager) CalculateMovementCost(from, to *Position, terrain string) int

// CheckOpportunityAttack 检查是否触发机会攻击
func (m *MovementManager) CheckOpportunityAttack(combat *Combat, movingID, from Position) []string

// OpportunityAttackEvent 机会攻击事件
type OpportunityAttackEvent struct {
    ThreateningID string `json:"threateningId"`
    Position      Position `json:"position"`
}
```

### 2.8 ReactionManager

```go
// internal/server/combat/reactions.go

// ReactionManager 反应管理器
type ReactionManager struct {
    attackHdl *AttackHandler
    eventBus  *events.Bus
}

// Reaction 反应动作
type Reaction struct {
    ID          string        `json:"id"`
    CombatantID string        `json:"combatantId"`
    Type        ReactionType  `json:"type"`
    Trigger     string        `json:"trigger"`
    Action      func() error  `json:"-"`
    Used        bool          `json:"used"`
    CreatedAt   time.Time     `json:"createdAt"`
}

// ReactionType 反应类型
type ReactionType string

const (
    ReactionOpportunityAttack ReactionType = "opportunity_attack"
    ReactionShield            ReactionType = "shield"
    ReactionCounterspell      ReactionType = "counterspell"
    ReactionParry             ReactionType = "parry"
)

// NewReactionManager 创建反应管理器
func NewReactionManager(attackHdl *AttackHandler, eventBus *events.Bus) *ReactionManager

// RegisterReaction 注册反应
func (m *ReactionManager) RegisterReaction(combat *Combat, reaction *Reaction) error

// TriggerOpportunityAttack 触发机会攻击
func (m *ReactionManager) TriggerOpportunityAttack(ctx context.Context, combat *Combat, movingID, threateningID string) (*AttackResult, error)

// UseReaction 使用反应
func (m *ReactionManager) UseReaction(ctx context.Context, combat *Combat, combatantID string, reactionID string) error

// ResetReactions 重置所有反应
func (m *ReactionManager) ResetReactions(combatant *Combatant)
```

### 2.9 ConditionManager

```go
// internal/server/combat/conditions.go

// ConditionManager 状态效果管理器
type ConditionManager struct {
    eventBus *events.Bus
}

// Condition 状态效果
type Condition string

const (
    ConditionBlinded      Condition = "blinded"
    ConditionCharmed      Condition = "charmed"
    ConditionDeafened     Condition = "deafened"
    ConditionExhaustion   Condition = "exhaustion"
    ConditionFrightened   Condition = "frightened"
    ConditionGrappled     Condition = "grappled"
    ConditionInvisible    Condition = "invisible"
    ConditionParalyzed    Condition = "paralyzed"
    ConditionPetrified    Condition = "petrified"
    ConditionPoisoned     Condition = "poisoned"
    ConditionProne        Condition = "prone"
    ConditionRestrained   Condition = "restrained"
    ConditionStunned      Condition = "stunned"
    ConditionUnconscious  Condition = "unconscious"
)

// ActiveCondition 活跃状态效果
type ActiveCondition struct {
    Condition   Condition `json:"condition"`
    SourceID    string    `json:"sourceId,omitempty"`
    Duration    int       `json:"duration"` // 回合数，-1 表示永久
    Remaining   int       `json:"remaining"`
    AppliedAt   time.Time `json:"appliedAt"`
}

// NewConditionManager 创建状态管理器
func NewConditionManager(eventBus *events.Bus) *ConditionManager

// ApplyCondition 应用状态效果
func (m *ConditionManager) ApplyCondition(combatant *Combatant, condition Condition, sourceID string, duration int) error

// RemoveCondition 移除状态效果
func (m *ConditionManager) RemoveCondition(combatant *Combatant, condition Condition) error

// HasCondition 检查是否有状态效果
func (m *ConditionManager) HasCondition(combatant *Combatant, condition Condition) bool

// ProcessConditionEffects 处理状态效果
func (m *ConditionManager) ProcessConditionEffects(ctx context.Context, combat *Combat, combatant *Combatant) error

// DecreaseDurations 减少持续时间
func (m *ConditionManager) DecreaseDurations(combatant *Combatant)

// GetConditionModifiers 获取状态效果调整值
func (m *ConditionManager) GetConditionModifiers(combatant *Combatant) map[string]int
```

### 2.10 CombatEventBus

```go
// internal/server/combat/events.go

// CombatEventType 战斗事件类型
type CombatEventType string

const (
    CombatEventCombatStart       CombatEventType = "combat_start"
    CombatEventInitiativeRolled  CombatEventType = "initiative_rolled"
    CombatEventTurnStart         CombatEventType = "turn_start"
    CombatEventTurnEnd           CombatEventType = "turn_end"
    CombatEventAttack            CombatEventType = "attack"
    CombatEventDamage            CombatEventType = "damage"
    CombatEventHeal              CombatEventType = "heal"
    CombatEventDeath             CombatEventType = "death"
    CombatEventUnconscious       CombatEventType = "unconscious"
    CombatEventConditionApplied  CombatEventType = "condition_applied"
    CombatEventConditionRemoved  CombatEventType = "condition_removed"
    CombatEventRoundEnd          CombatEventType = "round_end"
    CombatEventCombatEnd         CombatEventType = "combat_end"
    CombatEventOpportunityAttack CombatEventType = "opportunity_attack"
)

// CombatEvent 战斗事件
type CombatEvent struct {
    Type      CombatEventType `json:"type"`
    CombatID  string          `json:"combatId"`
    Timestamp int64           `json:"timestamp"`
    Data      interface{}     `json:"data"`
}

// AttackEventData 攻击事件数据
type AttackEventData struct {
    AttackerID string     `json:"attackerId"`
    TargetID   string     `json:"targetId"`
    AttackRoll int        `json:"attackRoll"`
    TargetAC   int        `json:"targetAc"`
    Hit        bool       `json:"hit"`
    Critical   bool       `json:"critical"`
    Damage     int        `json:"damage,omitempty"`
    DamageType DamageType `json:"damageType,omitempty"`
}

// DeathEventData 死亡事件数据
type DeathEventData struct {
    CombatantID   string        `json:"combatantId"`
    CombatantType CombatantType `json:"combatantType"`
    KillerID      string        `json:"killerId,omitempty"`
}

// ConditionEventData 状态效果事件数据
type ConditionEventData struct {
    CombatantID string    `json:"combatantId"`
    Condition   Condition `json:"condition"`
    Applied     bool      `json:"applied"` // true=应用, false=移除
}

// CombatEventHandler 战斗事件处理器
type CombatEventHandler func(event CombatEvent)

// CombatEventBus 战斗事件总线
type CombatEventBus struct {
    handlers map[CombatEventType][]CombatEventHandler
    eventBus *events.Bus
}

// NewCombatEventBus 创建战斗事件总线
func NewCombatEventBus(eventBus *events.Bus) *CombatEventBus

// Subscribe 订阅事件
func (b *CombatEventBus) Subscribe(eventType CombatEventType, handler CombatEventHandler)

// Publish 发布事件
func (b *CombatEventBus) Publish(event CombatEvent)
```

---

## 3. 组件内部结构设计

### 3.1 CombatManager 内部结构

```
┌─────────────────────────────────────────────────────────────────┐
│                         CombatManager                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│   │ Initiative    │  │     Turn      │  │    Action     │     │
│   │   Manager     │  │   Manager     │  │   Manager     │     │
│   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘     │
│           │                  │                  │               │
│           └──────────────────┼──────────────────┘               │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │   Attack      │  │   Movement      │  │   Reaction    │   │
│   │   Handler     │  │   Manager       │  │   Manager     │   │
│   └───────┬───────┘  └─────────────────┘  └───────┬───────┘   │
│           │                                          │           │
│           └──────────────────┬───────────────────────┘           │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │    Damage     │  │   Condition     │  │     Event     │   │
│   │  Calculator   │  │   Manager       │  │     Bus       │   │
│   └───────────────┘  └─────────────────┘  └───────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│ │                    依赖服务                               │   │
│ │  CharacterService │ SpellService │ ItemService │ MapSvc  │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 战斗状态机

```go
// internal/server/combat/state.go

// CombatState 战斗状态
type CombatState string

const (
    CombatStateIdle     CombatState = "idle"
    CombatStateActive   CombatState = "active"
    CombatStatePaused   CombatState = "paused"
    CombatStateEnded    CombatState = "ended"
)

// TurnState 回合状态
type TurnState string

const (
    TurnStateInitiative TurnState = "initiative"
    TurnStateTurnStart  TurnState = "turn_start"
    TurnStateAction     TurnState = "action"
    TurnStateTurnEnd    TurnState = "turn_end"
)

// StateTransition 状态转换
type StateTransition struct {
    From   CombatState
    To     CombatState
    Action func() error
}

// StateMachine 状态机
type StateMachine struct {
    currentState CombatState
    transitions  map[CombatState][]StateTransition
}

// Transition 转换状态
func (sm *StateMachine) Transition(to CombatState) error
```

---

## 4. 组件间通信方式

### 4.1 同步调用

```go
// ActionManager -> AttackHandler (同步)
attackResult, err := m.attackHdl.ExecuteAttack(ctx, combat, attackReq)

// DamageCalculator -> ConditionManager (同步)
hasCondition := m.conditionMgr.HasCondition(combatant, ConditionParalyzed)
```

### 4.2 事件发布

```go
// 发布攻击事件
m.eventBus.Publish(CombatEvent{
    Type:     CombatEventAttack,
    CombatID: combat.ID,
    Timestamp: time.Now().Unix(),
    Data: AttackEventData{
        AttackerID: result.AttackerID,
        TargetID:   result.TargetID,
        Hit:        result.Hit,
        Damage:     result.Damage,
    },
})

// 订阅伤害事件
m.combatEventBus.Subscribe(CombatEventDamage, func(event CombatEvent) {
    data := event.Data.(DamageEventData)
    // 处理伤害后的效果
})
```

### 4.3 回调函数

```go
// MovementManager -> ReactionManager
opportunityAttacks := m.reactionMgr.CheckOpportunityAttacks(
    combat,
    movingID,
    from,
    func(targetID string) (*AttackResult, error) {
        return m.reactionMgr.TriggerOpportunityAttack(ctx, combat, movingID, targetID)
    },
)
```

---

## 5. 状态管理设计

### 5.1 战斗状态存储（内存管理）

战斗状态存储在内存中，由 StateManager 统一管理。

```go
// 战斗状态存储在 GameState 中
type GameState struct {
    // ...
    Combat *CombatState `json:"combat,omitempty"` // 当前战斗状态
    // ...
}

// StateManager 提供战斗状态访问方法
func (sm *StateManager) GetCombatState(sessionID string) *CombatState
func (sm *StateManager) UpdateCombatState(sessionID string, combat *CombatState) error
func (sm *StateManager) StartCombat(sessionID string, participants []string) error
func (sm *StateManager) EndCombat(sessionID string) error

// CombatState 战斗状态
type CombatState struct {
    Active          bool                    `json:"active"`
    Round           int                     `json:"round"`
    TurnNumber      int                     `json:"turnNumber"`
    InitiativeOrder []InitiativeEntry       `json:"initiativeOrder"`
    CurrentTurn     int                     `json:"currentTurn"`
    Combatants      map[string]*Combatant   `json:"combatants"`
    Log             []CombatLogEntry        `json:"log"`
}

// CombatManager 通过 StateManager 访问和更新战斗数据
type CombatManager struct {
    stateManager *state.Manager
    persistence  *persistence.Manager
    eventBus     *events.Bus
    // ...
}

// StartCombat 开始战斗
func (cm *CombatManager) StartCombat(sessionID string, participants []string) error {
    // 创建战斗状态
    combat := &CombatState{
        Active:     true,
        Round:      1,
        TurnNumber: 0,
        Combatants: make(map[string]*Combatant),
    }

    // 添加参战者
    for _, id := range participants {
        combat.Combatants[id] = &Combatant{ /* ... */ }
    }

    // 擦先攻
    cm.rollInitiative(combat)

    // 更新状态
    if err := cm.stateManager.UpdateCombatState(sessionID, combat); err != nil {
        return err
    }

    // 记录事件
    return cm.persistence.LogCombatStart(sessionID, participants)
}

// 持久化由 PersistenceManager 负责
// - SaveState() 定期保存完整状态快照
// - LogCombatStart/End() 记录战斗事件
```

### 5.2 状态快照

```go
// CombatSnapshot 战斗快照
type CombatSnapshot struct {
    Combat      *Combat    `json:"combat"`
    TakenAt     time.Time  `json:"takenAt"`
    RoundNumber int        `json:"roundNumber"`
}

// TakeSnapshot 创建快照
func (m *CombatManager) TakeSnapshot(combatID string) (*CombatSnapshot, error)

// RestoreFromSnapshot 从快照恢复
func (m *CombatManager) RestoreFromSnapshot(snapshot *CombatSnapshot) error
```

### 5.3 状态同步

```go
// StateSync 状态同步器
type StateSync struct {
    combatMgr *CombatManager
    eventBus  *events.Bus
    clients   map[string]*WebSocketClient
}

// BroadcastState 广播状态
func (ss *StateSync) BroadcastState(combatID string, state *Combat) error

// SubscribeState 订阅状态更新
func (ss *StateSync) SubscribeState(clientID string, combatID string)
```

---

## 6. 错误处理设计

### 6.1 错误类型

```go
// CombatError 战斗错误
type CombatError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Detail  string `json:"detail,omitempty"`
}

func (e *CombatError) Error() string {
    return e.Message
}

// 错误代码
const (
    ErrCombatNotFound     = "COMBAT_NOT_FOUND"
    ErrCombatantNotFound  = "COMBATANT_NOT_FOUND"
    ErrNotYourTurn        = "NOT_YOUR_TURN"
    ErrActionExhausted    = "ACTION_EXHAUSTED"
    ErrOutOfRange         = "OUT_OF_RANGE"
    ErrInvalidTarget      = "INVALID_TARGET"
    ErrCombatAlreadyEnded = "COMBAT_ALREADY_ENDED"
)

// NewCombatError 创建错误
func NewCombatError(code, message, detail string) *CombatError
```

### 6.2 错误恢复

```go
// RecoverableError 可恢复错误
type RecoverableError struct {
    Err        error
    CanRetry   bool
    RetryAfter time.Duration
}

// ErrorHandler 错误处理器
type ErrorHandler struct {
    logger *log.Logger
}

// Handle 处理错误
func (eh *ErrorHandler) Handle(ctx context.Context, err error) *CombatError {
    switch e := err.(type) {
    case *CombatError:
        return e
    case *RecoverableError:
        if e.CanRetry {
            // 记录并允许重试
            eh.logger.Warn("Recoverable error", "error", e.Err)
            return &CombatError{
                Code:    "RETRYABLE_ERROR",
                Message: e.Err.Error(),
            }
        }
    default:
        // 未知错误
        eh.logger.Error("Unknown error", "error", err)
        return &CombatError{
            Code:    "INTERNAL_ERROR",
            Message: "An internal error occurred",
        }
    }
}
```

### 6.3 验证链

```go
// ValidationChain 验证链
type ValidationChain struct {
    validators []func() error
}

// Add 添加验证器
func (vc *ValidationChain) Add(validator func() error) *ValidationChain

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
func (m *ActionManager) validateAttackRequest(ctx context.Context, combat *Combat, req *AttackRequest) error {
    return NewValidationChain().
        Add(func() error { return m.validateCombatActive(combat) }).
        Add(func() error { return m.validateIsTurnOf(combat, req.AttackerID) }).
        Add(func() error { return m.validateTargetInRange(ctx, combat, req) }).
        Add(func() error { return m.validateActionAvailable(combat, req.AttackerID) }).
        Validate()
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
