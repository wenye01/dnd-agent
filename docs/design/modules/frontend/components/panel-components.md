# 游戏面板组件设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: UI 模块

---

## 1. 组件列表

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| CharacterPanel | `components/panels/CharacterPanel/` | 角色信息面板 |
| StatsDisplay | `components/panels/CharacterPanel/` | 属性显示组件 |
| HPBar | `components/panels/CharacterPanel/` | 生命值条 |
| ConditionsDisplay | `components/panels/CharacterPanel/` | 状态效果显示 |
| InventoryPanel | `components/panels/InventoryPanel/` | 背包面板 |
| ItemSlot | `components/panels/InventoryPanel/` | 物品格子 |
| EquipmentSlots | `components/panels/InventoryPanel/` | 装备栏 |
| ItemTooltip | `components/panels/InventoryPanel/` | 物品提示 |
| SpellbookPanel | `components/panels/SpellbookPanel/` | 法术书面板 |
| SpellSlot | `components/panels/SpellbookPanel/` | 法术格子 |
| SpellSlotsDisplay | `components/panels/SpellbookPanel/` | 法术位显示 |
| PartyPanel | `components/panels/PartyPanel/` | 队伍面板 |
| PartyMember | `components/panels/PartyPanel/` | 队伍成员卡片 |

---

## 2. CharacterPanel（角色面板）

### 2.1 Props 接口

```typescript
// components/panels/CharacterPanel/CharacterPanel.tsx
export interface CharacterPanelProps {
  /** 角色 ID */
  characterId: string;
  /** 显示模式 */
  mode?: 'full' | 'compact' | 'minimal';
  /** 可编辑 */
  editable?: boolean;
  /** 显示属性 */
  showStats?: boolean;
  /** 显示装备 */
  showEquipment?: boolean;
  /** 显示法术 */
  showSpells?: boolean;
  /** 类名 */
  className?: string;
}
```

### 2.2 内部状态

```typescript
// 组件内部无状态，完全从 Store 读取
const character = useGameStore(state =>
  state.characters.find(c => c.id === characterId)
);
```

### 2.3 数据结构

```typescript
// 从 Store 读取的 Character 类型
interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background?: string;
  alignment?: string;
  experiencePoints: number;

  // 属性
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };

  // 战斗属性
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  initiative: number;
  proficiencyBonus: number;

  // 状态效果
  conditions: Condition[];

  // 装备
  equipment: Equipment;

  // 法术
  spellSlots: SpellSlots;
  preparedSpells: string[];
  knownSpells: string[];

  // 技能
  skills: Record<string, Skill>;
  proficiencies: string[];

  // 外观
  avatar?: string;
  color?: string;
}

interface Condition {
  id: string;
  name: string;
  description: string;
  duration?: number;
  source?: string;
}
```

### 2.4 交互设计

| 交互 | 描述 | 触发事件 |
|------|------|----------|
| 查看详情 | 点击角色名称/头像打开完整详情 | - |
| 编辑角色 | 编辑模式下点击属性进入编辑 | - |
| 调整 HP | 点击 HP 条打开调整对话框 | - |
| 查看状态 | 悬停状态图标显示说明 | - |
| 查看装备 | 悬停装备格子显示物品详情 | - |

### 2.5 样式方案

```typescript
// 完整模式布局
<div className="bg-slate-800 rounded-lg border border-slate-700 w-80">
  {/* 头部 */}
  <div className="p-4 border-b border-slate-700">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
        {avatar ? <img src={avatar} /> : <span className="text-xl">?</span>}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-white">{name}</h3>
        <p className="text-sm text-slate-400">
          {race} {class} {level}
        </p>
      </div>
    </div>
  </div>

  {/* HP 条 */}
  <div className="p-4">
    <HPBar current={hp} max={maxHp} temp={tempHp} />
  </div>

  {/* 属性 */}
  {showStats && <StatsDisplay stats={stats} />}

  {/* 状态效果 */}
  {conditions.length > 0 && (
    <ConditionsDisplay conditions={conditions} />
  )}

  {/* 装备 */}
  {showEquipment && <EquipmentSlots equipment={equipment} />}

  {/* 法术位 */}
  {showSpells && <SpellSlotsDisplay slots={spellSlots} />}
</div>

// 紧凑模式
<div className="bg-slate-800 rounded p-2 flex items-center gap-2">
  <div className="w-8 h-8 rounded bg-slate-700" />
  <div className="flex-1">
    <div className="text-sm font-medium">{name}</div>
    <HPBar current={hp} max={maxHp} size="sm" />
  </div>
</div>

// 最小模式（仅 HP 条）
<HPBar current={hp} max={maxHp} showName={true} name={name} />
```

---

## 3. StatsDisplay（属性显示）

### 3.1 Props 接口

```typescript
// components/panels/CharacterPanel/StatsDisplay.tsx
export interface StatsDisplayProps {
  /** 属性值 */
  stats: Character['stats'];
  /** 显示模式 */
  mode?: 'grid' | 'list' | 'circle';
  /** 显示修正值 */
  showModifier?: boolean;
  /** 可交互（点击检定） */
  interactive?: boolean;
  /** 检定回调 */
  onCheck?: (stat: keyof Character['stats']) => void;
  /** 类名 */
  className?: string;
}

export interface StatProps {
  /** 属性名 */
  name: string;
  /** 属性值 */
  value: number;
  /** 修正值 */
  modifier?: number;
  /** 熟练 */
  proficient?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}
```

### 3.2 修正值计算

```typescript
// 计算属性修正值
function calculateModifier(value: number): number {
  return Math.floor((value - 10) / 2);
}

// 显示格式
function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}
```

### 3.3 样式方案

```typescript
// 网格布局
<div className="grid grid-cols-3 gap-2">
  {Object.entries(stats).map(([key, value]) => (
    <StatBox
      key={key}
      name={key.toUpperCase()}
      value={value}
      modifier={calculateModifier(value)}
      onClick={() => onCheck?.(key)}
    />
  ))}
</div>

// 单个属性框
<div className="bg-slate-700 rounded p-2 text-center hover:bg-slate-600 cursor-pointer transition-colors">
  <div className="text-xs text-slate-400">{name}</div>
  <div className="text-lg font-bold text-white">{value}</div>
  <div className={cn(
    'text-sm',
    modifier >= 0 ? 'text-green-400' : 'text-red-400'
  )}>
    {formatModifier(modifier)}
  </div>
</div>

// 列表布局
<div className="space-y-1">
  {Object.entries(stats).map(([key, value]) => (
    <div key={key} className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{key.toUpperCase()}</span>
      <span className="font-mono">{value}</span>
    </div>
  ))}
</div>
```

---

## 4. HPBar（生命值条）

### 4.1 Props 接口

```typescript
// components/panels/CharacterPanel/HPBar.tsx
export interface HPBarProps {
  /** 当前 HP */
  current: number;
  /** 最大 HP */
  max: number;
  /** 临时 HP */
  temp?: number;
  /** 显示数值 */
  showText?: boolean;
  /** 显示名称 */
  showName?: boolean;
  /** 名称 */
  name?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 可编辑 */
  editable?: boolean;
  /** 编辑回调 */
  onEdit?: () => void;
  /** 颜色 */
  color?: 'red' | 'blue' | 'green' | 'yellow';
}
```

### 4.2 视觉设计

```
HP 条分层结构：

┌─────────────────────────────────────────────────────────────┐
│ 临时 HP (Temp HP)                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ████████░░░░░░░░░░ 8/10                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│ 当前 HP (Current HP)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ████████████████████░░░░░░░░░░░░ 18/30                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 18 / 30 HP                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 状态颜色

```typescript
// HP 百分比对应的颜色
function getHPColor(percentage: number): string {
  if (percentage > 0.5) return 'bg-green-500';
  if (percentage > 0.25) return 'bg-yellow-500';
  return 'bg-red-500';
}

// 受伤状态动画
<div className={cn(
  'transition-all duration-300',
  tookDamage && 'animate-pulse'
)}>
  <ProgressBar current={current} max={max} color={getHPColor(percentage)} />
</div>
```

---

## 5. ConditionsDisplay（状态效果显示）

### 5.1 Props 接口

```typescript
// components/panels/CharacterPanel/ConditionsDisplay.tsx
export interface ConditionsDisplayProps {
  /** 状态效果列表 */
  conditions: Condition[];
  /** 显示模式 */
  mode?: 'icons' | 'list' | 'compact';
  /** 最大显示数量 */
  maxDisplay?: number;
  /** 类名 */
  className?: string;
}

export interface ConditionIconProps {
  /** 状态 ID */
  conditionId: string;
  /** 状态名称 */
  name: string;
  /** 持续时间 */
  duration?: number;
  /** 点击回调 */
  onClick?: () => void;
}
```

### 5.2 状态图标映射

```typescript
// D&D 5e 状态效果图标
const conditionIcons: Record<string, string> = {
  blinded: '👁️',
  charmed: '💕',
  frightened: '😱',
  grappled: '🤼',
  incapacitated: '💫',
  invisible: '👻',
  paralyzed: '🧊',
  petrified: '🗿',
  poisoned: '☠️',
  prone: '↔️',
  restrained: '⛓️',
  stunned: '😵',
  exhausted: '😩',
};
```

### 5.3 样式方案

```typescript
// 图标模式
<div className="flex flex-wrap gap-1">
  {conditions.slice(0, maxDisplay).map(condition => (
    <Tooltip key={condition.id} content={condition.name}>
      <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-lg hover:bg-slate-600 cursor-help">
        {conditionIcons[condition.id] || '❓'}
        {condition.duration && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {condition.duration}
          </span>
        )}
      </div>
    </Tooltip>
  ))}
  {conditions.length > maxDisplay && (
    <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs">
      +{conditions.length - maxDisplay}
    </div>
  )}
</div>

// 列表模式
<div className="space-y-1">
  {conditions.map(condition => (
    <div key={condition.id} className="flex items-center gap-2 text-sm">
      <span>{conditionIcons[condition.id]}</span>
      <span className="flex-1">{condition.name}</span>
      {condition.duration && (
        <span className="text-slate-400">{condition.duration} 回合</span>
      )}
    </div>
  ))}
</div>
```

---

## 6. InventoryPanel（背包面板）

### 6.1 Props 接口

```typescript
// components/panels/InventoryPanel/InventoryPanel.tsx
export interface InventoryPanelProps {
  /** 角色 ID */
  characterId: string;
  /** 只读模式 */
  readOnly?: boolean;
  /** 显示重量 */
  showWeight?: boolean;
  /** 显示价值 */
  showValue?: boolean;
  /** 筛选类型 */
  filterType?: ItemType | 'all';
  /** 排序方式 */
  sortBy?: 'name' | 'type' | 'weight' | 'value';
  /** 物品选中回调 */
  onItemSelected?: (item: InventoryItem) => void;
  /** 物品使用回调 */
  onItemUse?: (item: InventoryItem) => void;
  /** 类名 */
  className?: string;
}

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'tool'
  | 'gear'
  | 'treasure';
```

### 6.2 数据结构

```typescript
interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  quantity: number;
  weight: number;
  value: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';

  // 装备属性
  armorClass?: number;
  damage?: string;
  damageType?: string;

  // 消耗品属性
  charges?: number;
  maxCharges?: number;

  // 法术属性
  spellLevel?: number;
  spellId?: string;

  // 图标
  icon?: string;
}

interface Equipment {
  head?: InventoryItem;
  neck?: InventoryItem;
  body?: InventoryItem;
  cloak?: InventoryItem;
  hands?: InventoryItem;
  ring1?: InventoryItem;
  ring2?: InventoryItem;
  belt?: InventoryItem;
  feet?: InventoryItem;
  weapon?: InventoryItem;
  shield?: InventoryItem;
}
```

### 6.3 样式方案

```typescript
// 背包主布局
<div className="bg-slate-800 rounded-lg border border-slate-700">
  {/* 头部 */}
  <div className="p-4 border-b border-slate-700 flex items-center justify-between">
    <h3 className="font-semibold">Inventory</h3>
    {showWeight && (
      <span className="text-sm text-slate-400">
        {currentWeight} / {carryCapacity} lb
      </span>
    )}
  </div>

  {/* 筛选和排序 */}
  <div className="p-2 flex gap-2 border-b border-slate-700">
    <Select value={filterType} onChange={setFilterType}>
      <option value="all">All</option>
      <option value="weapon">Weapons</option>
      <option value="armor">Armor</option>
      <option value="potion">Potions</option>
      {/* ... */}
    </Select>
  </div>

  {/* 装备栏 */}
  <EquipmentSlots equipment={equipment} onSlotClick={onItemSelected} />

  {/* 背包格子 */}
  <div className="p-4">
    <div className="grid grid-cols-5 gap-2">
      {inventorySlots.map(slot => (
        <ItemSlot
          key={slot.id}
          item={slot.item}
          empty={!slot.item}
          onClick={() => slot.item && onItemSelected?.(slot.item)}
        />
      ))}
    </div>
  </div>
</div>
```

---

## 7. ItemSlot（物品格子）

### 7.1 Props 接口

```typescript
// components/panels/InventoryPanel/ItemSlot.tsx
export interface ItemSlotProps {
  /** 物品数据 */
  item?: InventoryItem;
  /** 空格子 */
  empty?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 是否拖拽目标 */
  dropTarget?: boolean;
  /** 数量徽章 */
  showQuantity?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 右键回调 */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** 拖拽回调 */
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** 类名 */
  className?: string;
}
```

### 7.2 交互设计

| 交互 | 描述 |
|------|------|
| 左键点击 | 选中物品 |
| 右键点击 | 打开上下文菜单（使用、装备、丢弃） |
| 拖拽 | 移动物品到装备栏或其他格子 |
| 悬停 | 显示物品提示 |

### 7.3 样式方案

```typescript
// 稀有度颜色
const rarityColors = {
  common: 'border-slate-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  'very-rare': 'border-purple-500',
  legendary: 'border-yellow-500',
};

// 物品格子
<div
  className={cn(
    'w-14 h-14 rounded bg-slate-700 border-2',
    'flex items-center justify-center relative',
    'hover:bg-slate-600 cursor-pointer transition-colors',
    selected && 'ring-2 ring-blue-500',
    dropTarget && 'ring-2 ring-green-500',
    empty && 'border-dashed border-slate-600',
    item && rarityColors[item.rarity || 'common']
  )}
  onClick={onClick}
  onContextMenu={onContextMenu}
  draggable={!empty}
  onDragStart={onDragStart}
  onDragEnd={onDragEnd}
>
  {item ? (
    <>
      {/* 物品图标 */}
      <div className="text-2xl">{item.icon || defaultIcon}</div>

      {/* 数量徽章 */}
      {showQuantity && item.quantity > 1 && (
        <div className="absolute bottom-0 right-0 bg-slate-900 rounded px-1 text-xs">
          {item.quantity}
        </div>
      )}

      {/* 充能指示器 */}
      {item.charges !== undefined && (
        <div className="absolute top-0 right-0 flex gap-0.5">
          {Array.from({ length: item.maxCharges || 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 h-2 rounded-sm',
                i < (item.charges || 0) ? 'bg-blue-400' : 'bg-slate-600'
              )}
            />
          ))}
        </div>
      )}
    </>
  ) : (
    <div className="text-slate-600 text-2xl">+</div>
  )}
</div>
```

---

## 8. EquipmentSlots（装备栏）

### 8.1 Props 接口

```typescript
// components/panels/InventoryPanel/EquipmentSlots.tsx
export interface EquipmentSlotsProps {
  /** 装备数据 */
  equipment: Equipment;
  /** 只读模式 */
  readOnly?: boolean;
  /** 槽位点击回调 */
  onSlotClick?: (slot: keyof Equipment) => void;
  /** 类名 */
  className?: string;
}
```

### 8.2 布局设计

```
装备栏布局（纸娃娃系统）：

     [Head]
      [Neck]
[Ring1][Body][Ring2]
     [Cloak]
[Hand1][Belt][Hand2]
     [Feet]
[Weapon][Shield]
```

### 8.3 样式方案

```typescript
// 装备栏容器
<div className="bg-slate-900 rounded p-4">
  {/* 头部装备 */}
  <div className="flex justify-center mb-2">
    <EquipmentSlot
      item={equipment.head}
      slot="head"
      label="Head"
      onClick={onSlotClick}
    />
  </div>

  {/* 颈部 */}
  <div className="flex justify-center mb-2">
    <EquipmentSlot
      item={equipment.neck}
      slot="neck"
      label="Neck"
      onClick={onSlotClick}
    />
  </div>

  {/* 身体和戒指 */}
  <div className="flex justify-center gap-2 mb-2">
    <EquipmentSlot item={equipment.ring1} slot="ring1" label="Ring" />
    <EquipmentSlot item={equipment.body} slot="body" label="Armor" />
    <EquipmentSlot item={equipment.ring2} slot="ring2" label="Ring" />
  </div>

  {/* ... 其他槽位 */}
</div>
```

---

## 9. ItemTooltip（物品提示）

### 9.1 Props 接口

```typescript
// components/panels/InventoryPanel/ItemTooltip.tsx
export interface ItemTooltipProps {
  /** 物品数据 */
  item: InventoryItem;
  /** 显示位置 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 显示动作按钮 */
  showActions?: boolean;
  /** 动作回调 */
  onUse?: () => void;
  onEquip?: () => void;
  onDrop?: () => void;
}
```

### 9.2 内容结构

```typescript
// 物品提示内容
<div className="bg-slate-800 border border-slate-600 rounded-lg p-3 min-w-64">
  {/* 头部 */}
  <div className="flex items-center gap-2 mb-2">
    <span className="text-2xl">{item.icon}</span>
    <div>
      <div className={cn(
        'font-semibold',
        rarityColors[item.rarity]
      )}>
        {item.name}
      </div>
      <div className="text-xs text-slate-400">{item.type}</div>
    </div>
  </div>

  {/* 描述 */}
  <p className="text-sm text-slate-300 mb-2">{item.description}</p>

  {/* 属性 */}
  {item.armorClass && (
    <div className="text-sm">AC: {item.armorClass}</div>
  )}
  {item.damage && (
    <div className="text-sm">Damage: {item.damage} {item.damageType}</div>
  )}

  {/* 重量和价值 */}
  <div className="flex justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700">
    <span>Weight: {item.weight} lb</span>
    <span>Value: {item.value} gp</span>
  </div>

  {/* 动作按钮 */}
  {showActions && (
    <div className="flex gap-2 mt-3">
      {item.type === 'weapon' || item.type === 'armor' ? (
        <Button size="sm" onClick={onEquip}>Equip</Button>
      ) : item.type === 'potion' ? (
        <Button size="sm" onClick={onUse}>Use</Button>
      ) : null}
      <Button size="sm" variant="ghost" onClick={onDrop}>Drop</Button>
    </div>
  )}
</div>
```

---

## 10. SpellbookPanel（法术书面板）

### 10.1 Props 接口

```typescript
// components/panels/SpellbookPanel/SpellbookPanel.tsx
export interface SpellbookPanelProps {
  /** 角色 ID */
  characterId: string;
  /** 显示模式 */
  mode?: 'grid' | 'list' | 'compact';
  /** 筛选等级 */
  filterLevel?: number | 'all';
  /** 筛选学派 */
  filterSchool?: string | 'all';
  /** 法术选中回调 */
  onSpellSelected?: (spell: Spell) => void;
  /** 类名 */
  className?: string;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  components: string;
  description: string;
  ritual: boolean;
  concentration: boolean;
}

interface SpellSlots {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
  7: number;
  8: number;
  9: number;
}
```

### 10.2 样式方案

```typescript
// 法术书面板布局
<div className="bg-slate-800 rounded-lg border border-slate-700">
  {/* 头部 */}
  <div className="p-4 border-b border-slate-700">
    <h3 className="font-semibold">Spellbook</h3>
  </div>

  {/* 法术位显示 */}
  <SpellSlotsDisplay slots={spellSlots} />

  {/* 筛选器 */}
  <div className="p-2 flex gap-2 border-b border-slate-700">
    <Select value={filterLevel} onChange={setFilterLevel}>
      <option value="all">All Levels</option>
      <option value="0">Cantrips</option>
      <option value="1">1st Level</option>
      {/* ... */}
    </Select>
    <Select value={filterSchool} onChange={setFilterSchool}>
      <option value="all">All Schools</option>
      <option value="abjuration">Abjuration</option>
      <option value="conjuration">Conjuration</option>
      {/* ... */}
    </Select>
  </div>

  {/* 法术列表 */}
  <div className="p-4">
    <div className="grid grid-cols-2 gap-2">
      {filteredSpells.map(spell => (
        <SpellSlot
          key={spell.id}
          spell={spell}
          prepared={preparedSpells.includes(spell.id)}
          onClick={() => onSpellSelected?.(spell)}
        />
      ))}
    </div>
  </div>
</div>
```

---

## 11. SpellSlot（法术格子）

### 11.1 Props 接口

```typescript
// components/panels/SpellbookPanel/SpellSlot.tsx
export interface SpellSlotProps {
  /** 法术数据 */
  spell: Spell;
  /** 已准备 */
  prepared?: boolean;
  /** 可用（法术位） */
  available?: boolean;
  /** 选中状态 */
  selected?: boolean;
  /** 显示等级 */
  showLevel?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 切换准备状态 */
  onTogglePrepare?: () => void;
}
```

### 11.2 样式方案

```typescript
// 学派颜色
const schoolColors = {
  abjuration: 'border-yellow-500',
  conjuration: 'border-green-500',
  divination: 'border-blue-500',
  enchantment: 'border-pink-500',
  evocation: 'border-red-500',
  illusion: 'border-purple-500',
  necromancy: 'border-gray-500',
  transmutation: 'border-orange-500',
};

// 法术格子
<div
  className={cn(
    'p-2 rounded bg-slate-700 border-2',
    'hover:bg-slate-600 cursor-pointer transition-colors',
    schoolColors[spell.school],
    prepared && 'bg-blue-900/30',
    !available && 'opacity-50',
    selected && 'ring-2 ring-blue-500'
  )}
  onClick={onClick}
  onContextMenu={(e) => {
    e.preventDefault();
    onTogglePrepare?.();
  }}
>
  <div className="flex items-center gap-2">
    {/* 等级标识 */}
    {showLevel && (
      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
        {spell.level}
      </div>
    )}

    {/* 法术名称 */}
    <div className="flex-1">
      <div className="font-medium text-sm">{spell.name}</div>
      <div className="text-xs text-slate-400">{spell.school}</div>
    </div>

    {/* 准备标记 */}
    {prepared && (
      <div className="text-green-400">
        <CheckIcon />
      </div>
    )}

    {/* 专注标记 */}
    {spell.concentration && (
      <div className="text-yellow-400">
        <ConcentrationIcon />
      </div>
    )}
  </div>
</div>
```

---

## 12. SpellSlotsDisplay（法术位显示）

### 12.1 Props 接口

```typescript
// components/panels/SpellbookPanel/SpellSlotsDisplay.tsx
export interface SpellSlotsDisplayProps {
  /** 法术位数据 */
  slots: SpellSlots;
  /** 每级最大法术位 */
  maxSlots: SpellSlots;
  /** 显示模式 */
  mode?: 'dots' | 'bars' | 'numbers';
}
```

### 12.2 样式方案

```typescript
// 法术位显示布局
<div className="p-4 space-y-2">
  {[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(level => maxSlots[level] > 0).map(level => (
    <div key={level} className="flex items-center gap-2">
      <div className="w-12 text-sm text-slate-400">
        {level}{level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'}
      </div>

      {/* 点状显示 */}
      {mode === 'dots' && (
        <div className="flex gap-1">
          {Array.from({ length: maxSlots[level] }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-4 h-4 rounded-full',
                i < slots[level] ? 'bg-blue-500' : 'bg-slate-700'
              )}
            />
          ))}
        </div>
      )}

      {/* 进度条显示 */}
      {mode === 'bars' && (
        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${(slots[level] / maxSlots[level]) * 100}%` }}
          />
        </div>
      )}

      {/* 数值显示 */}
      {mode === 'numbers' && (
        <div className="text-sm">
          {slots[level]} / {maxSlots[level]}
        </div>
      )}
    </div>
  ))}
</div>
```

---

## 13. PartyPanel（队伍面板）

### 13.1 Props 接口

```typescript
// components/panels/PartyPanel/PartyPanel.tsx
export interface PartyPanelProps {
  /** 队伍角色 ID 列表 */
  characterIds: string[];
  /** 当前选中角色 */
  selectedId?: string;
  /** 选择回调 */
  onSelect?: (characterId: string) => void;
  /** 显示模式 */
  mode?: 'list' | 'grid' | 'compact';
  /** 类名 */
  className?: string;
}

export interface PartyMemberProps {
  /** 角色 ID */
  characterId: string;
  /** 选中状态 */
  selected?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 显示模式 */
  mode?: 'full' | 'compact';
}
```

### 13.2 样式方案

```typescript
// 队伍面板布局
<div className="bg-slate-800 rounded-lg border border-slate-700">
  {/* 头部 */}
  <div className="p-4 border-b border-slate-700">
    <h3 className="font-semibold">Party</h3>
  </div>

  {/* 成员列表 */}
  <div className={cn(
    'divide-y divide-slate-700',
    mode === 'grid' && 'grid grid-cols-2 gap-2 p-2 divide-none'
  )}>
    {characterIds.map(id => (
      <PartyMember
        key={id}
        characterId={id}
        selected={id === selectedId}
        onClick={() => onSelect?.(id)}
        mode={mode}
      />
    ))}
  </div>
</div>

// 单个成员
<div
  className={cn(
    'p-3 hover:bg-slate-700 cursor-pointer transition-colors',
    selected && 'bg-blue-900/30 border-l-2 border-blue-500'
  )}
  onClick={onClick}
>
  <div className="flex items-center gap-3">
    {/* 头像 */}
    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
      <Avatar characterId={characterId} />
    </div>

    {/* 信息 */}
    <div className="flex-1">
      <div className="font-medium">{character.name}</div>
      <div className="text-sm text-slate-400">
        {character.class} {character.level}
      </div>
    </div>

    {/* HP */}
    <div className="text-right">
      <div className="text-sm font-medium">
        {character.hp} / {character.maxHp}
      </div>
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500"
          style={{ width: `${(character.hp / character.maxHp) * 100}%` }}
        />
      </div>
    </div>
  </div>

  {/* 状态效果 */}
  {character.conditions.length > 0 && (
    <div className="flex gap-1 mt-2">
      {character.conditions.map(c => (
        <span key={c.id} className="text-lg" title={c.name}>
          {conditionIcons[c.id]}
        </span>
      ))}
    </div>
  )}
</div>
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
