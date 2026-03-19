# 剧本系统组件设计

> **模块名称**: scenario
> **版本**: v1.0
> **创建日期**: 2026-03-16
> **组件设计师**: component-designer

---

## 1. 组件概述

### 1.1 组件职责划分

剧本系统由以下核心组件组成：

| 组件 | 职责 | 文件 |
|------|------|------|
| **ScenarioManager** | 剧本加载、生命周期管理、章节切换 | scenario.go |
| **ChapterManager** | 章节管理、完成条件检查 | chapter.go |
| **SceneManager** | 场景管理、场景初始化 | scene.go |
| **TriggerEngine** | 触发器检测、条件评估、动作执行 | trigger.go |
| **ProgressTracker** | 进度追踪、标记管理、变量存储 | progress.go |
| **NPCManager** | NPC 模板管理、NPC 实例化 | npc.go |
| **EncounterManager** | 遭遇管理、难度计算 | encounter.go |
| **DifficultyCalculator** | 难度计算、群怪调整 | difficulty.go |
| **DialogEngine** | 对话树处理、对话选择 | dialog.go |

### 1.2 组件依赖图

```
                        ┌─────────────────────┐
                        │  ScenarioManager    │
                        │  (剧本生命周期管理)  │
                        └──────────┬──────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  ChapterManager   │    │ SceneManager     │    │ ProgressTracker  │
│  (章节管理)        │    │  (场景管理)       │    │  (进度追踪)       │
└─────────┬─────────┘    └────────┬─────────┘    └──────────────────┘
          │                       │
          │                       │
          ▼                       ▼
┌───────────────────┐    ┌──────────────────┐
│  TriggerEngine    │    │  NPCManager      │
│  (触发器引擎)      │    │  (NPC管理)        │
└─────────┬─────────┘    └──────────────────┘
          │
          │     ┌──────────────────────┐
          └─────┤ TriggerEngine 子组件  │
                │                      │
                ▼                      ▼
        ┌──────────────┐    ┌──────────────────┐
        │ConditionEval │    │  ActionExecutor  │
        │(条件评估器)  │    │  (动作执行器)     │
        └──────────────┘    └────────┬─────────┘
                                     │
                                     ▼
                              ┌──────────────────┐
                              │ EncounterManager │
                              │ (遭遇管理)        │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │DifficultyCalc    │
                              │(难度计算器)       │
                              └──────────────────┘
```

---

## 2. 组件接口定义

### 2.1 ScenarioManager 组件

```go
// internal/server/scenario/scenario.go

package scenario

import (
    "context"
    "sync"
)

// ScenarioManager 剧本管理器
type ScenarioManager struct {
    mu                sync.RWMutex
    scenarios         map[ScenarioID]*Scenario
    sessions          map[string]*SessionScenario // sessionID -> 剧本状态
    loader            *ScenarioLoader
    chapterMgr        *ChapterManager
    sceneMgr          *SceneManager
    triggerEngine     *TriggerEngine
    progressTracker   *ProgressTracker
    npcManager        *NPCManager
    encounterManager  *EncounterManager
}

// SessionScenario 会话剧本状态
type SessionScenario struct {
    ScenarioID    ScenarioID
    CurrentChapter *Chapter
    CurrentScene   *Scene
    StartedAt     time.Time
    LastUpdate    time.Time
}

// NewScenarioManager 创建剧本管理器
func NewScenarioManager(dataPath string) (*ScenarioManager, error) {
    loader := NewScenarioLoader(dataPath)
    chapterMgr := NewChapterManager()
    sceneMgr := NewSceneManager()
    progressTracker := NewProgressTracker()
    npcManager := NewNPCManager()
    encounterManager := NewEncounterManager()
    triggerEngine := NewTriggerEngine(progressTracker, encounterManager)

    return &ScenarioManager{
        scenarios:        make(map[ScenarioID]*Scenario),
        sessions:         make(map[string]*SessionScenario),
        loader:           loader,
        chapterMgr:       chapterMgr,
        sceneMgr:         sceneMgr,
        triggerEngine:    triggerEngine,
        progressTracker:  progressTracker,
        npcManager:       npcManager,
        encounterManager: encounterManager,
    }, nil
}

// LoadScenario 加载剧本
func (sm *ScenarioManager) LoadScenario(ctx context.Context, scenarioID ScenarioID) (*Scenario, error) {
    sm.mu.RLock()
    if scenario, exists := sm.scenarios[scenarioID]; exists {
        sm.mu.RUnlock()
        return scenario, nil
    }
    sm.mu.RUnlock()

    // 从文件加载
    data, err := sm.loader.Load(scenarioID)
    if err != nil {
        return nil, fmt.Errorf("load scenario data: %w", err)
    }

    scenario, err := sm.loader.Parse(data)
    if err != nil {
        return nil, fmt.Errorf("parse scenario: %w", err)
    }

    sm.mu.Lock()
    sm.scenarios[scenarioID] = scenario
    sm.mu.Unlock()

    return scenario, nil
}

// StartScenario 开始剧本
func (sm *ScenarioManager) StartScenario(ctx context.Context, sessionID string, scenarioID ScenarioID) error {
    scenario, err := sm.LoadScenario(ctx, scenarioID)
    if err != nil {
        return err
    }

    // 找到起始章节
    var startChapter *Chapter
    for i := range scenario.Chapters {
        if scenario.Chapters[i].ID == ChapterID(scenario.StartChapter) {
            startChapter = &scenario.Chapters[i]
            break
        }
    }
    if startChapter == nil {
        return ErrStartChapterNotFound
    }

    // 找到起始场景
    var startScene *Scene
    for i := range startChapter.Scenes {
        if startChapter.Scenes[i].ID == SceneID(scenario.StartScene) {
            startScene = &startChapter.Scenes[i]
            break
        }
    }
    if startScene == nil {
        return ErrStartSceneNotFound
    }

    // 初始化进度
    sm.progressTracker.Initialize(sessionID, scenarioID)

    // 设置会话剧本
    sm.mu.Lock()
    sm.sessions[sessionID] = &SessionScenario{
        ScenarioID:    scenarioID,
        CurrentChapter: startChapter,
        CurrentScene:   startScene,
        StartedAt:     time.Now(),
        LastUpdate:    time.Now(),
    }
    sm.mu.Unlock()

    // 初始化场景
    if err := sm.sceneMgr.InitializeScene(ctx, sessionID, startScene); err != nil {
        return fmt.Errorf("initialize scene: %w", err)
    }

    return nil
}

// GetScenario 获取当前剧本
func (sm *ScenarioManager) GetScenario(sessionID string) (*Scenario, error) {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    sessionScenario, exists := sm.sessions[sessionID]
    if !exists {
        return nil, ErrNoActiveScenario
    }

    return sm.scenarios[sessionScenario.ScenarioID], nil
}

// GetCurrentChapter 获取当前章节
func (sm *ScenarioManager) GetCurrentChapter(sessionID string) (*Chapter, error) {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    sessionScenario, exists := sm.sessions[sessionID]
    if !exists {
        return nil, ErrNoActiveScenario
    }

    return sessionScenario.CurrentChapter, nil
}

// GetCurrentScene 获取当前场景
func (sm *ScenarioManager) GetCurrentScene(sessionID string) (*Scene, error) {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    sessionScenario, exists := sm.sessions[sessionID]
    if !exists {
        return nil, ErrNoActiveScenario
    }

    return sessionScenario.CurrentScene, nil
}

// ChangeScene 切换场景
func (sm *ScenarioManager) ChangeScene(ctx context.Context, sessionID string, sceneID SceneID) error {
    sm.mu.Lock()
    sessionScenario := sm.sessions[sessionID]
    sm.mu.Unlock()

    if sessionScenario == nil {
        return ErrNoActiveScenario
    }

    scenario := sm.scenarios[sessionScenario.ScenarioID]

    // 查找目标场景
    var targetScene *Scene
    for _, chapter := range scenario.Chapters {
        for i := range chapter.Scenes {
            if chapter.Scenes[i].ID == sceneID {
                targetScene = &chapter.Scenes[i]

                // 更新章节
                sessionScenario.CurrentChapter = &chapter
                sessionScenario.CurrentScene = targetScene
                sessionScenario.LastUpdate = time.Now()

                // 初始化场景
                if err := sm.sceneMgr.InitializeScene(ctx, sessionID, targetScene); err != nil {
                    return fmt.Errorf("initialize scene: %w", err)
                }

                return nil
            }
        }
    }

    return ErrSceneNotFound
}

// CompleteChapter 完成章节
func (sm *ScenarioManager) CompleteChapter(ctx context.Context, sessionID string, chapterID ChapterID) error {
    sessionScenario, err := sm.GetCurrentChapter(sessionID)
    if err != nil {
        return err
    }

    if sessionScenario.CurrentChapter.ID != chapterID {
        return ErrChapterNotActive
    }

    // 检查完成条件
    if !sm.chapterMgr.IsComplete(sessionID, chapterID) {
        return ErrChapterConditionsNotMet
    }

    // 标记完成
    sm.progressTracker.MarkChapterCompleted(sessionID, chapterID)

    // 给予奖励
    if err := sm.chapterMgr.GiveRewards(ctx, sessionID, chapterID); err != nil {
        return err
    }

    return nil
}

// CheckTriggers 检查触发器
func (sm *ScenarioManager) CheckTriggers(ctx context.Context, sessionID string, event TriggerEvent) ([]*TriggeredAction, error) {
    scene, err := sm.GetCurrentScene(sessionID)
    if err != nil {
        return nil, err
    }

    return sm.triggerEngine.CheckTriggers(ctx, sessionID, scene.Triggers, event)
}

// EndScenario 结束剧本
func (sm *ScenarioManager) EndScenario(sessionID string) {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    delete(sm.sessions, sessionID)
    sm.progressTracker.Clear(sessionID)
}
```

### 2.2 TriggerEngine 组件

```go
// internal/server/scenario/trigger.go

package scenario

import (
    "context"
    "sync"
)

// TriggerEngine 触发器引擎
type TriggerEngine struct {
    mu               sync.RWMutex
    conditionEval    *ConditionEvaluator
    actionExecutor   *ActionExecutor
    progressTracker  *ProgressTracker
    encounterManager *EncounterManager
}

// NewTriggerEngine 创建触发器引擎
func NewTriggerEngine(progressTracker *ProgressTracker, encounterManager *EncounterManager) *TriggerEngine {
    conditionEval := NewConditionEvaluator(progressTracker)
    actionExecutor := NewActionExecutor(progressTracker, encounterManager)

    return &TriggerEngine{
        conditionEval:    conditionEval,
        actionExecutor:   actionExecutor,
        progressTracker:  progressTracker,
        encounterManager: encounterManager,
    }
}

// CheckTriggers 检查触发器
func (te *TriggerEngine) CheckTriggers(ctx context.Context, sessionID string, triggers []Trigger, event TriggerEvent) ([]*TriggeredAction, error) {
    te.mu.Lock()
    defer te.mu.Unlock()

    var triggeredActions []*TriggeredAction

    for i := range triggers {
        trigger := &triggers[i]

        // 跳过已禁用或已触发的一次性触发器
        if !trigger.Enabled {
            continue
        }
        if trigger.OneTime && te.progressTracker.IsTriggered(sessionID, trigger.ID) {
            continue
        }

        // 评估条件
        met, err := te.conditionEval.Evaluate(ctx, sessionID, trigger.Condition, event)
        if err != nil {
            return nil, fmt.Errorf("evaluate condition: %w", err)
        }

        if met {
            // 执行动作
            for _, action := range trigger.Actions {
                result, err := te.actionExecutor.Execute(ctx, sessionID, action)
                if err != nil {
                    return nil, fmt.Errorf("execute action: %w", err)
                }

                triggeredActions = append(triggeredActions, &TriggeredAction{
                    TriggerID: trigger.ID,
                    Action:    action,
                    Result:    result,
                })
            }

            // 标记已触发
            if trigger.OneTime {
                te.progressTracker.MarkTriggered(sessionID, trigger.ID)
            }
        }
    }

    return triggeredActions, nil
}

// TriggeredAction 触发的动作
type TriggeredAction struct {
    TriggerID string
    Action    Action
    Result    ActionResult
}
```

### 2.3 ConditionEvaluator 组件

```go
// internal/server/scenario/condition_evaluator.go

package scenario

import (
    "context"
    "fmt"
)

// ConditionEvaluator 条件评估器
type ConditionEvaluator struct {
    progressTracker *ProgressTracker
}

// NewConditionEvaluator 创建条件评估器
func NewConditionEvaluator(progressTracker *ProgressTracker) *ConditionEvaluator {
    return &ConditionEvaluator{
        progressTracker: progressTracker,
    }
}

// Evaluate 评估条件
func (ce *ConditionEvaluator) Evaluate(ctx context.Context, sessionID string, condition Condition, event TriggerEvent) (bool, error) {
    // 处理 AND 组合
    if len(condition.And) > 0 {
        for _, cond := range condition.And {
            met, err := ce.Evaluate(ctx, sessionID, cond, event)
            if err != nil {
                return false, err
            }
            if !met {
                return false, nil
            }
        }
        return true, nil
    }

    // 处理 OR 组合
    if len(condition.Or) > 0 {
        for _, cond := range condition.Or {
            met, err := ce.Evaluate(ctx, sessionID, cond, event)
            if err != nil {
                return false, err
            }
            if met {
                return true, nil
            }
        }
        return false, nil
    }

    // 评估基础条件
    return ce.evaluateBaseCondition(ctx, sessionID, condition, event)
}

// evaluateBaseCondition 评估基础条件
func (ce *ConditionEvaluator) evaluateBaseCondition(ctx context.Context, sessionID string, condition Condition, event TriggerEvent) (bool, error) {
    switch condition.Type {
    case ConditionEnterArea:
        return ce.evaluateEnterArea(event, condition.Params)

    case ConditionInteractWith:
        return ce.evaluateInteractWith(event, condition.Params)

    case ConditionDefeatAll:
        return ce.evaluateDefeatAll(ctx, sessionID, condition.Params)

    case ConditionHasItem:
        return ce.evaluateHasItem(ctx, sessionID, condition.Params)

    case ConditionFlagSet:
        flag := condition.Params["flag"].(string)
        return ce.progressTracker.GetFlag(sessionID, flag), nil

    case ConditionVariableEquals:
        return ce.evaluateVariableEquals(ctx, sessionID, condition.Params)

    case ConditionDialogChoice:
        return ce.evaluateDialogChoice(event, condition.Params)

    case ConditionTimeElapsed:
        return ce.evaluateTimeElapsed(ctx, sessionID, condition.Params)

    default:
        return false, fmt.Errorf("unknown condition type: %s", condition.Type)
    }
}

// evaluateEnterArea 评估进入区域条件
func (ce *ConditionEvaluator) evaluateEnterArea(event TriggerEvent, params map[string]interface{}) (bool, error) {
    if event.Type != TriggerEventEnterArea {
        return false, nil
    }

    if event.Position == nil {
        return false, nil
    }

    // 检查是否在指定区域内
    x1 := int(params["x1"].(float64))
    y1 := int(params["y1"].(float64))
    x2 := int(params["x2"].(float64))
    y2 := int(params["y2"].(float64))

    x, y := event.Position.X, event.Position.Y

    return x >= x1 && x <= x2 && y >= y1 && y <= y2, nil
}

// evaluateInteractWith 评估交互条件
func (ce *ConditionEvaluator) evaluateInteractWith(event TriggerEvent, params map[string]interface{}) (bool, error) {
    if event.Type != TriggerEventInteract {
        return false, nil
    }

    targetID := params["targetId"].(string)
    return event.TargetID == targetID, nil
}

// evaluateDefeatAll 评估击败所有敌人条件
func (ce *ConditionEvaluator) evaluateDefeatAll(ctx context.Context, sessionID string, params map[string]interface{}) (bool, error) {
    // 查询场景中的敌人是否全部被击败
    // 这需要与战斗系统交互
    sceneID := params["sceneId"].(string)

    // TODO: 从战斗系统查询场景状态
    return false, nil
}

// evaluateHasItem 评估拥有物品条件
func (ce *ConditionEvaluator) evaluateHasItem(ctx context.Context, sessionID string, params map[string]interface{}) (bool, error) {
    itemID := params["itemId"].(string)
    count := int(params["count"].(float64))

    // TODO: 从物品系统查询
    return false, nil
}

// evaluateVariableEquals 评估变量相等条件
func (ce *ConditionEvaluator) evaluateVariableEquals(ctx context.Context, sessionID string, params map[string]interface{}) (bool, error) {
    key := params["key"].(string)
    expectedValue := params["value"]

    actualValue := ce.progressTracker.GetVariable(sessionID, key)
    return actualValue == expectedValue, nil
}

// evaluateDialogChoice 评估对话选择条件
func (ce *ConditionEvaluator) evaluateDialogChoice(event TriggerEvent, params map[string]interface{}) (bool, error) {
    if event.Type != TriggerEventDialogEnd {
        return false, nil
    }

    expectedChoice := params["choiceId"].(string)
    actualChoice := event.Params["choiceId"]

    return expectedChoice == actualChoice, nil
}

// evaluateTimeElapsed 评估时间流逝条件
func (ce *ConditionEvaluator) evaluateTimeElapsed(ctx context.Context, sessionID string, params map[string]interface{}) (bool, error) {
    minSeconds := int(params["seconds"].(float64))

    sessionStartTime := ce.progressTracker.GetSessionStartTime(sessionID)
    elapsed := time.Since(sessionStartTime).Seconds()

    return int(elapsed) >= minSeconds, nil
}
```

### 2.4 ActionExecutor 组件

```go
// internal/server/scenario/action_executor.go

package scenario

import (
    "context"
    "fmt"
)

// ActionExecutor 动作执行器
type ActionExecutor struct {
    progressTracker  *ProgressTracker
    encounterManager *EncounterManager
    dialogEngine     *DialogEngine
}

// NewActionExecutor 创建动作执行器
func NewActionExecutor(progressTracker *ProgressTracker, encounterManager *EncounterManager) *ActionExecutor {
    dialogEngine := NewDialogEngine(progressTracker)

    return &ActionExecutor{
        progressTracker:  progressTracker,
        encounterManager: encounterManager,
        dialogEngine:     dialogEngine,
    }
}

// Execute 执行动作
func (ae *ActionExecutor) Execute(ctx context.Context, sessionID string, action Action) (ActionResult, error) {
    var result ActionResult

    switch action.Type {
    case ActionStartCombat:
        return ae.executeStartCombat(ctx, sessionID, action.Params)

    case ActionSpawnNPC:
        return ae.executeSpawnNPC(ctx, sessionID, action.Params)

    case ActionSpawnEnemy:
        return ae.executeSpawnEnemy(ctx, sessionID, action.Params)

    case ActionSetFlag:
        return ae.executeSetFlag(sessionID, action.Params)

    case ActionClearFlag:
        return ae.executeClearFlag(sessionID, action.Params)

    case ActionSetVariable:
        return ae.executeSetVariable(sessionID, action.Params)

    case ActionShowDialog:
        return ae.executeShowDialog(ctx, sessionID, action.Params)

    case ActionGiveItem:
        return ae.executeGiveItem(ctx, sessionID, action.Params)

    case ActionRemoveItem:
        return ae.executeRemoveItem(ctx, sessionID, action.Params)

    case ActionGiveXP:
        return ae.executeGiveXP(ctx, sessionID, action.Params)

    case ActionTeleport:
        return ae.executeTeleport(ctx, sessionID, action.Params)

    case ActionChangeScene:
        return ae.executeChangeScene(ctx, sessionID, action.Params)

    case ActionUnlockExit:
        return ae.executeUnlockExit(sessionID, action.Params)

    case ActionNarrate:
        return ae.executeNarrate(sessionID, action.Params)

    default:
        return ActionResult{}, fmt.Errorf("unknown action type: %s", action.Type)
    }
}

// executeStartCombat 执行开始战斗
func (ae *ActionExecutor) executeStartCombat(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    encounterID := params["encounterId"].(string)

    // 获取遭遇配置
    encounter, err := ae.encounterManager.GetEncounter(EncounterID(encounterID))
    if err != nil {
        return ActionResult{}, err
    }

    // 初始化战斗
    // TODO: 调用战斗系统

    return ActionResult{
        Type:     ResultTypeCombatStarted,
        Success:  true,
        Message:  fmt.Sprintf("Started combat: %s", encounter.Name),
    }, nil
}

// executeSpawnNPC 执行生成 NPC
func (ae *ActionExecutor) executeSpawnNPC(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    npcTemplateID := params["npcTemplateId"].(string)

    x := int(params["x"].(float64))
    y := int(params["y"].(float64))
    position := Position{X: x, Y: y}

    // TODO: 调用 NPC 系统生成 NPC

    return ActionResult{
        Type:     ResultTypeNPCSpawned,
        Success:  true,
        Message:  fmt.Sprintf("Spawned NPC: %s at %v", npcTemplateID, position),
    }, nil
}

// executeSpawnEnemy 执行生成敌人
func (ae *ActionExecutor) executeSpawnEnemy(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    enemyID := params["enemyId"].(string)

    x := int(params["x"].(float64))
    y := int(params["y"].(float64))
    position := Position{X: x, Y: y}

    // TODO: 调用战斗系统生成敌人

    return ActionResult{
        Type:     ResultTypeEnemySpawned,
        Success:  true,
        Message:  fmt.Sprintf("Spawned enemy: %s at %v", enemyID, position),
    }, nil
}

// executeSetFlag 执行设置标记
func (ae *ActionExecutor) executeSetFlag(sessionID string, params map[string]interface{}) (ActionResult, error) {
    flag := params["flag"].(string)
    value := true
    if v, ok := params["value"].(bool); ok {
        value = v
    }

    ae.progressTracker.SetFlag(sessionID, flag, value)

    return ActionResult{
        Type:     ResultTypeFlagSet,
        Success:  true,
        Message:  fmt.Sprintf("Set flag %s to %v", flag, value),
    }, nil
}

// executeClearFlag 执行清除标记
func (ae *ActionExecutor) executeClearFlag(sessionID string, params map[string]interface{}) (ActionResult, error) {
    flag := params["flag"].(string)

    ae.progressTracker.SetFlag(sessionID, flag, false)

    return ActionResult{
        Type:     ResultTypeFlagCleared,
        Success:  true,
        Message:  fmt.Sprintf("Cleared flag %s", flag),
    }, nil
}

// executeSetVariable 执行设置变量
func (ae *ActionExecutor) executeSetVariable(sessionID string, params map[string]interface{}) (ActionResult, error) {
    key := params["key"].(string)
    value := params["value"]

    ae.progressTracker.SetVariable(sessionID, key, value)

    return ActionResult{
        Type:     ResultTypeVariableSet,
        Success:  true,
        Message:  fmt.Sprintf("Set variable %s", key),
    }, nil
}

// executeShowDialog 执行显示对话
func (ae *ActionExecutor) executeShowDialog(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    dialogID := params["dialogId"].(string)

    // TODO: 显示对话

    return ActionResult{
        Type:     ResultTypeDialogShown,
        Success:  true,
        Message:  fmt.Sprintf("Showed dialog: %s", dialogID),
    }, nil
}

// executeGiveItem 执行给予物品
func (ae *ActionExecutor) executeGiveItem(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    itemID := params["itemId"].(string)
    count := 1
    if c, ok := params["count"].(float64); ok {
        count = int(c)
    }

    // TODO: 调用物品系统

    return ActionResult{
        Type:     ResultTypeItemGiven,
        Success:  true,
        Message:  fmt.Sprintf("Gave %d of item %s", count, itemID),
    }, nil
}

// executeRemoveItem 执行移除物品
func (ae *ActionExecutor) executeRemoveItem(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    itemID := params["itemId"].(string)
    count := 1
    if c, ok := params["count"].(float64); ok {
        count = int(c)
    }

    // TODO: 调用物品系统

    return ActionResult{
        Type:     ResultTypeItemRemoved,
        Success:  true,
        Message:  fmt.Sprintf("Removed %d of item %s", count, itemID),
    }, nil
}

// executeGiveXP 执行给予经验值
func (ae *ActionExecutor) executeGiveXP(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    xp := int(params["xp"].(float64))

    // TODO: 调用角色系统给予经验

    return ActionResult{
        Type:     ResultTypeXPGiven,
        Success:  true,
        Message:  fmt.Sprintf("Gave %d XP", xp),
    }, nil
}

// executeTeleport 执行传送
func (ae *ActionExecutor) executeTeleport(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    mapID := params["mapId"].(string)

    x := int(params["x"].(float64))
    y := int(params["y"].(float64))
    position := Position{X: x, Y: y}

    // TODO: 调用地图系统

    return ActionResult{
        Type:     ResultTypeTeleported,
        Success:  true,
        Message:  fmt.Sprintf("Teleported to %s at %v", mapID, position),
    }, nil
}

// executeChangeScene 执行切换场景
func (ae *ActionExecutor) executeChangeScene(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    sceneID := params["sceneId"].(string)

    // TODO: 调用 ScenarioManager 切换场景

    return ActionResult{
        Type:     ResultTypeSceneChanged,
        Success:  true,
        Message:  fmt.Sprintf("Changed to scene %s", sceneID),
    }, nil
}

// executeUnlockExit 执行解锁出口
func (ae *ActionExecutor) executeUnlockExit(sessionID string, params map[string]interface{}) (ActionResult, error) {
    exitID := params["exitId"].(string)

    // TODO: 解锁出口

    return ActionResult{
        Type:     ResultTypeExitUnlocked,
        Success:  true,
        Message:  fmt.Sprintf("Unlocked exit %s", exitID),
    }, nil
}

// executeNarrate 执行叙述
func (ae *ActionExecutor) executeNarrate(sessionID string, params map[string]interface{}) (ActionResult, error) {
    text := params["text"].(string)

    return ActionResult{
        Type:     ResultTypeNarrated,
        Success:  true,
        Message:  text,
    }, nil
}

// ActionResult 动作执行结果
type ActionResult struct {
    Type    ResultType
    Success bool
    Message string
    Data    map[string]interface{}
}

// ResultType 结果类型
type ResultType string

const (
    ResultTypeCombatStarted  ResultType = "combat_started"
    ResultTypeNPCSpawned     ResultType = "npc_spawned"
    ResultTypeEnemySpawned   ResultType = "enemy_spawned"
    ResultTypeFlagSet        ResultType = "flag_set"
    ResultTypeFlagCleared    ResultType = "flag_cleared"
    ResultTypeVariableSet    ResultType = "variable_set"
    ResultTypeDialogShown    ResultType = "dialog_shown"
    ResultTypeItemGiven      ResultType = "item_given"
    ResultTypeItemRemoved    ResultType = "item_removed"
    ResultTypeXPGiven        ResultType = "xp_given"
    ResultTypeTeleported     ResultType = "teleported"
    ResultTypeSceneChanged   ResultType = "scene_changed"
    ResultTypeExitUnlocked   ResultType = "exit_unlocked"
    ResultTypeNarrated       ResultType = "narrated"
)
```

### 2.5 ProgressTracker 组件

```go
// internal/server/scenario/progress.go

package scenario

import (
    "sync"
    "time"
)

// ProgressTracker 进度追踪器
type ProgressTracker struct {
    mu     sync.RWMutex
    states map[string]*ScenarioProgress
}

// ScenarioProgress 剧本进度
type ScenarioProgress struct {
    ScenarioID         ScenarioID              `json:"scenarioId"`
    CurrentChapterID   ChapterID               `json:"currentChapterId"`
    CurrentSceneID     SceneID                 `json:"currentSceneId"`
    CompletedChapters  []ChapterID             `json:"completedChapters"`
    Flags              map[string]bool         `json:"flags"`
    Variables          map[string]interface{}  `json:"variables"`
    TriggeredTriggers  []string                `json:"triggeredTriggers"`
    QuestProgress      map[string]*QuestProgress `json:"questProgress"`
    StartedAt          time.Time               `json:"startedAt"`
    LastUpdate         time.Time               `json:"lastUpdate"`
}

// QuestProgress 任务进度
type QuestProgress struct {
    QuestID    string                 `json:"questId"`
    Status     QuestStatus            `json:"status"`
    Objectives map[string]bool        `json:"objectives"`
}

// QuestStatus 任务状态
type QuestStatus string

const (
    QuestStatusNotStarted QuestStatus = "not_started"
    QuestStatusInProgress QuestStatus = "in_progress"
    QuestStatusCompleted  QuestStatus = "completed"
    QuestStatusFailed     QuestStatus = "failed"
)

// NewProgressTracker 创建进度追踪器
func NewProgressTracker() *ProgressTracker {
    return &ProgressTracker{
        states: make(map[string]*ScenarioProgress),
    }
}

// Initialize 初始化进度
func (pt *ProgressTracker) Initialize(sessionID string, scenarioID ScenarioID) {
    pt.mu.Lock()
    defer pt.mu.Unlock()

    pt.states[sessionID] = &ScenarioProgress{
        ScenarioID:        scenarioID,
        Flags:            make(map[string]bool),
        Variables:        make(map[string]interface{}),
        TriggeredTriggers: []string{},
        QuestProgress:    make(map[string]*QuestProgress),
        StartedAt:        time.Now(),
        LastUpdate:       time.Now(),
    }
}

// GetProgress 获取进度
func (pt *ProgressTracker) GetProgress(sessionID string) *ScenarioProgress {
    pt.mu.RLock()
    defer pt.mu.RUnlock()

    if progress, exists := pt.states[sessionID]; exists {
        return progress
    }
    return nil
}

// SetFlag 设置标记
func (pt *ProgressTracker) SetFlag(sessionID string, flag string, value bool) {
    pt.mu.Lock()
    defer pt.mu.Unlock()

    if progress := pt.states[sessionID]; progress != nil {
        progress.Flags[flag] = value
        progress.LastUpdate = time.Now()
    }
}

// GetFlag 获取标记
func (pt *ProgressTracker) GetFlag(sessionID string, flag string) bool {
    pt.mu.RLock()
    defer pt.mu.RUnlock()

    if progress := pt.states[sessionID]; progress != nil {
        if value, exists := progress.Flags[flag]; exists {
            return value
        }
    }
    return false
}

// SetVariable 设置变量
func (pt *ProgressTracker) SetVariable(sessionID string, key string, value interface{}) {
    pt.mu.Lock()
    defer pt.mu.Unlock()

    if progress := pt.states[sessionID]; progress != nil {
        progress.Variables[key] = value
        progress.LastUpdate = time.Now()
    }
}

// GetVariable 获取变量
func (pt *ProgressTracker) GetVariable(sessionID string, key string) interface{} {
    pt.mu.RLock()
    defer pt.mu.RUnlock()

    if progress := pt.states[sessionID]; progress != nil {
        if value, exists := progress.Variables[key]; exists {
            return value
        }
    }
    return nil
}

// MarkTriggered 标记触发器已触发
func (pt *ProgressTracker) MarkTriggered(sessionID string, triggerID string) {
    pt.mu.Lock()
    defer pt.mu.Unlock()

    if progress := pt.states[sessionID]; progress != nil {
        progress.TriggeredTriggers = append(progress.TriggeredTriggers, triggerID)
        progress.LastUpdate = time.Now()
    }
}

// IsTriggered 检查触发器是否已触发
func (pt *ProgressTracker) IsTriggered(sessionID string, triggerID string) bool {
    pt.mu.RLock()
    defer pt.mu.RUnlock()

    if progress := pt.states[sessionID]; progress != nil {
        for _, id := range progress.TriggeredTriggers {
            if id == triggerID {
                return true
            }
        }
    }
    return false
}

// MarkChapterCompleted 标记章节完成
func (pt *ProgressTracker) MarkChapterCompleted(sessionID string, chapterID ChapterID) {
    pt.mu.Lock()
    defer pt.mu.Unlock()

    if progress := pt.states[sessionID]; progress != nil {
        progress.CompletedChapters = append(progress.CompletedChapters, chapterID)
        progress.LastUpdate = time.Now()
    }
}

// IsChapterCompleted 检查章节是否完成
func (pt *ProgressTracker) IsChapterCompleted(sessionID string, chapterID ChapterID) bool {
    pt.mu.RLock()
    defer pt.mu.RUnlock()

    if progress := pt.states[sessionID]; progress != nil {
        for _, id := range progress.CompletedChapters {
            if id == chapterID {
                return true
            }
        }
    }
    return false
}

// GetSessionStartTime 获取会话开始时间
func (pt *ProgressTracker) GetSessionStartTime(sessionID string) time.Time {
    pt.mu.RLock()
    defer pt.mu.RUnlock()

    if progress := pt.states[sessionID]; progress != nil {
        return progress.StartedAt
    }
    return time.Time{}
}

// Clear 清除进度
func (pt *ProgressTracker) Clear(sessionID string) {
    pt.mu.Lock()
    defer pt.mu.Unlock()

    delete(pt.states, sessionID)
}
```

### 2.6 DifficultyCalculator 组件

```go
// internal/server/scenario/difficulty.go

package scenario

// DifficultyCalculator 难度计算器
type DifficultyCalculator struct {
    thresholds map[int]DifficultyThresholds
}

// DifficultyThresholds 难度阈值
type DifficultyThresholds struct {
    Easy    int `json:"easy"`
    Medium  int `json:"medium"`
    Hard    int `json:"hard"`
    Deadly  int `json:"deadly"`
}

// NewDifficultyCalculator 创建难度计算器
func NewDifficultyCalculator() *DifficultyCalculator {
    return &DifficultyCalculator{
        thresholds: getDefaultDifficultyThresholds(),
    }
}

// CalculateDifficulty 计算遭遇难度
func (dc *DifficultyCalculator) CalculateDifficulty(enemies []EncounterEnemy, partyLevel, partySize int) Difficulty {
    totalXP := dc.CalculateEnemyXP(enemies)

    thresholds := dc.GetDifficultyThresholds(partyLevel, partySize)

    // 应用群怪调整
    multiplier := dc.getGroupMultiplier(len(enemies), partySize)
    adjustedXP := int(float64(totalXP) * multiplier)

    // 判定难度
    if adjustedXP >= thresholds.Deadly {
        return DifficultyDeadly
    } else if adjustedXP >= thresholds.Hard {
        return DifficultyHard
    } else if adjustedXP >= thresholds.Medium {
        return DifficultyMedium
    }
    return DifficultyEasy
}

// GetDifficultyThresholds 获取难度阈值
func (dc *DifficultyCalculator) GetDifficultyThresholds(partyLevel, partySize int) DifficultyThresholds {
    thresholds, exists := dc.thresholds[partyLevel]
    if !exists {
        // 使用最接近的等级
        for level := partyLevel; level >= 1; level-- {
            if t, ok := dc.thresholds[level]; ok {
                thresholds = t
                break
            }
        }
    }

    // 根据队伍大小调整
    if partySize > 0 {
        multiplier := float64(partySize) / 4.0
        thresholds.Easy = int(float64(thresholds.Easy) * multiplier)
        thresholds.Medium = int(float64(thresholds.Medium) * multiplier)
        thresholds.Hard = int(float64(thresholds.Hard) * multiplier)
        thresholds.Deadly = int(float64(thresholds.Deadly) * multiplier)
    }

    return thresholds
}

// CalculateEnemyXP 计算敌人 XP 总和
func (dc *DifficultyCalculator) CalculateEnemyXP(enemies []EncounterEnemy) int {
    total := 0
    for _, enemy := range enemies {
        xp := dc.getEnemyXP(enemy.EnemyID)
        count := enemy.Count
        if enemy.MinCount > 0 && enemy.MaxCount > 0 {
            count = (enemy.MinCount + enemy.MaxCount) / 2
        }
        total += xp * count
    }
    return total
}

// getGroupMultiplier 获取群怪倍率
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

    // 标准倍率（DMG 第82页）
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

// getEnemyXP 获取敌人 XP
func (dc *DifficultyCalculator) getEnemyXP(enemyID string) int {
    // TODO: 从怪物图鉴查询
    return 50 // 默认值
}

// getDefaultDifficultyThresholds 获取默认难度阈值（DMG 第82页）
func getDefaultDifficultyThresholds() map[int]DifficultyThresholds {
    return map[int]DifficultyThresholds{
        1:  {Easy: 25, Medium: 50, Hard: 75, Deadly: 100},
        2:  {Easy: 50, Medium: 100, Hard: 150, Deadly: 200},
        3:  {Easy: 75, Medium: 150, Hard: 225, Deadly: 400},
        4:  {Easy: 125, Medium: 250, Hard: 375, Deadly: 500},
        5:  {Easy: 250, Medium: 500, Hard: 750, Deadly: 1100},
        6:  {Easy: 300, Medium: 600, Hard: 900, Deadly: 1400},
        7:  {Easy: 350, Medium: 750, Hard: 1100, Deadly: 1700},
        8:  {Easy: 450, Medium: 900, Hard: 1400, Deadly: 2100},
        9:  {Easy: 550, Medium: 1100, Hard: 1600, Deadly: 2400},
        10: {Easy: 600, Medium: 1200, Hard: 1900, Deadly: 2800},
        11: {Easy: 700, Medium: 1400, Hard: 2100, Deadly: 3200},
        12: {Easy: 800, Medium: 1600, Hard: 2400, Deadly: 3600},
        13: {Easy: 900, Medium: 1800, Hard: 2700, Deadly: 4100},
        14: {Easy: 1000, Medium: 2000, Hard: 3000, Deadly: 4500},
        15: {Easy: 1100, Medium: 2200, Hard: 3400, Deadly: 5100},
        16: {Easy: 1250, Medium: 2500, Hard: 3800, Deadly: 5600},
        17: {Easy: 1400, Medium: 2800, Hard: 4300, Deadly: 6400},
        18: {Easy: 1600, Medium: 3200, Hard: 4800, Deadly: 7200},
        19: {Easy: 1800, Medium: 3600, Hard: 5400, Deadly: 8100},
        20: {Easy: 2000, Medium: 4000, Hard: 6000, Deadly: 9000},
    }
}
```

---

## 3. 组件间通信方式

### 3.1 与战斗系统通信

```go
// TriggerEngine 通过接口调用战斗系统
type CombatSystem interface {
    InitiateCombat(mapID string, participantIDs []string) error
    GetCombatState(sessionID string) (*CombatState, error)
}

// 在 ActionExecutor 中使用
func (ae *ActionExecutor) executeStartCombat(ctx context.Context, sessionID string, params map[string]interface{}) (ActionResult, error) {
    // ...
    err := ae.combatSystem.InitiateCombat(encounter.Environment.MapID, participantIDs)
    // ...
}
```

### 3.2 与地图系统通信

```go
// SceneManager 通过接口调用地图系统
type MapSystem interface {
    LoadMap(sessionID string, mapID MapID) error
    SpawnEntity(entityID string, mapID MapID, position Position) error
    RemoveEntity(entityID string) error
}

func (sm *SceneManager) InitializeScene(ctx context.Context, sessionID string, scene *Scene) error {
    // 加载地图
    if err := sm.mapSystem.LoadMap(sessionID, MapID(scene.MapID)); err != nil {
        return err
    }

    // 生成 NPC
    for _, npc := range scene.NPCs {
        if err := sm.mapSystem.SpawnEntity(npc.NPCTemplateID, MapID(scene.MapID), npc.Position); err != nil {
            return err
        }
    }

    return nil
}
```

### 3.3 事件驱动通信

```go
// ScenarioEvent 剧本事件
type ScenarioEvent struct {
    Type      ScenarioEventType
    SessionID string
    Data      map[string]interface{}
    Timestamp time.Time
}

// ScenarioEventType 事件类型
type ScenarioEventType string

const (
    ScenarioEventChapterStarted   ScenarioEventType = "chapter_started"
    ScenarioEventChapterCompleted ScenarioEventType = "chapter_completed"
    ScenarioEventSceneChanged     ScenarioEventType = "scene_changed"
    ScenarioEventTriggerFired     ScenarioEventType = "trigger_fired"
    ScenarioEventDialogStarted    ScenarioEventType = "dialog_started"
    ScenarioEventQuestUpdated     ScenarioEventType = "quest_updated"
)

// EventHandler 事件处理器
type EventHandler interface {
    Handle(event ScenarioEvent) error
}

// ScenarioManager 实现事件发布
func (sm *ScenarioManager) publishEvent(event ScenarioEvent) {
    for _, handler := range sm.eventHandlers {
        go func(h EventHandler) {
            _ = h.Handle(event)
        }(handler)
    }
}
```

---

## 4. 状态管理设计

### 4.1 状态快照

```go
// ScenarioSnapshot 剧本状态快照
type ScenarioSnapshot struct {
    SessionID      string                 `json:"sessionId"`
    ScenarioID     ScenarioID             `json:"scenarioId"`
    ChapterID      ChapterID              `json:"chapterId"`
    SceneID        SceneID                `json:"sceneId"`
    Progress       *ScenarioProgress      `json:"progress"`
    ActiveNPCs     map[string]*NPCInstance `json:"activeNPCs"`
    ActiveEnemies  map[string]*EnemyInstance `json:"activeEnemies"`
    Timestamp      time.Time              `json:"timestamp"`
}

// CreateSnapshot 创建快照
func (sm *ScenarioManager) CreateSnapshot(sessionID string) (*ScenarioSnapshot, error) {
    progress := sm.progressTracker.GetProgress(sessionID)
    if progress == nil {
        return nil, ErrNoProgress
    }

    return &ScenarioSnapshot{
        SessionID:     sessionID,
        ScenarioID:    progress.ScenarioID,
        ChapterID:     progress.CurrentChapterID,
        SceneID:       progress.CurrentSceneID,
        Progress:      progress,
        ActiveNPCs:    sm.npcManager.GetActiveNPCs(sessionID),
        ActiveEnemies: sm.encounterManager.GetActiveEnemies(sessionID),
        Timestamp:     time.Now(),
    }, nil
}
```

---

## 5. 错误处理设计

### 5.1 错误类型

```go
var (
    ErrScenarioNotFound         = errors.New("scenario not found")
    ErrNoActiveScenario         = errors.New("no active scenario")
    ErrStartChapterNotFound     = errors.New("start chapter not found")
    ErrStartSceneNotFound       = errors.New("start scene not found")
    ErrSceneNotFound            = errors.New("scene not found")
    ErrChapterNotActive         = errors.New("chapter not active")
    ErrChapterConditionsNotMet  = errors.New("chapter conditions not met")
    ErrNoProgress               = errors.New("no progress found")
)
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
**组件设计师**: component-designer
