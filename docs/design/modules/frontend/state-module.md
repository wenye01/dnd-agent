# 状态管理模块设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属子系统**: Web 前端子系统

---

## 1. 模块概述

### 1.1 模块职责

状态管理模块基于 Zustand，负责前端应用的所有状态管理，包括：

- 游戏状态管理（角色、物品、地图等）
- 战斗状态管理（先攻、回合、行动等）
- 聊天状态管理（消息、叙述等）
- UI 状态管理（面板、对话框、主题等）
- 与后端状态同步

### 1.2 设计原则

- **单一数据源**：每种状态由唯一的 Store 管理
- **不可变更新**：使用 immer 确保不可变更新
- **选择性订阅**：组件只订阅需要的状态片段
- **持久化**：UI 状态可持久化到 localStorage

### 1.3 模块边界

**包含**：
- 所有 Zustand Store 定义
- Store 相关的类型定义
- 状态持久化逻辑
- 状态同步逻辑

**不包含**：
- UI 组件（由 UI 模块负责）
- 网络通信逻辑（由通信模块负责，Store 调用通信模块）
- 游戏渲染逻辑（由游戏引擎模块负责）

---

## 2. 目录结构

```
stores/
├── gameStore.ts                  # 游戏状态
├── combatStore.ts                # 战斗状态
├── chatStore.ts                  # 聊天状态
├── uiStore.ts                    # UI 状态
├── connectionStore.ts            # 连接状态
├── index.ts                      # 统一导出
│
├── middleware/                   # 中间件
│   ├── logger.ts                 # 日志中间件
│   ├── persist.ts                # 持久化中间件
│   ├── sync.ts                   # 同步中间件
│   └── index.ts
│
└── types/                        # Store 类型定义
    ├── game.ts
    ├── combat.ts
    ├── chat.ts
    ├── ui.ts
    └── index.ts
```

---

## 3. 对外接口

### 3.1 统一导出

```typescript
// stores/index.ts
export { useGameStore, gameStore } from './gameStore';
export { useCombatStore, combatStore } from './combatStore';
export { useChatStore, chatStore } from './chatStore';
export { useUIStore, uiStore } from './uiStore';
export { useConnectionStore, connectionStore } from './connectionStore';

// 类型导出
export type {
  GameState,
  GameActions,
  CombatState,
  CombatActions,
  ChatState,
  ChatActions,
  UIState,
  UIActions,
  ConnectionState,
  ConnectionActions
} from './types';
```

### 3.2 Store 使用方式

```typescript
// 方式 1: Hook 方式（推荐）
import { useGameStore } from '@/stores';

function CharacterPanel() {
  const character = useGameStore(state =>
    state.characters.find(c => c.id === 'player')
  );
  const updateCharacter = useGameStore(state => state.updateCharacter);
}

// 方式 2: 直接访问（非 React 环境）
import { gameStore } from '@/stores';

const character = gameStore.getState().characters[0];
gameStore.getState().updateCharacter(id, data);
```

---

## 4. Store 详细设计

### 4.1 GameStore（游戏状态）

```typescript
// stores/gameStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

interface GameState {
  // 会话信息
  sessionId: string | null;
  scenarioId: string | null;
  gameMode: 'exploration' | 'combat' | 'dialogue';

  // 角色
  characters: Character[];
  activeCharacterId: string | null;

  // 地图
  currentMapId: string | null;
  currentSceneId: string | null;

  // 物品
  partyInventory: InventoryItem[];

  // 剧本进度
  currentChapter: string | null;
  completedObjectives: string[];

  // 游戏时间
  gameTime: GameTime;
}

interface GameActions {
  // 会话管理
  setSession: (sessionId: string, scenarioId: string) => void;
  clearSession: () => void;

  // 角色管理
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  setActiveCharacter: (id: string | null) => void;

  // 地图管理
  setCurrentMap: (mapId: string) => void;
  setCurrentScene: (sceneId: string) => void;

  // 物品管理
  addToInventory: (item: InventoryItem) => void;
  removeFromInventory: (itemId: string) => void;
  updateInventoryItem: (itemId: string, data: Partial<InventoryItem>) => void;

  // 剧本进度
  setCurrentChapter: (chapterId: string) => void;
  completeObjective: (objectiveId: string) => void;

  // 游戏模式
  setGameMode: (mode: GameState['gameMode']) => void;

  // 时间管理
  advanceTime: (amount: number, unit: 'minutes' | 'hours' | 'days') => void;

  // 状态同步
  syncState: (state: Partial<GameState>) => void;
  resetState: () => void;
}

export const useGameStore = create<GameState & GameActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      sessionId: null,
      scenarioId: null,
      gameMode: 'exploration',
      characters: [],
      activeCharacterId: null,
      currentMapId: null,
      currentSceneId: null,
      partyInventory: [],
      currentChapter: null,
      completedObjectives: [],
      gameTime: { day: 1, hour: 8, minute: 0 },

      // Actions 实现
      setSession: (sessionId, scenarioId) => set({ sessionId, scenarioId }),

      addCharacter: (character) => set((state) => {
        state.characters.push(character);
      }),

      updateCharacter: (id, data) => set((state) => {
        const index = state.characters.findIndex(c => c.id === id);
        if (index !== -1) {
          state.characters[index] = { ...state.characters[index], ...data };
        }
      }),

      // ... 其他 actions
    }))
  )
);
```

### 4.2 CombatStore（战斗状态）

```typescript
// stores/combatStore.ts
interface CombatState {
  // 战斗状态
  isActive: boolean;
  combatId: string | null;

  // 参与者
  units: CombatUnit[];
  initiativeOrder: InitiativeEntry[];
  currentTurn: number;
  currentUnitId: string | null;

  // 回合信息
  roundNumber: number;
  turnActions: TurnActions;

  // 移动
  selectedMoveTarget: { x: number; y: number } | null;
  moveRange: { x: number; y: number }[];

  // 目标选择
  targetMode: 'none' | 'attack' | 'spell' | 'item';
  validTargets: string[];
  selectedTargetId: string | null;

  // 待确认行动
  pendingAction: PendingAction | null;
}

interface CombatActions {
  // 战斗控制
  startCombat: (participants: CombatParticipant[]) => void;
  endCombat: () => void;

  // 回合管理
  nextTurn: () => void;
  endCurrentTurn: () => void;

  // 行动管理
  selectAction: (action: ActionType) => void;
  selectMoveTarget: (position: { x: number; y: number }) => void;
  selectTarget: (targetId: string) => void;
  confirmAction: () => void;
  cancelAction: () => void;

  // 请求发送（通过通信模块）
  requestMove: (position: { x: number; y: number }) => void;
  requestAttack: (targetId: string) => void;
  requestSpell: (spellId: string, targetId: string) => void;
  requestItem: (itemId: string, targetId?: string) => void;
  requestEndTurn: () => void;

  // 状态更新
  updateUnit: (unitId: string, data: Partial<CombatUnit>) => void;
  updateInitiative: (order: InitiativeEntry[]) => void;
  syncCombatState: (state: Partial<CombatState>) => void;
}

export const useCombatStore = create<CombatState & CombatActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      isActive: false,
      combatId: null,
      units: [],
      initiativeOrder: [],
      currentTurn: 0,
      currentUnitId: null,
      roundNumber: 1,
      turnActions: { action: true, bonus: true, movement: true, reaction: true },
      selectedMoveTarget: null,
      moveRange: [],
      targetMode: 'none',
      validTargets: [],
      selectedTargetId: null,
      pendingAction: null,

      // Actions 实现
      startCombat: (participants) => {
        // 初始化战斗状态
      },

      requestMove: (position) => {
        const state = get();
        if (!state.currentUnitId) return;

        // 通过 eventBus 发送请求，由通信模块订阅处理
        eventBus.emit(GameEvents.COMBAT_ACTION_REQUEST, {
          actionType: 'move',
          unitId: state.currentUnitId,
          position
        });
      },

      // ... 其他 actions
    }))
  )
);
```

### 4.3 ChatStore（聊天状态）

```typescript
// stores/chatStore.ts
interface ChatState {
  // 消息列表
  messages: ChatMessage[];

  // 当前叙述
  currentNarration: Narration | null;
  isNarrationStreaming: boolean;
  narrationBuffer: string;

  // 输入状态
  inputEnabled: boolean;
  inputPlaceholder: string;

  // 等待状态
  isWaitingForDM: boolean;
  waitingMessage: string;
}

interface ChatActions {
  // 消息管理
  addMessage: (message: ChatMessage) => void;
  addMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;

  // 叙述管理
  startNarration: (narration: Narration) => void;
  appendNarration: (text: string) => void;
  endNarration: () => void;

  // 发送消息
  sendMessage: (text: string) => void;

  // 状态管理
  setInputEnabled: (enabled: boolean, placeholder?: string) => void;
  setWaitingForDM: (waiting: boolean, message?: string) => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  immer((set, get) => ({
    // 初始状态
    messages: [],
    currentNarration: null,
    isNarrationStreaming: false,
    narrationBuffer: '',
    inputEnabled: true,
    inputPlaceholder: '输入你的行动...',
    isWaitingForDM: false,
    waitingMessage: '',

    // Actions 实现
    sendMessage: (text) => {
      const message: ChatMessage = {
        id: generateId(),
        type: 'user',
        content: text,
        timestamp: Date.now()
      };

      set((state) => {
        state.messages.push(message);
        state.isWaitingForDM = true;
        state.waitingMessage = 'DM 正在思考...';
      });

      // 通过 eventBus 发送请求，由通信模块订阅处理
      eventBus.emit(GameEvents.USER_INPUT_REQUEST, { text });
    },

    appendNarration: (text) => set((state) => {
      state.narrationBuffer += text;
    }),

    // ... 其他 actions
  }))
);
```

### 4.4 UIStore（UI 状态）

```typescript
// stores/uiStore.ts
interface UIState {
  // 面板状态
  activePanel: 'character' | 'inventory' | 'spellbook' | 'party' | null;
  panelCollapsed: Record<string, boolean>;

  // 对话框状态
  activeDialog: string | null;
  dialogData: Record<string, any>;

  // 主题设置
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';

  // 音量设置
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;

  // 布局设置
  sidebarCollapsed: boolean;
  chatPosition: 'left' | 'right' | 'bottom';
}

interface UIActions {
  // 面板管理
  setActivePanel: (panel: UIState['activePanel']) => void;
  togglePanel: (panelId: string) => void;

  // 对话框管理
  openDialog: (dialogId: string, data?: any) => void;
  closeDialog: () => void;

  // 设置管理
  setTheme: (theme: UIState['theme']) => void;
  setFontSize: (size: UIState['fontSize']) => void;
  setVolume: (type: 'master' | 'sfx' | 'music', value: number) => void;

  // 布局管理
  toggleSidebar: () => void;
  setChatPosition: (position: UIState['chatPosition']) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    immer((set) => ({
      // 初始状态
      activePanel: null,
      panelCollapsed: {},
      activeDialog: null,
      dialogData: {},
      theme: 'dark',
      fontSize: 'medium',
      masterVolume: 100,
      sfxVolume: 100,
      musicVolume: 50,
      sidebarCollapsed: false,
      chatPosition: 'right',

      // Actions 实现
      openDialog: (dialogId, data) => set((state) => {
        state.activeDialog = dialogId;
        state.dialogData = data || {};
      }),

      closeDialog: () => set((state) => {
        state.activeDialog = null;
        state.dialogData = {};
      }),

      setTheme: (theme) => set({ theme }),

      // ... 其他 actions
    })),
    {
      name: 'dnd-ui-settings',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        masterVolume: state.masterVolume,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
        sidebarCollapsed: state.sidebarCollapsed,
        chatPosition: state.chatPosition
      })
    }
  )
);
```

### 4.5 ConnectionStore（连接状态）

```typescript
// stores/connectionStore.ts
interface ConnectionState {
  // 连接状态
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  lastConnected: number | null;
  reconnectAttempts: number;

  // 错误信息
  lastError: string | null;
}

interface ConnectionActions {
  // 状态管理
  setStatus: (status: ConnectionState['status']) => void;
  setError: (error: string | null) => void;

  // 连接控制
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  immer((set, get) => ({
    // 初始状态
    status: 'disconnected',
    lastConnected: null,
    reconnectAttempts: 0,
    lastError: null,

    // Actions 实现
    setStatus: (status) => set({ status }),

    connect: () => {
      set({ status: 'connecting', lastError: null });
      // 通过 eventBus 发送连接请求
      eventBus.emit(GameEvents.WEBSOCKET_CONNECT_REQUEST);
    },

    // ... 其他 actions
  }))
);
```

---

## 5. 状态类型定义

> **重要说明**：共享类型定义统一放在 `utils-module/types/` 目录中。`state-module/stores/types/` 仅存放 Store 内部类型（如 State、Actions 接口）。

### 5.1 共享类型引用

```typescript
// stores/types/game.ts
// 引用 utils-module 中的共享类型
import type {
  Character,
  Stats,
  Equipment,
  Condition,
  GameTime,
  Item,
  Position
} from '@/types';

// Store 内部类型（仅 state-module 使用）
export interface GameState {
  // 会话信息
  sessionId: string | null;
  scenarioId: string | null;
  gameMode: 'exploration' | 'combat' | 'dialogue';

  // 角色（引用共享类型）
  characters: Character[];
  activeCharacterId: string | null;

  // 地图
  currentMapId: string | null;
  currentSceneId: string | null;

  // 物品
  partyInventory: Item[];

  // 剧本进度
  currentChapter: string | null;
  completedObjectives: string[];

  // 游戏时间（引用共享类型）
  gameTime: GameTime;
}

// Store Actions 类型
export interface GameActions {
  setSession: (sessionId: string, scenarioId: string) => void;
  clearSession: () => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  // ... 其他 actions
}
```

### 5.2 战斗类型

```typescript
// stores/types/combat.ts
// 引用 utils-module 中的共享类型
import type {
  CombatUnit,
  InitiativeEntry,
  Position,
  Condition,
  CombatActionType
} from '@/types';

// Store 内部类型（仅 state-module 使用）
export interface CombatState {
  // 战斗状态
  isActive: boolean;
  combatId: string | null;

  // 参与者（引用共享类型）
  units: CombatUnit[];
  initiativeOrder: InitiativeEntry[];
  currentTurn: number;
  currentUnitId: string | null;

  // 回合信息
  roundNumber: number;
  turnActions: TurnActions;

  // 移动
  selectedMoveTarget: Position | null;
  moveRange: Position[];

  // 目标选择
  targetMode: 'none' | 'attack' | 'spell' | 'item';
  validTargets: string[];
  selectedTargetId: string | null;

  // 待确认行动
  pendingAction: PendingAction | null;
}

// Store 内部类型（回合行动状态）
export interface TurnActions {
  action: boolean;
  bonus: boolean;
  movement: boolean;
  reaction: boolean;
}

// Store 内部类型（待确认行动）
export interface PendingAction {
  type: CombatActionType;
  unitId: string;
  data: unknown;
}

// Store Actions 类型
export interface CombatActions {
  startCombat: (participants: CombatUnit[]) => void;
  endCombat: () => void;
  nextTurn: () => void;
  // ... 其他 actions
}
```

### 5.3 消息类型

```typescript
// stores/types/chat.ts
// 引用 utils-module 中的共享类型
import type { ChatMessage, Narration } from '@/types';

// Store 内部类型（仅 state-module 使用）
export interface ChatState {
  // 消息列表（引用共享类型）
  messages: ChatMessage[];

  // 当前叙述（引用共享类型）
  currentNarration: Narration | null;
  isNarrationStreaming: boolean;
  narrationBuffer: string;

  // 输入状态
  inputEnabled: boolean;
  inputPlaceholder: string;

  // 等待状态
  isWaitingForDM: boolean;
  waitingMessage: string;
}

// Store Actions 类型
export interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  addMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  startNarration: (narration: Narration) => void;
  appendNarration: (text: string) => void;
  endNarration: () => void;
  sendMessage: (text: string) => void;
  setInputEnabled: (enabled: boolean, placeholder?: string) => void;
  setWaitingForDM: (waiting: boolean, message?: string) => void;
}
```

### 5.4 类型依赖关系

```
utils-module/types/          (共享类型，所有模块引用)
├── game.ts                  -> Character, GameTime, Session, Scenario
├── character.ts             -> Character, Stats, Equipment, Condition
├── combat.ts                -> CombatUnit, InitiativeEntry, CombatActionType
├── message.ts               -> ChatMessage, UserMessage, DMMessage, SystemMessage
├── item.ts                  -> Item, Weapon, Armor
├── spell.ts                 -> Spell, SpellLevel
└── map.ts                   -> SceneMap, Tile, Location

state-module/stores/types/   (Store 内部类型，仅 state-module 使用)
├── game.ts                  -> GameState, GameActions (引用 utils Character)
├── combat.ts                -> CombatState, CombatActions (引用 utils CombatUnit)
├── chat.ts                  -> ChatState, ChatActions (引用 utils ChatMessage)
├── ui.ts                    -> UIState, UIActions
└── connection.ts            -> ConnectionState, ConnectionActions
```

---

## 6. 模块间通信

### 6.1 与通信模块（通过 eventBus 解耦）

> **重要设计决策**：状态模块不直接依赖通信模块，而是通过 eventBus 发布消息请求，由通信模块订阅处理。这避免了循环依赖。

```typescript
// 状态模块通过 eventBus 发送请求
import { eventBus, GameEvents } from '@/events';

// 在 Store Action 中
sendMessage: (text: string) => {
  // 更新本地状态
  set((state) => {
    state.messages.push(userMessage);
  });

  // 通过 eventBus 发布发送请求，由通信模块订阅处理
  eventBus.emit(GameEvents.USER_INPUT_REQUEST, { text });
}

// 通信模块订阅请求事件
// services/websocket/messageHandler.ts
eventBus.on(GameEvents.USER_INPUT_REQUEST, ({ text }) => {
  websocketClient.send({
    type: 'user_input',
    payload: { text }
  });
});
```

### 6.1.1 状态模块订阅事件（接收服务端消息）

```typescript
// stores/gameStore.ts - 状态模块订阅事件
import { eventBus, GameEvents } from '@/events';

// 在 Store 初始化时订阅事件
function initStoreSubscriptions() {
  // 订阅状态更新（来自服务端）
  eventBus.on(GameEvents.STATE_UPDATE, (payload) => {
    const store = useGameStore.getState();
    switch (payload.stateType) {
      case 'game':
        store.syncState(payload.data);
        break;
      case 'party':
        store.syncParty(payload.data);
        break;
    }
  });

  // 订阅战斗事件（来自服务端）
  eventBus.on(GameEvents.COMBAT_EVENT, (payload) => {
    const combatStore = useCombatStore.getState();
    combatStore.handleCombatEvent(payload);
  });

  // 订阅 DM 叙述（来自服务端）
  eventBus.on(GameEvents.NARRATION, (payload) => {
    const chatStore = useChatStore.getState();
    chatStore.startNarration(payload);
  });

  // 订阅错误
  eventBus.on(GameEvents.ERROR, (payload) => {
    useChatStore.getState().addMessage({
      id: generateId(),
      type: 'system',
      content: `错误: ${payload.message}`,
      timestamp: Date.now()
    });
  });
}

// 在应用启动时调用
initStoreSubscriptions();
```

### 6.2 与 UI 模块

### 6.2 与 UI 模块

```typescript
// UI 组件订阅 Store
import { useChatStore } from '@/stores';

function MessageList() {
  const messages = useChatStore(state => state.messages);

  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} data={msg} />
      ))}
    </div>
  );
}
```

### 6.3 与游戏引擎模块

```typescript
// 游戏场景读取 Store
import { useCombatStore } from '@/stores';
import { eventBus, GameEvents } from '@/events';

class CombatScene extends BaseScene {
  updateUnits() {
    const units = useCombatStore.getState().units;
    // 更新游戏实体
  }
}

// 订阅状态变化，通过 eventBus 通知游戏引擎
useCombatStore.subscribe(
  state => state.units,
  (units) => {
    eventBus.emit(GameEvents.COMBAT_UNITS_UPDATED, units);
  }
);
```

---

## 7. 中间件设计

### 7.1 日志中间件

```typescript
// stores/middleware/logger.ts
export const logger = (config) => (set, get, api) =>
  config(
    (args) => {
      const prevState = get();
      set(args);
      const nextState = get();

      if (process.env.NODE_ENV === 'development') {
        console.group('State Update');
        console.log('Prev:', prevState);
        console.log('Next:', nextState);
        console.groupEnd();
      }
    },
    get,
    api
  );
```

### 7.2 持久化中间件

```typescript
// stores/middleware/persist.ts
export const createPersistMiddleware = (name: string, options = {}) => {
  return persist(
    (set, get) => ({ /* store */ }),
    {
      name,
      storage: createJSONStorage(() => localStorage),
      ...options
    }
  );
};
```

### 7.3 同步中间件

```typescript
// stores/middleware/sync.ts
export const syncMiddleware = (config) => (set, get, api) => {
  const syncedSet = (args) => {
    set(args);

    // 通知游戏引擎模块状态已更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store-updated', {
        detail: { newState: get() }
      }));
    }
  };

  return config(syncedSet, get, api);
};
```

---

## 8. 可测试性设计

### 8.1 Store 测试

```typescript
// __tests__/stores/gameStore.test.ts
import { act } from '@testing-library/react';
import { useGameStore } from '@/stores/gameStore';

describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetState();
  });

  it('should add character', () => {
    const character = { id: '1', name: 'Test', ... };

    act(() => {
      useGameStore.getState().addCharacter(character);
    });

    expect(useGameStore.getState().characters).toHaveLength(1);
    expect(useGameStore.getState().characters[0].name).toBe('Test');
  });

  it('should update character', () => {
    // 先添加角色
    act(() => {
      useGameStore.getState().addCharacter(character);
    });

    // 更新角色
    act(() => {
      useGameStore.getState().updateCharacter('1', { hp: 20 });
    });

    expect(useGameStore.getState().characters[0].hp).toBe(20);
  });
});
```

### 8.2 Mock 通信模块

```typescript
// __tests__/stores/chatStore.test.ts
import { websocketClient } from '@/services/websocket';

jest.mock('@/services/websocket', () => ({
  websocketClient: {
    send: jest.fn()
  }
}));

describe('ChatStore', () => {
  it('should send message via websocket', () => {
    act(() => {
      useChatStore.getState().sendMessage('Hello');
    });

    expect(websocketClient.send).toHaveBeenCalledWith({
      type: 'user_input',
      payload: { text: 'Hello' }
    });
  });
});
```

---

## 9. 错误边界设计

### 9.1 全局错误边界

```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GameErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误
    console.error('Game Error:', error, errorInfo);

    // 通知错误状态
    useErrorStore.getState().setError(error);

    // 可选：上报错误
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    useErrorStore.getState().clearError();
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error!} resetError={this.resetError} />;
    }
    return this.props.children;
  }
}
```

### 9.2 错误状态 Store

```typescript
// stores/errorStore.ts
interface ErrorState {
  // 全局错误
  globalError: AppError | null;

  // 各模块错误
  errors: Record<string, AppError>;

  // 错误历史
  errorHistory: AppError[];

  // 是否正在恢复
  isRecovering: boolean;
}

interface ErrorActions {
  setError: (error: Error, module?: string) => void;
  clearError: (module?: string) => void;
  clearAllErrors: () => void;
  retry: () => void;
}

interface AppError {
  id: string;
  code: string;
  message: string;
  module: string;
  timestamp: number;
  recoverable: boolean;
  retryAction?: () => void;
}

export const useErrorStore = create<ErrorState & ErrorActions>()(
  immer((set, get) => ({
    globalError: null,
    errors: {},
    errorHistory: [],
    isRecovering: false,

    setError: (error, module = 'global') => {
      const appError: AppError = {
        id: generateId(),
        code: getErrorCode(error),
        message: error.message,
        module,
        timestamp: Date.now(),
        recoverable: isRecoverable(error),
      };

      set((state) => {
        if (module === 'global') {
          state.globalError = appError;
        }
        state.errors[module] = appError;
        state.errorHistory.push(appError);
        // 保留最近 50 条错误
        if (state.errorHistory.length > 50) {
          state.errorHistory.shift();
        }
      });
    },

    clearError: (module) => set((state) => {
      if (module) {
        delete state.errors[module];
      } else {
        state.globalError = null;
      }
    }),

    retry: () => {
      const error = get().globalError;
      if (error?.retryAction) {
        set({ isRecovering: true });
        error.retryAction();
      }
    },
  }))
);
```

### 9.3 错误类型定义

```typescript
// stores/types/error.ts
enum ErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  WEBSOCKET_DISCONNECTED = 'WS_DISCONNECTED',
  WEBSOCKET_ERROR = 'WS_ERROR',

  // 游戏错误
  GAME_STATE_ERROR = 'GAME_STATE_ERROR',
  COMBAT_ERROR = 'COMBAT_ERROR',

  // 存档错误
  SAVE_ERROR = 'SAVE_ERROR',
  LOAD_ERROR = 'LOAD_ERROR',

  // LLM 错误
  LLM_ERROR = 'LLM_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

function getErrorCode(error: Error): ErrorCode {
  if (error instanceof NetworkError) return ErrorCode.NETWORK_ERROR;
  if (error instanceof WebSocketError) return ErrorCode.WEBSOCKET_ERROR;
  // ...
  return ErrorCode.UNKNOWN_ERROR;
}

function isRecoverable(error: Error): boolean {
  const code = getErrorCode(error);
  return [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.WEBSOCKET_DISCONNECTED,
    ErrorCode.LLM_TIMEOUT,
  ].includes(code);
}
```

### 9.4 错误恢复策略

| 错误类型 | 恢复策略 | 自动重试 |
|----------|----------|----------|
| 网络断开 | 自动重连 | 是 (3次) |
| WebSocket 错误 | 重连 + 状态同步 | 是 (3次) |
| 状态不一致 | 请求全量同步 | 是 |
| 存档损坏 | 加载最近备份 | 否 |
| LLM 超时 | 重试请求 | 是 (2次) |
| 渲染错误 | 重置组件 | 否 |

### 9.5 使用示例

```tsx
// App.tsx
function App() {
  return (
    <GameErrorBoundary fallback={GameErrorFallback}>
      <Game />
    </GameErrorBoundary>
  );
}

// 组件中使用
function CombatPanel() {
  const error = useErrorStore(state => state.errors['combat']);

  if (error) {
    return <CombatErrorDisplay error={error} />;
  }

  // 正常渲染
}

// 处理异步错误
async function loadGame() {
  try {
    await gameService.load();
  } catch (error) {
    useErrorStore.getState().setError(error, 'game');
  }
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：模块设计师
