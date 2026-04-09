# D&D Agent 前端 Code Wiki

> **用途**: 渐进式代码索引，帮助 AI 快速定位代码而无需读取全部文件
> **最后更新**: 2026-04-09 | **基于**: master (7754627)
> **技术栈**: React 19.2 / TypeScript 5.9 / Phaser 3.90.0 / Zustand 5.0 / Tailwind CSS 4.2 / Vite 8.0

---

## L0 — 一句话定位

React 19 UI + Phaser 3.90 战斗渲染 + 4 个 Zustand Store 状态管理 + WebSocket 实时通信 + EventBus 解耦 Phaser↔React，通过 `useGameMessages` hook 统一消息分发。

---

## L1 — 架构速查

### 数据流总览

```
用户操作 → React 组件 → Zustand Store (写)
                              ↓
                    eventBus.emit() (Phaser 交互)
                              ↓
              WebSocketClient.send() (网络层)
                              ↓
                   ┌──────────┴──────────┐
                   ↓                      ↓
            Go Backend               WebSocket 消息返回
                   ↓                      ↓
            useGameMessages hook (统一入口)
           ┌──────┼──────┬──────┬──────┐
           ↓      ↓      ↓      ↓      ↓
        narration state   dice   combat_event  error
           ↓      ↓      ↓      ↓      ↓
     chatStore gameStore chatStore combatStore+eventBus chatStore
           ↓      ↓      ↓      ↓      ↓
         UI更新  UI更新  UI更新  Phaser特效  UI更新
```

### 目录结构

```
src/
├── main.tsx / App.tsx                 # 入口，路由 (/ → HomePage, /game → GamePage)
├── pages/                             # 页面
│   ├── HomePage.tsx                   # 首页（开始冒险/创建角色）
│   └── GamePage.tsx                   # 主游戏页（三栏布局）
├── components/
│   ├── layout/                        # MainLayout, GameHeader
│   ├── chat/                          # ChatPanel, InputBar, MessageList, StreamingNarration
│   ├── combat/                        # CombatHUD, InitiativeTracker, ActionSelector, CombatLog, TurnIndicator
│   ├── panels/                        # CharacterPanel, CharacterCard, CharacterStats, QuickActions,
│   │                                   # DeathSavesDisplay, EquipmentSlots, SavingThrows, SkillsList, SpellSlotsBar
│   ├── character/                     # CharacterCreationDialog
│   ├── ui/                            # Button, Input, TextArea, Modal, Panel, Tooltip, ConnectionStatus, HealthBar
│   └── game/                           # GameContainer (Phaser 挂载点)
├── stores/                             # 4 个 Zustand Store
├── services/                           # websocket.ts, api.ts
├── hooks/                              # useGameMessages.ts
├── contexts/                           # WebSocketContext.tsx
├── events/                             # eventBus.ts, gameEvents.ts
├── config/                             # constants.ts
├── types/                              # character.ts, game.ts, message.ts, state.ts
├── utils/                              # modifiers.ts, lib/utils.ts
└── game/                                # Phaser 游戏引擎
    ├── GameManager.ts, config.ts, constants.ts
    ├── scenes/BaseScene.ts, CombatScene/{CombatScene, GridLayer, MoveRange, TargetHighlight, TurnIndicator}
    ├── entities/BaseEntity.ts, Character.ts, Enemy.ts
    ├── effects/{EffectManager, DamageNumber, AttackEffect, HealingEffect, SpellEffect, StatusEffect}
    ├── ui/{GameUIManager, HealthBar, NameLabel, SelectionRing, StatusIcon}
    └── utils/{AnimationUtils, CoordinateUtils, GridUtils, PathFinding}
```

---

## L2 — 模块索引（按任务查找）

---

### 2.1 Zustand Stores（4 个）

#### `gameStore.ts` — 全局游戏状态

```typescript
interface GameStore {
  gameState: GameState | null       // { sessionId, phase, party, currentMapId, combat, scenario, metadata }
  isLoading: boolean
  error: string | null
  // Actions:
  setGameState, updateGameState, updateParty, updateCombat, setLoading, setError, reset,
  initSession()  // ← 创建或复用 session（含后端验证 P0 bug fix）
}
```
- 使用 `persist` 中间件持久化到 localStorage (`key: 'dnd-game-state'`)
- **关键**: `initSession()` 先验证缓存 sessionId 是否在后端仍有效，无效则重建

#### `combatStore.ts` — 战斗专用状态（独立于 gameStore）

```typescript
interface CombatStore {
  combat: CombatState | null
  isCombatActive: boolean
  currentUnitId: string | null          // 当前操作单位
  targetMode: TargetMode                // 'none' | 'attack' | 'spell' | 'item'
  validTargetIds: string[]              // 当前可选目标列表
  selectedTargetId: string | null
  moveRange: { x, y }[]                 // 移动范围格子
  logEntries: CombatLogEntry[]          // 战斗日志（最多100条）
  // Actions:
  setCombat, setCurrentUnit, setTargetMode, setValidTargets, setSelectedTarget, setMoveRange,
  addLogEntry, getCombatant, updateCombatant,
  applyDamage(targetId, amount),         // 含临时HP吸收逻辑
  applyHeal(targetId, amount),           // 上限 MaxHP
  requestMove(position),                // → eventBus.emit(COMBAT_MOVE_CONFIRM)
  requestAttack(targetId),              // → eventBus.emit(COMBAT_TARGET_SELECT)
  requestAction(action, data),          // → eventBus.emit(COMBAT_UNIT_SELECT)
  reset
}
```
- **核心职责**: Bridge between WebSocket messages and Phaser scene events

#### `chatStore.ts` — 聊天消息

```typescript
interface ChatStore {
  messages: ChatMessage[]     // { id, type('user'|'dm'|'system'), content, timestamp, isStreaming }
  streamingText: string       // 流式文本累积区
  isStreaming: boolean
  // Actions:
  addUserMessage, addDMMessage, addSystemMessage,
  appendStreamText(text),      // 追加流式文本块
  finalizeStreamText(): boolean // 结束流式，返回是否有内容需显示为新消息
  clearMessages
}
```

#### `uiStore.ts` — UI 面板/对话框状态

```typescript
interface UiStore {
  activePanel: PanelType | null   // 'character' | 'inventory' | 'spells' | 'map'
  isPanelOpen: boolean
  activeDialog: string | null
  // Actions:
  setActivePanel, togglePanel, openDialog, closeDialog
}
```

---

### 2.2 React 组件树

| 组件 | 文件路径 | Props / 用途 |
|------|----------|-------------|
| **页面** |||
| `HomePage` | `pages/HomePage.tsx` | 首页：D20 图标 + "Start Adventure" / "Create Character" |
| `GamePage` | `pages/GamePage.tsx` | 主游戏页：三栏布局（左角色/中Phaser/右聊天）+ CombatHUD |
| **布局** |||
| `MainLayout` | `components/layout/MainLayout/MainLayout.tsx` | Props: `{ header, leftPanel, mainContent, rightPanel }` |
| `GameHeader` | `components/layout/GameHeader/GameHeader.tsx` | 顶部导航栏 |
| **聊天** |||
| `ChatPanel` | `components/chat/ChatPanel.tsx` | MessageList + StreamingNarration + InputBar |
| `InputBar` | `components/chat/InputBar.tsx` | 输入框 → `ws.sendMessage(text)` |
| `MessageList` | `components/chat/MessageList.tsx` | 消息列表 (auto-scroll) |
| `StreamingNarration` | `components/chat/StreamingNarration.tsx` | 流式叙述文字打字效果 |
| **战斗 UI** |||
| `CombatHUD` | `components/combat/CombatHUD.tsx` | TurnIndicator + InitiativeTracker + ActionSelector + CombatLog |
| `InitiativeTracker` | `components/combat/InitiativeTracker.tsx` | 先攻顺序条 |
| `ActionSelector` | `components/combat/ActionSelector.tsx` | 行动选择按钮组 |
| `CombatLog` | `components/combat/CombatLog.tsx` | 战斗事件日志 |
| `TurnIndicator` | `components/combat/TurnIndicator.tsx` | 当前回合指示器 |
| **角色面板** |||
| `CharacterPanel` | `components/panels/CharacterPanel.tsx` | 队伍展示（可折叠） |
| `CharacterCard` | `components/panels/CharacterCard.tsx` | 单角色卡片 |
| `CharacterStats` | `components/panels/CharacterStats.tsx` | 属性六维网格 |
| `QuickActions` | `components/panels/QuickActions.tsx` | 快捷行动按钮 |
| `DeathSavesDisplay` | `components/panels/DeathSavesDisplay.tsx` | 死亡豁免圈标记 |
| `EquipmentSlots` | `components/panels/EquipmentSlots.tsx` | 装备槽位展示 |
| `SavingThrows` | `components/panels/SavingThrows.tsx` | 豁免熟练度展示 |
| `SkillsList` | `components/panels/SkillsList.tsx` | 技能熟练度列表 |
| `SpellSlotsBar` | `components/panels/SpellSlotsBar.tsx` | 法术位条 |
| **角色创建** |||
| `CharacterCreationDialog` | `components/character/CharacterCreationDialog.tsx` | 完整创建器：9族×12职×12背景+属性输入(标准数组[15,14,13,12,10,8]) |
| **通用 UI** |||
| `ConnectionStatus` | `components/ui/ConnectionStatus.tsx` | WS 状态指示（绿=Linked / 红=Offline） |
| `HealthBar` | `components/ui/HealthBar/HealthBar.tsx` | HP 条组件（React 版） |
| `GameContainer` | `components/game/GameContainer.tsx` | Phaser canvas 挂载点 (`#game-container`) |

---

### 2.3 Phaser 游戏引擎

#### 核心配置 (`game/config.ts`, `game/constants.ts`)

| 常量 | 值 | 说明 |
|------|-----|------|
| `TILE_SIZE` | 64px | 格子像素尺寸 |
| `GRID_WIDTH` × `GRID_HEIGHT` | 12 × 9 | 网格维度 (768×576 px) |
| `FEET_PER_TILE` | 5 | 每格英尺数 |
| `DEFAULT_MELEE_RANGE` | 1 格 (5ft) | 默认近战范围 |
| `DEFAULT_SPELL_RANGE` | 10 格 (50ft) | 默认施法范围 |
| Render Type | `Phaser.AUTO` | WebGL fallback Canvas |
| Physics | Arcade (gravity disabled) | 物理引擎 |

#### 场景系统

| 文件 | 类 | 职责 |
|------|-----|------|
| `scenes/BaseScene.ts` | `BaseScene` | 抽象基类：生命周期辅助、store 订阅清理、`addUnsubscribe()`、`switchToScene()` |
| `scenes/CombatScene/CombatScene.ts` | `CombatScene` (~420行) | **主战斗场景**。子系统：GridLayer, MoveRange, TargetHighlight, TurnIndicator, EffectManager, GameUIManager。Entity map。输入：点击格子/单位。**防双重 destroy 守卫** |
| `scenes/CombatScene/GridLayer.ts` | `GridLayer` | 网格线渲染 (12×9) |
| `scenes/CombatScene/MoveRange.ts` | `MoveRange` | 移动范围可视化（蓝色高亮） |
| `scenes/CombatScene/TargetHighlight.ts` | `TargetHighlight` | 目标选择高亮 |
| `scenes/CombatScene/TurnIndicator.ts` | `TurnIndicator` | 回合指示箭头动画 |

#### 实体系统

| 文件 | 基类 | 特有方法 | 外观 |
|------|------|----------|------|
| `entities/BaseEntity.ts` | `Phaser.Container` | `moveToCell()`, `moveAlongPath()`, `setSelected()`, `playHurt()`, `playDeath()` | — |
| `entities/Character.ts` | `BaseEntity` | `updateCombatant(combatant)`, `playAttack()` | 蓝色圆形 + 首字母 |
| `entities/Enemy.ts` | `BaseEntity` | 同 Character | 红色菱形 + CR 标签 |

#### 特效系统 (`effects/`)

| 文件 | 触发事件 | 效果描述 |
|------|----------|----------|
| `EffectManager.ts` | 所有 combat events | 中央调度器：`handleCombatEvent(event)` → 路由到具体 effect |
| `DamageNumber.ts` | damage/heal | 浮动数字：damage(红), heal(绿), miss(灰), crit(金) |
| `AttackEffect.ts` | attack | `meleeSwing()` 弧形 / `projectile()` 弹道 / `hitFlash()` 闪光 |
| `HealingEffect.ts` | heal | 绿色治疗光效 |
| `SpellEffect.ts` | spell | 法术施放特效 |
| `StatusEffect.ts` | condition_apply/remove | 状态图标效果 |

#### 游戏 UI (`game/ui/`)

| 文件 | 职责 |
|------|------|
| `GameUIManager.ts` | 协调器：`createUI()` 创建 HP Bar + Name Label + Status Icon + Selection Ring |
| `HealthBar.ts` | Phaser HP 条（绿/黄/红渐变） |
| `NameLabel.ts` | 名称文字标签 |
| `SelectionRing.ts` | 选中指示环 |
| `StatusIcon.ts` | 状态条件图标 |

#### 工具函数 (`game/utils/`)

| 文件 | 函数 | 说明 |
|------|------|------|
| `CoordinateUtils.ts` | `worldToGrid()`, `gridToWorld()`, `snapToGrid()`, `gridDistance()` | 像素↔格子坐标转换（Manhattan） |
| `GridUtils.ts` | `isValidCell()`, `buildOccupancySet()`, `isCellOccupied()`, `buildObstacleGrid()`, `getNeighbors()` | 格子验证与占用（4邻域） |
| `PathFinding.ts` | `findPath(start, end)` A*, `getMoveRange(start, range)` BFS | 寻路算法 |

---

### 2.4 Services — 通信层

#### WebSocket Client (`services/websocket.ts`)

```typescript
class WebSocketClient {
  connect(): Promise<void>           // 连接（自动附加 ?session_id=xxx）
  disconnect(): void                 // 断开（手动关闭不重连）
  send(message: ClientMessage): void // 发送（离线时入队，上限100）
  sendMessage(text: string): void    // 快捷发送 user_input
  onMessage(handler): () => void     // 订阅消息（返回取消订阅）
  onConnection(handler): () => void  // 订阅连接状态变化
}
```
- 自动重连: 最多 10 次，间隔 3s；心跳: 每 30s ping；消息队列: 断线时缓存

**Type Guards**: `isNarrationPayload()`, `isStateUpdatePayload()`, `isDiceResultPayload()`, `isErrorPayload()`, `isCombatEventPayload()` — 运行时类型安全

#### REST API Client (`services/api.ts`)

| 方法 | HTTP | 说明 |
|------|------|------|
| `sessionApi.create()` | POST `/sessions` | 创建会话 |
| `sessionApi.get(id)` | GET /sessions/:id` | 获取会话 |
| `characterApi.create(data)` | POST `/characters` | 创建角色 |
| `characterApi.get/list/delete(id)` | CRUD `/characters` | 角色 CRUD |

---

### 2.5 Event Bus — Phaser ↔ React 桥梁

> 定义位置: `events/eventBus.ts` + `events/gameEvents.ts`

```typescript
// 21 种事件常量
export const GameEvents = {
  // Phaser → React（用户交互）
  COMBAT_CELL_CLICK, COMBAT_UNIT_SELECT, COMBAT_TARGET_SELECT, COMBAT_MOVE_CONFIRM,
  // React/Store → Phaser（状态变更）
  COMBAT_START, COMBAT_END, COMBAT_TURN_START, COMBAT_TURN_END, COMBAT_UPDATE,
  // Store → Phaser（视觉效果）
  EFFECT_ATTACK, EFFECT_DAMAGE, EFFECT_HEAL, EFFECT_SPELL, EFFECT_STATUS, EFFECT_DEATH, EFFECT_MISS,
} as const
```

**数据流向**:
1. **Phaser → React**: 用户点击 → CombatScene emit → combatStore 更新 UI
2. **React → Phaser**: WS 消息 → useGameMessages → eventBus.emit → CombatScene 特效
3. **React → WS**: combatStore.requestMove/Attack/Action → eventBus.emit → useGameMessages → ws.send()

---

### 2.6 Contexts & Hooks

| 文件 | 导出 | 说明 |
|------|------|------|
| `contexts/WebSocketContext.tsx` | `WebSocketProvider`, `useWebSocket()` | 提供 `{ client, connected, send, subscribe }`；防 StrictMode 双连 |
| `hooks/useGameMessages.ts` | `useGameMessages()` | **核心 Hook**: 订阅 WS → 按 type 分发到 Store/Handler；监听 eventBus → 转发为 WS combat_action |

**useGameMessages 消息路由**:

| Server Message Type | 处理函数 | 目标 |
|-------------------|----------|------|
| `narration` | handleNarration | chatStore (流式/非流式) |
| `state_update` | handleStateUpdate | gameStore (game/party/combat/map/notification) |
| `dice_result` | handleDiceResult | chatSystem (格式化骰子) |
| `error` | handleError | chatSystem |
| `combat_event` | handleCombatEvent | combatStore + eventBus (19种事件) |

---

### 2.7 Types

| 文件 | 核心类型 |
|------|----------|
| `types/game.ts` | `GamePhase`(4种), `Ability`(6种), `DamageType`(14种), `Condition`(18种), `ActiveEffect` |
| `types/character.ts` | `Character`(完整角色), `Monster`(简化NPC) |
| `types/message.ts` | `ClientMessage`/`ServerMessage`, 5 C types / 6 S types, Payloads |
| `types/state.ts` | `InitiativeEntry`, `CombatantType`(3种), `ActionState`(2种), `ConditionEntry`, `Combatant`, `CombatState`, `ScenarioState`, `GameMetadata`, `GameState` |

---

### 2.8 Utils & Config

| 文件 | 导出 |
|------|------|
| `utils/modifiers.ts` | `getModifier(score)` → D&D 修正值, `formatModifier(mod)` → "+3"/"-2" |
| `lib/utils.ts` | `cn()` (clsx+twMerge), `generateStableId(prefix)` (crypto.randomUUID fallback) |
| `config/constants.ts` | WS URL/重连/心跳/队列配置, `WS_MESSAGE_TYPES`, `STATE_UPDATE_TYPES`, `COMBAT_EVENT_TYPES`(20种) |

---

## L3 — 关键代码模式

### Store 订阅模式（Phaser Scene 中）
```typescript
// BaseScene 提供的清理注册机制
private setupStoreSubscriptions(): void {
  const unsub = useCombatStore.subscribe((s) => s.combat, (combat) => {
    this.syncEntities(combat)
  })
  this.addUnsubscribe(unsub)  // shutdown 时统一取消
}
```

### 流式消息处理
```typescript
// useGameMessages → handleNarration
if (isStreaming) { appendStreamText(text) }
else {
  const hadStream = finalizeStreamText()
  if (!hadStream && text) addDMMessage(text)
}
```

### Session 验证流程（P0 Bug Fix）
```typescript
// gameStore.initSession()
if (gameState?.sessionId) {
  const res = await sessionApi.get(gameState.sessionId)
  if (res.status === 'success') return  // 缓存有效
  set({ gameState: null })               // 缓存失效，清除后重建
}
```

### 防双重 Destroy（Phaser Scene）
```typescript
private _cleaned = false
cleanup(): void {
  if (this._cleaned) return   // COMBAT_END 触发 cleanup 后不再重复
  this._cleaned = true
}
```

### Vite 代理配置 (`vite.config.ts`)
`/api/*` → http://localhost:8080 | `/ws/*` → ws://localhost:8080

---

## L4 — 全部 .ts/.tsx 文件速查表

| 文件路径 | 一行描述 |
|----------|----------|
| `main.tsx` | React 入口 |
| `App.tsx` | 根组件：WebSocketProvider + Routes(/, /game) |
| `pages/HomePage.tsx` | 首页（~270行） |
| `pages/GamePage.tsx` | 主游戏页（~354行）：三栏 + useGameMessages + CombatHUD |
| `components/layout/MainLayout/MainLayout.tsx` | 可折叠三栏布局（~137行） |
| `components/layout/GameHeader/GameHeader.tsx` | 顶部导航栏 |
| `components/chat/ChatPanel.tsx` | 聊天容器（~60行） |
| `components/chat/InputBar.tsx` | 输入框 |
| `components/chat/MessageList.tsx` | 消息列表 |
| `components/chat/StreamingNarration.tsx` | 流式叙述 |
| `components/combat/CombatHUD.tsx` | 战斗覆盖层（~45行） |
| `components/combat/InitiativeTracker.tsx` | 先攻顺序条 |
| `components/combat/ActionSelector.tsx` | 行动选择器 |
| `components/combat/CombatLog.tsx` | 战斗日志 |
| `components/combat/TurnIndicator.tsx` | 回合指示 |
| `components/panels/CharacterPanel.tsx` | 队伍面板（~346行） |
| `components/panels/CharacterCard.tsx` | 角色卡片 |
| `components/panels/CharacterStats.tsx` | 属性展示 |
| `components/panels/QuickActions.tsx` | 快捷行动 |
| `components/panels/DeathSavesDisplay.tsx` | 死亡豁免 |
| `components/panels/EquipmentSlots.tsx` | 装备槽 |
| `components/panels/SavingThrows.tsx` | 豁免熟练度 |
| `components/panels/SkillsList.tsx` | 技能列表 |
| `components/panels/SpellSlotsBar.tsx` | 法术位 |
| `components/character/CharacterCreationDialog.tsx` | 角色创建器（~460行）：9族×12职×12背景 |
| `components/game/GameContainer.tsx` | Phaser 挂载（~81行） |
| `components/ui/Button/Button.tsx` | 按钮 |
| `components/ui/ConnectionStatus.tsx` | 连接状态 |
| `components/ui/HealthBar/HealthBar.tsx` | HP 条（React） |
| `stores/gameStore.ts` | 游戏状态 Store（persist） |
| `stores/combatStore.ts` | 战斗状态 Store（~200行） |
| `stores/chatStore.ts` | 聊天消息 Store |
| `stores/uiStore.ts` | UI 面板 Store |
| `services/websocket.ts` | WS 客户端（~445行）+ Type Guards |
| `services/api.ts` | REST API 客户端 |
| `hooks/useGameMessages.ts` | 核心 Hook（~382行）：消息路由 + eventBus→WS |
| `contexts/WebSocketContext.tsx` | WS Provider（防双连） |
| `events/eventBus.ts` | 类型安全事件总线 |
| `events/gameEvents.ts` | 21 个事件常量 |
| `config/constants.ts` | WS/消息类型/战斗事件常量 |
| `types/character.ts` | Character + Monster 类型 |
| `types/game.ts` | GamePhase, Ability, DamageType, Condition 等 |
| `types/message.ts` | WebSocket 消息类型 + Payload |
| `types/state.ts` | Combatant, CombatState, GameState 等 |
| `utils/modifiers.ts` | D&D 修正值计算 |
| `lib/utils.ts` | cn(), generateStableId() |
| `game/GameManager.ts` | Phaser 单例管理器 |
| `game/config.ts` | Phaser 配置（12×9格, 64px） |
| `game/constants.ts` | 颜色/动画/战斗/UI 常量 |
| `game/scenes/BaseScene.ts` | 场景基类（生命周期+清理） |
| `game/scenes/CombatScene/CombatScene.ts` | 主战斗场景（~420行） |
| `game/scenes/CombatScene/GridLayer.ts` | 网格渲染 |
| `game/scenes/CombatScene/MoveRange.ts` | 移动范围 |
| `game/scenes/CombatScene/TargetHighlight.ts` | 目标高亮 |
| `game/scenes/CombatScene/TurnIndicator.tsx` | 回合指示 |
| `game/entities/BaseEntity.ts` | 实体基类（移动/选中/受伤/死亡动画） |
| `game/entities/Character.ts` | 玩家实体（蓝圆+字母） |
| `game/entities/Enemy.ts` | 敌人实体（红菱+CR） |
| `game/effects/EffectManager.ts` | 特效调度器 |
| `game/effects/DamageNumber.ts` | 浮动数字 |
| `game/effects/AttackEffect.ts` | 攻击特效 |
| `game/effects/HealingEffect.ts` | 治疗特效 |
| `game/effects/SpellEffect.ts` | 法术特效 |
| `game/effects/StatusEffect.ts` | 状态图标 |
| `game/ui/GameUIManager.ts` | 游戏内 UI 协调器 |
| `game/ui/HealthBar.ts` | Phaser HP 条 |
| `game/ui/NameLabel.ts` | 名称标签 |
| `game/ui/SelectionRing.ts` | 选中环 |
| `game/ui/StatusIcon.ts` | 状态图标 |
| `game/utils/AnimationUtils.ts` | 动画工具 |
| `game/utils/CoordinateUtils.ts` | 坐标转换 |
| `game/utils/GridUtils.ts` | 格子工具 |
| `game/utils/PathFinding.ts` | A* + BFS 寻路 |

**测试文件**: stores(4), services(2), hooks(1), components: chat(1), character(1), panels(5)

---

> **提示**: 后端 Code Wiki 见 `../server/CODE_WIKI.md` | 设计文档索引见 `../../docs/design/README.md`
