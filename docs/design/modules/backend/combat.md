# 战斗系统设计

> **模块名称**: combat
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

战斗系统负责 D&D 5e 战斗规则的实现：
- 战斗初始化和参战单位管理
- 先攻顺序管理
- 回合和行动管理
- 攻击和伤害计算
- 战斗结束判定

### 1.2 模块边界

**包含**：
- 战斗状态管理和持久化
- 先攻掷骰和排序
- 回合流程控制
- 攻击检定和伤害掷骰
- 战斗事件发布

**不包含**：
- 法术效果（由法术系统负责）
- 物品使用（由物品系统负责）
- 移动和碰撞（由地图系统负责）
- 角色属性计算（由角色系统负责）

---

## 2. 目录结构

```
internal/server/combat/
├── combat.go              # 战斗管理器
├── initiative.go          # 先攻管理
├── turn.go                # 回合管理
├── action.go              # 行动处理
├── attack.go              # 攻击处理
├── damage.go              # 伤害计算
├── movement.go            # 战斗移动
├── events.go              # 战斗事件
└── conditions.go          # 战斗中的状态效果
```

---

## 3. 数据模型

### 3.1 战斗状态

```go
// internal/server/combat/combat.go

type Combat struct {
    ID              string                `json:"id"`
    Active          bool                  `json:"active"`
    Round           int                   `json:"round"`
    InitiativeOrder []InitiativeEntry     `json:"initiativeOrder"`
    CurrentTurn     int                   `json:"currentTurn"`
    Combatants      map[string]*Combatant `json:"combatants"`
    MapID           string                `json:"mapId"`
    StartedAt       time.Time             `json:"startedAt"`
}

type CombatID string
```

### 3.2 先攻条目

```go
// internal/server/combat/initiative.go

type InitiativeEntry struct {
    CombatantID string `json:"combatantId"`
    Initiative  int    `json:"initiative"`
    HasActed    bool   `json:"hasActed"`
}
```

### 3.3 参战单位

```go
// internal/server/combat/combat.go

type Combatant struct {
    ID           string       `json:"id"`
    Name         string       `json:"name"`
    Type         CombatantType `json:"type"` // "player", "npc", "enemy"

    // 位置和移动
    Position     *Position    `json:"position"`
    Speed        int          `json:"speed"`
    MovementUsed int          `json:"movementUsed"`

    // 战斗属性
    MaxHP        int          `json:"maxHp"`
    CurrentHP    int          `json:"currentHp"`
    TemporaryHP  int          `json:"temporaryHp"`
    AC           int          `json:"ac"`

    // 行动资源
    Action       ActionState  `json:"action"`
    BonusAction  ActionState  `json:"bonusAction"`
    Reaction     ActionState  `json:"reaction"`

    // 武器和攻击
    Weapons      []Weapon     `json:"weapons"`
    Attacks      []Attack     `json:"attacks"`

    // 状态效果
    Conditions   []Condition  `json:"conditions"`

    // 死亡豁免（玩家角色）
    DeathSaves   *DeathSaves  `json:"deathSaves,omitempty"`

    // 仇恨/目标（AI 使用）
    Threats      map[string]int `json:"threats,omitempty"`
}

type CombatantType string

const (
    CombatantTypePlayer CombatantType = "player"
    CombatantTypeNPC    CombatantType = "npc"
    CombatantTypeEnemy  CombatantType = "enemy"
)

type ActionState string

const (
    ActionAvailable ActionState = "available"
    ActionUsed      ActionState = "used"
)
```

### 3.4 攻击模型

```go
// internal/server/combat/attack.go

type Attack struct {
    Name           string       `json:"name"`
    AttackBonus    int          `json:"attackBonus"`
    Damage         DamageRoll   `json:"damage"`
    DamageType     DamageType   `json:"damageType"`
    Range          Range        `json:"range"`
    Properties     []string     `json:"properties"`
}

type DamageRoll struct {
    BaseDice  string `json:"baseDice"`  // 如 "1d8"
    Bonus     int    `json:"bonus"`     // 固定加值
}

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

type Range struct {
    Normal int `json:"normal"`
    Long   int `json:"long,omitempty"` // 远程武器长距离
}
```

### 3.5 战斗事件

```go
// internal/server/combat/events.go

type CombatEventType string

const (
    CombatEventInitiativeRolled CombatEventType = "initiative_rolled"
    CombatEventTurnStart        CombatEventType = "turn_start"
    CombatEventTurnEnd          CombatEventType = "turn_end"
    CombatEventAttack           CombatEventType = "attack"
    CombatEventDamage           CombatEventType = "damage"
    CombatEventHeal             CombatEventType = "heal"
    CombatEventDeath            CombatEventType = "death"
    CombatEventUnconscious      CombatEventType = "unconscious"
    CombatEventConditionApplied CombatEventType = "condition_applied"
    CombatEventConditionRemoved CombatEventType = "condition_removed"
    CombatEventRoundEnd         CombatEventType = "round_end"
    CombatEventCombatEnd        CombatEventType = "combat_end"
)

type CombatEvent struct {
    Type      CombatEventType `json:"type"`
    CombatID  string          `json:"combatId"`
    Timestamp int64           `json:"timestamp"`
    Data      interface{}     `json:"data"`
}

type AttackEventData struct {
    AttackerID  string `json:"attackerId"`
    TargetID    string `json:"targetId"`
    AttackRoll  int    `json:"attackRoll"`
    TargetAC    int    `json:"targetAc"`
    Hit         bool   `json:"hit"`
    Critical    bool   `json:"critical"`
    Damage      int    `json:"damage,omitempty"`
    DamageType  DamageType `json:"damageType,omitempty"`
}

type DeathEventData struct {
    CombatantID string        `json:"combatantId"`
    CombatantType CombatantType `json:"combatantType"`
    KillerID    string        `json:"killerId,omitempty"`
}
```

---

## 4. 对外接口

### 4.1 战斗管理器

```go
// internal/server/combat/combat.go

type Manager struct {
    roller        *dice.Roller
    characterMgr  *character.Manager
    spellMgr      *spell.Manager
    itemMgr       *item.Manager
    mapMgr        *map.Manager
    eventBus      *events.Bus
}

func NewManager(
    roller *dice.Roller,
    characterMgr *character.Manager,
    spellMgr *spell.Manager,
    itemMgr *item.Manager,
    mapMgr *map.Manager,
    eventBus *events.Bus,
) *Manager

// 初始化战斗
func (m *Manager) InitiateCombat(req *InitiateCombatRequest) (*Combat, error)

// 结束战斗
func (m *Manager) EndCombat(combatID string) error

// 获取战斗状态
func (m *Manager) GetCombat(combatID string) (*Combat, error)

type InitiateCombatRequest struct {
    MapID           string   `json:"mapId"`
    ParticipantIDs  []string `json:"participantIds"`
    SurpriseRound   bool     `json:"surpriseRound"` // v1 暂不实现
}
```

### 4.2 先攻管理

```go
// internal/server/combat/initiative.go

type InitiativeManager struct {
    roller *dice.Roller
}

func NewInitiativeManager(roller *dice.Roller) *InitiativeManager

// 掷先攻
func (im *InitiativeManager) RollInitiative(combatants []*Combatant) ([]InitiativeEntry, error)

// 排序先攻顺序
func (im *InitiativeManager) SortInitiative(entries []InitiativeEntry) []InitiativeEntry

// 获取当前行动单位
func (im *InitiativeManager) GetCurrentCombatant(combat *Combat) *Combatant

// 前进到下一个单位
func (im *InitiativeManager) NextTurn(combat *Combat) (*Combatant, bool)

// 延迟行动
func (im *InitiativeManager) DelayAction(combat *Combat, combatantID string, newPosition int) error
```

### 4.3 回合管理

```go
// internal/server/combat/turn.go

type TurnManager struct {
    combatMgr *Manager
}

func NewTurnManager(combatMgr *Manager) *TurnManager

// 开始回合
func (tm *TurnManager) StartTurn(combat *Combat, combatantID string) error

// 结束回合
func (tm *TurnManager) EndTurn(combat *Combat, combatantID string) error

// 检查是否轮到该单位
func (tm *TurnManager) IsTurnOf(combat *Combat, combatantID string) bool

// 处理回合开始效果
func (tm *TurnManager) ProcessTurnStartEffects(combat *Combat, combatant *Combatant) error

// 处理回合结束效果
func (tm *TurnManager) ProcessTurnEndEffects(combat *Combat, combatant *Combatant) error
```

### 4.4 行动处理

```go
// internal/server/combat/action.go

type ActionManager struct {
    combatMgr *Manager
}

func NewActionManager(combatMgr *Manager) *ActionManager

// 执行攻击动作
func (am *ActionManager) Attack(combat *Combat, req *AttackRequest) (*AttackResult, error)

// 执行撤离动作
func (am *ActionManager) Disengage(combat *Combat, combatantID string) error

// 执行闪避动作
func (am *ActionManager) Dodge(combat *Combat, combatantID string) error

// 执行协助动作
func (am *ActionManager) Help(combat *Combat, combatantID, targetID string) error

// 执行躲藏动作
func (am *ActionManager) Hide(combat *Combat, combatantID string) (*SkillCheckResult, error)

// 执行搜索动作
func (am *ActionManager) Search(combat *Combat, combatantID string) (*SkillCheckResult, error)

// 执行预备动作
func (am *ActionManager) Ready(combat *Combat, combatantID string, trigger string, action ReadyAction) error

type AttackRequest struct {
    AttackerID string `json:"attackerId"`
    TargetID   string `json:"targetId"`
    WeaponID   string `json:"weaponId,omitempty"`
    Advantage  AdvantageType `json:"advantage"`
}

type ReadyAction struct {
    Type   string `json:"type"`   // "attack", "spell", "move"
    Target string `json:"target"` // 触发条件的目标
}

type AdvantageType string

const (
    AdvantageNormal      AdvantageType = "normal"
    AdvantageAdvantage   AdvantageType = "advantage"
    AdvantageDisadvantage AdvantageType = "disadvantage"
)
```

### 4.5 伤害计算

```go
// internal/server/combat/damage.go

type DamageCalculator struct {
    roller *dice.Roller
}

func NewDamageCalculator(roller *dice.Roller) *DamageCalculator

// 计算伤害
func (dc *DamageCalculator) CalculateDamage(damageRoll DamageRoll, critical bool) (int, error)

// 应用伤害
func (dc *DamageCalculator) ApplyDamage(combatant *Combatant, damage int, damageType DamageType) *DamageResult

// 应用抗性/免疫
func (dc *DamageCalculator) ApplyResistances(combatant *Combatant, damage int, damageType DamageType) int

// 应用治疗
func (dc *DamageCalculator) ApplyHealing(combatant *Combatant, healing int) *HealResult

type DamageResult struct {
    OriginalDamage  int        `json:"originalDamage"`
    ModifiedDamage  int        `json:"modifiedDamage"`
    ResistanceApplied bool     `json:"resistanceApplied"`
    ImmunityApplied   bool     `json:"immunityApplied"`
    CurrentHP       int        `json:"currentHp"`
    Unconscious     bool       `json:"unconscious"`
    Dead            bool       `json:"dead"`
}

type HealResult struct {
    Healing    int `json:"healing"`
    CurrentHP  int `json:"currentHp"`
    Conscious  bool `json:"conscious"`
}
```

---

## 5. 组件划分

### 5.1 战斗流程控制器

```go
// internal/server/combat/combat.go

func (m *Manager) InitiateCombat(req *InitiateCombatRequest) (*Combat, error) {
    combat := &Combat{
        ID:         generateID(),
        Active:     true,
        Round:      1,
        Combatants: make(map[string]*Combatant),
        MapID:      req.MapID,
        StartedAt:  time.Now(),
    }

    // 添加参战单位
    for _, id := range req.ParticipantIDs {
        combatant, err := m.createCombatant(id)
        if err != nil {
            return nil, err
        }
        combat.Combatants[id] = combatant
    }

    // 掷先攻
    entries, err := m.initiativeMgr.RollInitiative(
        maps.Values(combat.Combatants),
    )
    if err != nil {
        return nil, err
    }
    combat.InitiativeOrder = entries
    combat.CurrentTurn = 0

    // 发布战斗开始事件
    m.eventBus.Publish(CombatEvent{
        Type:     CombatEventCombatStart,
        CombatID: combat.ID,
        Data:     combat,
    })

    return combat, nil
}
```

### 5.2 攻击处理器

```go
// internal/server/combat/attack.go

type AttackHandler struct {
    roller    *dice.Roller
    damageCalc *DamageCalculator
}

func (h *AttackHandler) ExecuteAttack(attacker, target *Combatant, weapon *Weapon, advantage AdvantageType) (*AttackResult, error) {
    result := &AttackResult{
        AttackerID: attacker.ID,
        TargetID:   target.ID,
        WeaponName: weapon.Name,
    }

    // 计算攻击检定
    attackRoll := h.rollAttack(attacker, weapon, advantage)
    result.AttackRoll = attackRoll.Total
    result.Critical = attackRoll.Critical
    result.Fumble = attackRoll.Fumble

    // 判定命中
    result.Hit = attackRoll.Total >= target.AC || result.Critical

    if result.Hit {
        // 计算伤害
        damageRoll := weapon.Damage
        if attacker.HasCondition("blessed") {
            damageRoll.Bonus += 1 // 示例：祝福状态
        }

        damage, err := h.damageCalc.CalculateDamage(damageRoll, result.Critical)
        if err != nil {
            return nil, err
        }

        result.Damage = damage
        result.DamageType = weapon.DamageType
    }

    return result, nil
}

func (h *AttackHandler) rollAttack(attacker *Combatant, weapon *Weapon, advantage AdvantageType) *DiceRollResult {
    modifier := weapon.AttackBonus

    switch advantage {
    case AdvantageAdvantage:
        return h.roller.RollWithAdvantage("1d20+" + strconv.Itoa(modifier))
    case AdvantageDisadvantage:
        return h.roller.RollWithDisadvantage("1d20+" + strconv.Itoa(modifier))
    default:
        return h.roller.Roll("1d20+" + strconv.Itoa(modifier))
    }
}
```

### 5.3 伤害应用器

```go
// internal/server/combat/damage.go

func (dc *DamageCalculator) ApplyDamage(combatant *Combatant, damage int, damageType DamageType) *DamageResult {
    result := &DamageResult{
        OriginalDamage: damage,
    }

    // 应用抗性和免疫
    if combatant.HasImmunity(damageType) {
        result.ImmunityApplied = true
        result.ModifiedDamage = 0
    } else if combatant.HasResistance(damageType) {
        result.ResistanceApplied = true
        result.ModifiedDamage = damage / 2
    } else {
        result.ModifiedDamage = damage
    }

    // 扣除临时 HP
    if combatant.TemporaryHP > 0 {
        if combatant.TemporaryHP >= result.ModifiedDamage {
            combatant.TemporaryHP -= result.ModifiedDamage
            result.ModifiedDamage = 0
        } else {
            result.ModifiedDamage -= combatant.TemporaryHP
            combatant.TemporaryHP = 0
        }
    }

    // 扣除 HP
    combatant.CurrentHP -= result.ModifiedDamage
    result.CurrentHP = combatant.CurrentHP

    // 检查昏迷/死亡
    if combatant.CurrentHP <= 0 {
        if combatant.Type == CombatantTypePlayer {
            result.Unconscious = true
            combatant.CurrentHP = 0
        } else {
            result.Dead = true
            combatant.CurrentHP = 0
        }
    }

    return result
}
```

---

## 6. 状态设计

### 6.1 战斗状态机

```
┌─────────────────────────────────────────────────────────────────┐
│                        战斗状态机                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     初始化      ┌──────────┐                    │
│   │  Idle    │ ──────────────▶ │Initiative│                    │
│   └──────────┘                 │  Rolling │                    │
│        ▲                       └────┬─────┘                    │
│        │                            │                          │
│        │                            │ 先攻排序完成             │
│        │                            ▼                          │
│        │                       ┌──────────┐                    │
│        │                       │  Active  │◀──────────┐        │
│        │                       │  Combat  │           │        │
│        │                       └────┬─────┘           │        │
│        │                            │                 │        │
│        │         ┌──────────────────┼─────────────────┤        │
│        │         │                  │                 │        │
│        │         ▼                  ▼                 ▼        │
│        │    ┌──────────┐      ┌──────────┐     ┌──────────┐   │
│        │    │   Turn   │      │   Turn   │     │   Turn   │   │
│        │    │  Start   │─────▶│  Action  │────▶│   End    │   │
│        │    └──────────┘      └──────────┘     └────┬─────┘   │
│        │                                            │         │
│        │                       所有回合结束          │         │
│        │                       或战斗结束           │         │
│        └────────────────────────────────────────────┘         │
│                           战斗结束                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 回合资源状态

```go
type TurnResources struct {
    Action       ActionState `json:"action"`
    BonusAction  ActionState `json:"bonusAction"`
    Reaction     ActionState `json:"reaction"`
    MovementUsed int         `json:"movementUsed"`
}

// 重置回合资源
func (tr *TurnResources) Reset() {
    tr.Action = ActionAvailable
    tr.BonusAction = ActionAvailable
    tr.Reaction = ActionAvailable
    tr.MovementUsed = 0
}
```

---

## 7. 模块间通信

### 7.1 与角色系统通信

```go
// 从角色创建参战单位
func (m *Manager) createCombatantFromCharacter(char *character.Character) *Combatant {
    return &Combatant{
        ID:          string(char.ID),
        Name:        char.Name,
        Type:        CombatantTypePlayer,
        Position:    char.Position,
        Speed:       char.Speed,
        MaxHP:       char.MaxHP,
        CurrentHP:   char.CurrentHP,
        TemporaryHP: char.TemporaryHP,
        AC:          m.calculateAC(char),
        Weapons:     m.getWeapons(char),
        Conditions:  char.Conditions,
        DeathSaves:  &char.DeathSaves,
    }
}
```

### 7.2 与地图系统通信

```go
// 检查攻击距离
func (m *Manager) checkAttackRange(attacker, target *Combatant, weapon *Weapon) (bool, error) {
    distance, err := m.mapMgr.GetDistance(attacker.Position, target.Position)
    if err != nil {
        return false, err
    }

    return distance <= weapon.Range.Normal, nil
}

// 检查视线
func (m *Manager) checkLineOfSight(attacker, target *Combatant) (bool, error) {
    return m.mapMgr.HasLineOfSight(attacker.Position, target.Position)
}

// 检查掩护
func (m *Manager) checkCover(attacker, target *Combatant) (CoverType, error) {
    return m.mapMgr.GetCover(attacker.Position, target.Position)
}

type CoverType int

const (
    CoverNone CoverType = iota
    CoverHalf    // +2 AC
    CoverThreeQuarters // +5 AC
    CoverFull    // 不能被选为目标
)
```

### 7.3 与事件总线通信

```go
// 发布战斗事件
func (m *Manager) publishCombatEvent(eventType CombatEventType, combatID string, data interface{}) {
    m.eventBus.Publish(CombatEvent{
        Type:      eventType,
        CombatID:  combatID,
        Timestamp: time.Now().Unix(),
        Data:      data,
    })
}

// 在攻击后发布事件
func (h *AttackHandler) ExecuteAttack(...) (*AttackResult, error) {
    // ... 攻击逻辑 ...

    // 发布攻击事件
    h.eventBus.Publish(CombatEvent{
        Type:     CombatEventAttack,
        CombatID: combatID,
        Data: AttackEventData{
            AttackerID: result.AttackerID,
            TargetID:   result.TargetID,
            AttackRoll: result.AttackRoll,
            Hit:        result.Hit,
            Critical:   result.Critical,
            Damage:     result.Damage,
        },
    })

    return result, nil
}
```

---

## 8. 特殊规则处理

### 8.1 优势/劣势来源

```go
type AdvantageSource struct {
    Source      string `json:"source"`
    Type        AdvantageType `json:"type"`
    Duration    int `json:"duration"` // 回合数，-1 表示永久
}

// 检查是否有优势/劣势
func (c *Combatant) GetAdvantageType(action string) AdvantageType {
    var hasAdvantage, hasDisadvantage bool

    for _, source := range c.AdvantageSources {
        if source.AppliesTo(action) {
            if source.Type == AdvantageAdvantage {
                hasAdvantage = true
            } else {
                hasDisadvantage = true
            }
        }
    }

    // 优势和劣势抵消
    if hasAdvantage && hasDisadvantage {
        return AdvantageNormal
    }
    if hasAdvantage {
        return AdvantageAdvantage
    }
    if hasDisadvantage {
        return AdvantageDisadvantage
    }
    return AdvantageNormal
}
```

### 8.2 反应动作

```go
// 反应动作管理
type ReactionManager struct {
    reactions map[string]*Reaction
}

type Reaction struct {
    CombatantID string      `json:"combatantId"`
    Type        string      `json:"type"` // "opportunity_attack", "shield", etc.
    Trigger     string      `json:"trigger"`
    Action      func() error `json:"-"`
    Used        bool        `json:"used"`
}

// 机会攻击
func (rm *ReactionManager) TriggerOpportunityAttack(combat *Combat, movingID, threateningID string) error {
    combatant := combat.Combatants[threateningID]
    if combatant.Reaction != ActionAvailable {
        return nil // 没有反应可用
    }

    target := combat.Combatants[movingID]

    // 执行机会攻击
    result, err := rm.attackHandler.ExecuteAttack(combatant, target, combatant.GetMainWeapon(), AdvantageNormal)
    if err != nil {
        return err
    }

    // 消耗反应
    combatant.Reaction = ActionUsed

    return nil
}
```

### 8.3 死亡豁免

```go
// 在回合结束时检查死亡豁免
func (tm *TurnManager) ProcessDeathSave(combat *Combat, combatant *Combatant) error {
    if combatant.CurrentHP > 0 || combatant.DeathSaves == nil {
        return nil
    }

    result, err := tm.deathMgr.DeathSave(combatant)
    if err != nil {
        return err
    }

    if result.Dead {
        tm.eventBus.Publish(CombatEvent{
            Type:     CombatEventDeath,
            CombatID: combat.ID,
            Data: DeathEventData{
                CombatantID: combatant.ID,
                CombatantType: combatant.Type,
            },
        })
    } else if result.Stable {
        // 角色稳定
        tm.eventBus.Publish(CombatEvent{
            Type:     CombatEventConditionApplied,
            CombatID: combat.ID,
            Data: ConditionEventData{
                CombatantID: combatant.ID,
                Condition:   "stable",
            },
        })
    }

    return nil
}
```

---

## 9. 战斗结束判定

```go
// 检查战斗是否应该结束
func (m *Manager) checkCombatEnd(combat *Combat) (bool, CombatResult) {
    var playerAlive, enemyAlive bool

    for _, combatant := range combat.Combatants {
        if combatant.CurrentHP > 0 {
            if combatant.Type == CombatantTypePlayer {
                playerAlive = true
            } else if combatant.Type == CombatantTypeEnemy {
                enemyAlive = true
            }
        }
    }

    if !enemyAlive {
        return true, CombatResult{Victory: true, Reason: "All enemies defeated"}
    }
    if !playerAlive {
        return true, CombatResult{Victory: false, Reason: "Party defeated"}
    }

    return false, CombatResult{}
}

type CombatResult struct {
    Victory bool   `json:"victory"`
    Reason  string `json:"reason"`
    XP      int    `json:"xp"` // 经验值奖励
    Loot    []LootItem `json:"loot,omitempty"`
}
```

---

## 10. 配置项

```yaml
combat:
  # 战斗设置
  auto_end_combat: true        # 自动结束战斗
  xp_multiplier: 1.0           # 经验值倍率

  # 死亡豁免
  death_save_dc: 10            # 死亡豁免 DC
  death_save_critical_range: 20 # 死亡豁免大成功
  death_save_fumble_range: 1   # 死亡豁免大失败

  # 机会攻击
  opportunity_attack_enabled: true
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
