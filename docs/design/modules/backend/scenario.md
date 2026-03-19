# 剧本系统设计

> **模块名称**: scenario
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

剧本系统负责游戏剧本的管理：
- 剧本数据加载和解析
- 章节和场景管理
- 事件触发器处理
- NPC 数据管理
- 遭遇和战斗触发
- 剧本进度追踪

### 1.2 模块边界

**包含**：
- 剧本数据模型和加载
- 章节流程管理
- 事件触发器定义和检测
- NPC 模板数据
- 遭遇配置和难度计算

**不包含**：
- 战斗执行（由战斗系统负责）
- 地图数据（由地图系统负责）
- NPC AI 行为（由 Client 模块/LLM 负责）

---

## 2. 目录结构

```
internal/server/scenario/
├── scenario.go            # 剧本模型定义
├── loader.go              # 剧本加载器
├── chapter.go             # 章节管理
├── scene.go               # 场景管理
├── event.go               # 事件触发器
├── encounter.go           # 遭遇定义
├── npc.go                 # NPC 模板
├── progress.go            # 进度追踪
├── trigger.go             # 触发器引擎
└── difficulty.go          # 难度计算
```

---

## 3. 数据模型

### 3.1 剧本模型

```go
// internal/server/scenario/scenario.go

type Scenario struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Description string        `json:"description"`
    Version     string        `json:"version"`
    Author      string        `json:"author"`

    // 推荐设置
    LevelRange  [2]int        `json:"levelRange"` // [min, max]
    PartySize   [2]int        `json:"partySize"`  // [min, max]

    // 内容
    Chapters    []Chapter     `json:"chapters"`
    NPCs        []NPCTemplate `json:"npcs"`
    Maps        []string      `json:"maps"`       // 地图 ID 列表
    Items       []string      `json:"items"`      // 特殊物品 ID

    // 起始配置
    StartChapter string       `json:"startChapter"`
    StartScene   string       `json:"startScene"`
    StartMap     string       `json:"startMap"`
    StartPosition Position    `json:"startPosition"`

    // 元数据
    Tags        []string      `json:"tags"`
    EstimatedPlayTime int     `json:"estimatedPlayTime"` // 分钟
}
```

### 3.2 章节模型

```go
// internal/server/scenario/chapter.go

type Chapter struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Description string        `json:"description"`
    Order       int           `json:"order"`      // 章节顺序

    // 场景
    Scenes      []Scene       `json:"scenes"`

    // 完成条件
    CompletionCondition *Condition `json:"completionCondition"`

    // 奖励
    XP          int           `json:"xp"`
    Treasure    []Treasure    `json:"treasure"`
}

type Treasure struct {
    ItemID    string `json:"itemId,omitempty"`
    Gold      int    `json:"gold,omitempty"`
    Random    *RandomTreasure `json:"random,omitempty"`
}

type RandomTreasure struct {
    Table     string `json:"table"`
    Rolls     int    `json:"rolls"`
}
```

### 3.3 场景模型

```go
// internal/server/scenario/scene.go

type Scene struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Description string        `json:"description"`

    // 地图
    MapID       string        `json:"mapId"`

    // 入口
    EntranceID  string        `json:"entranceId"`

    // NPC 和敌人
    NPCs        []SceneNPC    `json:"npcs,omitempty"`
    Enemies     []SceneEnemy  `json:"enemies,omitempty"`

    // 触发器
    Triggers    []Trigger     `json:"triggers"`

    // 交互物
    Interactables []Interactable `json:"interactables"`

    // 出口
    Exits       []SceneExit   `json:"exits"`
}

type SceneNPC struct {
    NPCTemplateID string    `json:"npcTemplateId"`
    Position      Position  `json:"position"`
    Name          string    `json:"name,omitempty"` // 自定义名称
    Attitude      Attitude  `json:"attitude"`       // 初始态度
    QuestGiver    bool      `json:"questGiver,omitempty"`
}

type SceneEnemy struct {
    EnemyID       string    `json:"enemyId"`       // 怪物图鉴 ID
    Position      Position  `json:"position"`
    PatrolPath    []Position `json:"patrolPath,omitempty"`
    AlertRange    int       `json:"alertRange"`    // 警戒范围（英尺）
    Loot          []Treasure `json:"loot,omitempty"`
}

type Attitude string

const (
    AttitudeFriendly    Attitude = "friendly"
    AttitudeIndifferent Attitude = "indifferent"
    AttitudeHostile     Attitude = "hostile"
)
```

### 3.4 触发器模型

```go
// internal/server/scenario/trigger.go

type Trigger struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Enabled     bool          `json:"enabled"`
    OneTime     bool          `json:"oneTime"`     // 是否一次性

    // 触发条件
    Condition   Condition     `json:"condition"`

    // 触发动作
    Actions     []Action      `json:"actions"`

    // 状态
    Triggered   bool          `json:"triggered"`
}

type Condition struct {
    Type        ConditionType `json:"type"`
    Params      map[string]interface{} `json:"params"`
    And         []Condition   `json:"and,omitempty"`
    Or          []Condition   `json:"or,omitempty"`
}

type ConditionType string

const (
    ConditionEnterArea      ConditionType = "enter_area"
    ConditionInteractWith   ConditionType = "interact_with"
    ConditionDefeatAll      ConditionType = "defeat_all"
    ConditionHasItem        ConditionType = "has_item"
    ConditionFlagSet        ConditionType = "flag_set"
    ConditionDialogChoice   ConditionType = "dialog_choice"
    ConditionVariableEquals ConditionType = "variable_equals"
    ConditionTimeElapsed    ConditionType = "time_elapsed"
)

type Action struct {
    Type        ActionType    `json:"type"`
    Params      map[string]interface{} `json:"params"`
    Delay       int           `json:"delay,omitempty"` // 延迟（秒）
}

type ActionType string

const (
    ActionStartCombat     ActionType = "start_combat"
    ActionSpawnNPC        ActionType = "spawn_npc"
    ActionSpawnEnemy      ActionType = "spawn_enemy"
    ActionSetFlag         ActionType = "set_flag"
    ActionClearFlag       ActionType = "clear_flag"
    ActionSetVariable     ActionType = "set_variable"
    ActionShowDialog      ActionType = "show_dialog"
    ActionGiveItem        ActionType = "give_item"
    ActionRemoveItem      ActionType = "remove_item"
    ActionGiveXP          ActionType = "give_xp"
    ActionTeleport        ActionType = "teleport"
    ActionChangeScene     ActionType = "change_scene"
    ActionUnlockExit      ActionType = "unlock_exit"
    ActionNarrate         ActionType = "narrate"
)
```

### 3.5 遭遇模型

```go
// internal/server/scenario/encounter.go

type Encounter struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Description string        `json:"description"`

    // 敌人配置
    Enemies     []EncounterEnemy `json:"enemies"`

    // 环境因素
    Environment Environment   `json:"environment"`

    // 难度信息
    Difficulty  Difficulty    `json:"difficulty"`
    XPThreshold int           `json:"xpThreshold"`
}

type EncounterEnemy struct {
    EnemyID     string    `json:"enemyId"`
    Count       int       `json:"count"`
    MinCount    int       `json:"minCount,omitempty"` // 根据队伍调整
    MaxCount    int       `json:"maxCount,omitempty"`
    Position    Position  `json:"position,omitempty"`
    RandomPosition bool    `json:"randomPosition,omitempty"`
}

type Environment struct {
    MapID       string      `json:"mapId"`
    TimeOfDay   string      `json:"timeOfDay"`
    Weather     string      `json:"weather"`
    Hazards     []Hazard    `json:"hazards,omitempty"`
}

type Difficulty string

const (
    DifficultyEasy    Difficulty = "easy"
    DifficultyMedium  Difficulty = "medium"
    DifficultyHard    Difficulty = "hard"
    DifficultyDeadly  Difficulty = "deadly"
)
```

### 3.6 NPC 模板

```go
// internal/server/scenario/npc.go

type NPCTemplate struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Description string        `json:"description"`
    Race        string        `json:"race"`
    Class       string        `json:"class,omitempty"`
    Level       int           `json:"level"`

    // 属性
    AbilityScores AbilityScores `json:"abilityScores"`

    // 对话
    Dialog      DialogTree    `json:"dialog"`

    // 交互
    Services    []Service     `json:"services,omitempty"` // 商店、治疗等
    Quests      []string      `json:"quests,omitempty"`   // 关联任务
}

type DialogTree struct {
    Root        DialogNode   `json:"root"`
    Nodes       []DialogNode `json:"nodes"`
}

type DialogNode struct {
    ID          string       `json:"id"`
    Text        string       `json:"text"`
    Speaker     string       `json:"speaker,omitempty"`
    Choices     []DialogChoice `json:"choices,omitempty"`
    Actions     []Action     `json:"actions,omitempty"`
    Condition   *Condition   `json:"condition,omitempty"`
}

type DialogChoice struct {
    Text        string       `json:"text"`
    NextNodeID  string       `json:"nextNodeId"`
    Condition   *Condition   `json:"condition,omitempty"`
    SkillCheck  *SkillCheck  `json:"skillCheck,omitempty"`
}

type Service struct {
    Type        ServiceType  `json:"type"`
    Items       []string     `json:"items,omitempty"`
    CostModifier float64     `json:"costModifier,omitempty"`
}

type ServiceType string

const (
    ServiceShop     ServiceType = "shop"
    ServiceInn      ServiceType = "inn"
    ServiceHealing  ServiceType = "healing"
    ServiceTraining ServiceType = "training"
    ServiceIdentify ServiceType = "identify"
)
```

---

## 4. 对外接口

### 4.1 剧本管理器

```go
// internal/server/scenario/scenario.go

type Manager struct {
    scenarios    map[string]*Scenario
    loader       *Loader
    triggerEngine *TriggerEngine
    progressTracker *ProgressTracker
}

func NewManager(loader *Loader) *Manager

// 加载剧本
func (m *Manager) LoadScenario(scenarioID string) (*Scenario, error)

// 获取剧本列表
func (m *Manager) GetScenarioList() []*ScenarioSummary

// 开始剧本
func (m *Manager) StartScenario(sessionID string, scenarioID string) error

// 获取当前章节
func (m *Manager) GetCurrentChapter(sessionID string) *Chapter

// 获取当前场景
func (m *Manager) GetCurrentScene(sessionID string) *Scene

// 切换场景
func (m *Manager) ChangeScene(sessionID string, sceneID string) error

// 完成章节
func (m *Manager) CompleteChapter(sessionID string, chapterID string) error
```

### 4.2 触发器引擎

```go
// internal/server/scenario/trigger.go

type TriggerEngine struct {
    stateManager *state.Manager
    combatMgr    *combat.Manager
}

func NewTriggerEngine(stateManager *state.Manager, combatMgr *combat.Manager) *TriggerEngine

// 检查触发器
func (te *TriggerEngine) CheckTriggers(sessionID string, event TriggerEvent) ([]*Trigger, error)

// 执行触发器动作
func (te *TriggerEngine) ExecuteAction(sessionID string, action Action) error

// 评估条件
func (te *TriggerEngine) EvaluateCondition(sessionID string, cond Condition) bool

type TriggerEvent struct {
    Type      TriggerEventType `json:"type"`
    Position  *Position        `json:"position,omitempty"`
    TargetID  string           `json:"targetId,omitempty"`
    Params    map[string]interface{} `json:"params,omitempty"`
}

type TriggerEventType string

const (
    TriggerEventEnterArea    TriggerEventType = "enter_area"
    TriggerEventInteract     TriggerEventType = "interact"
    TriggerEventCombatEnd    TriggerEventType = "combat_end"
    TriggerEventDialogEnd    TriggerEventType = "dialog_end"
    TriggerEventSceneChange  TriggerEventType = "scene_change"
)
```

### 4.3 进度追踪器

```go
// internal/server/scenario/progress.go

type ProgressTracker struct {
    sessions map[string]*ScenarioProgress
}

func NewProgressTracker() *ProgressTracker

// 获取进度
func (pt *ProgressTracker) GetProgress(sessionID string) *ScenarioProgress

// 设置标记
func (pt *ProgressTracker) SetFlag(sessionID string, flag string, value bool)

// 获取标记
func (pt *ProgressTracker) GetFlag(sessionID string, flag string) bool

// 设置变量
func (pt *ProgressTracker) SetVariable(sessionID string, key string, value interface{})

// 获取变量
func (pt *ProgressTracker) GetVariable(sessionID string, key string) interface{}

// 记录已触发的触发器
func (pt *ProgressTracker) MarkTriggered(sessionID string, triggerID string)

// 检查触发器是否已触发
func (pt *ProgressTracker) IsTriggered(sessionID string, triggerID string) bool

type ScenarioProgress struct {
    ScenarioID        string                 `json:"scenarioId"`
    CurrentChapterID  string                 `json:"currentChapterId"`
    CurrentSceneID    string                 `json:"currentSceneId"`
    CompletedChapters []string               `json:"completedChapters"`
    Flags             map[string]bool        `json:"flags"`
    Variables         map[string]interface{} `json:"variables"`
    TriggeredTriggers []string               `json:"triggeredTriggers"`
    QuestProgress     map[string]*QuestProgress `json:"questProgress"`
}
```

### 4.4 难度计算器

```go
// internal/server/scenario/difficulty.go

type DifficultyCalculator struct{}

func NewDifficultyCalculator() *DifficultyCalculator

// 计算遭遇难度
func (dc *DifficultyCalculator) CalculateDifficulty(
    enemies []EncounterEnemy,
    partyLevel int,
    partySize int,
) Difficulty

// 获取难度阈值（DMG 第82页）
func (dc *DifficultyCalculator) GetDifficultyThresholds(partyLevel int, partySize int) DifficultyThresholds

// 计算敌人 XP 总和
func (dc *DifficultyCalculator) CalculateEnemyXP(enemies []EncounterEnemy) int

type DifficultyThresholds struct {
    Easy    int `json:"easy"`
    Medium  int `json:"medium"`
    Hard    int `json:"hard"`
    Deadly  int `json:"deadly"`
}
```

---

## 5. 组件划分

### 5.1 触发器处理器

```go
// internal/server/scenario/trigger.go

func (te *TriggerEngine) CheckTriggers(sessionID string, event TriggerEvent) ([]*Trigger, error) {
    scene := te.stateManager.GetCurrentScene(sessionID)
    var triggered []*Trigger

    for i := range scene.Triggers {
        trigger := &scene.Triggers[i]

        // 跳过已禁用或已触发的一次性触发器
        if !trigger.Enabled || (trigger.OneTime && trigger.Triggered) {
            continue
        }

        // 检查条件
        if te.EvaluateCondition(sessionID, trigger.Condition) {
            triggered = append(triggered, trigger)

            // 执行动作
            for _, action := range trigger.Actions {
                if err := te.ExecuteAction(sessionID, action); err != nil {
                    return nil, err
                }
            }

            // 标记已触发
            if trigger.OneTime {
                trigger.Triggered = true
            }
        }
    }

    return triggered, nil
}

func (te *TriggerEngine) EvaluateCondition(sessionID string, cond Condition) bool {
    // 处理 AND/OR 组合
    if len(cond.And) > 0 {
        for _, c := range cond.And {
            if !te.EvaluateCondition(sessionID, c) {
                return false
            }
        }
        return true
    }

    if len(cond.Or) > 0 {
        for _, c := range cond.Or {
            if te.EvaluateCondition(sessionID, c) {
                return true
            }
        }
        return false
    }

    // 处理基础条件
    progress := te.stateManager.GetProgress(sessionID)

    switch cond.Type {
    case ConditionFlagSet:
        flag := cond.Params["flag"].(string)
        return progress.Flags[flag]

    case ConditionHasItem:
        itemID := cond.Params["itemId"].(string)
        count := cond.Params["count"].(float64)
        return te.checkHasItem(sessionID, itemID, int(count))

    case ConditionDefeatAll:
        sceneID := cond.Params["sceneId"].(string)
        return te.checkDefeatAll(sessionID, sceneID)

    // ... 其他条件类型

    default:
        return false
    }
}
```

### 5.2 难度计算器实现

```go
// internal/server/scenario/difficulty.go

// DMG 第82页难度阈值表
var difficultyThresholds = map[int]DifficultyThresholds{
    1:  {Easy: 25, Medium: 50, Hard: 75, Deadly: 100},
    2:  {Easy: 50, Medium: 100, Hard: 150, Deadly: 200},
    3:  {Easy: 75, Medium: 150, Hard: 225, Deadly: 400},
    4:  {Easy: 125, Medium: 250, Hard: 375, Deadly: 500},
    5:  {Easy: 250, Medium: 500, Hard: 750, Deadly: 1100},
    // ... 完整表格
}

func (dc *DifficultyCalculator) CalculateDifficulty(
    enemies []EncounterEnemy,
    partyLevel int,
    partySize int,
) Difficulty {
    thresholds := dc.GetDifficultyThresholds(partyLevel, partySize)
    totalXP := dc.CalculateEnemyXP(enemies)

    // 应用群怪调整（DMG 第82页）
    enemyCount := dc.countEnemies(enemies)
    multiplier := dc.getGroupMultiplier(enemyCount, partySize)
    adjustedXP := totalXP * multiplier

    if adjustedXP >= thresholds.Deadly {
        return DifficultyDeadly
    } else if adjustedXP >= thresholds.Hard {
        return DifficultyHard
    } else if adjustedXP >= thresholds.Medium {
        return DifficultyMedium
    }
    return DifficultyEasy
}

func (dc *DifficultyCalculator) getGroupMultiplier(enemyCount, partySize int) float64 {
    // 队伍人数少于 3 人时，难度倍率增加
    if partySize < 3 {
        switch enemyCount {
        case 1:
            return 1.5
        case 2:
            return 2.0
        case 3, 4, 5, 6:
            return 2.5
        case 7, 8, 9, 10:
            return 3.0
        case 11, 12, 13, 14:
            return 4.0
        default:
            return 5.0
        }
    }

    // 标准倍率
    switch enemyCount {
    case 1:
        return 1.0
    case 2:
        return 1.5
    case 3, 4, 5, 6:
        return 2.0
    case 7, 8, 9, 10:
        return 2.5
    case 11, 12, 13, 14:
        return 3.0
    default:
        return 4.0
    }
}
```

---

## 6. 模块间通信

### 6.1 与战斗系统通信

```go
// 触发器引擎启动战斗
func (te *TriggerEngine) ExecuteAction(sessionID string, action Action) error {
    switch action.Type {
    case ActionStartCombat:
        encounterID := action.Params["encounterId"].(string)
        encounter := te.getEncounter(encounterID)

        // 创建参战单位列表
        var participantIDs []string
        for _, ee := range encounter.Enemies {
            for i := 0; i < ee.Count; i++ {
                enemy := te.createEnemyInstance(ee.EnemyID, ee.Position)
                participantIDs = append(participantIDs, enemy.ID)
            }
        }

        // 添加玩家角色
        party := te.stateManager.GetParty(sessionID)
        for _, char := range party {
            participantIDs = append(participantIDs, string(char.ID))
        }

        // 启动战斗
        return te.combatMgr.InitiateCombat(&combat.InitiateCombatRequest{
            MapID:          encounter.Environment.MapID,
            ParticipantIDs: participantIDs,
        })

    // ... 其他动作类型
    }
    return nil
}
```

### 6.2 与地图系统通信

```go
// 切换场景时加载地图
func (m *Manager) ChangeScene(sessionID string, sceneID string) error {
    scene := m.getScene(sceneID)
    if scene == nil {
        return ErrSceneNotFound
    }

    // 加载地图
    if err := m.mapMgr.LoadMap(sessionID, scene.MapID); err != nil {
        return err
    }

    // 更新进度
    progress := m.progressTracker.GetProgress(sessionID)
    progress.CurrentSceneID = sceneID

    // 初始化场景中的 NPC 和敌人
    m.initializeSceneEntities(sessionID, scene)

    return nil
}
```

---

## 7. 剧本数据示例

### 7.1 剧本定义示例

```json
{
  "id": "lost_mine_of_phandelver",
  "name": "Lost Mine of Phandelver",
  "description": "A classic adventure for levels 1-5...",
  "levelRange": [1, 5],
  "partySize": [4, 5],
  "chapters": [
    {
      "id": "ch1_goblin_arrows",
      "name": "Goblin Arrows",
      "order": 1,
      "scenes": ["scene_cragmaw_hideout", "scene_phandalin"]
    }
  ],
  "startChapter": "ch1_goblin_arrows",
  "startScene": "scene_cragmaw_hideout",
  "startMap": "map_cragmaw_hideout",
  "startPosition": {"x": 2, "y": 5}
}
```

### 7.2 触发器示例

```json
{
  "id": "trigger_goblin_ambush",
  "name": "Goblin Ambush",
  "enabled": true,
  "oneTime": true,
  "condition": {
    "type": "enter_area",
    "params": {
      "x1": 10, "y1": 5,
      "x2": 15, "y2": 10
    }
  },
  "actions": [
    {
      "type": "start_combat",
      "params": {
        "encounterId": "encounter_goblin_ambush"
      }
    },
    {
      "type": "narrate",
      "params": {
        "text": "Goblins leap from behind the bushes!"
      }
    }
  ]
}
```

---

## 8. 配置项

```yaml
scenario:
  # 剧本数据路径
  data_path: "./data/scenarios"

  # 自动保存
  auto_save:
    enabled: true
    interval: 300  # 秒

  # 难度调整
  difficulty:
    dynamic: true   # 根据队伍动态调整
    max_adjustment: 0.2  # 最大调整比例
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
