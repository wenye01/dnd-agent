# 状态管理组件设计文档

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: 状态管理模块
> **技术栈**: Zustand 4.x + TypeScript + Immer

---

## 1. 组件概览

### 1.1 组件职责划分

```
stores/
├── gameStore.ts                    # 游戏状态 Store
├── combatStore.ts                  # 战斗状态 Store
├── chatStore.ts                    # 聊天状态 Store
├── uiStore.ts                      # UI 状态 Store
├── connectionStore.ts              # 连接状态 Store
│
├── middleware/                     # 中间件组件
│   ├── logger.ts                   # 日志中间件
│   ├── persist.ts                  # 持久化中间件
│   ├── sync.ts                     # 同步中间件
│   └── devtools.ts                 # 开发工具中间件
│
└── types/                          # 类型定义组件
    ├── game.ts                     # 游戏状态类型
    ├── combat.ts                   # 战斗状态类型
    ├── chat.ts                     # 聊天状态类型
    ├── ui.ts                       # UI 状态类型
    └── index.ts                    # 统一导出
```

### 1.2 组件依赖关系

```
                    UI Components
                           │
                           │ subscribe / setState
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Zustand Stores                       │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│  gameStore  │ combatStore │  chatStore  │ uiStore           │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│             │             │             │                   │
│      WebSocket Client (通过 actions 调用)                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ send messages
                           ▼
                    Backend Server
```

---

## 2. Store 基础架构

### 2.1 Store 创建模板

```typescript
// stores/createStore.ts
import { create, StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * 创建 Store 的工厂函数
 * @param name - Store 名称（用于调试）
 * @param initialState - 初始状态
 * @param actions - 操作函数
 */
export function createStore<T, A extends Record<string, Function>>(
  name: string,
  initialState: T,
  actions: (set: StoreApi<T & A>['setState'], get: StoreApi<T & A>['getState']) => A
) {
  return create<T & A>()(
    devtools(
      subscribeWithSelector(
        immer((set, get, api) => ({
          ...initialState,
          ...actions(set, get, api)
        }))
      ),
      { name }
    )
  );
}
```

### 2.2 Store 类型定义模板

```typescript
// stores/types/base.ts

/**
 * Store 状态类型
 */
export interface StoreState<T> {
  // 原始状态
  readonly _state: T;
}

/**
 * Store 操作类型
 */
export interface StoreActions {
  // 所有操作函数返回 void
  [key: string]: (...args: any[]) => void | Promise<void>;
}

/**
 * Store 完整类型
 */
export type Store<S, A> = S & A;

/**
 * 选择器类型
 */
export type Selector<T, R> = (state: T) => R;

/**
 * 状态更新函数类型
 */
export type PartialState<T> = Partial<T> | ((state: T) => void);
```

---

## 3. gameStore 组件

### 3.1 状态结构

```typescript
// stores/types/game.ts

/**
 * 游戏时间
 */
export interface GameTime {
  day: number;
  hour: number;   // 0-23
  minute: number; // 0-59
}

/**
 * 属性值
 */
export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

/**
 * 技能熟练度
 */
export interface SkillProficiency {
  skill: string;        // 技能名称
  proficiency: number;  // 熟练度加值 (0, 0.5, 1, 2)
  expertise: boolean;   // 是否专精
}

/**
 * 状态效果
 */
export interface Condition {
  id: string;
  name: string;
  duration?: number;    // 持续回合数，undefined 表示永久
  source?: string;      // 来源
}

/**
 * 装备槽位
 */
export interface Equipment {
  head?: string;        // 头部
  chest?: string;       // 胸部
  hands?: string;       // 手部
  feet?: string;        // 脚部
  weapon?: string;      // 主手武器
  shield?: string;      // 副手盾牌
  ring1?: string;       // 戒指1
  ring2?: string;       // 戒指2
  amulet?: string;      // 项链
}

/**
 * 法术位
 */
export interface SpellSlots {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
  level6: number;
  level7: number;
  level8: number;
  level9: number;
}

/**
 * 角色数据
 */
export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  subclass?: string;
  background?: string;

  // 属性
  stats: AbilityScores;

  // 派生属性
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  initiative: number;
  proficiencyBonus: number;

  // 状态
  conditions: Condition[];
  isDead: boolean;
  isStable: boolean;

  // 装备
  equipment: Equipment;

  // 法术
  spellSlots: SpellSlots;
  knownSpells: string[];
  preparedSpells: string[];

  // 技能
  skills: Record<string, number>;      // 技能加值
  proficiencies: string[];             // 熟练项列表
  expertise: string[];                 // 专精列表

  // 外貌和背景
  appearance?: {
    age?: number;
    height?: string;
    weight?: string;
    eyes?: string;
    skin?: string;
    hair?: string;
  };
  personality?: {
    traits?: string[];
    ideals?: string[];
    bonds?: string[];
    flaws?: string[];
  };

  // 元数据
  createdAt: number;
  updatedAt: number;
}

/**
 * 背包物品
 */
export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'wonder' | 'treasure';
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  quantity: number;
  weight: number;
  value: number;       // 金币价值
  description?: string;
  properties?: Record<string, any>;
  canUse: boolean;
  canEquip: boolean;
}

/**
 * 地图数据
 */
export interface MapData {
  id: string;
  name: string;
  type: 'world' | 'scene' | 'dungeon';
  width: number;
  height: number;
  tileSize: number;
}

/**
 * 剧本进度
 */
export interface ScenarioProgress {
  scenarioId: string;
  chapterId: string | null;
  completedObjectives: string[];
  flags: Record<string, any>;  // 剧本标志位
}

/**
 * 游戏状态
 */
export interface GameState {
  // 会话信息
  sessionId: string | null;
  scenarioId: string | null;
  gameMode: 'exploration' | 'combat' | 'dialogue' | 'rest';

  // 角色
  characters: Character[];
  activeCharacterId: string | null;
  partyIds: string[];  // 队伍角色 ID 列表

  // 地图
  currentMapId: string | null;
  currentSceneId: string | null;

  // 物品
  partyInventory: InventoryItem[];

  // 剧本进度
  scenarioProgress: ScenarioProgress | null;

  // 游戏时间
  gameTime: GameTime;

  // 加载状态
  isLoading: boolean;
  loadingMessage: string | null;

  // 错误状态
  error: string | null;
}
```

### 3.2 操作接口

```typescript
// stores/types/game.ts

/**
 * 游戏 Store 操作
 */
export interface GameActions {
  // ========== 会话管理 ==========
  /**
   * 设置当前会话
   */
  setSession: (sessionId: string, scenarioId: string) => void;

  /**
   * 清除会话
   */
  clearSession: () => void;

  // ========== 角色管理 ==========
  /**
   * 添加角色
   */
  addCharacter: (character: Character) => void;

  /**
   * 更新角色
   */
  updateCharacter: (id: string, data: Partial<Character>) => void;

  /**
   * 删除角色
   */
  removeCharacter: (id: string) => void;

  /**
   * 设置活动角色
   */
  setActiveCharacter: (id: string | null) => void;

  /**
   * 更新角色 HP
   */
  updateCharacterHP: (id: string, hp: number, maxHp?: number) => void;

  /**
   * 添加角色状态效果
   */
  addCharacterCondition: (id: string, condition: Condition) => void;

  /**
   * 移除角色状态效果
   */
  removeCharacterCondition: (id: string, conditionId: string) => void;

  // ========== 地图管理 ==========
  /**
   * 设置当前地图
   */
  setCurrentMap: (mapId: string) => void;

  /**
   * 设置当前场景
   */
  setCurrentScene: (sceneId: string) => void;

  // ========== 物品管理 ==========
  /**
   * 添加物品到背包
   */
  addToInventory: (item: InventoryItem) => void;

  /**
   * 从背包移除物品
   */
  removeFromInventory: (itemId: string) => void;

  /**
   * 更新物品
   */
  updateInventoryItem: (itemId: string, data: Partial<InventoryItem>) => void;

  /**
   * 使用物品
   */
  useInventoryItem: (itemId: string, characterId?: string) => Promise<void>;

  // ========== 剧本进度 ==========
  /**
   * 设置剧本进度
   */
  setScenarioProgress: (progress: ScenarioProgress) => void;

  /**
   * 完成目标
   */
  completeObjective: (objectiveId: string) => void;

  /**
   * 设置标志位
   */
  setFlag: (key: string, value: any) => void;

  // ========== 游戏模式 ==========
  /**
   * 设置游戏模式
   */
  setGameMode: (mode: GameState['gameMode']) => void;

  // ========== 时间管理 ==========
  /**
   * 推进时间
   */
  advanceTime: (amount: number, unit: 'minutes' | 'hours' | 'days') => void;

  /**
   * 休息（长休/短休）
   */
  rest: (type: 'short' | 'long') => Promise<void>;

  // ========== 状态同步 ==========
  /**
   * 从服务器同步状态
   */
  syncState: (state: Partial<GameState>) => void;

  /**
   * 重置状态
   */
  resetState: () => void;

  // ========== 加载状态 ==========
  /**
   * 设置加载状态
   */
  setLoading: (loading: boolean, message?: string) => void;

  /**
   * 设置错误
   */
  setError: (error: string | null) => void;
}
```

### 3.3 Store 实现

```typescript
// stores/gameStore.ts
import { createStore } from './createStore';
import { GameState, GameActions } from './types/game';
import { websocketClient } from '@/services/websocket';

const initialState: GameState = {
  sessionId: null,
  scenarioId: null,
  gameMode: 'exploration',
  characters: [],
  activeCharacterId: null,
  partyIds: [],
  currentMapId: null,
  currentSceneId: null,
  partyInventory: [],
  scenarioProgress: null,
  gameTime: { day: 1, hour: 8, minute: 0 },
  isLoading: false,
  loadingMessage: null,
  error: null
};

export const useGameStore = createStore<GameState, GameActions>(
  'GameStore',
  initialState,
  (set, get) => ({
    // ========== 会话管理 ==========
    setSession: (sessionId, scenarioId) => set({ sessionId, scenarioId }),

    clearSession: () => set({
      sessionId: null,
      scenarioId: null,
      characters: [],
      activeCharacterId: null,
      currentMapId: null,
      currentSceneId: null,
      partyInventory: []
    }),

    // ========== 角色管理 ==========
    addCharacter: (character) => set((state) => {
      state.characters.push(character);
    }),

    updateCharacter: (id, data) => set((state) => {
      const index = state.characters.findIndex(c => c.id === id);
      if (index !== -1) {
        Object.assign(state.characters[index], data);
        state.characters[index].updatedAt = Date.now();
      }
    }),

    removeCharacter: (id) => set((state) => {
      state.characters = state.characters.filter(c => c.id !== id);
      if (state.activeCharacterId === id) {
        state.activeCharacterId = null;
      }
      state.partyIds = state.partyIds.filter(pid => pid !== id);
    }),

    setActiveCharacter: (id) => set({ activeCharacterId: id }),

    updateCharacterHP: (id, hp, maxHp) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (character) {
        character.hp = hp;
        if (maxHp !== undefined) {
          character.maxHp = maxHp;
        }
        character.isDead = hp <= 0 && character.tempHp <= 0;
      }
    }),

    addCharacterCondition: (id, condition) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (character) {
        character.conditions.push(condition);
      }
    }),

    removeCharacterCondition: (id, conditionId) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (character) {
        character.conditions = character.conditions.filter(c => c.id !== conditionId);
      }
    }),

    // ========== 地图管理 ==========
    setCurrentMap: (mapId) => set({ currentMapId: mapId }),

    setCurrentScene: (sceneId) => set({ currentSceneId: sceneId }),

    // ========== 物品管理 ==========
    addToInventory: (item) => set((state) => {
      const existing = state.partyInventory.find(i => i.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        state.partyInventory.push(item);
      }
    }),

    removeFromInventory: (itemId) => set((state) => {
      const index = state.partyInventory.findIndex(i => i.id === itemId);
      if (index !== -1) {
        if (state.partyInventory[index].quantity > 1) {
          state.partyInventory[index].quantity -= 1;
        } else {
          state.partyInventory.splice(index, 1);
        }
      }
    }),

    updateInventoryItem: (itemId, data) => set((state) => {
      const item = state.partyInventory.find(i => i.id === itemId);
      if (item) {
        Object.assign(item, data);
      }
    }),

    useInventoryItem: async (itemId, characterId) => {
      const state = get();
      const character = characterId
        ? state.characters.find(c => c.id === characterId)
        : state.characters.find(c => c.id === state.activeCharacterId);

      if (!character) return;

      // 通过通信模块发送使用物品请求
      websocketClient.send({
        type: 'map_action',
        payload: {
          action: 'use_item',
          itemId,
          characterId: character.id
        }
      });
    },

    // ========== 剧本进度 ==========
    setScenarioProgress: (progress) => set({ scenarioProgress: progress }),

    completeObjective: (objectiveId) => set((state) => {
      if (state.scenarioProgress) {
        state.scenarioProgress.completedObjectives.push(objectiveId);
      }
    }),

    setFlag: (key, value) => set((state) => {
      if (state.scenarioProgress) {
        state.scenarioProgress.flags[key] = value;
      }
    }),

    // ========== 游戏模式 ==========
    setGameMode: (mode) => set({ gameMode: mode }),

    // ========== 时间管理 ==========
    advanceTime: (amount, unit) => set((state) => {
      const multiplier = {
        minutes: 1,
        hours: 60,
        days: 60 * 24
      }[unit];

      const totalMinutes = state.gameTime.hour * 60 + state.gameTime.minute + amount * multiplier;
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      state.gameTime = {
        day: state.gameTime.day + days,
        hour: hours,
        minute: minutes
      };
    }),

    rest: async (type) => {
      const state = get();

      // 通过通信模块发送休息请求
      await websocketClient.sendWithResponse({
        type: 'map_action',
        payload: {
          action: 'rest',
          restType: type
        }
      });
    },

    // ========== 状态同步 ==========
    syncState: (serverState) => set((state) => {
      Object.assign(state, serverState);
    }),

    resetState: () => set(initialState),

    // ========== 加载状态 ==========
    setLoading: (loading, message) => set({
      isLoading: loading,
      loadingMessage: message ?? null
    }),

    setError: (error) => set({ error })
  })
);

// 导出 store 实例（非 Hook）
export const gameStore = useGameStore;
```

---

## 4. combatStore 组件

### 4.1 状态结构

```typescript
// stores/types/combat.ts

/**
 * 战斗单位
 */
export interface CombatUnit {
  id: string;
  characterId: string;
  name: string;
  team: 'player' | 'enemy' | 'neutral';

  // 位置
  position: { x: number; y: number };

  // 状态
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;

  // 状态效果
  conditions: Condition[];
  isDead: boolean;
  isUnconscious: boolean;

  // 回合状态
  hasActed: boolean;
  hasMoved: boolean;
  hasBonusAction: boolean;
  hasReaction: boolean;

  // 可用行动
  availableActions: CombatActionType[];

  // 显示数据
  sprite: string;
  size: 'small' | 'medium' | 'large' | 'huge';
}

/**
 * 战斗行动类型
 */
export type CombatActionType =
  | 'attack'
  | 'spell'
  | 'item'
  | 'move'
  | 'dodge'
  | 'dash'
  | 'disengage'
  | 'help'
  | 'hide'
  | 'ready'
  | 'search'
  | 'use_object';

/**
 * 先攻条目
 */
export interface InitiativeEntry {
  unitId: string;
  initiative: number;
  dexterity: number;
  hasRolled: boolean;
}

/**
 * 回合行动状态
 */
export interface TurnActions {
  action: boolean;
  bonus: boolean;
  movement: boolean;
  reaction: boolean;
}

/**
 * 待确认行动
 */
export interface PendingAction {
  type: CombatActionType;
  unitId: string;
  data?: Record<string, any>;
}

/**
 * 战斗状态
 */
export interface CombatState {
  // 战斗状态
  isActive: boolean;
  combatId: string | null;
  roundNumber: number;
  turnNumber: number;

  // 参与者
  units: CombatUnit[];
  initiativeOrder: InitiativeEntry[];
  currentUnitId: string | null;

  // 回合信息
  turnActions: TurnActions;

  // 移动
  selectedMoveTarget: { x: number; y: number } | null;
  moveRange: { x: number; y: number }[];
  remainingMovement: number;

  // 目标选择
  targetMode: 'none' | 'attack' | 'spell' | 'item';
  validTargets: string[];
  selectedTargetId: string | null;

  // 待确认行动
  pendingAction: PendingAction | null;

  // 行动历史
  actionHistory: CombatActionEvent[];

  // 加载状态
  isProcessing: boolean;
}

/**
 * 战斗行动事件
 */
export interface CombatActionEvent {
  id: string;
  roundNumber: number;
  turnNumber: number;
  unitId: string;
  actionType: CombatActionType;
  targetId?: string;
  result?: any;
  timestamp: number;
}
```

### 4.2 操作接口

```typescript
// stores/types/combat.ts

/**
 * 战斗 Store 操作
 */
export interface CombatActions {
  // ========== 战斗控制 ==========
  /**
   * 开始战斗
   */
  startCombat: (participants: CombatUnit[]) => void;

  /**
   * 结束战斗
   */
  endCombat: () => void;

  /**
   * 下一回合
   */
  nextTurn: () => void;

  /**
   * 结束当前回合
   */
  endCurrentTurn: () => void;

  // ========== 单位管理 ==========
  /**
   * 添加战斗单位
   */
  addUnit: (unit: CombatUnit) => void;

  /**
   * 更新战斗单位
   */
  updateUnit: (unitId: string, data: Partial<CombatUnit>) => void;

  /**
   * 移除战斗单位
   */
  removeUnit: (unitId: string) => void;

  /**
   * 设置先攻顺序
   */
  setInitiativeOrder: (order: InitiativeEntry[]) => void;

  // ========== 行动选择 ==========
  /**
   * 选择行动
   */
  selectAction: (action: CombatActionType, data?: any) => void;

  /**
   * 取消行动
   */
  cancelAction: () => void;

  /**
   * 确认行动
   */
  confirmAction: () => Promise<void>;

  // ========== 移动 ==========
  /**
   * 选择移动目标
   */
  selectMoveTarget: (position: { x: number; y: number }) => void;

  /**
   * 显示移动范围
   */
  showMoveRange: (unitId: string) => void;

  /**
   * 隐藏移动范围
   */
  hideMoveRange: () => void;

  /**
   * 请求移动
   */
  requestMove: (position: { x: number; y: number }) => void;

  // ========== 目标选择 ==========
  /**
   * 设置目标模式
   */
  setTargetMode: (mode: CombatState['targetMode']) => void;

  /**
   * 选择目标
   */
  selectTarget: (targetId: string) => void;

  /**
   * 清除目标选择
   */
  clearTargetSelection: () => void;

  // ========== 战斗请求（通过通信模块）==========
  /**
   * 请求攻击
   */
  requestAttack: (targetId: string, weaponId?: string) => Promise<void>;

  /**
   * 请求施法
   */
  requestSpell: (spellId: string, targetId?: string) => Promise<void>;

  /**
   * 请求使用物品
   */
  requestItem: (itemId: string, targetId?: string) => Promise<void>;

  /**
   * 请求结束回合
   */
  requestEndTurn: () => Promise<void>;

  // ========== 状态同步 ==========
  /**
   * 同步战斗状态
   */
  syncCombatState: (state: Partial<CombatState>) => void;

  /**
   * 处理战斗事件
   */
  handleCombatEvent: (event: CombatEventPayload) => void;

  /**
   * 重置状态
   */
  resetState: () => void;
}

/**
 * 战斗事件载荷
 */
export interface CombatEventPayload {
  eventType: 'attack' | 'damage' | 'heal' | 'spell' | 'move' | 'turn_start' | 'turn_end';
  sourceId: string;
  targetId?: string;
  result?: {
    hit?: boolean;
    critical?: boolean;
    damage?: number;
    healing?: number;
    damageType?: string;
  };
}
```

### 4.3 Store 实现（核心部分）

```typescript
// stores/combatStore.ts
import { createStore } from './createStore';
import { CombatState, CombatActions, CombatUnit } from './types/combat';
import { websocketClient } from '@/services/websocket';

const initialState: CombatState = {
  isActive: false,
  combatId: null,
  roundNumber: 1,
  turnNumber: 0,
  units: [],
  initiativeOrder: [],
  currentUnitId: null,
  turnActions: { action: true, bonus: true, movement: true, reaction: true },
  selectedMoveTarget: null,
  moveRange: [],
  remainingMovement: 0,
  targetMode: 'none',
  validTargets: [],
  selectedTargetId: null,
  pendingAction: null,
  actionHistory: [],
  isProcessing: false
};

export const useCombatStore = createStore<CombatState, CombatActions>(
  'CombatStore',
  initialState,
  (set, get) => ({
    // ========== 战斗控制 ==========
    startCombat: (participants) => set((state) => {
      state.isActive = true;
      state.units = participants;
      state.roundNumber = 1;
      state.turnNumber = 0;
      state.initiativeOrder = participants.map(p => ({
        unitId: p.id,
        initiative: 0,
        dexterity: 10,
        hasRolled: false
      }));
    }),

    endCombat: () => set(initialState),

    nextTurn: () => set((state) => {
      if (!state.initiativeOrder.length) return;

      state.turnNumber += 1;
      const nextIndex = state.turnNumber % state.initiativeOrder.length;
      const nextUnit = state.initiativeOrder[nextIndex];

      state.currentUnitId = nextUnit.unitId;
      state.turnActions = { action: true, bonus: true, movement: true, reaction: true };
      state.selectedMoveTarget = null;
      state.moveRange = [];
      state.targetMode = 'none';
      state.validTargets = [];
      state.selectedTargetId = null;
      state.pendingAction = null;

      // 新回合
      if (nextIndex === 0) {
        state.roundNumber += 1;
        // 重置单位回合状态
        state.units.forEach(unit => {
          unit.hasActed = false;
          unit.hasMoved = false;
        });
      }
    }),

    endCurrentTurn: async () => {
      const state = get();
      await get().requestEndTurn();
    },

    // ========== 单位管理 ==========
    addUnit: (unit) => set((state) => {
      state.units.push(unit);
    }),

    updateUnit: (unitId, data) => set((state) => {
      const unit = state.units.find(u => u.id === unitId);
      if (unit) {
        Object.assign(unit, data);
      }
    }),

    removeUnit: (unitId) => set((state) => {
      state.units = state.units.filter(u => u.id !== unitId);
      state.initiativeOrder = state.initiativeOrder.filter(e => e.unitId !== unitId);

      if (state.currentUnitId === unitId) {
        state.currentUnitId = null;
      }
    }),

    setInitiativeOrder: (order) => set({ initiativeOrder: order }),

    // ========== 行动选择 ==========
    selectAction: (actionType, data) => set((state) => {
      state.pendingAction = {
        type: actionType,
        unitId: state.currentUnitId!,
        data
      };
    }),

    cancelAction: () => set((state) => {
      state.pendingAction = null;
      state.targetMode = 'none';
      state.validTargets = [];
      state.selectedTargetId = null;
    }),

    confirmAction: async () => {
      const state = get();
      if (!state.pendingAction) return;

      const { type, unitId, data } = state.pendingAction;

      switch (type) {
        case 'attack':
          if (state.selectedTargetId) {
            await get().requestAttack(state.selectedTargetId, data?.weaponId);
          }
          break;
        case 'spell':
          if (state.selectedTargetId) {
            await get().requestSpell(data?.spellId, state.selectedTargetId);
          }
          break;
        case 'item':
          await get().requestItem(data?.itemId, state.selectedTargetId);
          break;
        case 'move':
          if (state.selectedMoveTarget) {
            get().requestMove(state.selectedMoveTarget);
          }
          break;
      }

      set({ pendingAction: null });
    },

    // ========== 移动 ==========
    selectMoveTarget: (position) => set({ selectedMoveTarget: position }),

    showMoveRange: (unitId) => set((state) => {
      const unit = state.units.find(u => u.id === unitId);
      if (unit) {
        // 通过通信模块请求移动范围
        websocketClient.send({
          type: 'combat_action',
          payload: {
            actionType: 'get_move_range',
            unitId
          }
        });
      }
    }),

    hideMoveRange: () => set({
      moveRange: [],
      selectedMoveTarget: null
    }),

    requestMove: (position) => {
      const state = get();
      if (!state.currentUnitId) return;

      websocketClient.send({
        type: 'combat_action',
        payload: {
          actionType: 'move',
          unitId: state.currentUnitId,
          position
        }
      });
    },

    // ========== 目标选择 ==========
    setTargetMode: (mode) => set({ targetMode: mode }),

    selectTarget: (targetId) => set({ selectedTargetId: targetId }),

    clearTargetSelection: () => set((state) => {
      state.targetMode = 'none';
      state.validTargets = [];
      state.selectedTargetId = null;
    }),

    // ========== 战斗请求 ==========
    requestAttack: async (targetId, weaponId) => {
      const state = get();
      if (!state.currentUnitId) return;

      set({ isProcessing: true });

      try {
        await websocketClient.sendWithResponse({
          type: 'combat_action',
          payload: {
            actionType: 'attack',
            unitId: state.currentUnitId,
            targetId,
            weaponId
          }
        });
      } finally {
        set({ isProcessing: false });
      }
    },

    requestSpell: async (spellId, targetId) => {
      const state = get();
      if (!state.currentUnitId) return;

      set({ isProcessing: true });

      try {
        await websocketClient.sendWithResponse({
          type: 'combat_action',
          payload: {
            actionType: 'spell',
            unitId: state.currentUnitId,
            spellId,
            targetId
          }
        });
      } finally {
        set({ isProcessing: false });
      }
    },

    requestItem: async (itemId, targetId) => {
      const state = get();
      if (!state.currentUnitId) return;

      set({ isProcessing: true });

      try {
        await websocketClient.sendWithResponse({
          type: 'combat_action',
          payload: {
            actionType: 'item',
            unitId: state.currentUnitId,
            itemId,
            targetId
          }
        });
      } finally {
        set({ isProcessing: false });
      }
    },

    requestEndTurn: async () => {
      const state = get();
      if (!state.currentUnitId) return;

      set({ isProcessing: true });

      try {
        await websocketClient.sendWithResponse({
          type: 'combat_action',
          payload: {
            actionType: 'end_turn',
            unitId: state.currentUnitId
          }
        });
      } finally {
        set({ isProcessing: false });
      }
    },

    // ========== 状态同步 ==========
    syncCombatState: (serverState) => set((state) => {
      Object.assign(state, serverState);
    }),

    handleCombatEvent: (event) => set((state) => {
      // 记录事件
      state.actionHistory.push({
        id: `event-${Date.now()}`,
        roundNumber: state.roundNumber,
        turnNumber: state.turnNumber,
        unitId: event.sourceId,
        actionType: event.eventType,
        targetId: event.targetId,
        result: event.result,
        timestamp: Date.now()
      });

      // 更新单位状态
      if (event.result) {
        if (event.targetId) {
          const targetUnit = state.units.find(u => u.id === event.targetId);
          if (targetUnit) {
            if (event.result.damage !== undefined) {
              targetUnit.hp -= event.result.damage;
              targetUnit.tempHp = 0;
              if (targetUnit.hp <= 0) {
                targetUnit.isUnconscious = true;
              }
            }
            if (event.result.healing !== undefined) {
              targetUnit.hp = Math.min(targetUnit.hp + event.result.healing, targetUnit.maxHp);
            }
          }
        }
      }
    }),

    resetState: () => set(initialState)
  })
);

export const combatStore = useCombatStore;
```

---

## 5. chatStore 组件

### 5.1 状态结构

```typescript
// stores/types/chat.ts

/**
 * 聊天消息类型
 */
export type ChatMessageType =
  | 'user'
  | 'dm'
  | 'system'
  | 'dice_roll'
  | 'combat_event'
  | 'narration';

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  timestamp: number;

  // 扩展字段（根据类型不同）
  sender?: string;           // 发送者名称
  rollType?: string;         // 掷骰类型
  formula?: string;          // 骰子公式
  rolls?: number[];          // 骰子点数
  modifier?: number;         // 修正值
  total?: number;            // 总结果
  combatData?: any;          // 战斗事件数据
}

/**
 * DM 叙述
 */
export interface Narration {
  id: string;
  content: string;
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 聊天状态
 */
export interface ChatState {
  // 消息列表
  messages: ChatMessage[];

  // 当前叙述
  currentNarration: Narration | null;
  isNarrationStreaming: boolean;
  narrationBuffer: string;

  // 输入状态
  inputEnabled: boolean;
  inputPlaceholder: string;
  inputHistory: string[];
  historyIndex: number;

  // 等待状态
  isWaitingForDM: boolean;
  waitingMessage: string;

  // 滚动状态
  autoScroll: boolean;
  isScrolledToBottom: boolean;

  // 设置
  showTimestamps: boolean;
  showDiceDetails: boolean;
  fontSize: 'small' | 'medium' | 'large';
}
```

### 5.2 操作接口

```typescript
// stores/types/chat.ts

/**
 * 聊天 Store 操作
 */
export interface ChatActions {
  // ========== 消息管理 ==========
  /**
   * 添加消息
   */
  addMessage: (message: ChatMessage) => void;

  /**
   * 批量添加消息
   */
  addMessages: (messages: ChatMessage[]) => void;

  /**
   * 清除消息
   */
  clearMessages: () => void;

  /**
   * 删除消息
   */
  deleteMessage: (messageId: string) => void;

  // ========== 叙述管理 ==========
  /**
   * 开始新叙述
   */
  startNarration: (narration: Narration) => void;

  /**
   * 追加叙述内容
   */
  appendNarration: (text: string) => void;

  /**
   * 结束叙述
   */
  endNarration: () => void;

  /**
   * 完成当前叙述
   */
  completeNarration: () => void;

  // ========== 发送消息 ==========
  /**
   * 发送用户输入
   */
  sendMessage: (text: string) => void;

  /**
   * 重发最后一条消息
   */
  resendLastMessage: () => void;

  // ========== 输入历史 ==========
  /**
   * 添加到历史记录
   */
  addToHistory: (text: string) => void;

  /**
   * 获取上一条历史
   */
  previousHistory: () => string;

  /**
   * 获取下一条历史
   */
  nextHistory: () => string;

  // ========== 状态管理 ==========
  /**
   * 设置输入状态
   */
  setInputEnabled: (enabled: boolean, placeholder?: string) => void;

  /**
   * 设置等待状态
   */
  setWaitingForDM: (waiting: boolean, message?: string) => void;

  /**
   * 设置滚动状态
   */
  setScrollState: (isScrolledToBottom: boolean) => void;

  /**
   * 设置自动滚动
   */
  setAutoScroll: (enabled: boolean) => void;

  // ========== 设置 ==========
  /**
   * 设置显示时间戳
   */
  setShowTimestamps: (show: boolean) => void;

  /**
   * 设置显示骰子详情
   */
  setShowDiceDetails: (show: boolean) => void;

  /**
   * 设置字体大小
   */
  setFontSize: (size: ChatState['fontSize']) => void;

  // ========== 状态同步 ==========
  /**
   * 同步聊天历史
   */
  syncChatHistory: (messages: ChatMessage[]) => void;

  /**
   * 重置状态
   */
  resetState: () => void;
}
```

### 5.3 Store 实现

```typescript
// stores/chatStore.ts
import { createStore } from './createStore';
import { ChatState, ChatActions, ChatMessage, Narration } from './types/chat';
import { websocketClient } from '@/services/websocket';

const initialState: ChatState = {
  messages: [],
  currentNarration: null,
  isNarrationStreaming: false,
  narrationBuffer: '',
  inputEnabled: true,
  inputPlaceholder: '输入你的行动...',
  inputHistory: [],
  historyIndex: -1,
  isWaitingForDM: false,
  waitingMessage: '',
  autoScroll: true,
  isScrolledToBottom: true,
  showTimestamps: false,
  showDiceDetails: true,
  fontSize: 'medium'
};

export const useChatStore = createStore<ChatState, ChatActions>(
  'ChatStore',
  initialState,
  (set, get) => ({
    // ========== 消息管理 ==========
    addMessage: (message) => set((state) => {
      state.messages.push(message);
    }),

    addMessages: (messages) => set((state) => {
      state.messages.push(...messages);
    }),

    clearMessages: () => set({ messages: [] }),

    deleteMessage: (messageId) => set((state) => {
      state.messages = state.messages.filter(m => m.id !== messageId);
    }),

    // ========== 叙述管理 ==========
    startNarration: (narration) => set((state) => {
      state.currentNarration = narration;
      state.isNarrationStreaming = true;
      state.narrationBuffer = narration.content;
    }),

    appendNarration: (text) => set((state) => {
      state.narrationBuffer += text;
      if (state.currentNarration) {
        state.currentNarration.content = state.narrationBuffer;
        state.currentNarration.updatedAt = Date.now();
      }
    }),

    endNarration: () => set((state) => {
      if (state.currentNarration) {
        state.currentNarration.isComplete = true;
      }
      state.isNarrationStreaming = false;
    }),

    completeNarration: () => set((state) => {
      if (state.currentNarration) {
        const completedNarration: ChatMessage = {
          id: state.currentNarration.id,
          type: 'narration',
          content: state.narrationBuffer,
          timestamp: Date.now()
        };
        state.messages.push(completedNarration);
      }
      state.currentNarration = null;
      state.isNarrationStreaming = false;
      state.narrationBuffer = '';
    }),

    // ========== 发送消息 ==========
    sendMessage: (text) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'user',
        content: trimmedText,
        timestamp: Date.now()
      };

      // 添加到消息列表
      get().addMessage(message);

      // 添加到历史记录
      get().addToHistory(trimmedText);

      // 设置等待状态
      get().setWaitingForDM(true, 'DM 正在思考...');

      // 通过通信模块发送
      websocketClient.send({
        type: 'user_input',
        payload: { text: trimmedText }
      });
    },

    resendLastMessage: () => {
      const state = get();
      const lastUserMessage = [...state.messages]
        .reverse()
        .find(m => m.type === 'user');

      if (lastUserMessage) {
        get().sendMessage(lastUserMessage.content);
      }
    },

    // ========== 输入历史 ==========
    addToHistory: (text) => set((state) => {
      // 避免重复
      if (state.inputHistory[state.inputHistory.length - 1] !== text) {
        state.inputHistory.push(text);
        // 限制历史记录数量
        if (state.inputHistory.length > 50) {
          state.inputHistory.shift();
        }
      }
      state.historyIndex = -1;
    }),

    previousHistory: () => set((state) => {
      if (state.inputHistory.length === 0) return '';

      if (state.historyIndex === -1) {
        state.historyIndex = state.inputHistory.length - 1;
      } else if (state.historyIndex > 0) {
        state.historyIndex--;
      }

      return state.inputHistory[state.historyIndex];
    }),

    nextHistory: () => set((state) => {
      if (state.historyIndex === -1) return '';

      state.historyIndex++;
      if (state.historyIndex >= state.inputHistory.length) {
        state.historyIndex = -1;
        return '';
      }

      return state.inputHistory[state.historyIndex];
    }),

    // ========== 状态管理 ==========
    setInputEnabled: (enabled, placeholder) => set((state) => ({
      inputEnabled: enabled,
      inputPlaceholder: placeholder ?? state.inputPlaceholder
    })),

    setWaitingForDM: (waiting, message) => set((state) => ({
      isWaitingForDM: waiting,
      waitingMessage: message ?? state.waitingMessage
    })),

    setScrollState: (isScrolledToBottom) => set({ isScrolledToBottom }),

    setAutoScroll: (enabled) => set({ autoScroll: enabled }),

    // ========== 设置 ==========
    setShowTimestamps: (show) => set({ showTimestamps: show }),

    setShowDiceDetails: (show) => set({ showDiceDetails: show }),

    setFontSize: (size) => set({ fontSize: size }),

    // ========== 状态同步 ==========
    syncChatHistory: (messages) => set({ messages }),

    resetState: () => set(initialState)
  })
);

export const chatStore = useChatStore;
```

---

## 6. uiStore 组件

### 6.1 状态结构

```typescript
// stores/types/ui.ts

/**
 * 面板类型
 */
export type PanelType = 'character' | 'inventory' | 'spellbook' | 'party' | 'journal' | 'settings';

/**
 * 对话框类型
 */
export type DialogType =
  | 'confirm'
  | 'alert'
  | 'prompt'
  | 'character-creation'
  | 'level-up'
  | 'save-game'
  | 'load-game'
  | 'settings';

/**
 * 聊天位置
 */
export type ChatPosition = 'left' | 'right' | 'bottom';

/**
 * UI 状态
 */
export interface UIState {
  // 面板状态
  activePanel: PanelType | null;
  panelCollapsed: Record<string, boolean>;
  panelSize: Record<string, number>; // 面板大小（宽度）

  // 对话框状态
  activeDialog: DialogType | null;
  dialogData: Record<string, any>;

  // 主题设置
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;

  // 字体设置
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;

  // 音量设置
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;

  // 布局设置
  sidebarCollapsed: boolean;
  chatPosition: ChatPosition;
  chatSize: number; // 聊天框大小百分比
  gameViewMode: 'fit' | 'fill' | 'center';

  // 显示设置
  showGrid: boolean;
  showCoordinates: boolean;
  showHealthBars: boolean;
  showNames: boolean;

  // 通知设置
  enableNotifications: boolean;
  enableSoundEffects: boolean;
  enableMusic: boolean;

  // 自动保存
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // 分钟
}

/**
 * 对话框数据
 */
export interface DialogData {
  confirm?: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  };
  alert?: {
    title: string;
    message: string;
    onOk: () => void;
  };
  prompt?: {
    title: string;
    message: string;
    defaultValue?: string;
    onSubmit: (value: string) => void;
    onCancel?: () => void;
  };
}
```

### 6.2 操作接口

```typescript
// stores/types/ui.ts

/**
 * UI Store 操作
 */
export interface UIActions {
  // ========== 面板管理 ==========
  /**
   * 设置活动面板
   */
  setActivePanel: (panel: UIState['activePanel']) => void;

  /**
   * 切换面板
   */
  togglePanel: (panelId: string) => void;

  /**
   * 折叠/展开面板
   */
  setPanelCollapsed: (panelId: string, collapsed: boolean) => void;

  /**
   * 设置面板大小
   */
  setPanelSize: (panelId: string, size: number) => void;

  // ========== 对话框管理 ==========
  /**
   * 打开对话框
   */
  openDialog: (dialogId: DialogType, data?: any) => void;

  /**
   * 打开确认对话框
   */
  openConfirmDialog: (data: DialogData['confirm']) => void;

  /**
   * 打开警告对话框
   */
  openAlertDialog: (data: DialogData['alert']) => void;

  /**
   * 打开输入对话框
   */
  openPromptDialog: (data: DialogData['prompt']) => void;

  /**
   * 关闭对话框
   */
  closeDialog: () => void;

  // ========== 主题设置 ==========
  /**
   * 设置主题
   */
  setTheme: (theme: UIState['theme']) => void;

  /**
   * 设置强调色
   */
  setAccentColor: (color: string) => void;

  // ========== 字体设置 ==========
  /**
   * 设置字体大小
   */
  setFontSize: (size: UIState['fontSize']) => void;

  /**
   * 设置字体族
   */
  setFontFamily: (family: string) => void;

  // ========== 音量设置 ==========
  /**
   * 设置音量
   */
  setVolume: (type: 'master' | 'sfx' | 'music' | 'ambient', value: number) => void;

  /**
   * 静音/取消静音
   */
  toggleMute: () => void;

  // ========== 布局管理 ==========
  /**
   * 切换侧边栏
   */
  toggleSidebar: () => void;

  /**
   * 设置聊天位置
   */
  setChatPosition: (position: ChatPosition) => void;

  /**
   * 设置聊天大小
   */
  setChatSize: (size: number) => void;

  /**
   * 设置游戏视图模式
   */
  setGameViewMode: (mode: UIState['gameViewMode']) => void;

  // ========== 显示设置 ==========
  /**
   * 设置显示选项
   */
  setShowGrid: (show: boolean) => void;
  setShowCoordinates: (show: boolean) => void;
  setShowHealthBars: (show: boolean) => void;
  setShowNames: (show: boolean) => void;

  // ========== 通知设置 ==========
  /**
   * 设置通知
   */
  setEnableNotifications: (enabled: boolean) => void;
  setEnableSoundEffects: (enabled: boolean) => void;
  setEnableMusic: (enabled: boolean) => void;

  // ========== 自动保存 ==========
  /**
   * 设置自动保存
   */
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;

  // ========== 重置 ==========
  /**
   * 重置为默认设置
   */
  resetToDefaults: () => void;
}
```

### 6.3 Store 实现

```typescript
// stores/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UIState, UIActions, DialogType, ChatPosition } from './types/ui';

const defaultState: UIState = {
  activePanel: null,
  panelCollapsed: {},
  panelSize: {},
  activeDialog: null,
  dialogData: {},
  theme: 'dark',
  accentColor: '#4a9eff',
  fontSize: 'medium',
  fontFamily: 'system-ui',
  masterVolume: 100,
  sfxVolume: 100,
  musicVolume: 50,
  ambientVolume: 30,
  sidebarCollapsed: false,
  chatPosition: 'right',
  chatSize: 30,
  gameViewMode: 'fit',
  showGrid: true,
  showCoordinates: false,
  showHealthBars: true,
  showNames: true,
  enableNotifications: true,
  enableSoundEffects: true,
  enableMusic: true,
  autoSaveEnabled: true,
  autoSaveInterval: 5
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    immer((set, get) => ({
      ...defaultState,

      // ========== 面板管理 ==========
      setActivePanel: (panel) => set({ activePanel: panel }),

      togglePanel: (panelId) => set((state) => {
        state.panelCollapsed[panelId] = !state.panelCollapsed[panelId];
      }),

      setPanelCollapsed: (panelId, collapsed) => set((state) => {
        state.panelCollapsed[panelId] = collapsed;
      }),

      setPanelSize: (panelId, size) => set((state) => {
        state.panelSize[panelId] = size;
      }),

      // ========== 对话框管理 ==========
      openDialog: (dialogId, data) => set((state) => {
        state.activeDialog = dialogId;
        state.dialogData = data || {};
      }),

      openConfirmDialog: (data) => set((state) => {
        state.activeDialog = 'confirm';
        state.dialogData = { confirm: data };
      }),

      openAlertDialog: (data) => set((state) => {
        state.activeDialog = 'alert';
        state.dialogData = { alert: data };
      }),

      openPromptDialog: (data) => set((state) => {
        state.activeDialog = 'prompt';
        state.dialogData = { prompt: data };
      }),

      closeDialog: () => set((state) => {
        state.activeDialog = null;
        state.dialogData = {};
      }),

      // ========== 主题设置 ==========
      setTheme: (theme) => set({ theme }),

      setAccentColor: (color) => set({ accentColor: color }),

      // ========== 字体设置 ==========
      setFontSize: (size) => set({ fontSize: size }),

      setFontFamily: (family) => set({ fontFamily: family }),

      // ========== 音量设置 ==========
      setVolume: (type, value) => set((state) => {
        switch (type) {
          case 'master':
            state.masterVolume = value;
            break;
          case 'sfx':
            state.sfxVolume = value;
            break;
          case 'music':
            state.musicVolume = value;
            break;
          case 'ambient':
            state.ambientVolume = value;
            break;
        }
      }),

      toggleMute: () => set((state) => {
        if (state.masterVolume > 0) {
          state.masterVolume = 0;
        } else {
          state.masterVolume = 100;
        }
      }),

      // ========== 布局管理 ==========
      toggleSidebar: () => set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      }),

      setChatPosition: (position) => set({ chatPosition: position }),

      setChatSize: (size) => set({ chatSize: Math.max(20, Math.min(50, size)) }),

      setGameViewMode: (mode) => set({ gameViewMode: mode }),

      // ========== 显示设置 ==========
      setShowGrid: (show) => set({ showGrid: show }),
      setShowCoordinates: (show) => set({ showCoordinates: show }),
      setShowHealthBars: (show) => set({ showHealthBars: show }),
      setShowNames: (show) => set({ showNames: show }),

      // ========== 通知设置 ==========
      setEnableNotifications: (enabled) => set({ enableNotifications: enabled }),
      setEnableSoundEffects: (enabled) => set({ enableSoundEffects: enabled }),
      setEnableMusic: (enabled) => set({ enableMusic: enabled }),

      // ========== 自动保存 ==========
      setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
      setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),

      // ========== 重置 ==========
      resetToDefaults: () => set(defaultState)
    }))
  ),
  {
    name: 'dnd-ui-settings',
    partialize: (state) => ({
      theme: state.theme,
      accentColor: state.accentColor,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      masterVolume: state.masterVolume,
      sfxVolume: state.sfxVolume,
      musicVolume: state.musicVolume,
      ambientVolume: state.ambientVolume,
      sidebarCollapsed: state.sidebarCollapsed,
      chatPosition: state.chatPosition,
      chatSize: state.chatSize,
      gameViewMode: state.gameViewMode,
      showGrid: state.showGrid,
      showCoordinates: state.showCoordinates,
      showHealthBars: state.showHealthBars,
      showNames: state.showNames,
      enableNotifications: state.enableNotifications,
      enableSoundEffects: state.enableSoundEffects,
      enableMusic: state.enableMusic,
      autoSaveEnabled: state.autoSaveEnabled,
      autoSaveInterval: state.autoSaveInterval
    })
  }
);

export const uiStore = useUIStore;
```

---

## 7. connectionStore 组件

### 7.1 状态结构

```typescript
// stores/types/connection.ts

/**
 * 连接状态类型
 */
export type ConnectionStatusType =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * 连接状态
 */
export interface ConnectionState {
  // 连接状态
  status: ConnectionStatusType;
  lastConnected: number | null;
  lastDisconnected: number | null;

  // 重连状态
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;

  // 错误信息
  lastError: string | null;
  errorCode: string | null;

  // 连接统计
  messagesSent: number;
  messagesReceived: number;
  totalBytesSent: number;
  totalBytesReceived: number;

  // 延迟
  latency: number | null;

  // 配置
  autoReconnect: boolean;
  heartbeatInterval: number;
}
```

### 7.2 操作接口

```typescript
// stores/types/connection.ts

/**
 * 连接 Store 操作
 */
export interface ConnectionActions {
  // ========== 连接控制 ==========
  /**
   * 连接
   */
  connect: () => void;

  /**
   * 断开连接
   */
  disconnect: () => void;

  /**
   * 重连
   */
  reconnect: () => void;

  // ========== 状态更新 ==========
  /**
   * 设置状态
   */
  setStatus: (status: ConnectionStatusType) => void;

  /**
   * 设置错误
   */
  setError: (error: string | null, code?: string) => void;

  /**
   * 更新重连状态
   */
  updateReconnectState: (attempts: number, delay: number) => void;

  // ========== 统计 ==========
  /**
   * 记录发送消息
   */
  recordMessageSent: (bytes: number) => void;

  /**
   * 记录接收消息
   */
  recordMessageReceived: (bytes: number) => void;

  /**
   * 更新延迟
   */
  updateLatency: (latency: number) => void;

  // ========== 配置 ==========
  /**
   * 设置自动重连
   */
  setAutoReconnect: (enabled: boolean) => void;

  /**
   * 设置心跳间隔
   */
  setHeartbeatInterval: (interval: number) => void;

  // ========== 重置 ==========
  /**
   * 重置统计
   */
  resetStats: () => void;

  /**
   * 重置状态
   */
  resetState: () => void;
}
```

### 7.3 Store 实现

```typescript
// stores/connectionStore.ts
import { createStore } from './createStore';
import { ConnectionState, ConnectionActions, ConnectionStatusType } from './types/connection';
import { websocketClient } from '@/services/websocket';

const initialState: ConnectionState = {
  status: 'disconnected',
  lastConnected: null,
  lastDisconnected: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  lastError: null,
  errorCode: null,
  messagesSent: 0,
  messagesReceived: 0,
  totalBytesSent: 0,
  totalBytesReceived: 0,
  latency: null,
  autoReconnect: true,
  heartbeatInterval: 30000
};

export const useConnectionStore = createStore<ConnectionState, ConnectionActions>(
  'ConnectionStore',
  initialState,
  (set, get) => ({
    ...initialState,

    // ========== 连接控制 ==========
    connect: () => {
      set({ status: 'connecting', lastError: null, errorCode: null });
      websocketClient.connect();
    },

    disconnect: () => {
      set({ status: 'disconnected' });
      websocketClient.disconnect();
    },

    reconnect: () => {
      websocketClient.reconnect();
    },

    // ========== 状态更新 ==========
    setStatus: (status) => set((state) => {
      const now = Date.now();

      state.status = status;

      if (status === 'connected') {
        state.lastConnected = now;
        state.reconnectAttempts = 0;
      } else if (status === 'disconnected' || status === 'error') {
        state.lastDisconnected = now;
      }
    }),

    setError: (error, code) => set({
      lastError: error,
      errorCode: code ?? null
    }),

    updateReconnectState: (attempts, delay) => set((state) => {
      state.reconnectAttempts = attempts;
      state.reconnectDelay = delay;
      state.status = 'reconnecting';
    }),

    // ========== 统计 ==========
    recordMessageSent: (bytes) => set((state) => {
      state.messagesSent++;
      state.totalBytesSent += bytes;
    }),

    recordMessageReceived: (bytes) => set((state) => {
      state.messagesReceived++;
      state.totalBytesReceived += bytes;
    }),

    updateLatency: (latency) => set({ latency }),

    // ========== 配置 ==========
    setAutoReconnect: (enabled) => set({ autoReconnect: enabled }),

    setHeartbeatInterval: (interval) => set({ heartbeatInterval: interval }),

    // ========== 重置 ==========
    resetStats: () => set((state) => ({
      messagesSent: 0,
      messagesReceived: 0,
      totalBytesSent: 0,
      totalBytesReceived: 0
    })),

    resetState: () => set(initialState)
  })
);

export const connectionStore = useConnectionStore;
```

---

## 8. 中间件组件

### 8.1 日志中间件

```typescript
// stores/middleware/logger.ts
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<T, [], Mps>
) => StateCreator<T, [], Mps>;

export const logger: Logger = (config) => (set, get, api) =>
  config(
    (args) => {
      const prevState = get();
      set(args);
      const nextState = get();

      if (process.env.NODE_ENV === 'development') {
        console.group('%cState Update', 'color: #4a9eff; font-weight: bold');
        console.log('%cPrev State', 'color: #ff6b6b', prevState);
        console.log('%cNext State', 'color: #51cf66', nextState);
        console.groupEnd();
      }
    },
    get,
    api
  );
```

### 8.2 同步中间件

```typescript
// stores/middleware/sync.ts
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Sync = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<T, [], Mps>,
  storeName: string
) => StateCreator<T, [], Mps>;

export const sync: Sync = (config, storeName) => (set, get, api) =>
  config(
    (args) => {
      set(args);

      // 通过 DOM 事件通知游戏引擎
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store-updated', {
          detail: {
            store: storeName,
            state: get()
          }
        }));
      }
    },
    get,
    api
  );
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：组件设计师
