# 接口设计文档

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **基于**: 架构文档 v1.0 + 各模块设计文档 v1.0

---

## 1. 文档概述

### 1.1 文档目的

本文档定义了 D&D 游戏系统的完整接口规范，包括：
- WebSocket 消息协议（客户端 ↔ 服务端）
- REST API 接口定义
- MCP 工具接口定义（内部模块间通信）
- 核心数据结构（前后端共享）
- 前后端共享类型定义

### 1.2 适用范围

| 接口类型 | 使用方 | 说明 |
|----------|--------|------|
| WebSocket | 前端 ↔ 后端 | 实时双向通信 |
| REST API | 前端 ↔ 后端 | 管理和查询接口 |
| MCP | 后端内部 | Client 模块 ↔ Server 模块 |
| 数据结构 | 前端 + 后端 | 共享数据模型定义 |

### 1.3 设计原则

- **类型安全**：所有接口都有完整的类型定义
- **版本兼容**：通过版本号管理接口变更
- **错误处理**：统一的错误码和错误响应格式
- **幂等性**：关键操作支持幂等调用
- **可扩展**：预留扩展字段，支持未来功能扩展

### 1.4 命名规范（重要）

**本文档是接口字段的唯一真实来源，所有字段统一使用 camelCase。**

#### 1.4.1 字段命名规范

| 位置 | 命名风格 | 示例 |
|------|----------|------|
| JSON 字段（网络传输） | camelCase | `sessionId`, `characterId`, `createdAt` |
| TypeScript 类型 | camelCase | `sessionId: string` |
| Go 结构体字段 | PascalCase + JSON tag | `SessionID string \`json:"sessionId"\`` |

#### 1.4.2 Go 后端实现规范

```go
// 正确示例：使用 JSON tag 明确指定 camelCase
type Session struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

// 错误示例：未指定 JSON tag，会使用 PascalCase
type Session struct {
    ID        string    // ❌ 序列化为 "ID"
    CreatedAt time.Time // ❌ 序列化为 "CreatedAt"
}
```

#### 1.4.3 常见字段对照表

| 字段用途 | JSON 字段名 | Go 字段名 |
|----------|-------------|-----------|
| 唯一标识 | `id` | `ID string \`json:"id"\`` |
| 会话 ID | `sessionId` | `SessionID string \`json:"sessionId"\`` |
| 角色 ID | `characterId` | `CharacterID string \`json:"characterId"\`` |
| 创建时间 | `createdAt` | `CreatedAt time.Time \`json:"createdAt"\`` |
| 更新时间 | `updatedAt` | `UpdatedAt time.Time \`json:"updatedAt"\`` |
| 是否完成 | `isComplete` | `IsComplete bool \`json:"isComplete"\`` |
| 是否流式 | `isStreaming` | `IsStreaming bool \`json:"isStreaming"\`` |

#### 1.4.4 已知不一致项（待修复）

| 位置 | 问题 | 修复方案 |
|------|------|----------|
| 后端 NarrationPayload | `isDone` vs `isComplete` | 统一为 `isComplete` |
| 后端 GameTime | `day/hour/minute` vs `days/hours/minutes` | 统一为复数形式 |
| 后端 Position | `X/Y` vs `x/y` | 使用 JSON tag 指定小写 |

---

## 2. WebSocket 消息协议

### 2.1 消息格式

#### 2.1.1 基础消息结构

```typescript
// 通用消息格式
interface BaseMessage {
  id?: string;           // 消息唯一标识
  timestamp?: number;    // 时间戳（服务端消息必填）
  requestId?: string;    // 请求-响应匹配 ID
  version?: string;      // 协议版本
}
```

#### 2.1.2 客户端消息

```typescript
// 客户端 -> 服务端
interface ClientMessage extends BaseMessage {
  type: ClientMessageType;
  payload: ClientMessagePayload;
}

type ClientMessageType =
  | 'user_input'        // 用户自然语言输入
  | 'map_action'        // 地图操作
  | 'combat_action'     // 战斗行动
  | 'subscribe'         // 订阅事件
  | 'management'        // 管理操作
  | 'ping';             // 心跳检测

type ClientMessagePayload =
  | UserInputPayload
  | MapActionPayload
  | CombatActionPayload
  | SubscribePayload
  | ManagementPayload
  | PingPayload;
```

#### 2.1.3 服务端消息

```typescript
// 服务端 -> 客户端
interface ServerMessage extends BaseMessage {
  type: ServerMessageType;
  payload: ServerMessagePayload;
  timestamp: number;    // 服务器时间戳（毫秒）
}

type ServerMessageType =
  | 'state_update'      // 状态更新
  | 'narration'         // DM 叙述
  | 'combat_event'      // 战斗事件
  | 'dice_result'       // 检定结果
  | 'error'             // 错误信息
  | 'pong'              // 心跳响应
  | 'stream_chunk';     // 流式数据块

type ServerMessagePayload =
  | StateUpdatePayload
  | NarrationPayload
  | CombatEventPayload
  | DiceResultPayload
  | ErrorPayload
  | PongPayload
  | StreamChunkPayload;
```

---

### 2.2 客户端消息类型定义

#### 2.2.1 用户输入

```typescript
// user_input
interface UserInputPayload {
  text: string;                    // 用户输入的文本
  context?: {
    mapId?: string;                 // 当前地图 ID
    sceneId?: string;               // 当前场景 ID
    combatId?: string;              // 当前战斗 ID（战斗中）
  };
}
```

#### 2.2.2 地图操作

```typescript
// map_action
interface MapActionPayload {
  action: MapActionType;
  position?: Position;              // 目标位置
  targetId?: string;                // 目标对象/角色 ID
  path?: Position[];                // 移动路径
}

type MapActionType =
  | 'move'              // 移动到指定位置
  | 'interact'          // 与对象交互
  | 'examine'           // 检查对象
  | 'select'            // 选择角色/对象
  | 'enter_area'        // 进入区域
  | 'exit';             // 离开区域
```

#### 2.2.3 战斗行动

```typescript
// combat_action
interface CombatActionPayload {
  actionType: CombatActionType;
  unitId: string;                  // 行动单位 ID
  targetId?: string;               // 目标 ID
  spellId?: string;                // 法术 ID
  itemId?: string;                 // 物品 ID
  position?: Position;             // 目标位置（用于范围法术等）
  advantage?: AdvantageType;       // 优势/劣势
}

type CombatActionType =
  | 'attack'            // 攻击
  | 'spell'             // 施法
  | 'item'              // 使用物品
  | 'move'              // 移动
  | 'dodge'             // 闪避动作
  | 'dash'              // 冲刺动作
  | 'disengage'         // 撤离动作
  | 'help'              // 协助动作
  | 'hide'              // 躲藏
  | 'search'            // 搜索
  | 'ready'             // 预备动作
  | 'end_turn';         // 结束回合

// AdvantageType 定义见 shared-types.md §4.2
```

> **类型引用**：`AdvantageType` 定义在 `shared-types.md §4.2`，使用时从共享类型导入。

#### 2.2.4 订阅事件

```typescript
// subscribe
interface SubscribePayload {
  events: ServerMessageType[];     // 要订阅的事件类型
  unsubscribe?: boolean;           // 是否取消订阅
}
```

#### 2.2.5 管理操作

```typescript
// management
interface ManagementPayload {
  operation: ManagementOperation;
  params: Record<string, unknown>;
}

type ManagementOperation =
  | 'save'              // 保存游戏
  | 'load'              // 加载存档
  | 'delete_save'       // 删除存档
  | 'export'            // 导出数据
  | 'import'            // 导入数据
  | 'settings'          // 更改设置
  | 'restart';          // 重新开始
```

#### 2.2.6 心跳

```typescript
// ping
interface PingPayload {
  // 空负载，用于连接保活
}
```

---

### 2.3 服务端消息类型定义

#### 2.3.1 状态更新

```typescript
// state_update
interface StateUpdatePayload {
  stateType: StateType;
  data: unknown;                    // 完整状态数据（全量更新时）
  diff?: StateDiff;                 // 增量更新（可选）
}

// 状态类型（统一定义，所有状态类型的集合）
type StateType =
  | 'game'        // 游戏全局状态
  | 'party'       // 队伍状态
  | 'combat'      // 战斗状态
  | 'character'   // 角色状态
  | 'inventory'   // 背包状态
  | 'scenario'    // 剧本进度
  | 'map'         // 地图状态
  | 'dialogue';   // 对话状态

// 增量更新格式（基于 JSON Patch 简化版）
interface StateDiff {
  operations: DiffOperation[];
  version: number;                  // 状态版本号，用于乐观锁
}

// 差异操作类型
type DiffOperation =
  | { op: 'replace'; path: string; value: unknown }    // 替换值
  | { op: 'add'; path: string; value: unknown }        // 添加/插入
  | { op: 'remove'; path: string }                      // 删除
  | { op: 'increment'; path: string; delta: number };  // 数值增量

// 示例：角色受到伤害
// 全量更新
{
  stateType: 'party',
  data: {
    members: [
      { id: 'char-1', name: '战士', currentHP: 20, maxHP: 30, ... },
      // ... 其他成员
    ]
  }
}

// 增量更新（推荐）
{
  stateType: 'party',
  diff: {
    version: 42,
    operations: [
      { op: 'replace', path: '/members/0/currentHP', value: 20 },
      { op: 'increment', path: '/members/0/damageTaken', delta: 8 }
    ]
  }
}
```

**增量更新路径规范**：
- 路径使用 JSON Pointer 格式：`/members/0/currentHP`
- 数组索引用数字表示：`/combatants/2/position/x`
- 根路径为空字符串时表示整个对象

// StateType 已在上方统一定义（第 285-294 行），此处保留引用以便快速查找
// type StateType = 'game' | 'party' | 'combat' | 'character' | 'inventory' | 'scenario' | 'map' | 'dialogue'
```

#### 2.3.2 DM 叙述

```typescript
// narration
interface NarrationPayload {
  text: string;                    // 叙述文本
  isStreaming: boolean;            // 是否流式传输中
  isComplete: boolean;             // 是否完成
  chunkIndex?: number;             // 块索引（流式时）
  totalChunks?: number;            // 总块数（流式时）
}
```

#### 2.3.3 战斗事件

```typescript
// combat_event
interface CombatEventPayload {
  eventType: CombatEventType;
  combatId: string;
  sourceId: string;
  targetId?: string;
  result?: CombatEventResult;
  timestamp: number;
}

type CombatEventType =
  | 'initiative_rolled'  // 先攻掷骰
  | 'turn_start'        // 回合开始
  | 'turn_end'          // 回合结束
  | 'attack'            // 攻击
  | 'damage'            // 伤害
  | 'heal'              // 治疗
  | 'death'             // 死亡
  | 'unconscious'       // 昏迷
  | 'condition_applied' // 状态施加
  | 'condition_removed' // 状态移除
  | 'round_end'         // 回合结束
  | 'combat_end';       // 战斗结束

interface CombatEventResult {
  hit?: boolean;                   // 是否命中
  critical?: boolean;              // 是否暴击
  damage?: number;                 // 伤害值
  damageType?: DamageType;         // 伤害类型
  healing?: number;                // 治疗值
  condition?: Condition;           // 状态效果
}
```

#### 2.3.4 检定结果

```typescript
// dice_result
interface DiceResultPayload {
  rollType: DiceRollType;
  formula: string;                 // 骰子公式
  rolls: number[];                 // 各次掷骰结果
  modifier: number;                // 修正值
  total: number;                   // 总结果
  success?: boolean;               // 是否成功（对比 DC 时）
  criticalSuccess?: boolean;       // 大成功
  criticalFailure?: boolean;       // 大失败
}

// DiceRollType 定义见 shared-types.md §4.1
```

> **类型引用**：`DiceRollType` 定义在 `shared-types.md §4.1`，使用时从共享类型导入。

#### 2.3.5 错误信息

```typescript
// error
interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
  recoverable: boolean;            // 是否可恢复
}

type ErrorCode =
  | 'INVALID_MESSAGE'    // 无效消息
  | 'UNAUTHORIZED'       // 未授权
  | 'SESSION_NOT_FOUND'  // 会话不存在
  | 'INVALID_ACTION'     // 无效操作
  | 'INTERNAL_ERROR'     // 内部错误
  | 'LLM_ERROR'          // LLM 错误
  | 'COMBAT_NOT_ACTIVE'  // 战斗未激活
  | 'OUT_OF_RANGE'       // 超出范围
  | 'INSUFFICIENT_RESOURCES'; // 资源不足
```

#### 2.3.6 心跳响应

```typescript
// pong
interface PongPayload {
  serverTime: number;              // 服务器时间戳
}
```

#### 2.3.7 流式数据块

```typescript
// stream_chunk
interface StreamChunkPayload {
  chunkId: string;                 // 数据块 ID（用于组装）
  sequence: number;                // 序列号
  isLast: boolean;                 // 是否最后一个块
  data: unknown;                   // 数据块内容
}
```

---

### 2.4 消息流程示例

#### 2.4.1 用户输入流程

```
客户端                              服务端
  │                                   │
  │─── user_input ──────────────────▶ │
  │    { text: "我向前走" }            │
  │                                   │
  │                                   │  处理输入
  │                                   │  ↓
  │◀─── narration (流式) ─────────────│
  │    { text: "你沿着小路向前走..." }  │
  │                                   │
  │◀─── state_update ─────────────────│
  │    { stateType: "map", ... }       │
  │                                   │
```

#### 2.4.2 战斗行动流程

```
客户端                              服务端
  │                                   │
  │─── combat_action ────────────────▶│
  │    { actionType: "attack",         │
  │      unitId: "hero1",              │
  │      targetId: "goblin1" }         │
  │                                   │
  │                                   │  执行攻击
  │                                   │  ↓
  │◀─── dice_result ──────────────────│
  │    { rollType: "attack",           │
  │      total: 18, ... }              │
  │                                   │
  │◀─── combat_event ─────────────────│
  │    { eventType: "damage",          │
  │      damage: 8, ... }              │
  │                                   │
  │◀─── state_update ─────────────────│
  │    { stateType: "combat", ... }    │
  │                                   │
```

---

## 3. REST API 接口

### 3.1 通用响应格式

```typescript
// 成功响应
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: number;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}
```

### 3.2 会话管理 API

#### 3.2.1 获取会话列表

```
GET /api/sessions

Response:
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_abc123",
        "name": "冒险之旅",
        "scenarioId": "lost_mine",
        "scenarioName": "Lost Mine of Phandelver",
        "createdAt": 1642394892000,
        "updatedAt": 1642481292000,
        "playTime": 3600
      }
    ]
  }
}
```

#### 3.2.2 创建会话

```
POST /api/sessions

Request:
{
  "name": "新冒险",
  "scenarioId": "lost_mine"
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "session_def456"
  }
}
```

#### 3.2.3 获取会话详情

```
GET /api/sessions/:id

Response:
{
  "success": true,
  "data": {
    "session": { /* SessionSummary */ },
    "party": [ /* Character[] */ ],
    "gameTime": {
      "days": 5,
      "hours": 14,
      "minutes": 30
    }
  }
}
```

#### 3.2.4 删除会话

```
DELETE /api/sessions/:id

Response:
{
  "success": true,
  "data": null
}
```

### 3.3 存档管理 API

#### 3.3.1 获取存档列表

```
GET /api/saves?sessionId=xxx

Response:
{
  "success": true,
  "data": {
    "saves": [
      {
        "id": "save_001",
        "name": "第一章存档",
        "sessionId": "session_abc123",
        "sessionName": "冒险之旅",
        "createdAt": 1642481292000,
        "gameTime": { "days": 3, "hours": 12, "minutes": 0 },
        "playTime": 1800
      }
    ]
  }
}
```

#### 3.3.2 创建存档

```
POST /api/saves

Request:
{
  "sessionId": "session_abc123",
  "name": "战斗前存档"
}

Response:
{
  "success": true,
  "data": {
    "saveId": "save_002"
  }
}
```

#### 3.3.3 加载存档

```
POST /api/saves/:id/load

Response:
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "restored": true
  }
}
```

#### 3.3.4 删除存档

```
DELETE /api/saves/:id

Response:
{
  "success": true,
  "data": null
}
```

### 3.4 剧本查询 API

#### 3.4.1 获取剧本列表

```
GET /api/scenarios

Response:
{
  "success": true,
  "data": {
    "scenarios": [
      {
        "id": "lost_mine",
        "name": "Lost Mine of Phandelver",
        "description": "A classic adventure for levels 1-5",
        "levelRange": [1, 5],
        "tags": ["入门", "地下城"]
      }
    ]
  }
}
```

#### 3.4.2 获取剧本详情

```
GET /api/scenarios/:id

Response:
{
  "success": true,
  "data": { /* ScenarioDetail */ }
}
```

### 3.5 配置查询 API

#### 3.5.1 获取配置

```
GET /api/config

Response:
{
  "success": true,
  "data": {
    "llmProviders": ["openai", "anthropic"],
    "version": "1.0.0",
    "features": {
      "multiplayer": false,
      "mobile": false
    }
  }
}
```

#### 3.5.2 健康检查

```
GET /api/health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600
  }
}
```

---

## 4. MCP 工具接口

### 4.1 工具定义格式

```go
// 工具定义
type ToolDefinition struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"inputSchema"` // JSON Schema
}

// 工具调用请求
type ToolCall struct {
    Name      string                 `json:"name"`
    Arguments map[string]interface{} `json:"arguments"`
}

// 工具执行结果
type ToolResult struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}
```

### 4.2 核心工具列表

#### 4.2.1 掷骰工具

```typescript
interface RollDiceTool {
  name: "roll_dice";
  description: "掷骰子进行检定或伤害计算";
  input: {
    formula: string;              // 骰子公式，如 "1d20+5", "2d6+3"
    type?: DiceRollType;          // 掷骰类型
    advantage?: AdvantageType;    // 优势/劣势
  };
  output: {
    rolls: number[];              // 各次结果
    modifier: number;             // 修正值
    total: number;                // 总结果
    criticalSuccess?: boolean;    // 大成功（自然 20）
    criticalFailure?: boolean;    // 大失败（自然 1）
  };
}
```

#### 4.2.2 角色工具

```typescript
// 创建角色
interface CreateCharacterTool {
  name: "create_character";
  description: "创建新的角色";
  input: {
    name: string;
    raceId: string;
    classId: string;
    backgroundId?: string;
    abilityScores: AbilityScores;
    skillChoices?: Skill[];
  };
  output: {
    characterId: string;
    character: Character;
  };
}

// 获取角色信息
interface GetCharacterTool {
  name: "get_character";
  description: "获取角色详细信息";
  input: {
    characterId: string;
  };
  output: {
    character: Character;
  };
}

// 移动角色
interface MoveCharacterTool {
  name: "move_character";
  description: "移动角色到指定位置";
  input: {
    characterId: string;
    position: Position;
    checkCombat?: boolean;         // 是否检查战斗移动规则
  };
  output: {
    success: boolean;
    path?: Position[];             // 实际移动路径
    movementCost?: number;         // 移动消耗
  };
}
```

#### 4.2.3 战斗工具

```typescript
// 开始战斗
interface StartCombatTool {
  name: "start_combat";
  description: "初始化战斗并掷先攻";
  input: {
    mapId: string;
    participantIds: string[];      // 参战单位 ID 列表
    surpriseRound?: boolean;       // 是否突袭回合
  };
  output: {
    combatId: string;
    initiativeOrder: InitiativeEntry[];
    currentTurn: number;
  };
}

// 执行攻击
interface AttackTool {
  name: "attack";
  description: "执行攻击动作";
  input: {
    attackerId: string;
    targetId: string;
    weaponId?: string;             // 武器 ID（默认主手武器）
    advantage?: AdvantageType;
  };
  output: {
    success: boolean;
    hit: boolean;
    critical: boolean;
    damageRoll?: DiceResultPayload;
    damage?: number;
    damageType?: DamageType;
  };
}

// 结束回合
interface EndTurnTool {
  name: "end_turn";
  description: "结束当前单位的回合";
  input: {
    characterId: string;
  };
  output: {
    nextCharacterId?: string;
    round: number;
  };
}
```

#### 4.2.4 法术工具

```typescript
// 施放法术
interface CastSpellTool {
  name: "cast_spell";
  description: "施放法术";
  input: {
    casterId: string;
    spellId: string;
    level?: number;                // 升环施法等级
    targetId?: string;
    position?: Position;           // 范围法术中心
  };
  output: {
    success: boolean;
    spellLevel: number;
    slotConsumed: boolean;
    effects: AppliedEffect[];
    concentration: boolean;        // 是否需要专注
  };
}

// 获取可用法术
interface GetSpellsTool {
  name: "get_spells";
  description: "获取角色可用的法术列表";
  input: {
    characterId: string;
    filter?: {
      level?: number;              // 筛选等级
      school?: SpellSchool;        // 筛选学派
      available?: boolean;         // 仅显示当前可用
    };
  };
  output: {
    spells: Spell[];
    cantrips: Spell[];
    spellSlots: SpellSlots;
  };
}
```

#### 4.2.5 物品工具

```typescript
// 使用物品
interface UseItemTool {
  name: "use_item";
  description: "使用物品";
  input: {
    characterId: string;
    itemId: string;
    targetId?: string;
    position?: Position;
  };
  output: {
    success: boolean;
    consumed: boolean;
    effects: AppliedEffect[];
    message: string;
  };
}

// 获取背包
interface GetInventoryTool {
  name: "get_inventory";
  description: "获取角色背包内容";
  input: {
    characterId: string;
  };
  output: {
    items: InventoryItem[];
    gold: number;
    silver: number;
    copper: number;
    currentWeight: number;
    capacity: number;
  };
}
```

#### 4.2.6 地图工具

```typescript
// 加载地图
interface LoadMapTool {
  name: "load_map";
  description: "加载指定地图";
  input: {
    mapId: string;
    entranceId?: string;           // 入口 ID
  };
  output: {
    mapId: string;
    width: number;
    height: number;
    gridSize: number;
    entrances: Entrance[];
    exits: Exit[];
  };
}

// 获取可见区域
interface GetVisibleAreaTool {
  name: "get_visible_area";
  description: "获取角色可见区域";
  input: {
    characterId: string;
    range?: number;                // 可见距离（英尺）
  };
  output: {
    positions: Position[];
    characters: CharacterSummary[];
    objects: MapObject[];
  };
}
```

#### 4.2.7 管理工具

```typescript
// 保存游戏
interface SaveGameTool {
  name: "save_game";
  description: "保存当前游戏状态";
  input: {
    saveName: string;
    description?: string;
  };
  output: {
    saveId: string;
    savedAt: number;
  };
}

// 加载游戏
interface LoadGameTool {
  name: "load_game";
  description: "加载存档";
  input: {
    saveId: string;
  };
  output: {
    sessionId: string;
    loadedAt: number;
  };
}
```

### 4.3 工具调用流程

```
LLM                              Client 模块                    Server 模块
 │                                   │                                  │
 │─── 工具调用请求 ──────────────────▶│                                  │
 │    { tool: "attack",               │                                  │
 │      args: { attackerId: "h1" } }  │                                  │
 │                                   │                                  │
 │                                   │─── MCP 调用 ───────────────────▶│
 │                                   │    { tool: "attack",             │
 │                                   │      args: { ... } }             │
 │                                   │                                  │
 │                                   │                                  │ 执行攻击
 │                                   │                                  │ ↓
 │                                   │◀─── 返回结果 ───────────────────│
 │                                   │    { success: true,              │
 │                                   │      hit: true, damage: 8 }       │
 │                                   │                                  │
 │◀─── 工具返回 ─────────────────────│                                  │
 │    { result: { ... } }            │                                  │
 │                                   │                                  │
 │─── 继续对话（基于工具结果）        │                                  │
```

---

## 5. 核心数据结构

### 5.1 角色数据结构

#### 5.1.1 角色基础

```typescript
interface Character {
  // 基础信息
  id: string;
  name: string;
  playerOwned: boolean;             // 是否玩家角色
  avatar?: string;                  // 头像 URL

  // 种族和职业
  race: Race;
  class: Class;
  background?: Background;
  level: number;

  // 属性
  abilityScores: AbilityScores;
  abilityModifiers: AbilityModifiers;
  proficiencyBonus: number;

  // 生命值
  maxHP: number;
  currentHP: number;
  temporaryHP: number;
  hitDice: HitDice;

  // 死亡豁免
  deathSaves: DeathSaves;

  // 移动和体型
  speed: number;
  size: Size;

  // 技能和熟练
  skillProficiencies: Record<Skill, boolean>;
  savingThrowProficiencies: Record<Ability, boolean>;
  toolProficiencies: Record<string, boolean>;
  languages: string[];

  // 特性
  features: Feature[];
  feats: Feat[];

  // 法术
  spellSlots?: SpellSlots;
  spellsKnown?: string[];           // 已知法术 ID 列表
  spellsPrepared?: string[];        // 已准备法术 ID 列表
  concentration?: Concentration;

  // 装备
  equipment: Equipment;
  inventory?: Inventory;

  // 位置和状态
  position?: Position;
  conditions: Condition[];

  // 经验值
  experiencePoints: number;
}

interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface AbilityModifiers {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

type Ability = keyof AbilityScores;

interface HitDice {
  total: number;                    // 总数 = 等级
  current: number;                  // 剩余可用
  size: number;                     // 骰子大小 (6, 8, 10, 12)
}

interface DeathSaves {
  successes: number;                // 成功次数（3 次稳定）
  failures: number;                 // 失败次数（3 次死亡）
}

// Size 定义见 shared-types.md §3.4
```

> **类型引用**：`Size` 类型定义在 `shared-types.md §3.4`，此处不再重复定义。

#### 5.1.2 种族和职业

```typescript
interface Race {
  id: string;
  name: string;
  description: string;
  size: Size;
  speed: number;
  abilityBonus: AbilityScoreBonus;
  traits: RaceTrait[];
  languages: string[];
  subraces?: Subrace[];
}

interface AbilityScoreBonus {
  type: 'fixed' | 'choice';
  fixed?: Partial<AbilityScores>;
  choices?: AbilityChoice[];
}

interface AbilityChoice {
  ability: Ability;
  bonus: number;
}

interface RaceTrait {
  name: string;
  description: string;
  effect?: Effect;
}

interface Subrace {
  id: string;
  name: string;
  description: string;
  abilityBonus: AbilityScoreBonus;
  traits: RaceTrait[];
}

interface Class {
  id: string;
  name: string;
  description: string;
  hitDie: number;                    // HD 大小 (6, 8, 10, 12)
  primaryAbilities: Ability[];
  savingThrowProficiencies: Ability[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  skillChoices: {
    count: number;
    from: Skill[];
  };
  features: Record<number, ClassFeature[]>; // 等级 -> 特性列表
  spellcasting?: SpellcastingInfo;
}

interface ClassFeature {
  name: string;
  description: string;
  level: number;
  effect?: Effect;
}

interface SpellcastingInfo {
  ability: Ability;                 // 施法属性
  ritualCasting: boolean;
  spellbook: boolean;               // 是否有法术书
  spellsKnown: Record<number, number>; // 各等级已知法术数
  cantripsKnown: number;
  spellPreparation: boolean;        // 是否需要准备法术
}

interface Background {
  id: string;
  name: string;
  description: string;
  skillProficiencies: Skill[];
  toolProficiencies: string[];
  languages: number;                // 额外语言数量
  feature: BackgroundFeature;
  equipment: EquipmentItem[];
}

interface BackgroundFeature {
  name: string;
  description: string;
  effect?: Effect;
}
```

#### 5.1.3 技能

> **类型引用**：`Skill` 类型定义在 `shared-types.md §2.3`，此处不再重复定义。

---

### 5.2 战斗数据结构

```typescript
interface Combat {
  id: string;
  active: boolean;
  round: number;
  initiativeOrder: InitiativeEntry[];
  currentTurn: number;               // 当前行动单位索引
  combatants: Record<string, Combatant>;
  mapId: string;
  startedAt: number;
}

// 单位状态枚举
type UnitStatus =
  | 'active'        // 正常，可行动
  | 'delayed'       // 延迟行动
  | 'ready'         // 准备行动
  | 'dead'          // 已死亡
  | 'incapacitated'; // 失能

interface InitiativeEntry {
  combatantId: string;
  initiative: number;
  dexterity: number;  // 平局时比较
  status: UnitStatus;
}

interface Combatant {
  id: string;
  name: string;
  type: CombatantType;

  // 位置和移动
  position?: Position;
  speed: number;
  movementUsed: number;

  // 战斗属性
  maxHP: number;
  currentHP: number;
  temporaryHP: number;
  ac: number;

  // 行动资源
  action: ActionState;
  bonusAction: ActionState;
  reaction: ActionState;

  // 武器和攻击
  weapons: Weapon[];
  attacks: Attack[];

  // 状态效果
  conditions: Condition[];

  // 死亡豁免（玩家角色）
  deathSaves?: DeathSaves;

  // AI 相关
  threats?: Record<string, number>;  // 仇恨值
}

type CombatantType = 'player' | 'npc' | 'enemy';

type ActionState = 'available' | 'used';

interface Attack {
  name: string;
  attackBonus: number;
  damage: DamageRoll;
  damageType: DamageType;
  range: Range;
  properties: string[];
}

interface DamageRoll {
  baseDice: string;                 // 如 "1d8"
  bonus: number;                    // 固定加值
}

// DamageType 定义见 shared-types.md §3.1

interface Range {
  normal: number;
  long?: number;                    // 远程武器长距离
}
```

---

### 5.3 法术数据结构

```typescript
interface Spell {
  id: string;
  name: string;
  level: number;                    // 0-9，0 为戏法
  school: SpellSchool;
  castingTime: CastingTime;
  range: SpellRange;
  components: Components;
  duration: Duration;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevels?: string;
  effects: SpellEffect[];
  classes: string[];
}

type SpellSchool =
  | 'abjuration'        // 防护
  | 'conjuration'       // 咒法
  | 'divination'        // 预言
  | 'enchantment'       // 附魔
  | 'evocation'         // 塑能
  | 'illusion'          // 幻术
  | 'necromancy'        // 死灵
  | 'transmutation';    // 变化

interface CastingTime {
  type: 'action' | 'bonus_action' | 'reaction' | 'minute' | 'hour';
  value: number;
}

interface SpellRange {
  type: 'self' | 'touch' | 'feet' | 'sight' | 'unlimited';
  value?: number;
  shape?: Shape;
}

interface Shape {
  type: 'sphere' | 'cylinder' | 'cone' | 'line' | 'cube';
  size: number;
  height?: number;
}

interface Components {
  verbal: boolean;
  somatic: boolean;
  material?: Material;
}

interface Material {
  components: string[];
  cost?: number;
  consumed?: boolean;
}

interface Duration {
  type: 'instantaneous' | 'rounds' | 'minutes' | 'hours' | 'days' | 'until_dispelled' | 'special';
  value?: number;
  dismissable?: boolean;
}

interface SpellEffect {
  type: EffectType;
  target: TargetType;
  save?: Save;
  damage?: DamageEffect;
  heal?: HealEffect;
  buff?: BuffEffect;
  debuff?: DebuffEffect;
  summon?: SummonEffect;
  areaEffect?: AreaEffect;
  special?: SpecialEffect;
}

type EffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'summon' | 'utility' | 'special';

type TargetType = 'self' | 'single' | 'multiple' | 'area';

interface Save {
  ability: Ability;
  dcModifier: 'spell' | 'fixed';
  effectOnSave: SaveEffect;
}

type SaveEffect = 'none' | 'half' | 'negates' | 'partial';

interface DamageEffect {
  dice: string;
  bonus: number;
  type: DamageType;
  scaling?: Scaling;
}

interface HealEffect {
  dice: string;
  bonus: number;
  scaling?: Scaling;
}

interface Scaling {
  type: 'damage' | 'dice' | 'target';
  interval: number;
  additional: number | string;
}

interface BuffEffect {
  statBonus?: StatBonus[];
  immunities?: Condition[];
}

interface DebuffEffect {
  conditions: Condition[];
}

interface Concentration {
  spellId: string;
  spellName: string;
  startedAt: number;
  casterId: string;
  targetId?: string;
}

type SpellSlots = Record<number, number>; // level -> count
```

---

### 5.4 物品数据结构

```typescript
interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  weight: number;                   // 磅
  value: number;                    // 铜币
  stackable: boolean;
  maxStack: number;
  requiresAttunement: boolean;
}

// ItemType 定义见 shared-types.md §3.5
// Rarity 定义见 shared-types.md §3.6
```

> **类型引用**：`ItemType` 和 `Rarity` 类型定义在 `shared-types.md §3.5` 和 `§3.6`，此处不再重复定义。

```typescript
interface Weapon extends Item {
  weaponCategory: 'simple' | 'martial';
  weaponType: 'melee' | 'ranged';
  damage: {
    count: number;
    size: number;
  };
  damageType: DamageType;
  range: {
    normal: number;
    long?: number;
  };
  properties: WeaponProperty[];
  twoHanded: boolean;
  versatile?: {
    count: number;
    size: number;
  };
}

type WeaponProperty =
  | 'ammunition' | 'finesse' | 'heavy' | 'light'
  | 'loading' | 'reach' | 'special' | 'thrown'
  | 'two_handed' | 'versatile';

interface Armor extends Item {
  armorCategory: 'light' | 'medium' | 'heavy';
  armorType: string;
  baseAC: number;
  dexBonus: 'full' | 'limited' | 'none';
  maxDexBonus?: number;
  strengthReq?: number;
  stealthDisadvantage: boolean;
}

interface Consumable extends Item {
  consumableType: 'potion' | 'scroll' | 'oil' | 'food' | 'ammunition';
  uses: number;
  maxUses: number;
  recharge?: Recharge;
  effect: ConsumableEffect;
}

interface Recharge {
  type: 'none' | 'dice' | 'daily' | 'short_rest' | 'long_rest';
  value?: string;
}

interface ConsumableEffect {
  type: 'heal' | 'damage' | 'condition' | 'spell';
  value?: number;
  dice?: string;
  duration?: number;
  conditions?: Condition[];
  spellId?: string;
}

interface Inventory {
  ownerId: string;
  items: InventoryItem[];
  gold: number;
  silver: number;
  copper: number;
  capacity: number;
  currentWeight: number;
}

interface InventoryItem {
  itemId: string;
  quantity: number;
  equipped: boolean;
  slot?: EquipmentSlot;
  customName?: string;
  charges?: number;
}

type EquipmentSlot =
  | 'main_hand' | 'off_hand' | 'head' | 'chest'
  | 'hands' | 'feet' | 'cloak' | 'neck'
  | 'ring1' | 'ring2' | 'belt';

interface Equipment {
  slots: Partial<Record<EquipmentSlot, InventoryItem>>;
}
```

---

### 5.5 地图数据结构

```typescript
interface GameMap {
  id: string;
  name: string;
  description: string;
  width: number;                    // 网格宽度
  height: number;                   // 网格高度
  gridSize: number;                 // 每格像素数
  gridType: 'square' | 'hex';

  // 地图层级
  background: MapLayer;
  walls: Wall[];
  tiles: Tile[][];
  lights: Light[];
  objects: MapObject[];

  // 元数据
  scenarioId?: string;
  connections: MapConnection[];

  // 入口/出口
  entrances: Entrance[];
  exits: Exit[];
}

interface MapLayer {
  name: string;
  visible: boolean;
  opacity: number;
  image?: string;
}

interface Tile {
  position: Position;
  type: TileType;
  walkable: boolean;
  difficult: boolean;               // 困难地形
  image?: string;
  properties?: Record<string, unknown>;
}

type TileType =
  | 'floor' | 'wall' | 'water' | 'lava'
  | 'pit' | 'stairs' | 'door' | 'special';

interface Wall {
  id: string;
  start: Position;
  end: Position;
  type: WallType;
  door?: Door;
}

type WallType = 'solid' | 'door' | 'secret' | 'window' | 'ethereal';

interface Door {
  id: string;
  state: 'open' | 'closed' | 'locked';
  locked: boolean;
  keyId?: string;
  dc?: number;                      // 撬锁 DC
}

interface Light {
  id: string;
  position: Position;
  radius: number;
  color: string;
  intensity: number;
}

interface MapObject {
  id: string;
  name: string;
  position: Position;
  size: {
    width: number;
    height: number;
  };
  type: ObjectType;
  interactive: boolean;
  properties?: Record<string, unknown>;
}

type ObjectType =
  | 'furniture' | 'container' | 'trap'
  | 'trigger' | 'npc' | 'treasure';

interface MapConnection {
  id: string;
  targetMapId: string;
  position: Position;
  targetPos: Position;
  bidirectional: boolean;
}

interface Entrance {
  id: string;
  position: Position;
  label?: string;
}

interface Exit {
  id: string;
  position: Position;
  targetMapId: string;
  targetPos: Position;
}
```

---

### 5.6 剧本数据结构

```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;

  // 推荐设置
  levelRange: [number, number];     // [min, max]
  partySize: [number, number];      // [min, max]

  // 内容
  chapters: Chapter[];
  npcs: NPCTemplate[];
  maps: string[];                   // 地图 ID 列表
  items: string[];                  // 特殊物品 ID

  // 起始配置
  startChapter: string;
  startScene: string;
  startMap: string;
  startPosition: Position;

  // 元数据
  tags: string[];
  estimatedPlayTime: number;        // 分钟
}

interface Chapter {
  id: string;
  name: string;
  description: string;
  order: number;                    // 章节顺序
  scenes: Scene[];
  completionCondition?: Condition;
  xp: number;
  treasure: Treasure[];
}

interface Scene {
  id: string;
  name: string;
  description: string;
  mapId: string;
  entranceId: string;
  npcs: SceneNPC[];
  enemies: SceneEnemy[];
  triggers: Trigger[];
  interactables: Interactable[];
  exits: SceneExit[];
}

interface NPCTemplate {
  id: string;
  name: string;
  description: string;
  race: string;
  class?: string;
  level: number;
  abilityScores: AbilityScores;
  dialog: DialogTree;
  services?: Service[];
  quests?: string[];
}

interface DialogTree {
  root: DialogNode;
  nodes: DialogNode[];
}

interface DialogNode {
  id: string;
  text: string;
  speaker?: string;
  choices: DialogChoice[];
  actions: Action[];
  condition?: Condition;
}

interface DialogChoice {
  text: string;
  nextNodeId: string;
  condition?: Condition;
  skillCheck?: SkillCheck;
}

interface SkillCheck {
  skill: Skill;
  dc: number;
}

interface Trigger {
  id: string;
  name: string;
  enabled: boolean;
  oneTime: boolean;
  condition: Condition;
  actions: Action[];
  triggered: boolean;
}

interface Condition {
  type: ConditionType;
  params: Record<string, unknown>;
  and?: Condition[];
  or?: Condition[];
}

type ConditionType =
  | 'enter_area' | 'interact_with' | 'defeat_all'
  | 'has_item' | 'flag_set' | 'dialog_choice'
  | 'variable_equals' | 'time_elapsed';

interface Action {
  type: ActionType;
  params: Record<string, unknown>;
  delay?: number;                    // 延迟（秒）
}

type ActionType =
  | 'start_combat' | 'spawn_npc' | 'spawn_enemy'
  | 'set_flag' | 'clear_flag' | 'set_variable'
  | 'show_dialog' | 'give_item' | 'remove_item'
  | 'give_xp' | 'teleport' | 'change_scene'
  | 'unlock_exit' | 'narrate';
```

---

### 5.7 游戏状态结构

```typescript
interface GameState {
  // 会话信息
  sessionId: string;
  scenarioId: string;
  chapterId: string;
  sceneId: string;
  mapId: string;

  // 时间
  gameTime: GameTime;
  realTime: number;                  // 实际游戏时间（秒）

  // 队伍
  party: Character[];

  // 战斗
  combat?: Combat;

  // 剧本进度
  scenarioProgress: ScenarioProgress;

  // 全局标志
  flags: Record<string, boolean>;
  variables: Record<string, unknown>;
}

// GameTime 定义见 shared-types.md §6.1

interface ScenarioProgress {
  scenarioId: string;
  currentChapterId: string;
  currentSceneId: string;
  completedChapters: string[];
  flags: Record<string, boolean>;
  variables: Record<string, unknown>;
  triggeredTriggers: string[];
  questProgress: Record<string, QuestProgress>;
}

interface QuestProgress {
  questId: string;
  stage: number;
  objectives: Record<string, boolean>;
}
```

---

## 6. 前后端共享类型定义

### 6.1 通用类型

```typescript
// 位置
interface Position {
  x: number;
  y: number;
}

// Condition 定义见 shared-types.md §3.2
// DamageType 定义见 shared-types.md §3.1

// 效果定义
interface Effect {
  type: string;
  value?: number | string;
  duration?: number;
  conditions?: Condition[];
}

// 特性
interface Feature {
  id: string;
  name: string;
  description: string;
  source: string;                    // 来源（种族/职业/专长）
}

interface Feat extends Feature {
  prerequisites?: string[];
}

// 应用的效果
interface AppliedEffect {
  type: EffectType;
  targetId?: string;
  damage?: number;
  damageType?: DamageType;
  healing?: number;
  conditions?: Condition[];
  description: string;
  duration?: number;
  spellResult?: CastSpellResult;
}
```

### 6.2 检定相关

```typescript
// 检定结果
interface DiceResult {
  rollType: DiceRollType;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  success?: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}

// 豁免结果
interface SaveResult {
  ability: Ability;
  dc: number;
  roll: number;
  total: number;
  success: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}

// 技能检定结果
interface SkillCheckResult {
  skill: Skill;
  dc: number;
  roll: number;
  total: number;
  success: boolean;
  advantageRolls?: [number, number]; // 优势/劣势时
}
```

### 6.3 战斗相关

```typescript
// 施法结果
interface CastSpellResult {
  spellId: string;
  level: number;
  success: boolean;
  attackRoll?: DiceResult;
  saveResults?: SaveResult[];
  effects: AppliedEffect[];
  concentration: boolean;
  targets?: string[];
}

// 攻击结果
interface AttackResult {
  attackerId: string;
  targetId: string;
  weaponName: string;
  attackRoll: number;
  critical: boolean;
  fumble: boolean;
  hit: boolean;
  damage?: number;
  damageType?: DamageType;
}

// 伤害结果
interface DamageResult {
  originalDamage: number;
  modifiedDamage: number;
  resistanceApplied: boolean;
  immunityApplied: boolean;
  currentHP: number;
  unconscious: boolean;
  dead: boolean;
}

// 治疗结果
interface HealResult {
  healing: number;
  currentHP: number;
  conscious: boolean;
}
```

---

## 7. 版本和兼容性

### 7.1 版本管理

```typescript
// 协议版本
interface ProtocolVersion {
  major: number;                    // 主版本号（不兼容变更）
  minor: number;                    // 次版本号（向后兼容）
  patch: number;                    // 补丁号（bug 修复）
}

// 当前版本
const CURRENT_VERSION: ProtocolVersion = {
  major: 1,
  minor: 0,
  patch: 0
};
```

### 7.2 兼容性规则

| 变更类型 | 主版本 | 次版本 | 补丁版本 |
|----------|--------|--------|----------|
| 删除字段 | 是 | 否 | 否 |
| 重命名字段 | 是 | 否 | 否 |
| 新增必填字段 | 是 | 否 | 否 |
| 新增可选字段 | 否 | 是 | 是 |
| 修改字段类型 | 是 | 否 | 否 |
| Bug 修复 | 否 | 是 | 是 |

### 7.3 版本协商

```typescript
// 握手消息
interface HandshakeMessage {
  type: 'handshake';
  payload: {
    version: ProtocolVersion;
    clientType: 'web' | 'mobile' | 'desktop';
    capabilities: string[];          // 支持的功能列表
  };
}

// 握手响应
interface HandshakeResponse {
  type: 'handshake_ack';
  payload: {
    serverVersion: ProtocolVersion;
    compatible: boolean;
    requiredVersion?: ProtocolVersion; // 不兼容时要求的最小版本
    serverCapabilities: string[];
  };
}
```

---

## 8. 错误处理

### 8.1 错误码

```typescript
enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 1000,
  INVALID_REQUEST = 1001,
  INVALID_MESSAGE_FORMAT = 1002,
  MISSING_REQUIRED_FIELD = 1003,
  INVALID_FIELD_VALUE = 1004,

  // 认证错误 (2xxx)
  UNAUTHORIZED = 2000,
  SESSION_EXPIRED = 2001,
  SESSION_NOT_FOUND = 2002,
  INVALID_CREDENTIALS = 2003,

  // 业务错误 (3xxx)
  CHARACTER_NOT_FOUND = 3000,
  SPELL_NOT_FOUND = 3001,
  ITEM_NOT_FOUND = 3002,
  MAP_NOT_FOUND = 3003,
  SCENARIO_NOT_FOUND = 3004,

  // 战斗错误 (4xxx)
  COMBAT_NOT_ACTIVE = 4000,
  NOT_YOUR_TURN = 4001,
  OUT_OF_RANGE = 4002,
  NO_LINE_OF_SIGHT = 4003,
  INSUFFICIENT_ACTIONS = 4004,
  INVALID_TARGET = 4005,

  // 资源错误 (5xxx)
  OUT_OF_SPELL_SLOTS = 5000,
  OUT_OF_AMMUNITION = 5001,
  OUT_OF_CHARGES = 5002,
  INSUFFICIENT_RESOURCES = 5003,

  // 外部服务错误 (6xxx)
  LLM_ERROR = 6000,
  LLM_TIMEOUT = 6001,
  LLM_RATE_LIMIT = 6002,

  // 系统错误 (9xxx)
  INTERNAL_ERROR = 9000,
  DATABASE_ERROR = 9001,
  NETWORK_ERROR = 9002
}
```

### 8.2 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;                 // 用户友好的错误描述
    technicalMessage?: string;      // 技术细节（仅开发模式）
    details?: Record<string, unknown>;
    recoverable: boolean;           // 是否可恢复
    retryable: boolean;             // 是否可重试
    retryAfter?: number;            // 重试延迟（毫秒）
  };
  timestamp: number;
}
```

---

## 9. 附录

### 9.1 术语表

| 术语 | 定义 |
|------|------|
| **Client 模块** | 游戏后端中负责 LLM 交互的模块（AI Agent 部分） |
| **Server 模块** | 游戏后端中负责 D&D 规则引擎的模块 |
| **MCP** | Model Context Protocol，工具调用格式规范 |
| **WebSocket Hub** | WebSocket 连接管理器 |
| **DTO** | Data Transfer Object，数据传输对象 |
| **AC** | Armor Class，护甲等级 |
| **HP** | Hit Points，生命值 |
| **DC** | Difficulty Class，难度等级 |

### 9.2 参考文档

- 架构设计文档 v1.0
- 各模块设计文档 v1.0
- D&D 5e Player's Handbook
- D&D 5e Dungeon Master's Guide
- WebSocket API 规范
- MCP 协议规范

### 9.3 更新日志

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-03-16 | 初始版本 |

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：接口设计师
