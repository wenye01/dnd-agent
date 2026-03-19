# 游戏引擎模块设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属子系统**: Web 前端子系统

---

## 1. 模块概述

### 1.1 模块职责

游戏引擎模块基于 Phaser 3，负责游戏世界的渲染和交互，包括：

- 游戏场景管理（冒险地图、场景地图、战斗场景）
- 游戏实体渲染（角色、NPC、敌人）
- 地图渲染（瓦片地图、网格、墙壁）
- 特效系统（法术效果、伤害数字、动画）
- 游戏内 UI（血条、状态图标）
- 用户交互处理（点击、拖拽、选择）

### 1.2 设计原则

- **场景分离**：不同游戏模式使用独立场景
- **数据驱动**：渲染数据来自状态管理模块
- **事件驱动**：通过事件系统与 UI 模块通信
- **性能优先**：优化渲染性能，保持 60fps

### 1.3 模块边界

**包含**：
- Phaser 游戏实例和配置
- 所有游戏场景
- 游戏实体类
- 特效系统
- 游戏内 UI 元素

**不包含**：
- React UI 组件（由 UI 模块负责）
- 状态管理逻辑（由状态管理模块负责）
- 网络通信逻辑（由通信模块负责）
- 游戏规则计算（由后端负责）

---

## 2. 目录结构

```
game/
├── Game.ts                       # Phaser 游戏实例
├── config.ts                     # 游戏配置
├── constants.ts                  # 游戏常量
│
├── scenes/                       # 游戏场景
│   ├── BaseScene.ts              # 场景基类
│   ├── SceneManager.ts           # 场景管理器
│   │
│   ├── WorldMapScene/            # 冒险地图场景
│   │   ├── WorldMapScene.ts      # 场景主文件
│   │   ├── LocationMarker.ts     # 地点标记
│   │   ├── PathLine.ts           # 路径线
│   │   └── index.ts
│   │
│   ├── SceneMapScene/            # 场景地图场景
│   │   ├── SceneMapScene.ts      # 场景主文件
│   │   ├── TileMap.ts            # 瓦片地图
│   │   ├── WallLayer.ts          # 墙壁层
│   │   ├── ObjectLayer.ts        # 对象层
│   │   └── index.ts
│   │
│   ├── CombatScene/              # 战斗场景
│   │   ├── CombatScene.ts        # 场景主文件
│   │   ├── GridLayer.ts          # 网格层
│   │   ├── MoveRange.ts          # 移动范围
│   │   ├── TargetHighlight.ts    # 目标高亮
│   │   ├── TurnIndicator.ts      # 回合指示
│   │   └── index.ts
│   │
│   └── index.ts
│
├── entities/                     # 游戏实体
│   ├── BaseEntity.ts             # 实体基类
│   ├── Character.ts              # 玩家角色实体
│   ├── NPC.ts                    # NPC 实体
│   ├── Enemy.ts                  # 敌人实体
│   ├── Prop.ts                   # 道具/物品实体
│   └── index.ts
│
├── effects/                      # 特效系统
│   ├── EffectManager.ts          # 特效管理器
│   ├── SpellEffect.ts            # 法术特效
│   ├── DamageNumber.ts           # 伤害数字
│   ├── HealingEffect.ts          # 治疗特效
│   ├── StatusEffect.ts           # 状态特效
│   ├── ProjectileEffect.ts       # 投射物特效
│   └── index.ts
│
├── ui/                           # 游戏内 UI
│   ├── GameUIManager.ts          # UI 管理器
│   ├── HealthBar.ts              # 血条
│   ├── ManaBar.ts                # 法力条
│   ├── StatusIcon.ts             # 状态图标
│   ├── NameLabel.ts              # 名称标签
│   ├── SelectionRing.ts          # 选中圈
│   └── index.ts
│
├── utils/                        # 游戏工具
│   ├── GridUtils.ts              # 网格工具
│   ├── PathFinding.ts            # 寻路算法
│   ├── CoordinateUtils.ts        # 坐标转换
│   ├── AnimationUtils.ts         # 动画工具
│   └── index.ts
│
├── input/                        # 输入处理
│   ├── InputManager.ts           # 输入管理器
│   ├── TouchHandler.ts           # 触摸处理
│   ├── KeyboardHandler.ts        # 键盘处理
│   └── index.ts
│
└── assets/                       # 资源加载
    ├── AssetLoader.ts            # 资源加载器
    ├── AssetManifest.ts          # 资源清单
    └── index.ts
```

---

## 3. 对外接口

### 3.1 游戏实例接口

```typescript
// game/Game.ts
export interface GameInstance {
  phaser: Phaser.Game;
  sceneManager: SceneManager;
  effectManager: EffectManager;
  inputManager: InputManager;
  assetLoader: AssetLoader;

  // 场景切换
  switchScene(sceneKey: string, data?: SceneData): void;

  // 资源加载
  loadAssets(assets: AssetManifest): Promise<void>;

  // 事件系统
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, data?: any): void;

  // 销毁
  destroy(): void;
}

// 创建游戏实例
export function createGame(config: GameConfig): GameInstance;
```

### 3.2 场景接口

```typescript
// game/scenes/BaseScene.ts
export abstract class BaseScene extends Phaser.Scene {
  // 场景初始化
  abstract init(data: SceneData): void;

  // 资源预加载
  abstract preload(): void;

  // 场景创建
  abstract create(): void;

  // 更新循环
  abstract update(time: number, delta: number): void;

  // 场景暂停
  pause(): void;

  // 场景恢复
  resume(): void;

  // 场景关闭
  shutdown(): void;
}
```

### 3.3 实体接口

```typescript
// game/entities/BaseEntity.ts
export interface EntityConfig {
  id: string;
  name: string;
  position: { x: number; y: number };
  sprite: string;
  scale?: number;
}

export abstract class BaseEntity extends Phaser.GameObjects.Container {
  // 属性
  id: string;
  name: string;
  gridPosition: { x: number; y: number };

  // 方法
  moveTo(position: { x: number; y: number }, animated?: boolean): Promise<void>;
  setDirection(direction: Direction): void;
  playAnimation(key: string): void;
  setSelected(selected: boolean): void;

  // 生命周期
  update(time: number, delta: number): void;
  destroy(): void;
}
```

### 3.4 特效接口

```typescript
// game/effects/EffectManager.ts
export interface EffectConfig {
  type: EffectType;
  position: { x: number; y: number };
  target?: { x: number; y: number };
  duration?: number;
  data?: any;
}

export class EffectManager {
  // 播放特效
  play(config: EffectConfig): Promise<void>;

  // 停止所有特效
  stopAll(): void;

  // 预加载特效资源
  preload(scene: Phaser.Scene): void;
}
```

---

## 4. 组件划分

### 4.1 场景划分

#### WorldMapScene（冒险地图场景）

**职责**：
- 渲染世界地图背景
- 显示地点标记
- 显示当前位置
- 处理地点点击

**状态**：
```typescript
interface WorldMapState {
  locations: Location[];
  currentLocation: string;
  visitedLocations: string[];
  availablePaths: Path[];
}
```

**事件**（通过 eventBus）：
- `GameEvents.WORLDMAP_LOCATION_CLICK` - 地点被点击
- `GameEvents.WORLDMAP_LOCATION_ENTER` - 进入地点

#### SceneMapScene（场景地图场景）

**职责**：
- 渲染场景瓦片地图
- 显示角色和 NPC
- 处理角色移动交互
- 显示可交互对象

**状态**：
```typescript
interface SceneMapState {
  mapId: string;
  tiles: Tile[][];
  characters: Character[];
  npcs: NPC[];
  interactables: Interactable[];
}
```

**事件**（通过 eventBus）：
- `GameEvents.SCENEMAP_TILE_CLICK` - 瓦片被点击
- `GameEvents.SCENEMAP_CHARACTER_SELECT` - 角色被选中
- `GameEvents.SCENEMAP_INTERACT` - 与对象交互

#### CombatScene（战斗场景）

**职责**：
- 渲染战斗网格
- 显示所有战斗单位
- 处理移动范围显示
- 处理目标选择
- 显示回合指示

**状态**：
```typescript
interface CombatState {
  gridWidth: number;
  gridHeight: number;
  units: CombatUnit[];
  currentTurn: string;
  moveRange: { x: number; y: number }[];
  targetMode: boolean;
  validTargets: string[];
}
```

**事件**（通过 eventBus）：
- `GameEvents.COMBAT_CELL_CLICK` - 格子被点击
- `GameEvents.COMBAT_UNIT_SELECT` - 单位被选中
- `GameEvents.COMBAT_TARGET_SELECT` - 目标被选中
- `GameEvents.COMBAT_MOVE_CONFIRM` - 移动确认

### 4.2 实体划分

#### Character（玩家角色）

```typescript
class Character extends BaseEntity {
  // 属性
  hp: number;
  maxHp: number;
  ac: number;
  conditions: Condition[];

  // 组件
  healthBar: HealthBar;
  statusIcons: StatusIcon[];
  selectionRing: SelectionRing;

  // 方法
  takeDamage(amount: number): void;
  heal(amount: number): void;
  addCondition(condition: Condition): void;
  removeCondition(conditionId: string): void;
}
```

#### Enemy（敌人）

```typescript
class Enemy extends BaseEntity {
  // 属性
  hp: number;
  maxHp: number;
  cr: number;  // 挑战等级

  // 组件
  healthBar: HealthBar;
  nameLabel: NameLabel;
}
```

### 4.3 特效划分

| 特效类型 | 描述 | 触发场景 |
|----------|------|----------|
| SpellEffect | 法术释放特效 | 施放法术时 |
| DamageNumber | 伤害/治疗数字 | 造成伤害/治疗时 |
| ProjectileEffect | 投射物特效 | 远程攻击时 |
| StatusEffect | 状态效果特效 | 获得/失去状态时 |
| HealingEffect | 治疗特效 | 受到治疗时 |

---

## 5. 状态设计

游戏引擎模块从状态管理模块读取状态，不直接修改业务状态。

### 5.1 状态订阅

```typescript
// 在场景中订阅状态
class CombatScene extends BaseScene {
  private unsubscribe: () => void;

  create() {
    // 订阅战斗状态
    this.unsubscribe = useCombatStore.subscribe(
      (state) => state.units,
      (units) => this.updateUnits(units)
    );
  }

  shutdown() {
    this.unsubscribe();
  }
}
```

### 5.2 状态同步

```typescript
// 同步游戏状态到场景
class SceneManager {
  syncGameState(state: GameState) {
    const currentScene = this.getCurrentScene();
    if (currentScene && 'syncState' in currentScene) {
      currentScene.syncState(state);
    }
  }
}
```

### 5.3 交互状态

```typescript
// 交互相关状态由场景内部管理
interface InteractionState {
  selectedUnit: string | null;
  hoveredCell: { x: number; y: number } | null;
  isDragging: boolean;
  movePreview: { x: number; y: number } | null;
}
```

---

## 6. 模块间通信

### 6.1 与状态管理模块

```typescript
// 读取状态
import { useCombatStore } from '@/stores/combatStore';

class CombatScene extends BaseScene {
  updateUnits() {
    const units = useCombatStore.getState().units;
    // 更新实体显示
  }
}
```

### 6.2 与 UI 模块

```typescript
// 通过事件总线通信（统一使用 eventBus）
import { eventBus, GameEvents } from '@/events';

class CombatScene extends BaseScene {
  onCellClick(cell: { x: number; y: number }) {
    // 发送事件给 UI 模块
    eventBus.emit(GameEvents.COMBAT_CELL_CLICK, cell);
  }

  onUnitSelect(unitId: string) {
    eventBus.emit(GameEvents.COMBAT_UNIT_SELECT, { unitId });
  }
}

// UI 模块监听
eventBus.on(GameEvents.COMBAT_CELL_CLICK, (cell) => {
  // 更新 UI 显示
});

eventBus.on(GameEvents.COMBAT_UNIT_SELECT, ({ unitId }) => {
  // 显示单位详情
});
```

### 6.3 与通信模块

```typescript
// 用户交互通过状态模块间接触发通信
class CombatScene extends BaseScene {
  async onMoveConfirm(targetCell: { x: number; y: number }) {
    // 更新状态（会通过 eventBus 触发通信）
    useCombatStore.getState().requestMove(targetCell);
  }

  // 也可以直接通过 eventBus 发送移动请求
  requestMoveViaEvent(position: { x: number; y: number }) {
    eventBus.emit(GameEvents.COMBAT_MOVE_REQUEST, {
      unitId: useCombatStore.getState().currentUnitId,
      position
    });
  }
}
```

---

## 7. 网格系统设计

### 7.1 坐标系统

```
屏幕坐标 ←→ 网格坐标

Grid: 64x64 像素/格

┌─────────────────────────────┐
│ (0,0) (1,0) (2,0) (3,0) ... │
│ (0,1) (1,1) (2,1) (3,1) ... │
│ (0,2) (1,2) (2,2) (3,2) ... │
│  ...                        │
└─────────────────────────────┘
```

### 7.2 坐标转换工具

```typescript
// game/utils/CoordinateUtils.ts
export const GridSize = 64;

export function worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
  return {
    x: Math.floor(worldX / GridSize),
    y: Math.floor(worldY / GridSize)
  };
}

export function gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: gridX * GridSize + GridSize / 2,
    y: gridY * GridSize + GridSize / 2
  };
}
```

### 7.3 寻路算法

```typescript
// game/utils/PathFinding.ts
export class PathFinding {
  // A* 寻路
  static findPath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    obstacles: boolean[][]
  ): { x: number; y: number }[] {
    // A* 算法实现
  }

  // 计算移动范围
  static getMoveRange(
    start: { x: number; y: number },
    speed: number,
    obstacles: boolean[][]
  ): { x: number; y: number }[] {
    // BFS 计算可移动范围
  }
}
```

---

## 8. 动画系统设计

### 8.1 角色动画

```typescript
// 角色动画状态
enum CharacterAnimation {
  IDLE = 'idle',
  WALK = 'walk',
  ATTACK = 'attack',
  CAST = 'cast',
  HURT = 'hurt',
  DIE = 'die'
}

// 角色动画配置
const characterAnimations = {
  idle: { frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
  walk: { frames: [4, 5, 6, 7], frameRate: 10, repeat: -1 },
  attack: { frames: [8, 9, 10, 11], frameRate: 12, repeat: 0 },
  // ...
};
```

### 8.2 特效动画

```typescript
// 特效动画配置
interface EffectAnimation {
  key: string;
  frames: string[];
  frameRate: number;
  repeat: number;
  scale: number;
  offset: { x: number; y: number };
}
```

### 8.3 平滑移动

```typescript
// 角色平滑移动
async moveTo(
  target: { x: number; y: number },
  duration: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    this.scene.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      duration: duration,
      ease: 'Sine.easeInOut',
      onComplete: resolve
    });
  });
}
```

---

## 9. 资源管理

### 9.1 资源清单

```typescript
// game/assets/AssetManifest.ts
export const AssetManifest = {
  images: {
    'tile/grass': 'assets/images/tiles/grass.png',
    'tile/wall': 'assets/images/tiles/wall.png',
    'character/player': 'assets/images/characters/player.png',
    // ...
  },
  spritesheets: {
    'character/wizard': {
      url: 'assets/images/characters/wizard.png',
      frameConfig: { frameWidth: 64, frameHeight: 64 }
    },
    // ...
  },
  audio: {
    'sfx/hit': 'assets/audio/sfx/hit.mp3',
    'sfx/spell': 'assets/audio/sfx/spell.mp3',
    // ...
  }
};
```

### 9.2 资源加载

```typescript
// game/assets/AssetLoader.ts
export class AssetLoader {
  async loadSceneAssets(scene: Phaser.Scene, assets: string[]): Promise<void> {
    return new Promise((resolve) => {
      assets.forEach(key => {
        const asset = AssetManifest[key];
        if (asset.type === 'image') {
          scene.load.image(key, asset.url);
        } else if (asset.type === 'spritesheet') {
          scene.load.spritesheet(key, asset.url, asset.frameConfig);
        }
        // ...
      });

      scene.load.once('complete', resolve);
      scene.load.start();
    });
  }
}
```

---

## 10. 可测试性设计

### 10.1 场景测试

```typescript
// __tests__/scenes/CombatScene.test.ts
describe('CombatScene', () => {
  let scene: CombatScene;

  beforeEach(() => {
    scene = new CombatScene({ key: 'CombatScene' });
  });

  it('should create grid on init', () => {
    scene.init({ gridWidth: 10, gridHeight: 10 });
    expect(scene.grid).toBeDefined();
  });
});
```

### 10.2 实体测试

```typescript
// __tests__/entities/Character.test.ts
describe('Character', () => {
  it('should move to target position', async () => {
    const character = new Character(scene, config);
    await character.moveTo({ x: 128, y: 128 });
    expect(character.x).toBe(128);
    expect(character.y).toBe(128);
  });
});
```

---

## 11. 性能优化

### 11.1 渲染优化

- 使用 Sprite 批处理
- 静态元素使用 RenderTexture
- 不可见元素自动剔除

### 11.2 更新优化

```typescript
// 仅更新可见区域
update(time: number, delta: number) {
  const visibleBounds = this.camera.worldView;
  this.entities.forEach(entity => {
    if (visibleBounds.contains(entity.x, entity.y)) {
      entity.update(time, delta);
    }
  });
}
```

### 11.3 内存管理

- 场景切换时清理资源
- 对象池复用
- 及时销毁不再使用的对象

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：模块设计师
