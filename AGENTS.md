# AGENTS.md - D&D 游戏项目开发指南

> 本项目的 AI Agent 开发指南。

---

<!-- TRELLIS:START -->
# Trellis 指令

这些指令是给在此项目中工作的 AI 助手使用的。

在开始新会话时使用 `/trellis:start` 命令：
- 初始化开发者身份
- 了解当前项目上下文
- 阅读相关指南

使用 `@/.trellis/` 了解：
- 开发工作流 (`workflow.md`)
- 项目结构指南 (`spec/`)
- 开发者工作区 (`workspace/`)

保留此管理块，以便 'trellis update' 可以刷新指令。

<!-- TRELLIS:END -->

---

## 工作语言

所有工作沟通、文档编写、代码注释均应使用**中文**。

---

## 1. 项目概述

### 1.1 这是什么项目？

一个 **D&D 5e（龙与地下城第5版）单人游戏**，包含：
- **AI 地下城主**：基于 LLM 的 DM，负责叙事和游戏管理
- **完整 D&D 5e 规则**：角色创建、战斗、法术、物品、技能
- **Web 界面**：React 前端 + Phaser 游戏引擎，支持战术战斗

### 1.2 核心功能

| 功能 | 描述 |
|------|------|
| **角色系统** | 完整的角色创建，包含种族、职业、背景、属性 |
| **战斗系统** | 回合制战术战斗，包含先攻、动作、反应 |
| **法术系统** | 完整的法术施放，包含法术位、专注 |
| **物品系统** | 背包、装备、消耗品 |
| **地图系统** | 场景地图（战斗/探索）、世界地图（旅行） |
| **剧本系统** | 预设冒险剧本（首推《凡代尔矿坑的失落之矿》） |
| **DM 叙事** | 基于 LLM 的叙事，通过工具调用执行游戏机制 |

### 1.3 目标用户

- 单人游戏，本地部署
- 想要单人游玩的 D&D 爱好者
- 注重故事体验和战术战斗

---

## 2. 技术栈

### 2.1 后端 (Go)

| 组件 | 技术 | 用途 |
|------|------|------|
| **Web 框架** | Gin | HTTP 服务器、路由 |
| **WebSocket** | Gorilla WebSocket | 实时双向通信 |
| **配置管理** | Viper | 配置文件管理 |
| **日志** | Zap/Zerolog | 结构化日志 |
| **状态存储** | 内存 + JSONL | 运行时状态 + 持久化 |
| **LLM 客户端** | 自研适配器 | OpenAI / Anthropic API 集成 |

### 2.2 前端 (React + Phaser)

| 组件 | 技术 | 用途 |
|------|------|------|
| **UI 框架** | React 18 + TypeScript | 组件化 UI |
| **游戏引擎** | Phaser 3 | 2D 游戏渲染、场景管理 |
| **状态管理** | Zustand | 轻量级全局状态 |
| **样式方案** | Tailwind CSS | 实用优先的样式 |
| **构建工具** | Vite | 快速开发和构建 |

### 2.3 通信协议

| 协议 | 用途 |
|------|------|
| **WebSocket** | 实时游戏更新、DM 叙事流式传输 |
| **REST API** | 会话管理、存档/读档操作 |
| **MCP 格式** | Client 与 Server 模块间的内部工具调用 |

---

## 3. 系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户层                                  │
│              [Web 前端: React + Phaser]                      │
└─────────────────────────────────────────────────────────────┘
                            │ WebSocket (JSON)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    游戏后端 (Go)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     API 层                             │  │
│  │   [WebSocket Hub]    [REST API]    [静态文件]         │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Client 模块 (AI Agent)                │  │
│  │   [会话管理]  [上下文管理]  [LLM 适配器]              │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │ MCP 工具调用                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Server 模块 (D&D 引擎)                │  │
│  │   [角色] [战斗] [法术] [物品] [地图] [检定]           │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    共享数据层                          │  │
│  │   [游戏状态]  [会话数据]  [持久化]                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
                   [LLM API: OpenAI/Anthropic]
```

### 3.2 模块职责

#### Client 模块 (AI Agent)
- LLM 会话管理
- 上下文构建和压缩
- 工具调用处理
- 流式响应处理

#### Server 模块 (D&D 引擎)
- 角色创建和管理
- 战斗先攻、回合、动作
- 法术施放和专注
- 背包和装备
- 地图加载和定位
- 掷骰和检定

### 3.3 数据流

```
用户输入 → 前端 → WebSocket → Client 模块 → LLM API
                                              ↓
                                          工具调用
                                              ↓
                                        Server 模块
                                              ↓
                                          状态更新
                                              ↓
前端 ← WebSocket ← 状态推送 ← 共享状态
```

---

## 4. 目录结构

### 4.1 Monorepo 项目根目录

```
dnd/
├── apps/                         # 应用目录
│   ├── server/                   # Go 后端服务
│   │   ├── cmd/server/           # 主入口
│   │   ├── internal/
│   │   │   ├── api/              # API 层 (WebSocket, REST)
│   │   │   ├── client/           # Client 模块 (AI Agent)
│   │   │   │   ├── llm/          # LLM 适配器
│   │   │   │   ├── context/      # 上下文管理
│   │   │   │   └── session/      # 会话管理
│   │   │   ├── server/           # Server 模块 (D&D 引擎)
│   │   │   │   ├── character/    # 角色系统
│   │   │   │   ├── combat/       # 战斗系统
│   │   │   │   ├── spell/        # 法术系统
│   │   │   │   ├── item/         # 物品系统
│   │   │   │   ├── map/          # 地图系统
│   │   │   │   ├── scenario/     # 剧本系统
│   │   │   │   └── dice/         # 检定系统
│   │   │   ├── shared/           # 共享数据
│   │   │   │   ├── state/        # 游戏状态
│   │   │   │   └── models/       # 数据模型
│   │   │   └── persistence/      # 持久化层
│   │   ├── pkg/                  # 公共包
│   │   ├── configs/              # 配置文件
│   │   └── data/                 # 数据文件
│   │
│   └── web/                      # React + Phaser 前端
│       ├── src/
│       │   ├── components/       # React 组件
│       │   │   ├── ui/           # 通用 UI 组件
│       │   │   ├── panels/       # 游戏面板
│       │   │   ├── dialogs/      # 对话框组件
│       │   │   └── chat/         # 聊天界面
│       │   ├── game/             # Phaser 游戏模块
│       │   │   ├── scenes/       # 游戏场景
│       │   │   ├── entities/     # 游戏实体
│       │   │   └── ui/           # Phaser UI 元素
│       │   ├── stores/           # Zustand 状态
│       │   ├── services/         # API 服务
│       │   ├── hooks/            # 自定义 Hooks
│       │   ├── types/            # TypeScript 类型
│       │   └── utils/            # 工具函数
│       └── public/               # 静态资源
│
├── packages/                     # 共享包目录
│   ├── shared/                   # 跨项目共享代码
│   │   ├── types/                # 共享类型定义
│   │   └── utils/                # 共享工具函数
│   └── data/                     # 游戏数据
│       ├── spells/               # 法术数据
│       ├── items/                # 物品数据
│       ├── monsters/             # 怪物数据
│       └── scenarios/            # 剧本数据
│
├── configs/                      # 项目级配置
│   ├── turbo.json                # Turborepo 配置
│   └── package.json             # 根 package.json
│
├── wiki/                         # 设计文档
│   └── design/                   # 详细设计文档
│
├── .trellis/                     # Trellis 工作流系统
│   ├── spec/                     # 开发指南
│   ├── tasks/                    # 任务跟踪
│   └── workspace/                # 开发者工作区
│
└── AGENTS.md                     # 本文件
```

### 4.2 设计文档

设计文档位于 `wiki/design/`：

| 文档 | 描述 |
|------|------|
| `architecture.md` | 系统架构设计 |
| `tech-roadmap.md` | 技术决策和实现阶段 |
| `interfaces.md` | API 和接口定义 |
| `shared-types.md` | 共享数据类型定义 |
| `modules/backend/` | 后端模块设计 |
| `modules/frontend/` | 前端模块设计 |

---

## 5. 开发指南

### 5.1 开始之前

**编码前必须阅读：**

1. 架构文档：`wiki/design/architecture.md`
2. 技术路线：`wiki/design/tech-roadmap.md`
3. Trellis 指南：`.trellis/spec/frontend/index.md` 或 `.trellis/spec/backend/index.md`

### 5.2 后端开发指南 (Go)

#### 代码组织
```
backend/internal/
├── api/           # API 层 - 处理 HTTP/WebSocket
├── client/        # Client 模块 - LLM 交互
├── server/        # Server 模块 - 游戏规则
├── shared/        # 共享数据和模型
└── persistence/   # 数据持久化
```

#### 关键模式

| 模式 | 描述 |
|------|------|
| **接口抽象** | LLM 提供商使用接口 |
| **依赖注入** | 传递依赖，不在内部创建 |
| **错误包装** | 使用 `fmt.Errorf("operation: %w", err)` |
| **上下文传递** | 始终传递 context 以支持取消 |
| **并发安全** | 共享状态使用 `sync.RWMutex` |

#### 并发规则

```go
// 规则 1：读多写少用 RWMutex
func (sm *StateManager) GetState() *GameState {
    sm.mu.RLock()
    defer sm.mu.RUnlock()
    return sm.gameState.Clone()
}

// 规则 2：写操作必须 Lock
func (sm *StateManager) UpdateState(fn func(*GameState)) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    fn(sm.gameState)
    sm.notifySubscribers()
}

// 规则 3：禁止同时持有多个锁
// 规则 4：禁止在锁内执行 I/O
```

#### 禁止的模式

```go
// ❌ 禁止：在库代码中 panic
func CreateCharacter() {
    panic("not implemented")  // 错误
}

// ❌ 禁止：忽略错误
data, _ := json.Marshal(x)  // 错误

// ❌ 禁止：直接使用全局状态
var globalState *GameState  // 错误 - 使用 StateManager

// ✅ 正确：返回错误
func CreateCharacter() (*Character, error) {
    return nil, errors.New("not implemented")
}

// ✅ 正确：处理错误
data, err := json.Marshal(x)
if err != nil {
    return fmt.Errorf("marshal failed: %w", err)
}
```

### 5.3 前端开发指南 (React + TypeScript)

#### 组件结构

```typescript
// 组件文件结构
components/
├── CharacterPanel/
│   ├── index.tsx           # 主组件导出
│   ├── CharacterPanel.tsx  # 实现
│   ├── types.ts            # 局部类型
│   └── useCharacterPanel.ts  # 局部 Hook
```

#### 状态管理

| 状态类型 | 解决方案 |
|----------|----------|
| **局部 UI 状态** | `useState` |
| **组件状态** | 自定义 Hooks |
| **全局游戏状态** | Zustand store |
| **服务器状态** | 后端通过 WebSocket |

#### WebSocket 通信

```typescript
// 消息类型
type ClientMessage = {
  type: 'user_input' | 'combat_action' | 'map_action' | 'management';
  payload: unknown;
  requestId?: string;
};

type ServerMessage = {
  type: 'state_update' | 'narration' | 'combat_event' | 'dice_result' | 'error';
  payload: unknown;
  requestId?: string;
  timestamp: number;
};
```

#### 禁止的模式

```typescript
// ❌ 禁止：使用 any
const data: any = fetchData();  // 错误

// ❌ 禁止：直接修改状态
state.characters.push(newChar);  // 错误

// ❌ 禁止：在组件体中获取数据
const [data] = useState(fetchData());  // 错误

// ✅ 正确：使用正确类型
const data: Character[] = await fetchData();

// ✅ 正确：创建新状态
setState(prev => [...prev, newChar]);

// ✅ 正确：使用 useEffect 或自定义 Hooks
useEffect(() => {
  fetchData().then(setData);
}, []);
```

---

## 6. WebSocket 协议

### 6.1 客户端 → 服务端消息

| 类型 | 载荷 | 描述 |
|------|------|------|
| `user_input` | `{ text: string }` | 自然语言输入 |
| `combat_action` | `{ action, targetId?, spellId?, itemId? }` | 战斗动作 |
| `map_action` | `{ action, position, target? }` | 地图交互 |
| `management` | `{ operation, params }` | 存档/读档/设置 |

### 6.2 服务端 → 客户端消息

| 类型 | 载荷 | 描述 |
|------|------|------|
| `state_update` | `{ stateType, data, diff? }` | 状态变更 |
| `narration` | `{ text, isStreaming }` | DM 叙事 |
| `combat_event` | `{ eventType, sourceId, targetId, result }` | 战斗事件 |
| `dice_result` | `{ rollType, formula, result, total }` | 掷骰结果 |
| `error` | `{ code, message, recoverable }` | 错误消息 |

---

## 7. MCP 工具调用

### 7.1 工具定义格式

```go
type ToolDefinition struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"inputSchema"`
}
```

### 7.2 核心工具

| 工具 | 用途 | 关键参数 |
|------|------|----------|
| `roll_dice` | 掷骰检定 | formula, modifier |
| `create_character` | 创建角色 | name, race, class, stats |
| `get_character` | 获取角色信息 | characterId |
| `attack` | 战斗攻击 | attackerId, targetId, weapon |
| `cast_spell` | 施放法术 | casterId, spellId, targetId |
| `use_item` | 使用物品 | characterId, itemId |
| `start_combat` | 开始战斗 | participantIds |
| `end_turn` | 结束回合 | characterId |
| `load_map` | 加载场景 | mapId |
| `save_game` | 创建存档 | saveName |
| `load_game` | 加载存档 | saveId |

---

## 8. D&D 5e 规则实现

### 8.1 v1 实现范围

| 系统 | 覆盖范围 |
|------|----------|
| 角色 | 完整（种族、职业、背景、属性、技能） |
| 战斗 | 完整（v1 不含惊奇轮） |
| 法术 | 完整（含专注规则） |
| 物品 | 完整 |
| 检定 | 完整 |
| 休息 | 完整 |
| 专长 | 完整 |
| 背景特性 | 完整 |

### 8.2 v1 不实现

| 系统 | 说明 |
|------|------|
| 多职业 | 后续版本 |
| 惊奇轮 | 后续版本 |
| 光照对战斗影响 | 后续版本 |

### 8.3 关键规则决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 队伍控制 | 轮流控制模式 | 每个角色有独立先攻 |
| 战斗触发 | 混合模式 | 剧本触发器 + LLM 判断 |
| 角色死亡 | 允许复活 | 按 D&D 5e 规则 |
| 惊奇轮 | v1 不实现 | 简化初始实现 |

---

## 9. 质量标准

### 9.1 性能指标

| 指标 | 目标 |
|------|------|
| WebSocket 延迟 | < 50ms（本地） |
| 状态更新推送 | < 100ms |
| 地图加载时间 | < 2s |
| 存档/读档时间 | < 3s |

### 9.2 可靠性指标

| 指标 | 目标 |
|------|------|
| WebSocket 重连成功率 | > 99% |
| 状态持久化 | 100%（无数据丢失） |
| LLM 重试成功率 | > 95%（3 次重试内） |

### 9.3 代码质量

| 指标 | 目标 |
|------|------|
| 测试覆盖率（核心模块） | > 70% |
| 接口文档覆盖率 | 100% |
| Lint 错误 | 0 |

---

## 10. 开发工作流

### 10.1 会话开始

```bash
# 获取上下文
python ./.trellis/scripts/get_context.py

# 阅读相关指南
cat .trellis/spec/frontend/index.md  # 前端工作
cat .trellis/spec/backend/index.md   # 后端工作
```

### 10.2 任务开发

1. 创建/选择任务
2. 按指南编写代码
3. 运行 lint 和测试
4. 提交（用户提交，非 AI）
5. 记录会话

### 10.3 提交前检查

运行 `/trellis:finish-work` 验证：
- [ ] 所有代码已提交
- [ ] Lint 通过
- [ ] 测试通过
- [ ] 工作目录干净

---

## 11. 关键文件快速参考

| 文件 | 用途 |
|------|------|
| `wiki/design/architecture.md` | 系统架构 |
| `wiki/design/tech-roadmap.md` | 技术决策 |
| `wiki/design/interfaces.md` | API 接口 |
| `.trellis/spec/backend/` | 后端指南 |
| `.trellis/spec/frontend/` | 前端指南 |
| `.trellis/workflow.md` | 开发工作流 |

---

## 12. 联系与资源

- **D&D 5e SRD**: https://www.dndbeyond.com/resources/1781-systems-reference-document
- **Phaser 3 文档**: https://photonstorm.github.io/phaser3-docs/
- **Gin 文档**: https://gin-gonic.com/docs/
- **OpenAI API**: https://platform.openai.com/docs
- **Anthropic API**: https://docs.anthropic.com/

---

**文档版本**：v1.0
**最后更新**：2026-03-17
