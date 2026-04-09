# 游戏后端子系统模块设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **基于**: 架构设计文档 v1.0 + 技术路线图 v1.0 + 最终需求确认 v1.0

---

## 1. 子系统概述

### 1.1 子系统定位

游戏后端是整个 D&D 游戏系统的核心，负责：
- 提供 HTTP/WebSocket API 接口
- 管理 LLM 会话和上下文
- 执行 D&D 5e 规则引擎
- 管理游戏状态和持久化

### 1.2 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 编程语言 | Go 1.21+ | 高性能、并发简单、部署便捷 |
| Web 框架 | Gin | 轻量高性能，生态成熟 |
| WebSocket | Gorilla WebSocket | Go 语言最成熟的 WebSocket 库 |
| 状态存储 | 内存 + JSONL | 内存存储性能最优；JSONL 便于追加和查看 |
| 配置管理 | Viper | 多格式配置、环境变量、热重载 |
| 日志 | Zerolog | 高性能结构化日志 |
| 序列化 | JSON | 标准库足够用，可读性好 |

### 1.3 模块划分

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            游戏后端子系统                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           API 模块                                   │   │
│  │   ┌─────────────────────┐    ┌─────────────────────┐               │   │
│  │   │   WebSocket Hub     │    │      REST API       │               │   │
│  │   │   (实时通信)         │    │   (管理/查询)        │               │   │
│  │   └─────────────────────┘    └─────────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Client 模块                                 │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│   │
│  │   │  会话管理   │  │ 上下文管理  │  │       LLM 适配层            ││   │
│  │   │ Session Mgr │  │ Context Mgr │  │  OpenAI │ Anthropic        ││   │
│  │   └─────────────┘  └─────────────┘  └─────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Server 模块                                 │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │   │
│  │   │  角色系统   │  │  战斗系统   │  │  法术系统   │  │ 检定系统  │ │   │
│  │   │ Character   │  │   Combat    │  │   Spell     │  │   Dice    │ │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │   │  物品系统   │  │  地图系统   │  │  剧本系统   │                │   │
│  │   │   Item      │  │    Map      │  │  Scenario   │                │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         持久化模块                                   │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│   │
│  │   │    内存     │  │   JSONL    │  │      文件系统               ││   │
│  │   │  (运行时)   │  │  (持久化)   │  │   (存档/剧本/地图)          ││   │
│  │   └─────────────┘  └─────────────┘  └─────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 模块清单

| 模块名称 | 文档 | 职责简述 |
|----------|------|----------|
| **API 模块** | [api.md](./api.md) | HTTP/WebSocket 接口层 |
| **Client 模块** | [client.md](./client.md) | LLM 会话管理、上下文构建、LLM 适配 |
| **角色系统** | [character.md](./character.md) | 角色创建、属性计算、升级、状态管理 |
| **战斗系统** | [combat.md](./combat.md) | 先攻管理、回合执行、攻击/伤害计算 |
| **法术系统** | [spell.md](./spell.md) | 法术位、施法、专注管理 |
| **物品系统** | [item.md](./item.md) | 背包、装备、物品使用 |
| **地图系统** | [map.md](./map.md) | 地图加载、位置管理、碰撞检测 |
| **剧本系统** | [scenario.md](./scenario.md) | 剧本加载、章节管理、事件触发 |
| **检定系统** | [dice.md](./dice.md) | 掷骰、属性检定、豁免、技能检定 |
| **持久化模块** | [persistence.md](./persistence.md) | 数据存储、缓存、存档管理 |

---

## 2. 模块依赖关系

### 2.1 依赖层次图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              依赖层次图                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   第1层（基础层，无依赖）                                                    │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│   │  检定系统  │  │  数据模型  │  │  工具函数  │  │  日志/配置 │          │
│   │   Dice     │  │   Models   │  │   Utils    │  │  Viper/Zap │          │
│   └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
│                                                                             │
│   第2层（核心规则层，依赖第1层）                                             │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│   │  物品系统  │  │  法术系统  │  │  角色系统  │  │  地图系统  │          │
│   │   Item     │  │   Spell    │  │ Character  │  │    Map     │          │
│   └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘          │
│          │               │               │               │                 │
│   第3层（复合规则层，依赖第2层）                                             │
│   ┌──────┴───────────────┴───────────────┴───────────────┴─────┐          │
│   │                        战斗系统                              │          │
│   │                        Combat                                │          │
│   └─────────────────────────────────────────────────────────────┘          │
│          │                                                                  │
│   第4层（业务编排层，依赖第3层）                                             │
│   ┌──────┴─────┐  ┌────────────┐                                          │
│   │  剧本系统  │  │ 持久化模块 │                                          │
│   │  Scenario  │  │Persistence │                                          │
│   └──────┬─────┘  └──────┬─────┘                                          │
│          │               │                                                 │
│   第5层（集成层，依赖第4层）                                                 │
│   ┌──────┴───────────────┴─────┐                                          │
│   │        Client 模块         │                                          │
│   │    (会话/上下文/LLM适配)    │                                          │
│   └──────────────┬─────────────┘                                          │
│                  │                                                         │
│   第6层（接口层，依赖第5层）                                                 │
│   ┌──────────────┴─────────────┐                                          │
│   │          API 模块          │                                          │
│   │    (WebSocket/REST)        │                                          │
│   └────────────────────────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块间通信方式

| 通信方式 | 使用场景 | 说明 |
|----------|----------|------|
| **直接调用** | 同层或下层依赖 | 通过接口调用，依赖注入 |
| **MCP 工具调用** | Client → Server | LLM 发起的工具调用请求 |
| **事件发布/订阅** | 状态变更通知 | 解耦模块间的状态同步 |
| **共享状态** | 跨模块状态访问 | 通过共享状态层统一管理 |

---

## 3. 目录结构规划

```
backend/
├── cmd/
│   └── server/                    # 主入口
│       └── main.go
│
├── internal/
│   ├── api/                       # API 模块
│   │   ├── websocket/             # WebSocket 处理
│   │   │   ├── hub.go             # 连接管理
│   │   │   ├── client.go          # 客户端连接
│   │   │   ├── handler.go         # 消息处理
│   │   │   └── message.go         # 消息类型定义
│   │   └── rest/                  # REST API
│   │       ├── router.go          # 路由定义
│   │       ├── session.go         # 会话接口
│   │       ├── save.go            # 存档接口
│   │       └── config.go          # 配置接口
│   │
│   ├── client/                    # Client 模块
│   │   ├── llm/                   # LLM 适配层
│   │   │   ├── provider.go        # 接口定义
│   │   │   ├── openai.go          # OpenAI 适配器
│   │   │   └── anthropic.go       # Anthropic 适配器
│   │   ├── context/               # 上下文管理
│   │   │   ├── builder.go         # 上下文构建
│   │   │   ├── compressor.go      # 历史压缩
│   │   │   └── templates.go       # Prompt 模板
│   │   ├── session/               # 会话管理
│   │   │   ├── manager.go         # 会话生命周期
│   │   │   └── state.go           # 会话状态
│   │   └── tools/                 # 工具定义
│   │       ├── registry.go        # 工具注册表
│   │       └── definitions.go     # 工具定义
│   │
│   ├── server/                    # Server 模块
│   │   ├── character/             # 角色系统
│   │   │   ├── character.go       # 角色模型
│   │   │   ├── creator.go         # 角色创建
│   │   │   ├── stats.go           # 属性计算
│   │   │   └── progression.go     # 升级系统
│   │   ├── combat/                # 战斗系统
│   │   │   ├── combat.go          # 战斗管理
│   │   │   ├── initiative.go      # 先攻管理
│   │   │   ├── turn.go            # 回合管理
│   │   │   ├── action.go          # 行动处理
│   │   │   └── damage.go          # 伤害计算
│   │   ├── spell/                 # 法术系统
│   │   │   ├── spell.go           # 法术模型
│   │   │   ├── casting.go         # 施法处理
│   │   │   ├── slots.go           # 法术位管理
│   │   │   └── concentration.go   # 专注管理
│   │   ├── item/                  # 物品系统
│   │   │   ├── item.go            # 物品模型
│   │   │   ├── inventory.go       # 背包管理
│   │   │   ├── equipment.go       # 装备管理
│   │   │   └── usage.go           # 物品使用
│   │   ├── map/                   # 地图系统
│   │   │   ├── map.go             # 地图模型
│   │   │   ├── loader.go          # 地图加载
│   │   │   ├── position.go        # 位置管理
│   │   │   └── collision.go       # 碰撞检测
│   │   ├── scenario/              # 剧本系统
│   │   │   ├── scenario.go        # 剧本模型
│   │   │   ├── loader.go          # 剧本加载
│   │   │   ├── chapter.go         # 章节管理
│   │   │   └── event.go           # 事件触发
│   │   ├── dice/                  # 检定系统
│   │   │   ├── roller.go          # 掷骰器
│   │   │   ├── check.go           # 检定计算
│   │   │   └── formula.go         # 骰子表达式解析
│   │   └── effects/               # 状态效果
│   │       └── conditions.go      # 状态效果定义
│   │
│   ├── shared/                    # 共享数据
│   │   ├── state/                 # 游戏状态
│   │   │   ├── game.go            # 全局状态
│   │   │   └── session.go         # 会话状态
│   │   ├── models/                # 数据模型
│   │   │   ├── base.go            # 基础模型
│   │   │   └── dto.go             # 传输对象
│   │   └── events/                # 事件系统
│   │       └── bus.go             # 事件总线
│   │
│   └── persistence/               # 持久化层
│       ├── manager.go             # 持久化管理器（内存状态+JSONL）
│       ├── state.go               # 状态快照管理
│       ├── messages.go            # 消息追加写入
│       └── save.go                # 存档管理
│
├── pkg/                           # 可导出的公共包
│   ├── dnd5e/                     # D&D 5e 规则常量
│   │   ├── races.go               # 种族数据
│   │   ├── classes.go             # 职业数据
│   │   ├── spells.go              # 法术数据
│   │   └── equipment.go           # 装备数据
│   └── utils/                     # 工具函数
│       ├── crypto.go              # 加密/ID生成
│       └── json.go                # JSON 工具
│
├── configs/                       # 配置文件
│   ├── config.yaml                # 主配置
│   └── prompts/                   # Prompt 模板
│
├── data/                          # 数据文件
│   ├── scenarios/                 # 剧本数据
│   └── maps/                      # 地图数据
│
├── go.mod
└── go.sum
```

---

## 4. 共享类型

### 4.1 类型定义位置

所有共享类型统一在 [shared-types.md](../../shared-types.md) 中定义，各模块不得重复定义。

### 4.2 核心共享类型

| 类型 | 说明 | 使用模块 |
|------|------|----------|
| `Position` | 2D 坐标位置 | Map, Character, Combat |
| `Ability` | 六大属性枚举 | Character, Dice, Spell |
| `AbilityScores` | 属性值集合 | Character |
| `Skill` | 18 种技能 | Character, Dice |
| `DamageType` | 13 种伤害类型 | Combat, Spell, Item |
| `Condition` | 15 种状态效果 | Character, Combat, Spell |
| `GameTime` | 游戏内时间 | State, Scenario |

### 4.3 导入规范

```go
// 从共享类型包导入
import "dnd-game/internal/shared/types"

// 使用示例
func (c *Character) GetModifier(ability types.Ability) int {
    // ...
}
```

### 4.4 目录结构

```
internal/shared/
├── types/
│   ├── ability.go      // Ability, AbilityScores, Skill
│   ├── combat.go       // DamageType, Condition, UnitStatus
│   ├── position.go     // Position
│   ├── time.go         // GameTime
│   └── spell.go        // SpellSchool, SpellComponents
├── models/
│   ├── base.go         // 基础模型
│   └── dto.go          // 传输对象
└── events/
    └── bus.go          // 事件总线
```

### 4.5 游戏状态结构

```go
// internal/shared/state/game.go

// 游戏全局状态
type GameState struct {
    SessionID    string              `json:"sessionId"`
    ScenarioID   string              `json:"scenarioId"`
    CurrentMapID string              `json:"currentMapId"`
    GameTime     GameTime            `json:"gameTime"`
    Party        []*Character        `json:"party"`
    NPCs         map[string]*NPC     `json:"npcs"`
    Enemies      map[string]*Enemy   `json:"enemies"`
    Combat       *CombatState        `json:"combat,omitempty"`
    Flags        map[string]bool     `json:"flags"`      // 剧本标记
    Variables    map[string]interface{} `json:"variables"` // 剧本变量
}

// 游戏时间
type GameTime struct {
    Day      int `json:"day"`
    Hour     int `json:"hour"`
    Minute   int `json:"minute"`
}

// 战斗状态
type CombatState struct {
    Active          bool              `json:"active"`
    Round           int               `json:"round"`
    InitiativeOrder []InitiativeEntry `json:"initiativeOrder"`
    CurrentTurn     int               `json:"currentTurn"`
    Combatants      map[string]*Combatant `json:"combatants"`
}
```

---

## 5. MCP 工具定义

### 5.1 工具注册表

Client 模块通过 MCP 格式的工具调用与 Server 模块交互。

```go
// internal/client/tools/registry.go

type ToolRegistry struct {
    tools map[string]ToolHandler
}

type ToolHandler func(args map[string]interface{}) (*ToolResult, error)

type ToolDefinition struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"inputSchema"`
}
```

### 5.2 核心工具列表

| 工具名称 | 用途 | 主要参数 | 所属模块 |
|----------|------|----------|----------|
| `roll_dice` | 掷骰检定 | formula, modifier, advantage | dice |
| `ability_check` | 属性检定 | characterId, ability, dc | dice |
| `saving_throw` | 豁免检定 | characterId, ability, dc | dice |
| `skill_check` | 技能检定 | characterId, skill, dc | dice |
| `create_character` | 创建角色 | name, race, class, abilityScores | character |
| `get_character` | 获取角色信息 | characterId | character |
| `update_character` | 更新角色 | characterId, updates | character |
| `level_up` | 角色升级 | characterId | character |
| `attack` | 执行攻击 | attackerId, targetId, weaponId | combat |
| `cast_spell` | 施放法术 | casterId, spellId, targetId | spell |
| `use_item` | 使用物品 | characterId, itemId | item |
| `equip_item` | 装备物品 | characterId, itemId, slot | item |
| `move_character` | 移动角色 | characterId, position | map |
| `interact` | 交互 | characterId, targetId, action | scenario |
| `start_combat` | 开始战斗 | participantIds | combat |
| `end_turn` | 结束回合 | characterId | combat |
| `load_map` | 加载地图 | mapId | map |
| `short_rest` | 短休息 | characterIds | character |
| `long_rest` | 长休息 | characterIds | character |
| `save_game` | 保存游戏 | saveName | persistence |
| `load_game` | 加载游戏 | saveId | persistence |

---

## 6. 设计原则和规范

### 6.1 Go 语言规范

1. **命名规范**
   - 包名：小写单词，不使用下划线
   - 导出函数：大写字母开头
   - 私有函数：小写字母开头
   - 接口：动词或名词 + er 后缀（如 `Roller`, `Provider`）

2. **错误处理**
   - 使用自定义错误类型
   - 错误信息包含上下文
   - 使用 `errors.Is` 和 `errors.As` 进行错误判断

3. **并发安全**
   - 共享状态使用互斥锁保护
   - 优先使用 channel 进行协程通信
   - 避免全局变量

### 6.2 模块设计原则

1. **单一职责**：每个模块只负责一个明确的功能领域
2. **依赖注入**：通过构造函数注入依赖，便于测试
3. **接口隔离**：定义最小化接口，避免大而全的接口
4. **错误隔离**：模块错误不影响其他模块，有明确的错误边界

### 6.3 代码组织规范

```go
// 标准文件头部注释
// Package character provides D&D 5e character management functionality.
// It handles character creation, progression, and stat calculations.
package character

// 导入顺序：标准库 → 第三方库 → 内部包
import (
    "context"
    "errors"
    "fmt"

    "github.com/gin-gonic/gin"

    "dnd-game/internal/shared/models"
)
```

---

## 7. 模块设计文档索引

| 文档 | 说明 |
|------|------|
| [API 模块](./api.md) | HTTP/WebSocket 接口设计 |
| [Client 模块](./client.md) | LLM 会话管理、上下文构建、适配器设计 |
| [角色系统](./character.md) | 角色创建、属性、升级、状态管理 |
| [战斗系统](./combat.md) | 先攻、回合、攻击、伤害计算 |
| [法术系统](./spell.md) | 法术位、施法、专注管理 |
| [物品系统](./item.md) | 背包、装备、物品使用 |
| [地图系统](./map.md) | 地图加载、位置、碰撞 |
| [剧本系统](./scenario.md) | 剧本加载、章节、事件 |
| [检定系统](./dice.md) | 掷骰、属性检定、豁免 |
| [持久化模块](./persistence.md) | 数据存储、缓存、存档 |

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：模块设计师
