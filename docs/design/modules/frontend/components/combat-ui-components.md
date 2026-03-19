# 战斗 UI 组件设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: UI 模块

---

## 1. 组件列表

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| CombatHUD | `components/combat/CombatHUD/` | 战斗主 HUD（抬头显示） |
| InitiativeTracker | `components/combat/InitiativeTracker/` | 先攻顺序追踪器 |
| InitiativeSlot | `components/combat/InitiativeTracker/` | 先攻槽位 |
| ActionSelector | `components/combat/ActionSelector/` | 行动选择器 |
| AttackAction | `components/combat/ActionSelector/` | 攻击行动面板 |
| SpellAction | `components/combat/ActionSelector/` | 施法行动面板 |
| ItemAction | `components/combat/ActionSelector/` | 物品行动面板 |
| MoveAction | `components/combat/ActionSelector/` | 移动行动面板 |
| TargetSelector | `components/combat/TargetSelector/` | 目标选择器 |
| TurnIndicator | `components/combat/TurnIndicator/` | 回合指示器 |
| CombatLog | `components/combat/CombatLog/` | 战斗日志 |
| UnitStatusBar | `components/combat/UnitStatusBar/` | 单位状态条 |

---

## 2. CombatHUD（战斗主 HUD）

### 2.1 Props 接口

```typescript
// components/combat/CombatHUD/CombatHUD.tsx
export interface CombatHUDProps {
  /** 战斗 ID */
  combatId: string;
  /** 显示模式 */
  mode?: 'full' | 'minimal';
  /** 当前角色 ID */
  currentCharacterId?: string;
  /** 隐藏组件 */
  hideInitiative?: boolean;
  hideActions?: boolean;
  hideLog?: boolean;
  /** 类名 */
  className?: string;
}

// HUD 布局区域
export interface HUDLayoutProps {
  /** 左侧区域（先攻追踪） */
  left?: React.ReactNode;
  /** 顶部区域（回合指示） */
  top?: React.ReactNode;
  /** 右侧区域（行动选择） */
  right?: React.ReactNode;
  /** 底部区域（战斗日志） */
  bottom?: React.ReactNode;
  /** 中央区域（叠加在游戏画面上） */
  center?: React.ReactNode;
}
```

### 2.2 布局设计

```
战斗 HUD 布局：

┌─────────────────────────────────────────────────────────────────────────┐
│                              [Top: Turn Indicator]                       │
├──────────────┬────────────────────────────────────────────────┬──────────┤
│              │                                                │          │
│              │                                                │          │
│   [Left:     │              Game View                         │ [Right:  │
│  Initiative] │            (Phaser Canvas)                      │ Actions] │
│              │                                                │          │
│              │                                                │          │
│              │                                                │          │
├──────────────┴────────────────────────────────────────────────┴──────────┤
│                         [Bottom: Combat Log]                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 样式方案

```typescript
// HUD 容器
<div className="fixed inset-0 pointer-events-none">
  {/* 左侧：先攻追踪 */}
  {!hideInitiative && (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
      <InitiativeTracker />
    </div>
  )}

  {/* 顶部：回合指示 */}
  <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
    <TurnIndicator />
  </div>

  {/* 右侧：行动选择 */}
  {!hideActions && (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
      <ActionSelector characterId={currentCharacterId} />
    </div>
  )}

  {/* 底部：战斗日志 */}
  {!hideLog && (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto max-w-lg w-full">
      <CombatLog />
    </div>
  )}

  {/* 中央：单位状态条 */}
  <div className="absolute inset-0 pointer-events-none">
    <UnitStatusOverlay />
  </div>
</div>
```

---

## 3. InitiativeTracker（先攻追踪器）

### 3.1 Props 接口

```typescript
// components/combat/InitiativeTracker/InitiativeTracker.tsx
export interface InitiativeTrackerProps {
  /** 先攻列表（从 Store 读取） */
  initiatives?: InitiativeEntry[];
  /** 当前回合索引 */
  currentTurn?: number;
  /** 当前回合单位 ID */
  currentUnitId?: string;
  /** 显示模式 */
  mode?: 'full' | 'compact' | 'minimal';
  /** 点击回调 */
  onUnitClick?: (unitId: string) => void;
  /** 类名 */
  className?: string;
}

export interface InitiativeEntry {
  unitId: string;
  unitName: string;
  initiative: number;
  dexterity: number;  // 平局时比较
  team: 'player' | 'enemy' | 'neutral';
  icon?: string;
  status: 'active' | 'delayed' | 'ready' | 'dead';
}
```

### 3.2 内部状态

```typescript
// 排序后的先攻列表（从 Store 计算得出）
const sortedInitiatives = useMemo(() => {
  return [...initiatives].sort((a, b) => {
    if (a.initiative !== b.initiative) {
      return b.initiative - a.initiative;
    }
    return b.dexterity - a.dexterity;
  });
}, [initiatives]);
```

### 3.3 交互设计

| 交互 | 描述 |
|------|------|
| 点击单位 | 选中对应单位（高亮显示） |
| 悬停 | 显示单位简要信息 |
| 拖拽 | 调整先攻顺序（仅 DM） |
| 右键 | 打开单位上下文菜单 |

### 3.4 样式方案

```typescript
// 先攻追踪器布局
<div className="bg-slate-800/90 backdrop-blur rounded-lg border border-slate-700 overflow-hidden">
  {/* 头部 */}
  <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700">
    <h3 className="text-sm font-semibold">Initiative</h3>
  </div>

  {/* 先攻列表 */}
  <div className="max-h-96 overflow-y-auto">
    {sortedInitiatives.map((entry, index) => (
      <InitiativeSlot
        key={entry.unitId}
        entry={entry}
        isActive={entry.unitId === currentUnitId}
        isCurrentTurn={index === currentTurn}
        turnNumber={index + 1}
        onClick={() => onUnitClick?.(entry.unitId)}
      />
    ))}
  </div>

  {/* 回合计数 */}
  <div className="px-3 py-2 bg-slate-700/50 border-t border-slate-700 text-center text-sm">
    Round {roundNumber}
  </div>
</div>
```

---

## 4. InitiativeSlot（先攻槽位）

### 4.1 Props 接口

```typescript
// components/combat/InitiativeTracker/InitiativeSlot.tsx
export interface InitiativeSlotProps {
  /** 先攻条目 */
  entry: InitiativeEntry;
  /** 是否当前单位 */
  isActive?: boolean;
  /** 是否当前回合 */
  isCurrentTurn?: boolean;
  /** 回合数 */
  turnNumber?: number;
  /** 点击回调 */
  onClick?: () => void;
}
```

### 4.2 样式方案

```typescript
// 先攻槽位
<div
  className={cn(
    'flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 last:border-0',
    'hover:bg-slate-700/50 cursor-pointer transition-colors',
    isCurrentTurn && 'bg-blue-900/30',
    entry.status === 'dead' && 'opacity-50 grayscale',
    entry.status === 'delayed' && 'opacity-70'
  )}
  onClick={onClick}
>
  {/* 回合标记 */}
  {isCurrentTurn && (
    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
  )}

  {/* 回合数 */}
  <div className="w-6 text-center text-sm text-slate-400">
    {turnNumber}
  </div>

  {/* 队伍标识 */}
  <div className={cn(
    'w-3 h-3 rounded-sm',
    entry.team === 'player' && 'bg-blue-500',
    entry.team === 'enemy' && 'bg-red-500',
    entry.team === 'neutral' && 'bg-yellow-500'
  )} />

  {/* 图标 */}
  {entry.icon && (
    <div className="text-lg">{entry.icon}</div>
  )}

  {/* 名称 */}
  <div className="flex-1 text-sm font-medium truncate">
    {entry.unitName}
  </div>

  {/* 先攻值 */}
  <div className="text-lg font-bold">
    {entry.initiative}
  </div>

  {/* 状态标记 */}
  {entry.status === 'delayed' && (
    <Tooltip content="Delayed">
      <ClockIcon className="w-4 h-4 text-yellow-400" />
    </Tooltip>
  )}
  {entry.status === 'ready' && (
    <Tooltip content="Ready Action">
      <BoltIcon className="w-4 h-4 text-blue-400" />
    </Tooltip>
  )}
</div>
```

---

## 5. ActionSelector（行动选择器）

### 5.1 Props 接口

```typescript
// components/combat/ActionSelector/ActionSelector.tsx
export interface ActionSelectorProps {
  /** 角色 ID */
  characterId: string;
  /** 可用行动 */
  availableActions?: ActionType[];
  /** 行动选中回调 */
  onActionSelect: (action: CombatAction) => void;
  /** 显示模式 */
  mode?: 'full' | 'compact' | 'floating';
  /** 类名 */
  className?: string;
}

export type ActionType =
  | 'attack'
  | 'spell'
  | 'item'
  | 'move'
  | 'dash'
  | 'disengage'
  | 'dodge'
  | 'help'
  | 'hide'
  | 'ready'
  | 'search'
  | 'use_object';

export interface CombatAction {
  type: ActionType;
  id?: string;
  name: string;
  description?: string;
  icon?: IconName;
  cost?: ActionCost;
  requirements?: ActionRequirement[];
}

export interface ActionCost {
  action?: boolean;
  bonusAction?: boolean;
  reaction?: boolean;
  movement?: number;  // 英尺
}

export interface ActionRequirement {
  type: 'weapon_equipped' | 'spell_slot' | 'item_available' | 'not_cast_spell';
  value?: any;
  met: boolean;
  reason?: string;
}
```

### 5.2 行动类别

```typescript
// 行动分类
const actionCategories: Record<string, ActionType[]> = {
  actions: ['attack', 'cast_spell', 'use_item', 'dash', 'disengage', 'dodge', 'help'],
  bonusActions: ['hide', 'ready', 'search'],
  movement: ['move', 'climb', 'swim'],
  reactions: ['opportunity_attack', 'readied_action'],
};

// 行动配置
const actionConfigs: Record<ActionType, CombatAction> = {
  attack: {
    type: 'attack',
    name: 'Attack',
    icon: 'sword',
    description: 'Make a weapon attack',
    cost: { action: true },
  },
  spell: {
    type: 'spell',
    name: 'Cast Spell',
    icon: 'spellbook',
    description: 'Cast a prepared spell',
    cost: { action: true },
  },
  item: {
    type: 'item',
    name: 'Use Item',
    icon: 'potion',
    description: 'Use an item from your inventory',
    cost: { action: true, bonusAction: true },
  },
  move: {
    type: 'move',
    name: 'Move',
    icon: 'footprints',
    description: 'Move your speed',
    cost: { movement: 30 },
  },
  dash: {
    type: 'dash',
    name: 'Dash',
    icon: 'wind',
    description: 'Move additional distance',
    cost: { action: true },
  },
  dodge: {
    type: 'dodge',
    name: 'Dodge',
    icon: 'shield',
    description: 'Disadvantage on attacks against you',
    cost: { action: true },
  },
  disengage: {
    type: 'disengage',
    name: 'Disengage',
    icon: 'feather',
    description: 'Move without provoking opportunity attacks',
    cost: { action: true },
  },
  // ... 更多行动
};
```

### 5.3 样式方案

```typescript
// 行动选择器布局
<div className="bg-slate-800/90 backdrop-blur rounded-lg border border-slate-700">
  {/* 头部 */}
  <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700">
    <h3 className="text-sm font-semibold">Actions</h3>
  </div>

  {/* 行动类别 */}
  <div className="divide-y divide-slate-700/50">
    {/* 行动（Actions） */}
    <ActionSection
      title="Actions"
      actions={availableActions.filter(a => a.cost?.action)}
      onSelect={onActionSelect}
      remaining={turnActions.action ? 1 : 0}
    />

    {/* 附赠行动（Bonus Actions） */}
    <ActionSection
      title="Bonus Actions"
      actions={availableActions.filter(a => a.cost?.bonusAction)}
      onSelect={onActionSelect}
      remaining={turnActions.bonusAction ? 1 : 0}
    />

    {/* 移动（Movement） */}
    <ActionSection
      title="Movement"
      actions={availableActions.filter(a => a.cost?.movement)}
      onSelect={onActionSelect}
      remaining={remainingMovement}
    />

    {/* 反应（Reactions） */}
    <ActionSection
      title="Reactions"
      actions={availableActions.filter(a => a.cost?.reaction)}
      onSelect={onActionSelect}
      remaining={turnActions.reaction ? 1 : 0}
    />
  </div>

  {/* 结束回合按钮 */}
  <div className="p-3 border-t border-slate-700">
    <Button
      variant="danger"
      fullWidth
      onClick={endTurn}
    >
      End Turn
    </Button>
  </div>
</div>

// 行动区域
function ActionSection({
  title,
  actions,
  onSelect,
  remaining
}: ActionSectionProps) {
  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{title}</span>
        {remaining !== undefined && (
          <span className={cn(
            'text-xs',
            remaining > 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {remaining} remaining
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {actions.map(action => (
          <ActionButton
            key={action.type}
            action={action}
            available={remaining > 0}
            onClick={() => onSelect(action)}
          />
        ))}
      </div>
    </div>
  );
}

// 行动按钮
function ActionButton({ action, available, onClick }: ActionButtonProps) {
  return (
    <Tooltip content={action.description}>
      <button
        className={cn(
          'aspect-square rounded flex flex-col items-center justify-center gap-1 transition-colors',
          'hover:bg-slate-700',
          available ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
        )}
        onClick={available ? onClick : undefined}
        disabled={!available}
      >
        <span className="text-2xl">{action.icon}</span>
        <span className="text-xs text-center">{action.name}</span>
      </button>
    </Tooltip>
  );
}
```

---

## 6. AttackAction（攻击行动面板）

### 6.1 Props 接口

```typescript
// components/combat/ActionSelector/AttackAction.tsx
export interface AttackActionProps {
  /** 角色 ID */
  characterId: string;
  /** 攻击确认回调 */
  onAttack: (attack: AttackRequest) => void;
  /** 取消回调 */
  onCancel: () => void;
}

export interface AttackRequest {
  attackerId: string;
  weaponId: string;
  targetId: string;
  advantage?: 'advantage' | 'disadvantage' | 'normal';
}
```

### 6.2 样式方案

```typescript
// 攻击面板布局
<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
  {/* 头部 */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold">Attack</h3>
    <Button size="sm" variant="ghost" onClick={onCancel}>
      <CloseIcon />
    </Button>
  </div>

  {/* 武器选择 */}
  <div className="mb-4">
    <label className="text-sm text-slate-400 mb-2 block">Select Weapon</label>
    <div className="grid grid-cols-4 gap-2">
      {equippedWeapons.map(weapon => (
        <WeaponCard
          key={weapon.id}
          weapon={weapon}
          selected={selectedWeaponId === weapon.id}
          onClick={() => setSelectedWeaponId(weapon.id)}
        />
      ))}
    </div>
  </div>

  {/* 目标选择 */}
  {selectedWeapon && (
    <div className="mb-4">
      <label className="text-sm text-slate-400 mb-2 block">Select Target</label>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {validTargets.map(target => (
          <TargetOption
            key={target.id}
            target={target}
            selected={selectedTargetId === target.id}
            onClick={() => setSelectedTargetId(target.id)}
          />
        ))}
      </div>
    </div>
  )}

  {/* 优势/劣势选择 */}
  {selectedWeapon && selectedTarget && (
    <div className="mb-4">
      <label className="text-sm text-slate-400 mb-2 block">Roll Modifier</label>
      <div className="flex gap-2">
        <RollModifierButton
          type="normal"
          selected={advantage === 'normal'}
          onClick={() => setAdvantage('normal')}
        />
        <RollModifierButton
          type="advantage"
          selected={advantage === 'advantage'}
          onClick={() => setAdvantage('advantage')}
        />
        <RollModifierButton
          type="disadvantage"
          selected={advantage === 'disadvantage'}
          onClick={() => setAdvantage('disadvantage')}
        />
      </div>
    </div>
  )}

  {/* 确认按钮 */}
  <div className="flex gap-2">
    <Button
      variant="secondary"
      fullWidth
      onClick={onCancel}
    >
      Cancel
    </Button>
    <Button
      fullWidth
      disabled={!selectedWeapon || !selectedTarget}
      onClick={() => onAttack({
        attackerId: characterId,
        weaponId: selectedWeaponId,
        targetId: selectedTargetId,
        advantage
      })}
    >
      Attack
    </Button>
  </div>
</div>
```

---

## 7. SpellAction（施法行动面板）

### 7.1 Props 接口

```typescript
// components/combat/ActionSelector/SpellAction.tsx
export interface SpellActionProps {
  /** 角色 ID */
  characterId: string;
  /** 法术确认回调 */
  onCast: (cast: SpellCastRequest) => void;
  /** 取消回调 */
  onCancel: () => void;
}

export interface SpellCastRequest {
  casterId: string;
  spellId: string;
  targetId?: string;
  position?: { x: number; y: number };
  level?: number;  // 升阶施法
  metamagic?: string[];
}
```

### 7.2 样式方案

```typescript
// 施法面板布局
<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
  {/* 头部 */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold">Cast Spell</h3>
    <Button size="sm" variant="ghost" onClick={onCancel}>
      <CloseIcon />
    </Button>
  </div>

  {/* 法术位选择 */}
  <div className="mb-4">
    <label className="text-sm text-slate-400 mb-2 block">Spell Level</label>
    <div className="flex gap-2">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(level => spellSlots[level] > 0).map(level => (
        <SpellLevelButton
          key={level}
          level={level}
          available={spellSlots[level] > 0}
          selected={selectedLevel === level}
          onClick={() => setSelectedLevel(level)}
        />
      ))}
    </div>
  </div>

  {/* 法术列表 */}
  {selectedLevel !== null && (
    <div className="mb-4">
      <label className="text-sm text-slate-400 mb-2 block">
        {selectedLevel === 0 ? 'Cantrips' : `${getOrdinal(selectedLevel)} Level`}
      </label>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {availableSpells.map(spell => (
          <SpellOption
            key={spell.id}
            spell={spell}
            selected={selectedSpellId === spell.id}
            onClick={() => setSelectedSpellId(spell.id)}
          />
        ))}
      </div>
    </div>
  )}

  {/* 法术详情 */}
  {selectedSpell && (
    <div className="mb-4 p-3 bg-slate-900/50 rounded">
      <SpellDetails spell={selectedSpell} />
    </div>
  )}

  {/* 目标选择（根据法术类型） */}
  {selectedSpell && needsTarget(selectedSpell) && (
    <div className="mb-4">
      <label className="text-sm text-slate-400 mb-2 block">Target</label>
      <TargetSelector
        spell={selectedSpell}
        onSelect={setSelectedTarget}
      />
    </div>
  )}

  {/* 确认按钮 */}
  <div className="flex gap-2">
    <Button variant="secondary" fullWidth onClick={onCancel}>
      Cancel
    </Button>
    <Button
      fullWidth
      disabled={!selectedSpell}
      onClick={() => onCast({
        casterId: characterId,
        spellId: selectedSpellId,
        targetId: selectedTarget,
        level: selectedLevel
      })}
    >
      Cast
    </Button>
  </div>
</div>
```

---

## 8. TargetSelector（目标选择器）

### 8.1 Props 接口

```typescript
// components/combat/TargetSelector/TargetSelector.tsx
export interface TargetSelectorProps {
  /** 目标类型 */
  targetType: 'single' | 'multiple' | 'area' | 'self';
  /** 有效目标列表 */
  validTargets?: CombatUnit[];
  /** 范围信息 */
  range?: number;
  /** 形状（area 目标） */
  shape?: 'sphere' | 'cube' | 'cone' | 'line';
  /** 半径/尺寸 */
  size?: number;
  /** 目标选中回调 */
  onSelect: (targets: string[] | { x: number; y: number }) => void;
  /** 取消回调 */
  onCancel?: () => void;
}
```

### 8.2 交互设计

| 目标类型 | 选择方式 |
|----------|----------|
| single | 点击单个单位 |
| multiple | 点击多个单位（可取消选择） |
| area | 在地图上选择位置 |
| self | 自动选中施法者 |

### 8.3 样式方案

```typescript
// 目标选择器覆盖层
<div className="absolute inset-0 pointer-events-none">
  {/* 选取框（area 目标） */}
  {targetType === 'area' && selectedPosition && (
    <div
      className="absolute border-2 border-dashed border-blue-500 rounded-full bg-blue-500/10 pointer-events-none"
      style={{
        left: selectedPosition.x,
        top: selectedPosition.y,
        width: size * 2,
        height: size * 2,
        transform: 'translate(-50%, -50%)'
      }}
    />
  )}

  {/* 目标标记 */}
  {selectedTargets.map(targetId => {
    const target = units.find(u => u.id === targetId);
    if (!target) return null;

    return (
      <div
        key={targetId}
        className="absolute pointer-events-none"
        style={{
          left: target.position.x,
          top: target.position.y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <div className="flex flex-col items-center">
          {/* 目标图标 */}
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-bounce">
            <CrosshairIcon />
          </div>
          {/* 范围指示器 */}
          {range && (
            <div className="w-2 h-2 bg-red-500 rounded-full mt-1" />
          )}
        </div>
      </div>
    );
  })}
</div>
```

---

## 9. TurnIndicator（回合指示器）

### 9.1 Props 接口

```typescript
// components/combat/TurnIndicator/TurnIndicator.tsx
export interface TurnIndicatorProps {
  /** 当前单位名称 */
  currentUnitName: string;
  /** 回合类型 */
  turnType: 'player' | 'enemy' | 'neutral';
  /** 倒计时（自动结束回合） */
  countdown?: number;
  /** 回合数 */
  roundNumber: number;
  /** 类名 */
  className?: string;
}
```

### 9.2 样式方案

```typescript
// 回合指示器
<div className="bg-slate-800/90 backdrop-blur rounded-full px-6 py-2 border border-slate-700 flex items-center gap-4">
  {/* 回合类型图标 */}
  <div className={cn(
    'w-10 h-10 rounded-full flex items-center justify-center',
    turnType === 'player' && 'bg-blue-500',
    turnType === 'enemy' && 'bg-red-500',
    turnType === 'neutral' && 'bg-yellow-500'
  )}>
    {turnType === 'player' && <UserIcon />}
    {turnType === 'enemy' && <SkullIcon />}
    {turnType === 'neutral' && <ShieldIcon />}
  </div>

  {/* 当前单位 */}
  <div className="text-center">
    <div className="text-xs text-slate-400">
      Round {roundNumber}
    </div>
    <div className="font-semibold">
      {currentUnitName}'s Turn
    </div>
  </div>

  {/* 倒计时 */}
  {countdown !== undefined && countdown > 0 && (
    <div className="flex items-center gap-1">
      <ClockIcon className="w-4 h-4 text-slate-400" />
      <span className="text-sm font-mono">{countdown}s</span>
    </div>
  )}
</div>
```

---

## 10. CombatLog（战斗日志）

### 10.1 Props 接口

```typescript
// components/combat/CombatLog/CombatLog.tsx
export interface CombatLogProps {
  /** 日志条目（从 Store 读取） */
  entries?: CombatLogEntry[];
  /** 最大显示条数 */
  maxEntries?: number;
  /** 自动滚动 */
  autoScroll?: boolean;
  /** 类名 */
  className?: string;
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  type: 'attack' | 'damage' | 'spell' | 'movement' | 'effect' | 'death';
  sourceId: string;
  sourceName: string;
  targetId?: string;
  targetName?: string;
  details: {
    main?: string;
    sub?: string;
    icon?: string;
    color?: string;
  };
}
```

### 10.2 样式方案

```typescript
// 战斗日志容器
<div className="bg-slate-800/90 backdrop-blur rounded-lg border border-slate-700">
  {/* 头部 */}
  <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700 flex items-center justify-between">
    <h3 className="text-sm font-semibold">Combat Log</h3>
    <Button size="sm" variant="ghost" onClick={clearLog}>
      <TrashIcon className="w-4 h-4" />
    </Button>
  </div>

  {/* 日志条目 */}
  <div className="max-h-48 overflow-y-auto p-2 space-y-1">
    {entries.slice(-maxEntries).map(entry => (
      <CombatLogEntry key={entry.id} entry={entry} />
    ))}
  </div>
</div>

// 单条日志
<div className="flex items-start gap-2 text-sm">
  {/* 图标 */}
  <div className={cn(
    'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
    entry.details.color || 'bg-slate-700'
  )}>
    {entry.details.icon}
  </div>

  {/* 内容 */}
  <div className="flex-1 min-w-0">
    <div className="text-slate-300">{entry.details.main}</div>
    {entry.details.sub && (
      <div className="text-xs text-slate-500">{entry.details.sub}</div>
    )}
  </div>

  {/* 时间 */}
  <div className="text-xs text-slate-600">
    {formatTime(entry.timestamp)}
  </div>
</div>
```

---

## 11. UnitStatusBar（单位状态条）

### 11.1 Props 接口

```typescript
// components/combat/UnitStatusBar/UnitStatusBar.tsx
export interface UnitStatusBarProps {
  /** 单位数据 */
  unit: CombatUnit;
  /** 位置 */
  position: { x: number; y: number };
  /** 偏移 */
  offset?: { x: number; y: number };
  /** 显示内容 */
  show?: ('name' | 'hp' | 'conditions')[];
  /** 类名 */
  className?: string;
}
```

### 11.2 样式方案

```typescript
// 单位状态条（浮动在单位上方）
<div
  className="absolute pointer-events-none"
  style={{
    left: position.x + (offset?.x || 0),
    top: position.y + (offset?.y || 0) - 50,
    transform: 'translateX(-50%)'
  }}
>
  {/* 名称 */}
  {show?.includes('name') && (
    <div className="text-center text-sm font-medium text-white drop-shadow-lg">
      {unit.name}
    </div>
  )}

  {/* HP 条 */}
  {show?.includes('hp') && (
    <div className="w-24 h-3 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700">
      <div
        className={cn(
          'h-full transition-all duration-300',
          getHPColor(unit.hp / unit.maxHp)
        )}
        style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
      />
    </div>
  )}

  {/* 状态效果 */}
  {show?.includes('conditions') && unit.conditions.length > 0 && (
    <div className="flex justify-center gap-0.5 mt-1">
      {unit.conditions.slice(0, 4).map(condition => (
        <div key={condition.id} className="w-5 h-5 rounded bg-slate-900/80 flex items-center justify-center text-xs">
          {conditionIcons[condition.id]}
        </div>
      ))}
      {unit.conditions.length > 4 && (
        <div className="w-5 h-5 rounded bg-slate-900/80 flex items-center justify-center text-xs">
          +{unit.conditions.length - 4}
        </div>
      )}
    </div>
  )}
</div>
```

---

## 12. 战斗 UI 状态集成

### 12.1 Store 集成

```typescript
// 从 CombatStore 读取状态
const combatState = useCombatStore(state => ({
  isActive: state.isActive,
  currentUnitId: state.currentUnitId,
  currentTurn: state.currentTurn,
  roundNumber: state.roundNumber,
  initiatives: state.initiativeOrder,
  units: state.units,
  turnActions: state.turnActions,
  selectedMoveTarget: state.selectedMoveTarget,
  targetMode: state.targetMode,
  validTargets: state.validTargets,
}));
```

### 12.2 事件处理

```typescript
// 行动确认后发送到后端
const handleActionConfirm = (action: CombatAction) => {
  // 更新本地状态（乐观更新）
  useCombatStore.getState().selectAction(action.type);

  // 发送到后端
  websocketClient.send({
    type: 'combat_action',
    payload: {
      actionType: action.type,
      ...action
    }
  });
};
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
