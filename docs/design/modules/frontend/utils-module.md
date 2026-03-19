# 工具模块设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属子系统**: Web 前端子系统

---

## 1. 模块概述

### 1.1 模块职责

工具模块提供前端子系统的通用基础设施，包括：

- **共享类型定义**：所有模块共用的类型定义（单一数据源）
- 自定义 React Hooks
- 通用工具函数
- 常量定义

### 1.2 设计原则

- **无依赖**：工具模块不依赖其他业务模块
- **纯函数**：工具函数应该是纯函数，无副作用
- **类型完整**：所有共享类型定义应该完整且准确，作为单一数据源
- **可复用**：所有内容都应该可以在多个地方复用

> **重要说明**：本模块是前端子系统中所有共享类型的**唯一定义位置**。其他模块（如 state-module、communication-module）如需使用这些类型，必须从此处引用，不得重复定义。

### 1.3 模块边界

**包含**：
- 共享类型定义（游戏、角色、战斗、物品、法术、地图、消息等）
- 自定义 Hooks
- 工具函数
- 常量定义

**不包含**：
- 业务逻辑
- UI 组件
- 状态管理（Store 内部类型在 state-module 中定义）
- 网络通信

---

## 2. 目录结构

```
src/
├── types/                        # 类型定义
│   ├── game.ts                   # 游戏相关类型
│   ├── character.ts              # 角色相关类型
│   ├── combat.ts                 # 战斗相关类型
│   ├── item.ts                   # 物品相关类型
│   ├── spell.ts                  # 法术相关类型
│   ├── map.ts                    # 地图相关类型
│   ├── message.ts                # 消息相关类型
│   ├── api.ts                    # API 相关类型
│   └── index.ts
│
├── events/                       # 事件总线（统一事件定义）
│   ├── index.ts                  # 统一导出 eventBus 和 GameEvents
│   ├── eventBus.ts               # 类型安全的事件总线
│   └── gameEvents.ts             # 游戏事件类型常量
│
├── hooks/                        # 自定义 Hooks
│   ├── useWebSocket.ts           # WebSocket Hook
│   ├── useGame.ts                # 游戏 Hook
│   ├── useCombat.ts              # 战斗 Hook
│   ├── useCharacter.ts           # 角色 Hook
│   ├── useInventory.ts           # 背包 Hook
│   ├── useDialog.ts              # 对话框 Hook
│   ├── useToast.ts               # Toast Hook
│   ├── useKeyPress.ts            # 按键 Hook
│   ├── useDebounce.ts            # 防抖 Hook
│   ├── useThrottle.ts            # 节流 Hook
│   ├── useLocalStorage.ts        # 本地存储 Hook
│   └── index.ts
│
├── utils/                        # 工具函数
│   ├── formatting.ts             # 格式化工具
│   ├── calculation.ts            # 计算工具
│   ├── validation.ts             # 验证工具
│   ├── random.ts                 # 随机工具
│   ├── id.ts                     # ID 生成工具
│   ├── object.ts                 # 对象工具
│   ├── array.ts                  # 数组工具
│   ├── date.ts                   # 日期工具
│   └── index.ts
│
└── constants/                    # 常量定义
    ├── game.ts                   # 游戏常量
    ├── character.ts              # 角色常量
    ├── combat.ts                 # 战斗常量
    ├── ui.ts                     # UI 常量
    └── index.ts
```

---

## 3. 类型定义

### 3.1 游戏类型

```typescript
// types/game.ts

// 游戏模式
export type GameMode = 'exploration' | 'combat' | 'dialogue';

// 游戏时间
export interface GameTime {
  day: number;
  hour: number;
  minute: number;
}

// 会话
export interface Session {
  id: string;
  name: string;
  scenarioId: string;
  createdAt: number;
  updatedAt: number;
  gameTime: GameTime;
}

// 存档
export interface Save {
  id: string;
  sessionId: string;
  name: string;
  createdAt: number;
  snapshotPath: string;
}

// 剧本
export interface Scenario {
  id: string;
  name: string;
  description: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  name: string;
  objectives: Objective[];
}

export interface Objective {
  id: string;
  description: string;
  completed: boolean;
}
```

### 3.2 角色类型

```typescript
// types/character.ts

// 种族
export type Race =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'dragonborn'
  | 'gnome'
  | 'half-elf'
  | 'half-orc'
  | 'tiefling';

// 职业
export type Class =
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard';

// 属性
export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// 属性修正值
export type StatName = keyof Stats;

// 技能
export type Skill =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival';

// 状态效果
export type Condition =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

// 角色完整定义
export interface Character {
  id: string;
  name: string;
  race: Race;
  class: Class;
  level: number;
  experience: number;

  // 属性
  stats: Stats;
  savingThrows: Record<StatName, boolean>;
  skills: Record<Skill, boolean>;

  // 战斗属性
  hp: number;
  maxHp: number;
  temporaryHp: number;
  ac: number;
  speed: number;
  initiative: number;
  proficiencyBonus: number;

  // 状态
  conditions: Condition[];
  deathSaves: { successes: number; failures: number };

  // 装备
  equipment: Equipment;

  // 法术
  spellcasting?: Spellcasting;
}

// 装备
export interface Equipment {
  mainHand: EquippedItem | null;
  offHand: EquippedItem | null;
  armor: EquippedItem | null;
  helmet: EquippedItem | null;
  cloak: EquippedItem | null;
  amulet: EquippedItem | null;
  ring1: EquippedItem | null;
  ring2: EquippedItem | null;
  belt: EquippedItem | null;
  boots: EquippedItem | null;
}

// 施法能力
export interface Spellcasting {
  ability: StatName;
  spellSlots: Record<number, { current: number; max: number }>;
  preparedSpells: string[];
  knownSpells: string[];
  concentration: string | null;
}
```

### 3.3 战斗类型

```typescript
// types/combat.ts

// 战斗单位
export interface CombatUnit {
  id: string;
  characterId: string | null;  // null 表示敌人
  name: string;
  team: 'player' | 'enemy' | 'neutral';

  // 位置
  position: Position;

  // 状态
  hp: number;
  maxHp: number;
  ac: number;
  conditions: Condition[];

  // 回合状态
  hasActed: boolean;
  hasMoved: boolean;
  hasBonusAction: boolean;
  hasReaction: boolean;
}

// 位置
export interface Position {
  x: number;
  y: number;
}

// 先攻条目
export interface InitiativeEntry {
  unitId: string;
  initiative: number;
  dexterity: number;
}

// 战斗行动类型
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
  | 'end_turn';

// 战斗事件
export interface CombatEvent {
  id: string;
  type: CombatEventType;
  sourceId: string;
  targetId?: string;
  data: any;
  timestamp: number;
}

export type CombatEventType =
  | 'attack'
  | 'damage'
  | 'heal'
  | 'spell_cast'
  | 'condition_apply'
  | 'condition_remove'
  | 'move'
  | 'turn_start'
  | 'turn_end'
  | 'round_start'
  | 'combat_start'
  | 'combat_end';
```

### 3.4 物品类型

```typescript
// types/item.ts

// 物品类型
export type ItemType =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'ring'
  | 'amulet'
  | 'tool'
  | 'misc';

// 武器类型
export type WeaponType =
  | 'simple_melee'
  | 'simple_ranged'
  | 'martial_melee'
  | 'martial_ranged';

// 伤害类型
export type DamageType =
  | 'bludgeoning'
  | 'piercing'
  | 'slashing'
  | 'acid'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'thunder';

// 物品
export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  weight: number;
  value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
  requiresAttunement: boolean;
  properties: ItemProperty[];
}

// 武器
export interface Weapon extends Item {
  type: 'weapon';
  weaponType: WeaponType;
  damage: { dice: string; type: DamageType };
  range: { normal: number; long?: number };
  properties: WeaponProperty[];
}

// 护甲
export interface Armor extends Item {
  type: 'armor';
  armorType: 'light' | 'medium' | 'heavy' | 'shield';
  ac: number;
  maxDex: number;
  stealthDisadvantage: boolean;
  strengthRequired: number;
}

// 装备槽
export type EquipmentSlot = keyof Equipment;

// 装备中的物品
export interface EquippedItem extends Item {
  quantity: number;
  isAttuned: boolean;
}
```

### 3.5 法术类型

```typescript
// types/spell.ts

// 法术等级
export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 法术学派
export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation';

// 施法时间
export type CastingTime = 'action' | 'bonus_action' | 'reaction' | 'minute' | 'hour';

// 法术范围
export interface SpellRange {
  type: 'self' | 'touch' | 'range' | 'sight';
  value?: number;
}

// 法术
export interface Spell {
  id: string;
  name: string;
  level: SpellLevel;
  school: SpellSchool;
  castingTime: CastingTime;
  castingTimeValue?: number;
  range: SpellRange;
  components: {
    verbal: boolean;
    somatic: boolean;
    material?: string;
  };
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevels?: string;
  classes: Class[];
}
```

### 3.6 地图类型

```typescript
// types/map.ts

// 地图类型
export type MapType = 'world' | 'scene';

// 瓦片
export interface Tile {
  id: string;
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  properties: Record<string, any>;
}

export type TileType =
  | 'floor'
  | 'wall'
  | 'water'
  | 'pit'
  | 'door'
  | 'stairs_up'
  | 'stairs_down';

// 地点
export interface Location {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  type: LocationType;
  visited: boolean;
  sceneMapId?: string;
}

export type LocationType =
  | 'town'
  | 'village'
  | 'dungeon'
  | 'forest'
  | 'mountain'
  | 'ruins'
  | 'castle';

// 场景地图
export interface SceneMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  walls: { x: number; y: number; width: number; height: number }[];
  objects: MapObject[];
  spawnPoints: { id: string; position: Position }[];
}

// 地图对象
export interface MapObject {
  id: string;
  type: string;
  position: Position;
  properties: Record<string, any>;
  interactable: boolean;
}
```

### 3.7 消息类型

```typescript
// types/message.ts

// 消息类型
export type MessageType = 'user' | 'dm' | 'system' | 'dice_roll' | 'combat_event';

// 基础消息
export interface BaseMessage {
  id: string;
  type: MessageType;
  timestamp: number;
}

// 用户消息
export interface UserMessage extends BaseMessage {
  type: 'user';
  content: string;
}

// DM 消息
export interface DMMessage extends BaseMessage {
  type: 'dm';
  content: string;
}

// 系统消息
export interface SystemMessage extends BaseMessage {
  type: 'system';
  content: string;
  level: 'info' | 'warning' | 'error';
}

// 掷骰消息
export interface DiceRollMessage extends BaseMessage {
  type: 'dice_roll';
  rollType: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
}

// 聊天消息联合类型
export type ChatMessage = UserMessage | DMMessage | SystemMessage | DiceRollMessage;
```

---

## 4. 自定义 Hooks

### 4.1 游戏 Hooks

```typescript
// hooks/useGame.ts
export function useGame() {
  const sessionId = useGameStore(state => state.sessionId);
  const gameMode = useGameStore(state => state.gameMode);
  const gameTime = useGameStore(state => state.gameTime);

  return {
    sessionId,
    gameMode,
    gameTime,
    isInCombat: gameMode === 'combat',
    isExploring: gameMode === 'exploration',
  };
}
```

### 4.2 角色 Hooks

```typescript
// hooks/useCharacter.ts
export function useCharacter(characterId: string) {
  const character = useGameStore(
    state => state.characters.find(c => c.id === characterId),
    shallow
  );

  const updateCharacter = useGameStore(state => state.updateCharacter);

  return {
    character,
    stats: character?.stats,
    hp: character?.hp,
    maxHp: character?.maxHp,
    ac: character?.ac,
    conditions: character?.conditions,
    equipment: character?.equipment,

    isAlive: character && character.hp > 0,
    isUnconscious: character && character.hp <= 0,
    hpPercentage: character ? (character.hp / character.maxHp) * 100 : 0,

    update: (data: Partial<Character>) => updateCharacter(characterId, data),
  };
}
```

### 4.3 战斗 Hooks

```typescript
// hooks/useCombat.ts
export function useCombat() {
  const isActive = useCombatStore(state => state.isActive);
  const currentUnitId = useCombatStore(state => state.currentUnitId);
  const currentTurn = useCombatStore(state => state.currentTurn);
  const roundNumber = useCombatStore(state => state.roundNumber);
  const initiativeOrder = useCombatStore(state => state.initiativeOrder);

  const currentUnit = useCombatStore(
    state => state.units.find(u => u.id === currentUnitId)
  );

  const requestMove = useCombatStore(state => state.requestMove);
  const requestAttack = useCombatStore(state => state.requestAttack);
  const requestEndTurn = useCombatStore(state => state.requestEndTurn);

  return {
    isActive,
    currentUnitId,
    currentUnit,
    currentTurn,
    roundNumber,
    initiativeOrder,

    isPlayerTurn: currentUnit?.team === 'player',
    isEnemyTurn: currentUnit?.team === 'enemy',

    move: requestMove,
    attack: requestAttack,
    endTurn: requestEndTurn,
  };
}
```

### 4.4 背包 Hooks

```typescript
// hooks/useInventory.ts
export function useInventory(characterId: string) {
  const inventory = useGameStore(state => state.partyInventory);
  const addToInventory = useGameStore(state => state.addToInventory);
  const removeFromInventory = useGameStore(state => state.removeFromInventory);

  const character = useGameStore(
    state => state.characters.find(c => c.id === characterId)
  );

  const equippedItems = character?.equipment
    ? Object.values(character.equipment).filter(Boolean)
    : [];

  return {
    inventory,
    equippedItems,
    totalWeight: inventory.reduce((sum, item) => sum + item.weight * item.quantity, 0),

    addItem: addToInventory,
    removeItem: removeFromInventory,
  };
}
```

### 4.5 对话框 Hooks

```typescript
// hooks/useDialog.ts
export function useDialog(dialogId: string) {
  const activeDialog = useUIStore(state => state.activeDialog);
  const dialogData = useUIStore(state => state.dialogData);
  const openDialog = useUIStore(state => state.openDialog);
  const closeDialog = useUIStore(state => state.closeDialog);

  return {
    isOpen: activeDialog === dialogId,
    data: activeDialog === dialogId ? dialogData : null,

    open: (data?: any) => openDialog(dialogId, data),
    close: closeDialog,
  };
}
```

### 4.6 Toast Hooks

```typescript
// hooks/useToast.ts
interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, options?: ToastOptions) => {
    const id = generateId();
    const toast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration: options?.duration || 3000,
    };

    setToasts(prev => [...prev, toast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration);
  }, []);

  return {
    toasts,
    show,
    success: (message: string) => show(message, { type: 'success' }),
    error: (message: string) => show(message, { type: 'error' }),
    warning: (message: string) => show(message, { type: 'warning' }),
    info: (message: string) => show(message, { type: 'info' }),
  };
}
```

### 4.7 通用 Hooks

```typescript
// hooks/useKeyPress.ts
export function useKeyPress(targetKey: string): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const downHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(true);
      }
    };

    const upHandler = ({ key }: KeyboardEvent) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return keyPressed;
}

// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
```

---

## 5. 工具函数

### 5.1 格式化工具

```typescript
// utils/formatting.ts

// 格式化属性修正值
export function formatModifier(value: number): string {
  const modifier = Math.floor((value - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

// 格式化 HP 显示
export function formatHP(current: number, max: number): string {
  return `${current}/${max}`;
}

// 格式化距离（英尺 -> 格）
export function formatDistance(feet: number): string {
  const squares = Math.floor(feet / 5);
  return `${squares} 格 (${feet} 尺)`;
}

// 格式化时间
export function formatGameTime(time: GameTime): string {
  const hour = time.hour.toString().padStart(2, '0');
  const minute = time.minute.toString().padStart(2, '0');
  return `第 ${time.day} 天 ${hour}:${minute}`;
}

// 格式化掷骰公式
export function formatDiceFormula(dice: string, modifier: number): string {
  if (modifier === 0) return dice;
  if (modifier > 0) return `${dice}+${modifier}`;
  return `${dice}${modifier}`;
}
```

### 5.2 计算工具

```typescript
// utils/calculation.ts

// 计算属性修正值
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// 计算熟练加值
export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

// 计算技能加值
export function calculateSkillBonus(
  statValue: number,
  proficient: boolean,
  proficiencyBonus: number,
  expertise: boolean = false
): number {
  const modifier = calculateModifier(statValue);
  if (!proficient) return modifier;
  return modifier + proficiencyBonus * (expertise ? 2 : 1);
}

// 计算 AC（无护甲）
export function calculateUnarmoredAC(
  dex: number,
  monk: boolean = false,
  wis: number = 10
): number {
  if (monk) {
    return 10 + calculateModifier(dex) + calculateModifier(wis);
  }
  return 10 + calculateModifier(dex);
}

// 计算负重
export function calculateCarryCapacity(strength: number): number {
  return strength * 15;
}

// 计算经验等级
export function calculateLevelFromXP(xp: number): number {
  const thresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
                      85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000,
                      305000, 355000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) return i + 1;
  }
  return 1;
}
```

### 5.3 验证工具

```typescript
// utils/validation.ts

// 验证角色名
export function validateCharacterName(name: string): boolean {
  return name.length >= 1 && name.length <= 50;
}

// 验证属性值
export function validateStatValue(value: number): boolean {
  return value >= 1 && value <= 30;
}

// 验证等级
export function validateLevel(level: number): boolean {
  return level >= 1 && level <= 20;
}

// 验证 HP
export function validateHP(hp: number, maxHp: number): boolean {
  return hp >= 0 && hp <= maxHp;
}

// 验证位置
export function validatePosition(
  pos: Position,
  bounds: { width: number; height: number }
): boolean {
  return pos.x >= 0 && pos.x < bounds.width &&
         pos.y >= 0 && pos.y < bounds.height;
}
```

### 5.4 随机工具

```typescript
// utils/random.ts

// 生成随机整数 [min, max]
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 掷骰子
export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => randomInt(1, sides));
}

// 解析掷骰公式 "2d6+3"
export function parseDiceFormula(formula: string): { count: number; sides: number; modifier: number } {
  const match = formula.match(/(\d+)?d(\d+)([+-]\d+)?/i);
  if (!match) throw new Error(`Invalid dice formula: ${formula}`);

  return {
    count: parseInt(match[1] || '1'),
    sides: parseInt(match[2]),
    modifier: parseInt(match[3] || '0'),
  };
}

// 执行掷骰
export function executeRoll(formula: string): { rolls: number[]; total: number } {
  const { count, sides, modifier } = parseDiceFormula(formula);
  const rolls = rollDice(count, sides);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  return { rolls, total };
}

// 从数组中随机选择
export function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

// 打乱数组
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### 5.5 ID 生成工具

```typescript
// utils/id.ts

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 生成短 ID
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

// 生成请求 ID
export function generateRequestId(): string {
  return `req-${generateId()}`;
}
```

### 5.6 对象/数组工具

```typescript
// utils/object.ts

// 深拷贝
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// 深合并
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(result[key], source[key]!);
      } else {
        result[key] = source[key]!;
      }
    }
  }
  return result;
}

// 挑选属性
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// utils/array.ts

// 分组
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<K, T[]>);
}

// 去重
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// 按属性去重
export function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

---

## 6. 常量定义

### 6.1 游戏常量

```typescript
// constants/game.ts

// 属性名
export const STAT_NAMES: Record<StatName, string> = {
  strength: '力量',
  dexterity: '敏捷',
  constitution: '体质',
  intelligence: '智力',
  wisdom: '感知',
  charisma: '魅力',
};

// 技能名
export const SKILL_NAMES: Record<Skill, string> = {
  acrobatics: '杂技',
  animal_handling: '驯兽',
  arcana: '奥秘',
  athletics: '运动',
  deception: '欺瞒',
  history: '历史',
  insight: '洞察',
  intimidation: '威吓',
  investigation: '调查',
  medicine: '医药',
  nature: '自然',
  perception: '察觉',
  performance: '表演',
  persuasion: '说服',
  religion: '宗教',
  sleight_of_hand: '巧手',
  stealth: '隐匿',
  survival: '生存',
};

// 技能对应属性
export const SKILL_ABILITIES: Record<Skill, StatName> = {
  acrobatics: 'dexterity',
  animal_handling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleight_of_hand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

// 状态效果名
export const CONDITION_NAMES: Record<Condition, string> = {
  blinded: '目盲',
  charmed: '魅惑',
  deafened: '耳聋',
  exhaustion: '力竭',
  frightened: '恐惧',
  grappled: '擒抱',
  incapacitated: '失能',
  invisible: '隐形',
  paralyzed: '麻痹',
  petrified: '石化',
  poisoned: '中毒',
  prone: '倒地',
  restrained: '束缚',
  stunned: '震慑',
  unconscious: '昏迷',
};

// 种族名
export const RACE_NAMES: Record<Race, string> = {
  human: '人类',
  elf: '精灵',
  dwarf: '矮人',
  halfling: '半身人',
  dragonborn: '龙裔',
  gnome: '侏儒',
  'half-elf': '半精灵',
  'half-orc': '半兽人',
  tiefling: '提夫林',
};

// 职业名
export const CLASS_NAMES: Record<Class, string> = {
  barbarian: '野蛮人',
  bard: '吟游诗人',
  cleric: '牧师',
  druid: '德鲁伊',
  fighter: '战士',
  monk: '武僧',
  paladin: '圣武士',
  ranger: '游侠',
  rogue: '游荡者',
  sorcerer: '术士',
  warlock: '邪术师',
  wizard: '法师',
};
```

### 6.2 战斗常量

```typescript
// constants/combat.ts

// 网格大小（像素）
export const GRID_SIZE = 64;

// 移动速度（格/回合，基于种族）
export const BASE_SPEED = {
  normal: 6,    // 30 尺
  slow: 5,      // 25 尺
  fast: 8,      // 40 尺
};

// 行动类型
export const ACTION_TYPES = {
  main: ['attack', 'spell', 'item', 'dodge', 'dash', 'disengage', 'help', 'hide', 'ready'],
  bonus: ['offhand_attack', 'healing_word', 'misty_step'],
  reaction: ['opportunity_attack', 'shield', 'counterspell'],
};

// 伤害类型
export const DAMAGE_TYPE_NAMES: Record<DamageType, string> = {
  bludgeoning: '钝击',
  piercing: '穿刺',
  slashing: '挥砍',
  acid: '酸',
  cold: '寒冷',
  fire: '火焰',
  force: '力场',
  lightning: '闪电',
  necrotic: '死灵',
  poison: '毒素',
  psychic: '心灵',
  radiant: '光耀',
  thunder: '雷鸣',
};
```

### 6.3 UI 常量

```typescript
// constants/ui.ts

// 面板宽度
export const PANEL_WIDTH = {
  narrow: 280,
  normal: 320,
  wide: 400,
};

// Z-Index 层级
export const Z_INDEX = {
  base: 0,
  panel: 100,
  dialog: 200,
  toast: 300,
  tooltip: 400,
};

// 动画时长
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// 断点
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};
```

---

## 7. 事件总线

> **重要**：事件总线是前端模块间通信的统一机制。所有模块间通信都应通过 eventBus 进行，避免直接依赖和循环依赖。

### 7.1 事件类型定义

```typescript
// events/gameEvents.ts

// 事件类型常量
export enum GameEvents {
  // === 服务端消息事件 ===
  STATE_UPDATE = 'server:state_update',
  NARRATION = 'server:narration',
  COMBAT_EVENT = 'server:combat_event',
  DICE_RESULT = 'server:dice_result',
  ERROR = 'server:error',

  // === 客户端请求事件 ===
  USER_INPUT_REQUEST = 'client:user_input',
  COMBAT_ACTION_REQUEST = 'client:combat_action',
  MAP_ACTION_REQUEST = 'client:map_action',
  WEBSOCKET_CONNECT_REQUEST = 'client:ws_connect',
  WEBSOCKET_DISCONNECT_REQUEST = 'client:ws_disconnect',

  // === UI 事件 ===
  UI_CHARACTER_SELECT = 'ui:character_select',
  UI_ACTION_TRIGGER = 'ui:action_trigger',

  // === 游戏引擎事件 ===
  GAME_SCENE_READY = 'game:scene_ready',
  GAME_FOCUS_CHARACTER = 'game:focus_character',
  WORLDMAP_LOCATION_CLICK = 'worldmap:location_click',
  WORLDMAP_LOCATION_ENTER = 'worldmap:location_enter',
  SCENEMAP_TILE_CLICK = 'scenemap:tile_click',
  SCENEMAP_CHARACTER_SELECT = 'scenemap:character_select',
  SCENEMAP_INTERACT = 'scenemap:interact',
  COMBAT_CELL_CLICK = 'combat:cell_click',
  COMBAT_UNIT_SELECT = 'combat:unit_select',
  COMBAT_TARGET_SELECT = 'combat:target_select',
  COMBAT_MOVE_CONFIRM = 'combat:move_confirm',
  COMBAT_UNITS_UPDATED = 'combat:units_updated',
}
```

### 7.2 事件映射类型

```typescript
// events/eventBus.ts
import { EventEmitter } from 'events';
import { GameEvents } from './gameEvents';

// 类型安全的事件映射
interface GameEventMap {
  // === 来自服务端的消息事件 ===
  [GameEvents.STATE_UPDATE]: StateUpdatePayload;
  [GameEvents.NARRATION]: NarrationPayload;
  [GameEvents.COMBAT_EVENT]: CombatEventPayload;
  [GameEvents.DICE_RESULT]: DiceResultPayload;
  [GameEvents.ERROR]: ErrorPayload;

  // === 客户端请求事件（状态模块 -> 通信模块） ===
  [GameEvents.USER_INPUT_REQUEST]: { text: string };
  [GameEvents.COMBAT_ACTION_REQUEST]: {
    actionType: string;
    unitId: string;
    targetId?: string;
    spellId?: string;
    itemId?: string;
    position?: { x: number; y: number };
  };
  [GameEvents.MAP_ACTION_REQUEST]: {
    action: 'move' | 'interact' | 'examine';
    position?: { x: number; y: number };
    targetId?: string;
  };
  [GameEvents.WEBSOCKET_CONNECT_REQUEST]: void;
  [GameEvents.WEBSOCKET_DISCONNECT_REQUEST]: void;

  // === UI 事件 ===
  [GameEvents.UI_CHARACTER_SELECT]: { characterId: string };
  [GameEvents.UI_ACTION_TRIGGER]: { actionType: string; data: unknown };

  // === 游戏引擎事件 ===
  [GameEvents.GAME_SCENE_READY]: void;
  [GameEvents.GAME_FOCUS_CHARACTER]: { characterId: string };
  [GameEvents.WORLDMAP_LOCATION_CLICK]: { locationId: string };
  [GameEvents.WORLDMAP_LOCATION_ENTER]: { locationId: string };
  [GameEvents.SCENEMAP_TILE_CLICK]: { x: number; y: number };
  [GameEvents.SCENEMAP_CHARACTER_SELECT]: { characterId: string };
  [GameEvents.SCENEMAP_INTERACT]: { objectId: string };
  [GameEvents.COMBAT_CELL_CLICK]: { x: number; y: number };
  [GameEvents.COMBAT_UNIT_SELECT]: { unitId: string };
  [GameEvents.COMBAT_TARGET_SELECT]: { targetId: string };
  [GameEvents.COMBAT_MOVE_CONFIRM]: { position: { x: number; y: number } };
  [GameEvents.COMBAT_UNITS_UPDATED]: CombatUnit[];
}
```

### 7.3 类型安全的事件总线

```typescript
// events/eventBus.ts (续)

class TypedEventBus {
  private emitter = new EventEmitter();

  on<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): () => void {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  once<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): void {
    this.emitter.once(event, handler);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
}

export const eventBus = new TypedEventBus();
```

### 7.4 统一导出

```typescript
// events/index.ts
export { eventBus } from './eventBus';
export { GameEvents } from './gameEvents';
export type { GameEventMap } from './eventBus';
```

### 7.5 使用示例

```typescript
// 在其他模块中使用
import { eventBus, GameEvents } from '@/events';

// 发布事件
eventBus.emit(GameEvents.USER_INPUT_REQUEST, { text: '我想攻击哥布林' });

// 订阅事件
const unsubscribe = eventBus.on(GameEvents.STATE_UPDATE, (payload) => {
  console.log('状态更新:', payload);
});

// 取消订阅
unsubscribe();
```

---

## 8. 对外接口

### 7.1 统一导出

```typescript
// types/index.ts
export * from './game';
export * from './character';
export * from './combat';
export * from './item';
export * from './spell';
export * from './map';
export * from './message';
export * from './api';

// hooks/index.ts
export * from './useGame';
export * from './useCharacter';
export * from './useCombat';
export * from './useInventory';
export * from './useDialog';
export * from './useToast';
export * from './useKeyPress';
export * from './useDebounce';
export * from './useThrottle';
export * from './useLocalStorage';

// utils/index.ts
export * from './formatting';
export * from './calculation';
export * from './validation';
export * from './random';
export * from './id';
export * from './object';
export * from './array';
export * from './date';

// constants/index.ts
export * from './game';
export * from './combat';
export * from './ui';

// events/index.ts
export { eventBus, GameEvents } from './events';
export type { GameEventMap } from './events';
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：模块设计师
