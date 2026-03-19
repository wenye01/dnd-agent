# 游戏引擎组件设计文档

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: 游戏引擎模块
> **技术栈**: Phaser 3.70+ + TypeScript

---

## 1. 组件概览

### 1.1 组件职责划分

```
game/
├── Game.ts                          # 游戏入口组件
├── SceneManager.ts                  # 场景管理组件
│
├── scenes/                          # 场景组件
│   ├── BaseScene.ts                 # 场景基类组件
│   ├── WorldMapScene.ts             # 冒险地图场景组件
│   ├── SceneMapScene.ts             # 场景地图场景组件
│   └── CombatScene.ts               # 战斗场景组件
│
├── entities/                        # 实体组件
│   ├── BaseEntity.ts                # 实体基类组件
│   ├── Character.ts                 # 角色实体组件
│   ├── NPC.ts                       # NPC 实体组件
│   ├── Enemy.ts                     # 敌人实体组件
│   └── Prop.ts                      # 道具实体组件
│
├── effects/                         # 特效组件
│   ├── EffectManager.ts             # 特效管理器组件
│   ├── SpellEffect.ts               # 法术特效组件
│   ├── DamageNumber.ts              # 伤害数字组件
│   ├── HealingEffect.ts             # 治疗特效组件
│   ├── StatusEffect.ts              # 状态特效组件
│   └── ProjectileEffect.ts          # 投射物特效组件
│
└── ui/                              # 游戏内 UI 组件
    ├── GameUIManager.ts             # UI 管理器组件
    ├── HealthBar.ts                 # 血条组件
    ├── ManaBar.ts                   # 法力条组件
    ├── StatusIcon.ts                # 状态图标组件
    ├── NameLabel.ts                 # 名称标签组件
    └── SelectionRing.ts             # 选中圈组件
```

### 1.2 组件依赖关系

```
                    Game (入口)
                       │
                       ▼
              SceneManager (场景管理)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
  WorldMapScene  SceneMapScene  CombatScene
        │              │              │
        ├──────────────┼──────────────┤
        │              │              │
        ▼              ▼              ▼
   Entities      Effects       GameUI
```

---

## 2. 场景组件

### 2.1 BaseScene（场景基类组件）

**职责**：
- 提供所有场景的通用功能
- 管理场景生命周期
- 提供状态订阅机制
- 处理通用输入事件

**接口定义**：

```typescript
// game/scenes/BaseScene.ts
import { Scene, DataObject } from 'phaser';

export interface SceneData {
  mapId?: string;
  sessionId?: string;
  [key: string]: any;
}

export abstract class BaseScene extends Scene {
  // 场景配置
  public readonly sceneKey: string;

  // 状态订阅清理函数
  protected unsubscribers: Array<() => void> = [];

  // 场景状态
  protected isPaused: boolean = false;
  protected isTransitioning: boolean = false;

  constructor(key: string) {
    super({ key });
    this.sceneKey = key;
  }

  // ========== 抽象方法（子类必须实现）==========

  /**
   * 场景初始化
   * @param data - 从上一个场景传递的数据
   */
  abstract init(data: SceneData): void;

  /**
   * 预加载资源
   */
  abstract preload(): void;

  /**
   * 创建场景内容
   */
  abstract create(): void;

  /**
   * 每帧更新
   * @param time - 当前时间（ms）
   * @param delta - 距离上一帧的时间（ms）
   */
  abstract update(time: number, delta: number): void;

  // ========== 生命周期方法 ==========

  /**
   * 场景启动时调用（在 create 之后）
   */
  public onSceneStart(): void {
    // 子类可覆盖
  }

  /**
   * 场景暂停
   */
  public pauseScene(): void {
    this.isPaused = true;
    this.scene.pause();
  }

  /**
   * 场景恢复
   */
  public resumeScene(): void {
    this.isPaused = false;
    this.scene.resume();
  }

  /**
   * 场景关闭
   */
  public shutdown(): void {
    // 清理所有订阅
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // 清理事件监听
    this.events.removeAll();
    this.input.removeAllListeners();

    // 清理子对象
    this.children.removeAll();
  }

  // ========== 状态订阅辅助方法 ==========

  /**
   * 订阅 Zustand store 状态变化
   * @param selector - 状态选择器
   * @param callback - 状态变化回调
   */
  protected subscribeStore<T>(
    selector: (state: any) => T,
    callback: (value: T) => void
  ): void {
    let previousValue: T;

    const unsubscribe = (selector as any)._subscribe?.((value: T) => {
      if (previousValue !== value) {
        previousValue = value;
        callback(value);
      }
    });

    if (unsubscribe) {
      this.unsubscribers.push(unsubscribe);
    }
  }

  // ========== 场景切换方法 ==========

  /**
   * 切换到其他场景
   * @param sceneKey - 目标场景键
   * @param data - 传递的数据
   * @param shouldShutdown - 是否关闭当前场景
   */
  protected switchScene(
    sceneKey: string,
    data?: SceneData,
    shouldShutdown: boolean = false
  ): void {
    this.isTransitioning = true;

    if (shouldShutdown) {
      this.scene.stop(this.sceneKey);
    }

    this.scene.start(sceneKey, data);
  }

  // ========== 辅助方法 ==========

  /**
   * 获取场景摄像机
   */
  protected getMainCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.cameras.main;
  }

  /**
   * 获取游戏世界尺寸
   */
  protected getWorldBounds(): {
    width: number;
    height: number;
  } {
    return {
      width: this.scale.width,
      height: this.scale.height
    };
  }
}
```

### 2.2 WorldMapScene（冒险地图场景组件）

**职责**：
- 渲染世界地图背景
- 显示地点标记（LocationMarker）
- 显示可用路径
- 处理地点点击交互
- 显示当前位置指示器

**接口定义**：

```typescript
// game/scenes/WorldMapScene.ts
import { Scene, Container, Graphics, Sprite } from 'phaser';
import { BaseScene, SceneData } from './BaseScene';

export interface LocationData {
  id: string;
  name: string;
  position: { x: number; y: number };
  isVisited: boolean;
  isAvailable: boolean;
  icon: string;
}

export interface PathData {
  from: string;
  to: string;
  isUnlocked: boolean;
}

export interface WorldMapState {
  locations: LocationData[];
  paths: PathData[];
  currentLocation: string | null;
  visitedLocations: string[];
}

export class WorldMapScene extends BaseScene {
  // 场景常量
  public static readonly KEY = 'WorldMapScene';

  // 地图配置
  private readonly MAP_SCALE = 1;
  private readonly LOCATION_SIZE = 64;

  // 场景对象
  private mapContainer: Container;
  private locationMarkers: Map<string, LocationMarker> = new Map();
  private pathLines: Map<string, PathLine> = new Map();
  private currentPlayerMarker: Sprite;

  // 场景状态
  private state: WorldMapState;

  // ========== 生命周期方法 ==========

  constructor() {
    super(WorldMapScene.KEY);
  }

  init(data: SceneData): void {
    // 初始化状态
    this.state = {
      locations: data.locations || [],
      paths: data.paths || [],
      currentLocation: data.currentLocation || null,
      visitedLocations: data.visitedLocations || []
    };
  }

  preload(): void {
    // 加载地图资源
    this.load.image('world-map', 'assets/maps/world-map.png');
    this.load.image('location-locked', 'assets/ui/location-locked.png');
    this.load.image('location-available', 'assets/ui/location-available.png');
    this.load.image('location-visited', 'assets/ui/location-visited.png');
    this.load.image('player-marker', 'assets/ui/player-marker.png');
  }

  create(): void {
    // 创建地图容器
    this.mapContainer = this.add.container(0, 0);

    // 创建地图背景
    this.createMapBackground();

    // 创建路径线
    this.createPathLines();

    // 创建地点标记
    this.createLocationMarkers();

    // 创建玩家标记
    this.createPlayerMarker();

    // 设置摄像机
    this.setupCamera();

    // 设置输入处理
    this.setupInput();

    // 订阅状态
    this.subscribeToState();

    // 派发场景启动事件
    this.events.emit('worldmap:ready');
  }

  update(time: number, delta: number): void {
    // 更新标记动画
    this.locationMarkers.forEach(marker => marker.update(time, delta));

    // 更新玩家标记动画
    if (this.currentPlayerMarker) {
      this.currentPlayerMarker.setScale(
        1 + Math.sin(time / 200) * 0.1
      );
    }
  }

  shutdown(): void {
    super.shutdown();

    // 清理对象
    this.locationMarkers.clear();
    this.pathLines.clear();
  }

  // ========== 创建方法 ==========

  private createMapBackground(): void {
    const bg = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'world-map'
    );
    bg.setScale(this.MAP_SCALE);
    this.mapContainer.add(bg);
  }

  private createPathLines(): void {
    this.state.paths.forEach(path => {
      const fromLocation = this.state.locations.find(l => l.id === path.from);
      const toLocation = this.state.locations.find(l => l.id === path.to);

      if (fromLocation && toLocation) {
        const pathLine = new PathLine(this, {
          from: fromLocation.position,
          to: toLocation.position,
          isUnlocked: path.isUnlocked
        });
        this.pathLines.set(`${path.from}-${path.to}`, pathLine);
        this.mapContainer.add(pathLine);
      }
    });
  }

  private createLocationMarkers(): void {
    this.state.locations.forEach(location => {
      const marker = new LocationMarker(this, {
        ...location,
        size: this.LOCATION_SIZE,
        onLocationClick: (id: string) => this.onLocationClick(id)
      });
      this.locationMarkers.set(location.id, marker);
      this.mapContainer.add(marker);
    });
  }

  private createPlayerMarker(): void {
    if (this.state.currentLocation) {
      const location = this.state.locations.find(
        l => l.id === this.state.currentLocation
      );

      if (location) {
        this.currentPlayerMarker = this.add.sprite(
          location.position.x,
          location.position.y,
          'player-marker'
        );
        this.currentPlayerMarker.setOrigin(0.5);
        this.mapContainer.add(this.currentPlayerMarker);
      }
    }
  }

  // ========== 输入处理 ==========

  private setupInput(): void {
    // 鼠标/触摸点击处理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer);
      this.checkLocationClick(worldPoint);
    });
  }

  private checkLocationClick(point: { x: number; y: number }): void {
    this.locationMarkers.forEach(marker => {
      if (marker.isPointInside(point)) {
        marker.onClick();
      }
    });
  }

  private onLocationClick(locationId: string): void {
    const location = this.state.locations.find(l => l.id === locationId);

    if (!location?.isAvailable) {
      // 显示不可用提示
      this.events.emit('worldmap:location-locked', location);
      return;
    }

    // 派发地点点击事件
    this.events.emit('worldmap:location-click', {
      locationId,
      location: location
    });
  }

  // ========== 状态管理 ==========

  private subscribeToState(): void {
    // 订阅游戏状态变化
    this.subscribeStore(
      (state: any) => state.currentLocation,
      (locationId: string | null) => {
        this.state.currentLocation = locationId;
        this.updatePlayerMarker(locationId);
      }
    );
  }

  private updatePlayerMarker(locationId: string | null): void {
    if (this.currentPlayerMarker) {
      this.currentPlayerMarker.destroy();
    }

    if (locationId) {
      const location = this.state.locations.find(l => l.id === locationId);
      if (location) {
        this.createPlayerMarker();
      }
    }
  }

  // ========== 摄像机设置 ==========

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.scale.width, this.scale.height);
    camera.setZoom(1);
  }

  // ========== 公共方法 ==========

  /**
   * 更新地点状态
   */
  public updateLocation(locationId: string, updates: Partial<LocationData>): void {
    const marker = this.locationMarkers.get(locationId);
    if (marker) {
      marker.updateState(updates);
    }

    const location = this.state.locations.find(l => l.id === locationId);
    if (location) {
      Object.assign(location, updates);
    }
  }

  /**
   * 解锁路径
   */
  public unlockPath(from: string, to: string): void {
    const key = `${from}-${to}`;
    const pathLine = this.pathLines.get(key);
    if (pathLine) {
      pathLine.unlock();
    }
  }

  /**
   * 移动玩家到指定地点
   */
  public movePlayerTo(locationId: string, animated: boolean = true): void {
    const location = this.state.locations.find(l => l.id === locationId);
    if (!location || !this.currentPlayerMarker) return;

    if (animated) {
      this.tweens.add({
        targets: this.currentPlayerMarker,
        x: location.position.x,
        y: location.position.y,
        duration: 1000,
        ease: 'Power2.easeInOut',
        onComplete: () => {
          this.events.emit('worldmap:player-arrived', locationId);
        }
      });
    } else {
      this.currentPlayerMarker.setPosition(
        location.position.x,
        location.position.y
      );
    }
  }
}
```

### 2.3 CombatScene（战斗场景组件）

**职责**：
- 渲染战斗网格
- 显示战斗单位
- 处理移动范围显示
- 处理目标选择
- 显示回合指示

**接口定义**：

```typescript
// game/scenes/CombatScene.ts
import { Scene, Container, Graphics, Rectangle } from 'phaser';
import { BaseScene, SceneData } from './BaseScene';

export interface CombatUnitData {
  id: string;
  characterId: string;
  name: string;
  team: 'player' | 'enemy' | 'neutral';
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  conditions: string[];
  sprite: string;
}

export interface GridCell {
  x: number;
  y: number;
  isWalkable: boolean;
  isOccupied: boolean;
  occupantId?: string;
}

export interface CombatState {
  gridWidth: number;
  gridHeight: number;
  grid: GridCell[][];
  units: CombatUnitData[];
  currentTurn: number;
  currentUnitId: string | null;
  moveRange: { x: number; y: number }[];
  targetMode: 'none' | 'attack' | 'spell' | 'item';
  validTargets: string[];
}

export class CombatScene extends BaseScene {
  // 场景常量
  public static readonly KEY = 'CombatScene';
  private readonly GRID_SIZE = 64;
  private readonly GRID_COLOR = 0x333333;
  private readonly HIGHLIGHT_COLOR = 0x44aaff;
  private readonly TARGET_COLOR = 0xff4444;

  // 场景对象
  private gridContainer: Container;
  private unitsContainer: Container;
  private uiContainer: Container;

  private gridGraphics: Graphics;
  private highlightGraphics: Graphics;

  private unitEntities: Map<string, Character> = new Map();

  // 场景状态
  private state: CombatState;
  private selectedUnitId: string | null = null;
  private hoveredCell: { x: number; y: number } | null = null;

  // ========== 生命周期方法 ==========

  constructor() {
    super(CombatScene.KEY);
  }

  init(data: SceneData): void {
    // 初始化状态
    this.state = {
      gridWidth: data.gridWidth || 10,
      gridHeight: data.gridHeight || 10,
      grid: data.grid || this.createEmptyGrid(data.gridWidth, data.gridHeight),
      units: data.units || [],
      currentTurn: data.currentTurn || 0,
      currentUnitId: data.currentUnitId || null,
      moveRange: [],
      targetMode: 'none',
      validTargets: []
    };
  }

  create(): void {
    // 创建容器
    this.gridContainer = this.add.container(0, 0);
    this.unitsContainer = this.add.container(0, 0);
    this.uiContainer = this.add.container(0, 0);

    // 创建网格
    this.createGrid();

    // 创建单位
    this.createUnits();

    // 设置摄像机
    this.setupCamera();

    // 设置输入处理
    this.setupInput();

    // 订阅状态
    this.subscribeToState();

    // 派发场景启动事件
    this.events.emit('combat:ready');
  }

  update(time: number, delta: number): void {
    // 更新悬停效果
    this.updateHoverHighlight();
  }

  shutdown(): void {
    super.shutdown();
    this.unitEntities.clear();
  }

  // ========== 创建方法 ==========

  private createGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();

    this.drawGrid();
    this.gridContainer.add([this.gridGraphics, this.highlightGraphics]);
  }

  private drawGrid(): void {
    const { gridWidth, gridHeight } = this.state;
    const size = this.GRID_SIZE;

    this.gridGraphics.clear();

    // 绘制网格线
    this.gridGraphics.lineStyle(1, this.GRID_COLOR, 0.5);

    for (let x = 0; x <= gridWidth; x++) {
      this.gridGraphics.moveTo(x * size, 0);
      this.gridGraphics.lineTo(x * size, gridHeight * size);
    }

    for (let y = 0; y <= gridHeight; y++) {
      this.gridGraphics.moveTo(0, y * size);
      this.gridGraphics.lineTo(gridWidth * size, y * size);
    }

    this.gridGraphics.strokePath();

    // 绘制不可行走区域
    this.gridGraphics.fillStyle(0x222222, 0.8);
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        if (!this.state.grid[x][y].isWalkable) {
          this.gridGraphics.fillRect(
            x * size + 1,
            y * size + 1,
            size - 2,
            size - 2
          );
        }
      }
    }
  }

  private createUnits(): void {
    this.state.units.forEach(unitData => {
      const unit = new Character(this, {
        id: unitData.id,
        name: unitData.name,
        position: this.gridToWorld(unitData.position.x, unitData.position.y),
        sprite: unitData.sprite,
        team: unitData.team
      });

      unit.updateHP(unitData.hp, unitData.maxHp);
      unit.updateConditions(unitData.conditions);

      this.unitEntities.set(unitData.id, unit);
      this.unitsContainer.add(unit);

      // 设置点击事件
      unit.on('pointerdown', () => this.onUnitClick(unitData.id));
    });
  }

  // ========== 输入处理 ==========

  private setupInput(): void {
    // 鼠标移动处理
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer);
      const gridPoint = this.worldToGrid(worldPoint.x, worldPoint.y);

      if (this.isValidCell(gridPoint.x, gridPoint.y)) {
        this.hoveredCell = gridPoint;
      }
    });

    // 点击处理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer);
      const gridPoint = this.worldToGrid(worldPoint.x, worldPoint.y);

      if (this.isValidCell(gridPoint.x, gridPoint.y)) {
        this.onCellClick(gridPoint);
      }
    });
  }

  private onCellClick(cell: { x: number; y: number }): void {
    // 检查是否点击了移动范围内的格子
    const isInMoveRange = this.state.moveRange.some(
      c => c.x === cell.x && c.y === cell.y
    );

    if (isInMoveRange && this.state.currentUnitId) {
      this.events.emit('combat:move-confirm', {
        unitId: this.state.currentUnitId,
        position: cell
      });
    } else {
      // 选择单位
      const occupant = this.state.grid[cell.x][cell.y].occupantId;
      if (occupant) {
        this.selectUnit(occupant);
      } else {
        this.deselectUnit();
      }
    }
  }

  private onUnitClick(unitId: string): void {
    const unit = this.state.units.find(u => u.id === unitId);

    // 如果在目标选择模式
    if (this.state.targetMode !== 'none' && this.state.validTargets.includes(unitId)) {
      this.events.emit('combat:target-select', {
        targetId: unitId,
        mode: this.state.targetMode
      });
      return;
    }

    // 选择单位
    this.selectUnit(unitId);
  }

  // ========== 单位选择 ==========

  private selectUnit(unitId: string): void {
    // 取消之前的选择
    this.deselectUnit();

    this.selectedUnitId = unitId;
    const unit = this.unitEntities.get(unitId);
    if (unit) {
      unit.setSelected(true);

      // 派发选择事件
      this.events.emit('combat:unit-select', {
        unitId,
        unit: this.state.units.find(u => u.id === unitId)
      });
    }
  }

  private deselectUnit(): void {
    if (this.selectedUnitId) {
      const unit = this.unitEntities.get(this.selectedUnitId);
      if (unit) {
        unit.setSelected(false);
      }
      this.selectedUnitId = null;
    }
  }

  // ========== 高亮显示 ==========

  public showMoveRange(cells: { x: number; y: number }[]): void {
    this.state.moveRange = cells;
    this.drawMoveHighlight();
  }

  private drawMoveHighlight(): void {
    this.highlightGraphics.clear();
    this.highlightGraphics.fillStyle(this.HIGHLIGHT_COLOR, 0.3);

    this.state.moveRange.forEach(cell => {
      const pos = this.gridToWorld(cell.x, cell.y);
      this.highlightGraphics.fillRect(
        pos.x - this.GRID_SIZE / 2,
        pos.y - this.GRID_SIZE / 2,
        this.GRID_SIZE - 2,
        this.GRID_SIZE - 2
      );
    });
  }

  public showValidTargets(targetIds: string[]): void {
    this.state.validTargets = targetIds;

    targetIds.forEach(id => {
      const unit = this.unitEntities.get(id);
      if (unit) {
        unit.showTargetHighlight();
      }
    });
  }

  private clearHighlights(): void {
    this.highlightGraphics.clear();
    this.state.moveRange = [];
    this.state.validTargets = [];

    this.unitEntities.forEach(unit => {
      unit.clearTargetHighlight();
    });
  }

  private updateHoverHighlight(): void {
    // 更新悬停格子的高亮
    if (this.hoveredCell) {
      // 可以添加悬停效果
    }
  }

  // ========== 状态管理 ==========

  private subscribeToState(): void {
    // 订阅战斗状态变化
    this.subscribeStore(
      (state: any) => state.units,
      (units: CombatUnitData[]) => this.updateUnits(units)
    );

    this.subscribeStore(
      (state: any) => state.currentUnitId,
      (unitId: string | null) => {
        this.state.currentUnitId = unitId;
        if (unitId) {
          this.selectUnit(unitId);
        }
      }
    );

    this.subscribeStore(
      (state: any) => state.targetMode,
      (mode: 'none' | 'attack' | 'spell' | 'item') => {
        this.state.targetMode = mode;
        if (mode === 'none') {
          this.clearHighlights();
        }
      }
    );
  }

  private updateUnits(units: CombatUnitData[]): void {
    // 更新现有单位
    units.forEach(unitData => {
      const entity = this.unitEntities.get(unitData.id);
      if (entity) {
        entity.updateHP(unitData.hp, unitData.maxHp);
        entity.updateConditions(unitData.conditions);

        // 更新位置
        const newPos = this.gridToWorld(unitData.position.x, unitData.position.y);
        entity.moveTo(newPos, true);
      }
    });

    // 移除不存在的单位
    const currentIds = new Set(units.map(u => u.id));
    this.unitEntities.forEach((entity, id) => {
      if (!currentIds.has(id)) {
        entity.destroy();
        this.unitEntities.delete(id);
      }
    });
  }

  // ========== 公共方法 ==========

  /**
   * 更新单位位置
   */
  public async moveUnit(unitId: string, position: { x: number; y: number }): Promise<void> {
    const unit = this.unitEntities.get(unitId);
    if (unit) {
      const worldPos = this.gridToWorld(position.x, position.y);
      await unit.moveTo(worldPos, true);

      // 更新网格状态
      this.updateGridOccupancy();
    }
  }

  /**
   * 播放攻击特效
   */
  public async playAttackEffect(
    attackerId: string,
    targetId: string,
    hit: boolean
  ): Promise<void> {
    const attacker = this.unitEntities.get(attackerId);
    const target = this.unitEntities.get(targetId);

    if (attacker && target) {
      // 投射物或近战特效
      const effect = new ProjectileEffect(this, {
        from: attacker.getCenter(),
        to: target.getCenter(),
        hit
      });

      this.uiContainer.add(effect);
      await effect.play();
      effect.destroy();
    }
  }

  /**
   * 显示伤害数字
   */
  public showDamageNumber(
    targetId: string,
    damage: number,
    isHealing: boolean = false
  ): void {
    const target = this.unitEntities.get(targetId);
    if (target) {
      const damageText = new DamageNumber(this, {
        text: isHealing ? `+${damage}` : `${damage}`,
        position: target.getCenter(),
        color: isHealing ? 0x00ff00 : 0xff0000
      });

      this.uiContainer.add(damageText);
      damageText.play();
    }
  }

  // ========== 辅助方法 ==========

  private gridToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.GRID_SIZE + this.GRID_SIZE / 2,
      y: y * this.GRID_SIZE + this.GRID_SIZE / 2
    };
  }

  private worldToGrid(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.floor(x / this.GRID_SIZE),
      y: Math.floor(y / this.GRID_SIZE)
    };
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.state.gridWidth &&
           y >= 0 && y < this.state.gridHeight;
  }

  private createEmptyGrid(width: number, height: number): GridCell[][] {
    const grid: GridCell[][] = [];

    for (let x = 0; x < width; x++) {
      grid[x] = [];
      for (let y = 0; y < height; y++) {
        grid[x][y] = {
          x, y,
          isWalkable: true,
          isOccupied: false
        };
      }
    }

    return grid;
  }

  private updateGridOccupancy(): void {
    // 清除所有占用
    for (let x = 0; x < this.state.gridWidth; x++) {
      for (let y = 0; y < this.state.gridHeight; y++) {
        this.state.grid[x][y].isOccupied = false;
        delete this.state.grid[x][y].occupantId;
      }
    }

    // 更新占用状态
    this.state.units.forEach(unit => {
      const { x, y } = unit.position;
      if (this.isValidCell(x, y)) {
        this.state.grid[x][y].isOccupied = true;
        this.state.grid[x][y].occupantId = unit.id;
      }
    });
  }
}
```

---

## 3. 实体组件

### 3.1 BaseEntity（实体基类组件）

**接口定义**：

```typescript
// game/entities/BaseEntity.ts
import { Container, Sprite, Graphics } from 'phaser';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface EntityConfig {
  id: string;
  name: string;
  position: { x: number; y: number };
  sprite: string;
  scale?: number;
}

export class BaseEntity extends Container {
  // 实体属性
  public readonly id: string;
  public readonly name: string;

  // 网格位置
  public gridPosition: { x: number; y: number };

  // 组件
  protected sprite: Sprite;
  protected selectionRing: SelectionRing;

  // 状态
  protected currentDirection: Direction = 'down';
  protected isSelected: boolean = false;

  constructor(scene: Phaser.Scene, config: EntityConfig) {
    super(scene, config.position.x, config.position.y);

    this.id = config.id;
    this.name = config.name;
    this.gridPosition = config.position;

    // 创建精灵
    this.sprite = scene.add.sprite(0, 0, config.sprite);
    this.sprite.setScale(config.scale || 1);
    this.add(this.sprite);

    // 创建选中圈
    this.selectionRing = new SelectionRing(scene);
    this.selectionRing.setVisible(false);
    this.add(this.selectionRing);

    // 设置尺寸
    const size = this.sprite.width * (config.scale || 1);
    this.setSize(size, size);

    // 设置交互
    this.setInteractive();
  }

  // ========== 移动方法 ==========

  /**
   * 移动到目标位置
   */
  public async moveTo(
    target: { x: number; y: number },
    animated: boolean = true
  ): Promise<void> {
    if (animated) {
      return new Promise((resolve) => {
        this.scene.tweens.add({
          targets: this,
          x: target.x,
          y: target.y,
          duration: 300,
          ease: 'Sine.easeInOut',
          onComplete: () => resolve()
        });
      });
    } else {
      this.setPosition(target.x, target.y);
    }
  }

  // ========== 方向方法 ==========

  /**
   * 设置朝向
   */
  public setDirection(direction: Direction): void {
    this.currentDirection = direction;

    // 根据方向翻转精灵
    if (direction === 'left') {
      this.sprite.setFlipX(true);
    } else if (direction === 'right') {
      this.sprite.setFlipX(false);
    }
  }

  // ========== 选择状态 ==========

  /**
   * 设置选中状态
   */
  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.selectionRing.setVisible(selected);
  }

  /**
   * 获取选中状态
   */
  public isEntitySelected(): boolean {
    return this.isSelected;
  }

  // ========== 动画方法 ==========

  /**
   * 播放动画
   */
  public playAnimation(key: string): void {
    this.sprite.anims.play(key);
  }

  /**
   * 停止动画
   */
  public stopAnimation(): void {
    this.sprite.anims.stop();
  }

  // ========== 辅助方法 ==========

  /**
   * 获取中心点
   */
  public getCenter(): { x: number; y: number } {
    return {
      x: this.x,
      y: this.y
    };
  }

  /**
   * 检查点是否在实体内
   */
  public isPointInside(point: { x: number; y: number }): boolean {
    const bounds = this.getBounds();
    return bounds.contains(point.x, point.y);
  }

  /**
   * 更新
   */
  public update(time: number, delta: number): void {
    // 子类可覆盖
  }

  /**
   * 销毁
   */
  public destroy(): void {
    this.selectionRing?.destroy();
    super.destroy();
  }
}
```

### 3.2 Character（角色实体组件）

**接口定义**：

```typescript
// game/entities/Character.ts
import { BaseEntity, EntityConfig } from './BaseEntity';
import { HealthBar } from '../ui/HealthBar';
import { StatusIcon } from '../ui/StatusIcon';
import { SelectionRing } from '../ui/SelectionRing';

export interface CharacterConfig extends EntityConfig {
  team: 'player' | 'enemy' | 'neutral';
  hp?: number;
  maxHp?: number;
  conditions?: string[];
}

export class Character extends BaseEntity {
  // 团队
  public readonly team: 'player' | 'enemy' | 'neutral';

  // 战斗属性
  private hp: number;
  private maxHp: number;
  private conditions: Set<string> = new Set();

  // UI 组件
  private healthBar: HealthBar;
  private statusIcons: StatusIcon[] = [];

  constructor(scene: Phaser.Scene, config: CharacterConfig) {
    super(scene, config);

    this.team = config.team;
    this.hp = config.hp ?? 100;
    this.maxHp = config.maxHp ?? 100;

    if (config.conditions) {
      config.conditions.forEach(c => this.conditions.add(c));
    }

    // 创建血条
    this.createHealthBar();

    // 创建状态图标
    this.updateStatusIcons();
  }

  // ========== 血条管理 ==========

  private createHealthBar(): void {
    this.healthBar = new HealthBar(this.scene, {
      width: 64,
      height: 8,
      position: { x: 0, y: -40 },
      currentHp: this.hp,
      maxHp: this.maxHp
    });

    this.add(this.healthBar);
  }

  public updateHP(current: number, max: number): void {
    this.hp = current;
    this.maxHp = max;
    this.healthBar.updateHP(current, max);
  }

  // ========== 状态效果管理 ==========

  public addCondition(condition: string): void {
    if (!this.conditions.has(condition)) {
      this.conditions.add(condition);
      this.updateStatusIcons();
    }
  }

  public removeCondition(condition: string): void {
    if (this.conditions.delete(condition)) {
      this.updateStatusIcons();
    }
  }

  public hasCondition(condition: string): boolean {
    return this.conditions.has(condition);
  }

  private updateStatusIcons(): void {
    // 清除旧图标
    this.statusIcons.forEach(icon => icon.destroy());
    this.statusIcons = [];

    // 创建新图标
    let xOffset = -30;
    this.conditions.forEach(condition => {
      const icon = new StatusIcon(this.scene, {
        condition,
        position: { x: xOffset, y: -50 }
      });

      this.add(icon);
      this.statusIcons.push(icon);
      xOffset += 20;
    });
  }

  // ========== 动画方法 ==========

  public async playAttackAnimation(): Promise<void> {
    const originalX = this.x;

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: originalX + 20,
        duration: 100,
        yoyo: true,
        ease: 'Power2.easeInOut',
        onComplete: () => resolve()
      });
    });
  }

  public async playHurtAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        repeat: 2,
        ease: 'Power2.easeInOut',
        onComplete: () => resolve()
      });
    });
  }

  public async playDeathAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        ease: 'Power2.easeOut',
        onComplete: () => resolve()
      });
    });
  }

  // ========== 目标高亮 ==========

  public showTargetHighlight(): void {
    this.selectionRing.setColor(0xff4444);
    this.selectionRing.setVisible(true);
  }

  public clearTargetHighlight(): void {
    if (!this.isSelected) {
      this.selectionRing.setVisible(false);
    }
    this.selectionRing.setColor(0x44aaff);
  }

  // ========== 公共方法 ==========

  public getHP(): { current: number; max: number } {
    return { current: this.hp, max: this.maxHp };
  }

  public getConditions(): string[] {
    return Array.from(this.conditions);
  }

  public destroy(): void {
    this.statusIcons.forEach(icon => icon.destroy());
    this.healthBar?.destroy();
    super.destroy();
  }
}
```

---

## 4. 特效组件

### 4.1 EffectManager（特效管理器组件）

**接口定义**：

```typescript
// game/effects/EffectManager.ts
import { Scene } from 'phaser';

export type EffectType =
  | 'spell'
  | 'damage'
  | 'heal'
  | 'projectile'
  | 'status';

export interface EffectConfig {
  type: EffectType;
  position: { x: number; y: number };
  target?: { x: number; y: number };
  duration?: number;
  data?: any;
}

export class EffectManager {
  private scene: Scene;
  private activeEffects: Set<Phaser.GameObjects.GameObject> = new Set();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * 播放特效
   */
  public async play(config: EffectConfig): Promise<void> {
    switch (config.type) {
      case 'spell':
        return this.playSpellEffect(config);
      case 'damage':
        return this.playDamageEffect(config);
      case 'heal':
        return this.playHealEffect(config);
      case 'projectile':
        return this.playProjectileEffect(config);
      case 'status':
        return this.playStatusEffect(config);
    }
  }

  private async playSpellEffect(config: EffectConfig): Promise<void> {
    const effect = new SpellEffect(this.scene, {
      position: config.position,
      spellId: config.data?.spellId,
      scale: config.data?.scale || 1
    });

    this.addEffect(effect);
    await effect.play();
    this.removeEffect(effect);
  }

  private async playDamageEffect(config: EffectConfig): Promise<void> {
    const effect = new DamageNumber(this.scene, {
      text: `${config.data?.damage || 0}`,
      position: config.position,
      color: 0xff0000
    });

    this.addEffect(effect);
    await effect.play();
    this.removeEffect(effect);
  }

  private async playHealEffect(config: EffectConfig): Promise<void> {
    const effect = new HealingEffect(this.scene, {
      position: config.position
    });

    this.addEffect(effect);
    await effect.play();
    this.removeEffect(effect);
  }

  private async playProjectileEffect(config: EffectConfig): Promise<void> {
    if (!config.target) return;

    const effect = new ProjectileEffect(this.scene, {
      from: config.position,
      to: config.target,
      hit: config.data?.hit ?? true
    });

    this.addEffect(effect);
    await effect.play();
    this.removeEffect(effect);
  }

  private async playStatusEffect(config: EffectConfig): Promise<void> {
    const effect = new StatusEffect(this.scene, {
      position: config.position,
      condition: config.data?.condition
    });

    this.addEffect(effect);
    await effect.play();
    this.removeEffect(effect);
  }

  /**
   * 停止所有特效
   */
  public stopAll(): void {
    this.activeEffects.forEach(effect => effect.destroy());
    this.activeEffects.clear();
  }

  /**
   * 预加载特效资源
   */
  public static preload(scene: Scene): void {
    // 加载特效资源
    scene.load.image('effect-fireball', 'assets/effects/fireball.png');
    scene.load.image('effect-heal', 'assets/effects/heal.png');
    scene.load.spritesheet('effect-sparkle', 'assets/effects/sparkle.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  private addEffect(effect: Phaser.GameObjects.GameObject): void {
    this.activeEffects.add(effect);
    this.scene.add.existing(effect);
  }

  private removeEffect(effect: Phaser.GameObjects.GameObject): void {
    this.activeEffects.delete(effect);
    effect.destroy();
  }
}
```

### 4.2 DamageNumber（伤害数字组件）

**接口定义**：

```typescript
// game/effects/DamageNumber.ts
import { Text, Tween } from 'phaser';

export interface DamageNumberConfig {
  text: string;
  position: { x: number; y: number };
  color?: number;
  fontSize?: number;
  duration?: number;
}

export class DamageNumber extends Text {
  constructor(scene: Phaser.Scene, config: DamageNumberConfig) {
    super(scene, config.position.x, config.position.y, config.text, {
      fontSize: `${config.fontSize || 32}px`,
      color: `#${(config.color || 0xff0000).toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });

    this.setOrigin(0.5);
    this.setDepth(1000);
  }

  public async play(): Promise<void> {
    return new Promise((resolve) => {
      // 向上飘动并淡出
      this.scene.tweens.add({
        targets: this,
        y: this.y - 50,
        alpha: 0,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => resolve()
      });

      // 缩放效果
      this.scene.tweens.add({
        targets: this,
        scale: { from: 0.5, to: 1.5 },
        duration: 200,
        yoyo: true,
        ease: 'Power2.easeInOut'
      });
    });
  }
}
```

### 4.3 ProjectileEffect（投射物特效组件）

**接口定义**：

```typescript
// game/effects/ProjectileEffect.ts
import { Container, Sprite, Circle } from 'phaser';

export interface ProjectileEffectConfig {
  from: { x: number; y: number };
  to: { x: number; y: number };
  hit?: boolean;
  sprite?: string;
  speed?: number;
}

export class ProjectileEffect extends Container {
  private projectile: Sprite;
  private hitEffect: Sprite;

  constructor(scene: Phaser.Scene, config: ProjectileEffectConfig) {
    super(scene, config.from.x, config.from.y);

    // 创建投射物精灵
    this.projectile = scene.add.sprite(0, 0, config.sprite || 'projectile');
    this.projectile.setScale(0.5);
    this.add(this.projectile);

    // 计算角度
    const angle = Phaser.Math.Angle.Between(
      config.from.x, config.from.y,
      config.to.x, config.to.y
    );
    this.projectile.setRotation(angle);
  }

  public async play(): Promise<void> {
    const targetX = this.x + (this.projectile.x + Math.cos(this.projectile.rotation) * 100);
    const targetY = this.y + (this.projectile.y + Math.sin(this.projectile.rotation) * 100);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.projectile,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Power2.easeOut',
        onComplete: () => {
          this.showHitEffect();
          resolve();
        }
      });
    });
  }

  private showHitEffect(): void {
    // 创建命中特效
    this.hitEffect = this.scene.add.sprite(
      this.projectile.x,
      this.projectile.y,
      'effect-hit'
    );

    this.add(this.hitEffect);
    this.hitEffect.play('hit-animation');

    this.hitEffect.once('animationcomplete', () => {
      this.hitEffect.destroy();
    });
  }
}
```

---

## 5. 游戏内 UI 组件

### 5.1 HealthBar（血条组件）

**接口定义**：

```typescript
// game/ui/HealthBar.ts
import { Container, Graphics, Rectangle } from 'phaser';

export interface HealthBarConfig {
  width: number;
  height: number;
  position: { x: number; y: number };
  currentHp: number;
  maxHp: number;
  showText?: boolean;
}

export class HealthBar extends Container {
  private background: Graphics;
  private fill: Graphics;
  private border: Graphics;

  private width: number;
  private height: number;
  private currentHp: number;
  private maxHp: number;

  constructor(scene: Phaser.Scene, config: HealthBarConfig) {
    super(scene, config.position.x, config.position.y);

    this.width = config.width;
    this.height = config.height;
    this.currentHp = config.currentHp;
    this.maxHp = config.maxHp;

    // 创建背景
    this.background = scene.add.graphics();
    this.background.fillStyle(0x000000, 0.7);
    this.background.fillRoundedRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      4
    );
    this.add(this.background);

    // 创建填充
    this.fill = scene.add.graphics();
    this.add(this.fill);

    // 创建边框
    this.border = scene.add.graphics();
    this.border.lineStyle(1, 0xffffff, 0.5);
    this.border.strokeRoundedRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      4
    );
    this.add(this.border);

    // 绘制初始血量
    this.drawHealth();
  }

  public updateHP(current: number, max: number): void {
    this.currentHp = current;
    this.maxHp = max;
    this.drawHealth();
  }

  private drawHealth(): void {
    this.fill.clear();

    const percent = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    const fillWidth = this.width * percent;

    // 根据血量百分比选择颜色
    let color = 0x00ff00; // 绿色
    if (percent < 0.25) {
      color = 0xff0000; // 红色
    } else if (percent < 0.5) {
      color = 0xffaa00; // 橙色
    }

    this.fill.fillStyle(color, 0.9);
    this.fill.fillRoundedRect(
      -this.width / 2 + 1,
      -this.height / 2 + 1,
      fillWidth - 2,
      this.height - 2,
      2
    );
  }
}
```

### 5.2 SelectionRing（选中圈组件）

**接口定义**：

```typescript
// game/ui/SelectionRing.ts
import { Graphics } from 'phaser';

export class SelectionRing extends Graphics {
  private radius: number;
  private color: number;
  private pulsePhase: number = 0;

  constructor(scene: Phaser.Scene, radius: number = 32) {
    super(scene);
    this.radius = radius;
    this.color = 0x44aaff;
    this.draw();
  }

  public setColor(color: number): void {
    this.color = color;
    this.draw();
  }

  public setRadius(radius: number): void {
    this.radius = radius;
    this.draw();
  }

  private draw(): void {
    this.clear();

    // 绘制外圈
    this.lineStyle(2, this.color, 0.8);
    this.strokeCircle(0, 0, this.radius);

    // 绘制四个角
    const cornerSize = 8;
    this.lineStyle(3, this.color, 1);

    // 左上
    this.beginPath();
    this.moveTo(-this.radius, -this.radius + cornerSize);
    this.lineTo(-this.radius, -this.radius);
    this.lineTo(-this.radius + cornerSize, -this.radius);
    this.strokePath();

    // 右上
    this.beginPath();
    this.moveTo(this.radius - cornerSize, -this.radius);
    this.lineTo(this.radius, -this.radius);
    this.lineTo(this.radius, -this.radius + cornerSize);
    this.strokePath();

    // 右下
    this.beginPath();
    this.moveTo(this.radius, this.radius - cornerSize);
    this.lineTo(this.radius, this.radius);
    this.lineTo(this.radius - cornerSize, this.radius);
    this.strokePath();

    // 左下
    this.beginPath();
    this.moveTo(-this.radius + cornerSize, this.radius);
    this.lineTo(-this.radius, this.radius);
    this.lineTo(-this.radius, this.radius - cornerSize);
    this.strokePath();
  }

  public update(time: number): void {
    // 脉冲效果
    this.pulsePhase = (time / 200) % (Math.PI * 2);
    const scale = 1 + Math.sin(this.pulsePhase) * 0.05;

    this.setScale(scale);
  }
}
```

### 5.3 StatusIcon（状态图标组件）

**接口定义**：

```typescript
// game/ui/StatusIcon.ts
import { Container, Sprite, Graphics } from 'phaser';

export interface StatusIconConfig {
  condition: string;
  position: { x: number; y: number };
  size?: number;
}

export class StatusIcon extends Container {
  private condition: string;
  private background: Graphics;
  private icon: Sprite;

  // 状态图标映射
  private static readonly CONDITION_ICONS: Record<string, string> = {
    'blinded': 'condition-blinded',
    'charmed': 'condition-charmed',
    'frightened': 'condition-frightened',
    'poisoned': 'condition-poisoned',
    'prone': 'condition-prone',
    'restrained': 'condition-restrained',
    'stunned': 'condition-stunned',
    'exhaustion': 'condition-exhaustion'
  };

  private static readonly CONDITION_COLORS: Record<string, number> = {
    'blinded': 0x8b4513,
    'charmed': 0xff69b4,
    'frightened': 0x800080,
    'poisoned': 0x00ff00,
    'prone': 0x808080,
    'restrained': 0xffa500,
    'stunned': 0xffff00,
    'exhaustion': 0x000080
  };

  constructor(scene: Phaser.Scene, config: StatusIconConfig) {
    super(scene, config.position.x, config.position.y);

    this.condition = config.condition;
    const size = config.size || 16;

    // 创建背景
    this.background = scene.add.graphics();
    const color = StatusIcon.CONDITION_COLORS[this.condition] || 0xffffff;
    this.background.fillStyle(color, 0.8);
    this.background.fillCircle(0, 0, size / 2);
    this.add(this.background);

    // 创建图标
    const iconKey = StatusIcon.CONDITION_ICONS[this.condition];
    if (iconKey) {
      this.icon = scene.add.sprite(0, 0, iconKey);
      this.icon.setScale(size / 32);
      this.add(this.icon);
    }
  }

  public getCondition(): string {
    return this.condition;
  }
}
```

---

## 6. 辅助组件

### 6.1 LocationMarker（地点标记组件）

**接口定义**：

```typescript
// game/scenes/WorldMapScene/LocationMarker.ts
import { Container, Sprite, Graphics, Text } from 'phaser';

export interface LocationMarkerConfig {
  id: string;
  name: string;
  position: { x: number; y: number };
  isVisited: boolean;
  isAvailable: boolean;
  icon: string;
  size: number;
  onLocationClick: (id: string) => void;
}

export class LocationMarker extends Container {
  private config: LocationMarkerConfig;
  private background: Graphics;
  private icon: Sprite;
  private nameLabel: Text;

  constructor(scene: Phaser.Scene, config: LocationMarkerConfig) {
    super(scene, config.position.x, config.position.y);

    this.config = config;

    // 创建背景
    this.createBackground();

    // 创建图标
    this.createIcon();

    // 创建名称标签
    this.createLabel();

    // 设置交互
    this.setSize(config.size, config.size);
    this.setInteractive();
    this.on('pointerdown', () => this.onClick());
    this.on('pointerover', () => this.onHover());
    this.on('pointerout', () => this.onLeave());
  }

  private createBackground(): void {
    this.background = this.scene.add.graphics();

    const color = this.getColor();
    this.background.fillStyle(color, 0.9);
    this.background.fillCircle(0, 0, this.config.size / 2);

    this.background.lineStyle(2, 0xffffff, 0.5);
    this.background.strokeCircle(0, 0, this.config.size / 2);

    this.add(this.background);
  }

  private createIcon(): void {
    this.icon = this.scene.add.sprite(0, 0, this.config.icon);
    this.icon.setScale(this.config.size / 64);
    this.add(this.icon);
  }

  private createLabel(): void {
    this.nameLabel = this.scene.add.text(0, this.config.size / 2 + 8, this.config.name, {
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });

    this.nameLabel.setOrigin(0.5);
    this.add(this.nameLabel);
  }

  private getColor(): number {
    if (!this.config.isAvailable) {
      return 0x333333; // 锁定 - 灰色
    }
    if (this.config.isVisited) {
      return 0x00aa00; // 已访问 - 绿色
    }
    return 0x44aaff; // 可用 - 蓝色
  }

  public onClick(): void {
    if (this.config.isAvailable) {
      this.config.onLocationClick(this.config.id);
    }
  }

  private onHover(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 1.2,
      duration: 150,
      ease: 'Power2.easeOut'
    });
  }

  private onLeave(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Power2.easeOut'
    });
  }

  public updateState(updates: Partial<LocationMarkerConfig>): void {
    Object.assign(this.config, updates);

    // 重新创建背景以更新颜色
    this.background.destroy();
    this.createBackground();
  }

  public isPointInside(point: { x: number; y: number }): boolean {
    const distance = Phaser.Math.Distance.Between(
      point.x, point.y,
      this.x, this.y
    );
    return distance <= this.config.size / 2;
  }

  public update(time: number, delta: number): void {
    // 未访问地点的脉冲效果
    if (this.config.isAvailable && !this.config.isVisited) {
      const pulse = 1 + Math.sin(time / 300) * 0.1;
      this.icon.setScale(pulse);
    }
  }
}
```

### 6.2 PathLine（路径线组件）

**接口定义**：

```typescript
// game/scenes/WorldMapScene/PathLine.ts
import { Graphics } from 'phaser';

export interface PathLineConfig {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isUnlocked: boolean;
  width?: number;
}

export class PathLine extends Graphics {
  private config: PathLineConfig;

  constructor(scene: Phaser.Scene, config: PathLineConfig) {
    super(scene);
    this.config = config;
    this.draw();
  }

  private draw(): void {
    this.clear();

    const color = this.config.isUnlocked ? 0x00aa00 : 0x444444;
    const alpha = this.config.isUnlocked ? 0.6 : 0.3;

    this.lineStyle(this.config.width || 3, color, alpha);

    // 绘制虚线路径
    const dx = this.config.to.x - this.config.from.x;
    const dy = this.config.to.y - this.config.from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dashLength = 10;
    const gapLength = 5;
    const totalLength = dashLength + gapLength;
    const dashes = Math.floor(distance / totalLength);

    for (let i = 0; i < dashes; i++) {
      const t1 = (i * totalLength) / distance;
      const t2 = ((i * totalLength) + dashLength) / distance;

      this.beginPath();
      this.moveTo(
        this.config.from.x + dx * t1,
        this.config.from.y + dy * t1
      );
      this.lineTo(
        this.config.from.x + dx * t2,
        this.config.from.y + dy * t2
      );
      this.strokePath();
    }
  }

  public unlock(): void {
    this.config.isUnlocked = true;
    this.draw();
  }
}
```

---

## 7. 组件间通信

### 7.1 事件系统

```typescript
// 场景事件列表
declare module 'phaser' {
  namespace Events {
    interface EventEmitter {
      // WorldMapScene 事件
      on(event: 'worldmap:ready', callback: () => void): this;
      on(event: 'worldmap:location-click', callback: (data: { locationId: string; location: LocationData }) => void): this;
      on(event: 'worldmap:location-locked', callback: (location: LocationData) => void): this;
      on(event: 'worldmap:player-arrived', callback: (locationId: string) => void): this;

      // CombatScene 事件
      on(event: 'combat:ready', callback: () => void): this;
      on(event: 'combat:cell-click', callback: (cell: { x: number; y: number }) => void): this;
      on(event: 'combat:unit-select', callback: (data: { unitId: string; unit: CombatUnitData }) => void): this;
      on(event: 'combat:target-select', callback: (data: { targetId: string; mode: string }) => void): this;
      on(event: 'combat:move-confirm', callback: (data: { unitId: string; position: { x: number; y: number } }) => void): this;
    }
  }
}
```

### 7.2 与状态管理模块通信

```typescript
// 订阅状态
this.subscribeStore(
  (state: any) => state.units,
  (units: CombatUnitData[]) => this.updateUnits(units)
);

// 触发状态更新
this.events.emit('combat:move-confirm', data);
// 在 UI 组件中监听并调用 store
useCombatStore.getState().requestMove(position);
```

### 7.3 与通信模块通信

```typescript
// 通过 DOM 事件桥接
window.dispatchEvent(new CustomEvent('combat-event', {
  detail: payload
}));

// 游戏引擎模块监听
window.addEventListener('combat-event', (e) => {
  const event = e.detail;
  // 播放特效
});
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：组件设计师
