# D&D Agent 后端 Code Wiki

> **用途**: 渐进式代码索引，帮助 AI 快速定位代码而无需读取全部文件
> **最后更新**: 2026-04-09 | **基于**: master (7754627)
> **技术栈**: Go 1.21+ / Gin / Gorilla WebSocket / Zerolog / Viper

---

## L0 — 一句话定位

Go 后端 = WebSocket 实时通信 + LLM 会话管理（OpenAI/GLM 适配） + D&D 5e 规则引擎（骰子/角色/战斗） + JSONL 持久化，通过 **23 个 MCP 工具** 暴露给 LLM 调用。

---

## L1 — 架构速查

### 启动流程 (`cmd/server/main.go`)

```
加载 .env → 加载配置 → 初始化日志
  → state.Manager (内存状态)
  → persistence.Manager (JSONL 持久化)
  → LLM Provider (OpenAI 或 GLM，由配置决定)
  → session.Manager (LLM 会话)
  → dice.Service (骰子服务，线程安全 RNG)
  → combat.CombatManager (战斗管理器)
  → tools.Registry (MCP 工具注册表，23个工具)
  → websocket.Hub (WebSocket 连接管理)
  → Gin Router (REST + /ws 路由)
  → HTTP Server 启动 (优雅关闭)
```

### 模块层次

```
┌──────────────────────────────────────┐
│  API 层                              │
│  websocket/hub.go + rest/routes.go   │
├──────────────────────────────────────┤
│  Client 层 (LLM Agent)               │
│  llm/provider.go → session/manager   │
│  tools/registry.go (23 MCP 工具)     │
├──────────────────────────────────────┤
│  Server 层 (D&D 规则引擎)            │
│  dice/  character/  combat/          │
├──────────────────────────────────────┤
│  共享层                              │
│  types/  models/  state/             │
├──────────────────────────────────────┤
│  persistence/manager.go              │
└──────────────────────────────────────┘
```

### 关键接口

| 接口 | 定义位置 | 方法 | 实现 |
|------|----------|------|------|
| `llm.Provider` | `client/llm/provider.go` | `SendMessage`, `StreamMessage`, `GetModel` | OpenAIProvider, GLMProvider |
| `rest.StateManager` | `api/rest/handler.go` | `GetSession`, `CreateSession`, `DeleteSession`, `ListSessions` | stateAdapter |
| `rest.Persistence` | `api/rest/handler.go` | CRUD sessions + SaveState/LoadState | persistenceAdapter |
| `tools.CharacterStateProvider` | `client/tools/character_tools.go` | `GetGameState`, `UpdateGameState` | Hub (注入) |
| `websocket.Broadcaster` | `api/rest/character.go` | `SendToSession` | Hub |

---

## L2 — 模块索引（按任务查找）

---

### 2.1 API 层 — WebSocket & REST

**任务：处理客户端连接、消息路由、HTTP 接口**

| 文件 | 核心导出 | 职责 |
|------|----------|------|
| `internal/api/websocket/hub.go` | `Hub{}`, `Run()`, `Register()`, `Broadcast()`, `SendToSession()` | 连接注册/注销、会话隔离广播、消息分发 |
| `internal/api/websocket/server.go` | `ServeWS()` | WebSocket 升级、连接建立 |
| `internal/api/websocket/client.go` | `Client{}` | 单连接读写泵、ping/pong 心跳 |
| `internal/api/websocket/handler.go` | `HandleMessage()` | 消息类型路由 → LLM 处理或状态查询 |
| `internal/api/rest/routes.go` | `RegisterRoutesWithCharacters()` | REST 路由注册 |
| `internal/api/rest/handler.go` | 健康检查、session CRUD handlers | `/health`, `/sessions` |
| `internal/api/rest/character.go` | 角色 CRUD handlers | GET/POST/DELETE `/characters` |

**WebSocket 消息类型** (`internal/shared/models/message.go`):

| 方向 | 类型常量 | 用途 |
|------|----------|------|
| C→S | `user_input` | 用户文本 → LLM 处理 |
| C→S | `map_action` | 地图操作（移动/交互） |
| C→S | `combat_action` | 战斗操作 |
| C→S | `management` | 会话/配置管理 |
| C→S | `ping` | 连接健康检查 |
| S→C | `narration` | LLM 生成的叙述文本（支持流式） |
| S→C | `state_update` | 游戏状态变更 |
| S→C | `dice_result` | 骰子掷骰结果 |
| S→C | `combat_event` | 战斗事件通知 |
| S→C | `error` | 错误消息 |
| S→C | `pong` | ping 响应 |

---

### 2.2 Client 层 — LLM 集成 & 工具系统

**任务：对接 LLM、管理会话上下文、注册 MCP 工具**

| 文件 | 核心导出 | 职责 |
|------|----------|------|
| `internal/client/llm/provider.go` | `Provider` 接口, `Request`, `Response`, `StreamChunk`, `ToolDefinition` | LLM 抽象接口定义 |
| `internal/client/llm/openai.go` | `NewOpenAIProvider()`, `OpenAIConfig{}` | OpenAI 兼容 API 客户端（含 MiniMax） |
| `internal/client/llm/glm.go` | `NewGLMProvider()`, `GLMConfig{}` | GLM 客户端（处理 `reasoning_content` 字段） |
| `internal/client/session/manager.go` | `Manager{}`, `SendMessage()` | LLM 会话管理、agentic 循环（工具调用→执行→反馈） |
| `internal/client/tools/registry.go` | `Registry{}`, `Register()`, `Get()`, `Execute()`, `AsToolDefinitions()` | 线程安全工具注册表，转为 LLM function calling 格式 |
| `internal/client/tools/dice_tools.go` | `RegisterDiceTools()` | 注册 roll_dice, ability_check |
| `internal/client/tools/character_tools.go` | `RegisterCharacterTools()` | 注册 5 个角色工具 |
| `internal/client/tools/combat_tools.go` | `RegisterCombatTools()` | 注册 16 个战斗工具 |

#### MCP 工具完整清单（23 个）

<details>
<summary><b>🎲 骰子工具 (2个)</b></summary>

| 工具名 | 必需参数 | 可选参数 | 说明 |
|--------|----------|----------|------|
| `roll_dice` | `formula` | — | D&D 骰子表达式: d20, 2d6+3, 4d6k3 |
| `ability_check` | `modifier`, `dc` | `advantage`, `disadvantage` | 属性检定 vs DC |

</details>

<details>
<summary><b>👤 角色工具 (5个)</b></summary>

| 工具名 | 必需参数 | 可选参数 | 说明 |
|--------|----------|----------|------|
| `create_character` | `session_id`, `name`, `race`, `class`, `background`, `ability_scores` | `skill_choices`, `extra_ability_bonuses` | 创建角色并加入队伍 |
| `get_character` | `session_id`, `character_id` | — | 获取角色详情 |
| `update_character` | `session_id`, `character_id` | `hp`, `max_hp`, `ac`, `gold`, `conditions_add/remove` | 更新可变属性 |
| `add_to_inventory` | `session_id`, `character_id`, `item_name` | `item_type`, `description` | 添加物品到背包 |
| `level_up` | `session_id`, `character_id` | — | 升级(HP+熟练加值) |

</details>

<details>
<summary><b>⚔️ 战斗工具 (16个)</b></summary>

| 工具名 | 必需参数 | 可选参数 | 说明 |
|--------|----------|----------|------|
| `start_combat` | `session_id`, `combatants[]` | — | 开始战斗，掷先攻 |
| `end_combat` | `session_id` | — | 结束战斗 |
| `get_combat_state` | `session_id` | — | 查询当前战斗状态 |
| `end_turn` | `session_id` | — | 结束当前回合，推进到下一单位 |
| `attack` | `session_id`, `attacker_id`, `target_id`, `attack_bonus`, `damage_dice`, `damage_type` | `damage_bonus`, `advantage`, `disadvantage` | 攻击动作(d20 vs AC) |
| `apply_damage` | `session_id`, `target_id`, `damage`, `damage_type` | — | 伤害结算(抗性/临时HP) |
| `apply_healing` | `session_id`, `target_id`, `healing` | — | 治疗(上限MaxHP) |
| `add_temporary_hp` | `session_id`, `target_id`, `temporary_hp` | — | 临时HP(不叠加) |
| `short_rest` | `session_id`, `combatant_id`, `dice_to_spend` | — | 短休息(消耗命中骰回血) |
| `long_rest` | `session_id`, `combatant_id` | — | 长休息(全HP+半命中骰) |
| `death_save` | `session_id`, `combatant_id` | — | 死亡豁免(d20, ≥10成功) |
| `stabilize` | `session_id`, `combatant_id`, `medicine_check_total` | — | 稳定(Medicine DC10) |
| `apply_condition` | `session_id`, `target_id`, `condition` | `source`, `duration`, `level` | 施加状态效果 |
| `remove_condition` | `session_id`, `target_id`, `condition` | — | 移除状态效果 |
| `get_conditions` | `session_id`, `target_id` | — | 查询所有状态 |
| `dodge` / `disengage` / `help` / `hide` / `ready` | `session_id`, `combatant_id` | 各自特有参数 | 5 种战斗动作 |
| `opportunity_attack` | `session_id`, `attacker_id`, `target_id`, `attack_bonus`, `damage_dice`, `damage_type` | `damage_bonus` | 借机攻击(反应) |

</details>

---

### 2.3 Server 层 — D&D 规则引擎

#### 2.3.1 骰子系统 (`internal/server/dice/`)

| 文件 | 核心函数/类型 | 说明 |
|------|---------------|------|
| `service.go` | `Service{}`, `NewService()`, `Roll()`, `AbilityCheck()` | 线程安全骰子服务，封装 RNG |
| `roller.go` | `ParseRoll()`, `ExecuteRoll()` | 骰子表达式解析与执行（支持 NdS±M, NdSkH） |
| `check.go` | `AbilityCheckResult`, `AttackRoll()` | 属性检定、攻击掷骰、豁免（优势/劣势） |
| `dice.go` | (deprecated) | 旧版简单掷骰，保留兼容 |

**关键类型** (`internal/shared/models/dice.go`):
- `DiceResult{Total, Formula, Rolls[], Kept[], Modifier}` — 骰子结果
- `CheckResult{Roll, Total, Modifier, DC, Success, CriticalHit/Fail, Advantage/Disadvantage}` — 检定结果

#### 2.3.2 角色系统 (`internal/server/character/`)

| 文件 | 核心函数/类型 | 说明 |
|------|---------------|------|
| `creator.go` | `CreateParams{}`, `CreateBasic()`, `GetClassConfig()` | D&D 5e 角色创建 |

**Character 模型** (`internal/shared/models/character.go`):
```go
type Character struct {
    ID, Name, Race, Class, Background string
    Level, HP, MaxHP, TemporaryHP, AC, Speed, Gold int
    Stats           AbilityScores     // 6 属性值
    Skills          map[Skill]bool    // 技能熟练(true=熟练)
    Inventory       []Item
    Conditions      []Condition
    ProficiencyBonus int
    SavingThrows    map[Ability]bool
    RacialTraits       []RaceTrait
    HitDice             HitDiceInfo   // {Total, Current, Size}
    DeathSaves          DeathSaves    // {Successes, Failures}
    DamageResistances   []DamageType
    DamageImmunities    []DamageType
    IsDead              bool
    ArmorProficiencies  []string
    WeaponProficiencies []string
}
```

**支持的数据**:
- **9 种族**: human, elf, dwarf, halfling, dragonborn, gnome, half-elf, half-orc, tiefling
- **11 职业**: fighter, wizard, rogue, cleric, bard, druid, monk, paladin, ranger, sorcerer, warlock
- **10 背景**: sage, soldier, criminal, commoner, urchin, folk_hero, noble, outlander, entertainer, acolyte
- **熟练加值等级表**: Lv1-4:+2, Lv5-8:+3, Lv9-12:+4, Lv13-16:+5, Lv17-20:+6
- **属性调整值公式**: `(score - 10) / 2`（向负无穷取整）
- **HP 计算**: 职业命中骰 + CON 调整值
- **AC 计算**: 默认 10 + DEX 调整值（无装备时）

#### 2.3.3 战斗系统 (`internal/server/combat/`) — 核心

| 文件 | 核心函数/类型 | 说明 |
|------|---------------|------|
| `combat.go` | `CombatManager{}`, `StartCombat()`, `EndCombat()`, `GetCombatState()` | 战斗生命周期管理 |
| `initiative.go` | `RollInitiative()`, `SortOrder()`, `AddCombatant()`, `RemoveCombatant()` | 先攻管理（DEX 检定，同分高 DEX 优先） |
| `turn.go` | `EndTurn()`, `ResetActionResources()`, `ProcessConditionDurations()` | 回合结束处理 |
| `action.go` | `AttackAction()`, `DodgeAction()`, `DisengageAction()`, `HelpAction()`, `HideAction()`, `ReadyAction()`, `OpportunityAttack()` | 战斗动作执行 |
| `damage.go` | `ApplyDamage()`, `ApplyHealing()`, `AddTemporaryHP()` | 伤害/治疗/临时 HP 结算（含抗性/免疫） |
| `events.go` | `CombatEventType`(15个), `CombatEvent{}`, `*EventData` 结构体 | 事件类型定义和数据结构 |
| `conditions.go` | `ApplyCondition()`, `RemoveCondition()`, `GetConditionModifiers()`, `ConditionModifiers{}` | 15 种条件及机制效果 |
| `rest.go` | `ShortRest()`, `LongRest()`, `DeathSave()`, `Stabilize()` | 休息与死亡豁免 |

**CombatState 结构** (`internal/shared/state/game.go`):
```go
type CombatState struct {
    Status        CombatStatus      // idle | active | ended
    Round         int
    TurnIndex     int
    Initiatives   []*InitiativeEntry // [{CharacterId, Initiative, HasActed}]
    Participants  []*Combatant
    ActiveEffects []*ActiveEffect
}

type Combatant struct {
    ID, Name string; Type CombatantType // player | npc | enemy
    MaxHP, CurrentHP, TemporaryHP, AC, Speed, DexScore int
    Action, BonusAction, Reaction ActionState // available | used
    Conditions        []*ConditionEntry
    DamageResistances []DamageType; DamageImmunities []DamageType
    DeathSaves *DeathSaves; HitDice HitDiceInfo
    CharacterID string; Level, CONMod int
}
```

**战斗事件类型** (15 种):

| 事件 | 数据结构 | 触发时机 |
|------|----------|----------|
| `combat_start` | — | 战斗开始 |
| `combat_end` | — | 战斗结束 |
| `initiative_rolled` | — | 先攻掷骰完成 |
| `turn_start` | — | 回合开始 |
| `turn_end` | — | 回合结束 |
| `round_end` | — | 回合结束 |
| `attack` | `AttackEventData{AttackerID, TargetID, AttackRoll, TargetAC, Hit, Critical, Damage, DamageType}` | 攻击动作 |
| `damage` | `DamageEventData{TargetID, Original/ModifiedDamage, ResistanceApplied, ImmunityApplied, CurrentHP, Unconscious, Dead}` | 伤害结算 |
| `heal` | `HealEventData{TargetID, Healing, CurrentHP, Conscious}` | 治疗 |
| `death` | `DeathEventData{CombatantID, Type, KillerID}` | 死亡 |
| `unconscious` | — | 昏厥 |
| `condition_applied` | `ConditionEventData{CombatantID, Condition, Applied}` | 条件施加 |
| `condition_removed` | `ConditionEventData{...}` | 条件移除 |
| `opportunity_attack` | — | 借机攻击 |

**状态效果（15 种 Condition）及其机制效果**:

| 条件 | 攻击防 | 防御防 | 属性检定 | 豁免防 | 特殊效果 |
|------|--------|--------|----------|--------|----------|
| blinded | — | advantage | auto-fail(sight) | — | 无法看见 |
| charmed | — | — | — | — | 无法攻击魅惑来源 |
| deafened | — | — | auto-fail(hear) | — | 无法听见 |
| frightened | disadvantage | — | disadvantage(source LOS) | — | 不能靠近恐惧源 |
| grappled | — | — | — | — | speed=0 |
| incapacitated | — | — | — | — | 无法行动/反应 |
| invisible | — | — | — | — | 无法被看见 |
| paralyzed | — | auto-crit(melee) | auto-fail | — | incapacitated+无法移动 |
| petrified | — | — | — | — | 变为固体物质 |
| poisoned | disadvantage | — | disadvantage | — | 攻击/检定劣势 |
| prone | disadvantage(melee) | advantage(melee) | — | — | 仅站立攻击劣势 |
| restrained | — | — | disadvantage | — | speed=0 |
| stunned | — | auto-crit(melee) | auto-fail | — | incapacitated+无法说话 |
| unconscious | — | auto-crit(melee) | auto-fail | — | incapacitated+无法感知 |
| exhaustion(Lv1-6) | Lv3: disadv | — | Lv1: disadv | — | Lv2:speed/2, Lv4:maxHP/2, Lv5:speed=0, Lv6:death |

---

### 2.4 共享层 — Types / Models / State

| 文件 | 核心类型 | 说明 |
|------|----------|------|
| `internal/shared/types/ability.go` | `Ability`(6种), `Skill`(18种), `SkillAbility` map | 属性与技能枚举，技能-属性映射 |
| `internal/shared/types/damage.go` | `DamageType`(13种), `Condition`(15种) | 伤害类型与状态效果枚举，含 `.Valid()` 校验 |
| `internal/shared/models/character.go` | `Character`, `AbilityScores`, `HitDiceInfo`, `DeathSaves`, `Item`, `RaceTrait` | 角色完整数据模型 |
| `internal/shared/models/dice.go` | `DiceResult`, `CheckResult` | 骰子结果模型 |
| `internal/shared/models/message.go` | `ClientMessage`, `ServerMessage` + 11 个消息类型常量 | WebSocket 消息协议 |
| `internal/shared/models/position.go` | `Position{X,Y}`, `Size{W,H}` + `Distance()`, `Bounds()` | 坐标与距离计算 |
| `internal/shared/state/game.go` | `GameState`, `CombatState`, `Combatant`, `InitiativeEntry`, `ConditionEntry`, `ActiveEffect`, `ScenarioState`, `GameMetadata` + `GamePhase`(4种), `CombatStatus`(3种), `CombatantType`(3种), `ActionState`(2种) | 全部游戏状态定义 |
| `internal/shared/state/manager.go` | `Manager{}`, `CreateSession()`, `GetSession()`, `UpdateSession()`, `DeleteSession()`, `ListSessions()` | 线程安全多会话状态管理（读写锁） |

**GamePhase 枚举**: `exploring` | `combat` | `dialog` | `resting`
**CombatStatus 枚举**: `idle` | `active` | `ended`
**CombatantType 枚举**: `player` | `npc` | `enemy`

**13 种 DamageType**: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder

**18 种 Skill → Ability 映射**:
- STR: athletics | DEX: acrobatics, sleight_of_hand, stealth | CON: —
- INT: arcana, history, investigation, nature, religion | WIS: animal_handling, insight, medicine, perception, survival | CHA: deception, intimidation, performance, persuasion

---

### 2.5 持久化层

| 文件 | 核心函数 | 说明 |
|------|----------|------|
| `internal/persistence/manager.go` | `Manager{}`, `SaveState()`, `LoadState()`, `Create/Delete/ListSession()` | JSON 文件持久化（sessions 目录下 per-session 存储） |

---

## L3 — 关键代码模式

### 依赖注入模式
```go
// main.go 中通过构造函数注入
combatManager := combat.NewCombatManager(stateManager, diceService)
toolRegistry := tools.NewRegistry()
tools.RegisterDiceTools(toolRegistry, diceService)
tools.RegisterCombatTools(toolRegistry, combatManager)
wsHub := websocket.NewHub(stateManager, sessionManager, toolRegistry, logger)
```

### 错误处理模式
```go
return fmt.Errorf("character not found: %s", characterId)
return fmt.Errorf("invalid condition: %w", err) // 错误包装
```

### 并发安全
```go
// state.Manager 使用 sync.RWMutex
func (m *Manager) UpdateSession(id string, fn func(*GameState)) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    fn(m.sessions[id])  // 在锁内执行回调，保证原子性
}
```

### MCP 工具注册模式
```go
registry.Register(Tool{
    Name: "tool_name", Description: "描述（LLM 可见）",
    InputSchema: map[string]interface{}{ /* JSON Schema */ },
    Handler: func(args map[string]interface{}) (interface{}, error) {
        // 解析参数 → 调用业务逻辑 → 返回结果
    },
})
```

### 参数提取辅助函数
```go
intArg(args, "key", default)    // interface{} → int (处理 float64/int/float32/json.Number)
boolArg(args, "key", default)   // interface{} → bool
getStrVal(m, "key")             // map → string
getIntVal(m, "key", default)    // map → int
```

---

## L4 — 全部 .go 文件速查表

| 文件路径 | 行数(约) | 一行描述 |
|----------|---------|----------|
| `cmd/server/main.go` | 300 | 入口：初始化所有服务、启动 HTTP/WS、优雅关闭 |
| `configs/config.go` | ~50 | 配置加载（环境变量/.env） |
| `internal/api/websocket/hub.go` | ~150 | WS 连接管理、广播、会话隔离 |
| `internal/api/websocket/server.go` | ~40 | WS 升级器 |
| `internal/api/websocket/client.go` | ~120 | 单连接读写泵、心跳 |
| `internal/api/websocket/handler.go` | ~100 | 消息路由分发 |
| `internal/api/rest/routes.go` | ~30 | REST 路由注册 |
| `internal/api/rest/handler.go` | ~80 | Session/健康检查 handler |
| `internal/api/rest/character.go` | ~120 | Character CRUD REST handler |
| `internal/client/llm/provider.go` | ~50 | Provider 接口 + Request/Response 类型 |
| `internal/client/llm/openai.go` | ~120 | OpenAI 兼容 API 客户端 |
| `internal/client/llm/glm.go` | ~100 | GLM API 客户端（reasoning_content） |
| `internal/client/session/manager.go` | ~150 | LLM 会话、agentic 循环 |
| `internal/client/tools/registry.go` | ~95 | 工具注册表 + dice tools |
| `internal/client/tools/character_tools.go` | ~565 | 5 个角色 MCP 工具 |
| `internal/client/tools/combat_tools.go` | ~680 | 16 个战斗 MCP 工具 |
| `internal/persistence/manager.go` | ~100 | JSON 文件持久化 |
| `internal/server/dice/service.go` | ~60 | 线程安全骰子服务 |
| `internal/server/dice/roller.go` | ~150 | 表达式解析器 (NdS±M, kH/kL) |
| `internal/server/dice/check.go` | ~100 | 检定/攻击掷骰（优势/劣势/暴击） |
| `internal/server/dice/dice.go` | ~30 | (deprecated) 旧版掷骰 |
| `internal/server/character/creator.go` | ~300 | 角色创建逻辑（9种族×11职业×10背景） |
| `internal/server/combat/combat.go` | ~120 | 战斗开始/结束/状态查询 |
| `internal/server/combat/initiative.go` | ~100 | 先攻掷骰与排序 |
| `internal/server/combat/turn.go` | ~80 | 回合推进与资源重置 |
| `internal/server/combat/action.go` | ~200 | 7 种战斗动作 |
| `internal/server/combat/damage.go` | ~100 | 伤害/治疗/临时HP |
| `internal/server/combat/events.go` | ~90 | 15 种事件类型 + 数据结构 |
| `internal/server/combat/conditions.go` | ~150 | 条件施加/移除 + 机制效果表 |
| `internal/server/combat/rest.go` | ~100 | 短/长休息 + 死亡豁免 |
| `internal/shared/types/ability.go` | ~90 | 6 Ability + 18 Skill + 映射 |
| `internal/shared/types/damage.go` | ~105 | 13 DamageType + 15 Condition + Valid() |
| `internal/shared/models/character.go` | ~140 | Character + AbilityScores + Item 等 |
| `internal/shared/models/dice.go` | ~40 | DiceResult + CheckResult |
| `internal/shared/models/message.go` | ~65 | ClientMessage + ServerMessage + 常量 |
| `internal/shared/models/position.go` | ~50 | Position + Size + Distance() |
| `internal/shared/state/game.go` | ~240 | GameState + CombatState + Combatant 等全部状态 |
| `internal/shared/state/manager.go` | ~100 | 线程安全 StateManager |

**测试文件** (同目录 `*_test.go`): models(4), types(2), state(2), dice(4), character(2+1 blackbox), combat(1), websocket(1), rest-character(1), tools-character(1)

---

> **提示**: 前端 Code Wiki 见 `../web/CODE_WIKI.md` | 设计文档索引见 `../../docs/design/README.md`
