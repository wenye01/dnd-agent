# UI 模块设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属子系统**: Web 前端子系统

---

## 1. 模块概述

### 1.1 模块职责

UI 模块负责所有用户界面的渲染和交互，包括：

- 通用 UI 组件（按钮、输入框、面板等）
- 游戏面板组件（角色面板、背包、技能书等）
- 聊天界面组件（消息列表、输入框、叙述展示）
- 对话框组件（存档/读档、设置、确认等）
- 战斗 UI 组件（战斗 HUD、先攻追踪器、行动选择器）
- 布局组件（主布局、游戏布局）

### 1.2 设计原则

- **组件化**：所有 UI 元素都是可复用的组件
- **类型安全**：使用 TypeScript 确保类型安全
- **样式一致**：使用 Tailwind CSS 统一样式
- **无状态优先**：组件尽量保持无状态，状态由 Store 管理

### 1.3 模块边界

**包含**：
- 所有 React UI 组件
- 组件样式定义
- 组件相关的自定义 Hooks

**不包含**：
- 游戏渲染逻辑（由游戏引擎模块负责）
- 状态管理逻辑（由状态管理模块负责）
- 网络通信逻辑（由通信模块负责）

---

## 2. 目录结构

```
components/
├── ui/                           # 通用 UI 组件
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styles.ts
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Input/
│   │   ├── Input.tsx
│   │   ├── TextArea.tsx
│   │   └── index.ts
│   ├── Panel/
│   │   ├── Panel.tsx
│   │   ├── PanelHeader.tsx
│   │   ├── PanelBody.tsx
│   │   └── index.ts
│   ├── Tooltip/
│   │   ├── Tooltip.tsx
│   │   └── index.ts
│   ├── Modal/
│   │   ├── Modal.tsx
│   │   └── index.ts
│   ├── ProgressBar/
│   │   ├── ProgressBar.tsx
│   │   └── index.ts
│   ├── Icon/
│   │   ├── Icon.tsx
│   │   ├── icons.ts              # 图标定义
│   │   └── index.ts
│   └── index.ts
│
├── layout/                       # 布局组件
│   ├── MainLayout/
│   │   ├── MainLayout.tsx        # 主布局
│   │   └── index.ts
│   ├── GameLayout/
│   │   ├── GameLayout.tsx        # 游戏布局
│   │   ├── Sidebar.tsx           # 侧边栏
│   │   ├── Header.tsx            # 顶部栏
│   │   └── index.ts
│   └── index.ts
│
├── panels/                       # 游戏面板组件
│   ├── CharacterPanel/
│   │   ├── CharacterPanel.tsx    # 角色面板
│   │   ├── StatsDisplay.tsx      # 属性显示
│   │   ├── HPBar.tsx             # 生命值条
│   │   ├── ConditionsDisplay.tsx # 状态效果显示
│   │   └── index.ts
│   ├── InventoryPanel/
│   │   ├── InventoryPanel.tsx    # 背包面板
│   │   ├── ItemSlot.tsx          # 物品格子
│   │   ├── EquipmentSlots.tsx    # 装备栏
│   │   ├── ItemTooltip.tsx       # 物品提示
│   │   └── index.ts
│   ├── SpellbookPanel/
│   │   ├── SpellbookPanel.tsx    # 法术书面板
│   │   ├── SpellSlot.tsx         # 法术格子
│   │   ├── SpellSlotsDisplay.tsx # 法术位显示
│   │   └── index.ts
│   ├── PartyPanel/
│   │   ├── PartyPanel.tsx        # 队伍面板
│   │   ├── PartyMember.tsx       # 队伍成员
│   │   └── index.ts
│   └── index.ts
│
├── chat/                         # 聊天组件
│   ├── ChatContainer/
│   │   ├── ChatContainer.tsx     # 聊天容器
│   │   └── index.ts
│   ├── MessageList/
│   │   ├── MessageList.tsx       # 消息列表
│   │   ├── Message.tsx           # 单条消息
│   │   └── index.ts
│   ├── MessageInput/
│   │   ├── MessageInput.tsx      # 消息输入
│   │   └── index.ts
│   ├── NarrationDisplay/
│   │   ├── NarrationDisplay.tsx  # DM 叙述展示
│   │   └── index.ts
│   └── index.ts
│
├── dialogs/                      # 对话框组件
│   ├── SaveLoadDialog/
│   │   ├── SaveLoadDialog.tsx    # 存档/读档对话框
│   │   ├── SaveSlot.tsx          # 存档槽位
│   │   └── index.ts
│   ├── SettingsDialog/
│   │   ├── SettingsDialog.tsx    # 设置对话框
│   │   └── index.ts
│   ├── ConfirmDialog/
│   │   ├── ConfirmDialog.tsx     # 确认对话框
│   │   └── index.ts
│   ├── CharacterCreateDialog/
│   │   ├── CharacterCreateDialog.tsx  # 角色创建对话框
│   │   ├── RaceSelect.tsx
│   │   ├── ClassSelect.tsx
│   │   ├── StatsRoll.tsx
│   │   └── index.ts
│   └── index.ts
│
├── combat/                       # 战斗 UI 组件
│   ├── CombatHUD/
│   │   ├── CombatHUD.tsx         # 战斗 HUD
│   │   └── index.ts
│   ├── InitiativeTracker/
│   │   ├── InitiativeTracker.tsx # 先攻追踪器
│   │   ├── InitiativeSlot.tsx    # 先攻槽位
│   │   └── index.ts
│   ├── ActionSelector/
│   │   ├── ActionSelector.tsx    # 行动选择器
│   │   ├── AttackAction.tsx      # 攻击行动
│   │   ├── SpellAction.tsx       # 施法行动
│   │   ├── ItemAction.tsx        # 物品行动
│   │   ├── MoveAction.tsx        # 移动行动
│   │   └── index.ts
│   ├── TargetSelector/
│   │   ├── TargetSelector.tsx    # 目标选择器
│   │   └── index.ts
│   └── index.ts
│
└── index.ts
```

---

## 3. 对外接口

### 3.1 通用组件接口

```typescript
// components/ui/index.ts
export { Button } from './Button';
export { Input, TextArea } from './Input';
export { Panel, PanelHeader, PanelBody } from './Panel';
export { Tooltip } from './Tooltip';
export { Modal } from './Modal';
export { ProgressBar } from './ProgressBar';
export { Icon } from './Icon';

// 组件 Props 类型
export type { ButtonProps } from './Button';
export type { InputProps, TextAreaProps } from './Input';
export type { PanelProps } from './Panel';
export type { TooltipProps } from './Tooltip';
export type { ModalProps } from './Modal';
export type { ProgressBarProps } from './ProgressBar';
export type { IconProps } from './Icon';
```

### 3.2 面板组件接口

```typescript
// components/panels/index.ts
export { CharacterPanel } from './CharacterPanel';
export { InventoryPanel } from './InventoryPanel';
export { SpellbookPanel } from './SpellbookPanel';
export { PartyPanel } from './PartyPanel';

// 组件 Props 类型
export type { CharacterPanelProps } from './CharacterPanel';
export type { InventoryPanelProps } from './InventoryPanel';
export type { SpellbookPanelProps } from './SpellbookPanel';
export type { PartyPanelProps } from './PartyPanel';
```

### 3.3 聊天组件接口

```typescript
// components/chat/index.ts
export { ChatContainer } from './ChatContainer';
export { MessageList } from './MessageList';
export { MessageInput } from './MessageInput';
export { NarrationDisplay } from './NarrationDisplay';

// 组件 Props 类型
export type { ChatContainerProps } from './ChatContainer';
export type { MessageListProps, MessageProps } from './MessageList';
export type { MessageInputProps } from './MessageInput';
export type { NarrationDisplayProps } from './NarrationDisplay';
```

### 3.4 对话框组件接口

```typescript
// components/dialogs/index.ts
export { SaveLoadDialog } from './SaveLoadDialog';
export { SettingsDialog } from './SettingsDialog';
export { ConfirmDialog } from './ConfirmDialog';
export { CharacterCreateDialog } from './CharacterCreateDialog';

// 对话框控制接口
export interface DialogControl {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}
```

### 3.5 战斗 UI 组件接口

```typescript
// components/combat/index.ts
export { CombatHUD } from './CombatHUD';
export { InitiativeTracker } from './InitiativeTracker';
export { ActionSelector } from './ActionSelector';
export { TargetSelector } from './TargetSelector';

// 组件 Props 类型
export type { CombatHUDProps } from './CombatHUD';
export type { InitiativeTrackerProps } from './InitiativeTracker';
export type { ActionSelectorProps } from './ActionSelector';
export type { TargetSelectorProps } from './TargetSelector';
```

---

## 4. 组件划分

### 4.1 通用 UI 组件

#### Button

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

#### Input / TextArea

```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  type?: 'text' | 'password' | 'number';
}

interface TextAreaProps extends InputProps {
  rows?: number;
  maxRows?: number;
  autoResize?: boolean;
}
```

#### Panel

```typescript
interface PanelProps {
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

#### ProgressBar

```typescript
interface ProgressBarProps {
  current: number;
  max: number;
  color?: 'red' | 'blue' | 'green' | 'yellow';
  showText?: boolean;
  animated?: boolean;
}
```

### 4.2 面板组件

#### CharacterPanel

```typescript
interface CharacterPanelProps {
  characterId: string;
  compact?: boolean;  // 紧凑模式
}

// 内部数据来源: useCharacterStore
```

#### InventoryPanel

```typescript
interface InventoryPanelProps {
  characterId: string;
  onItemSelected?: (itemId: string) => void;
  onItemEquipped?: (itemId: string, slot: EquipmentSlot) => void;
}
```

#### SpellbookPanel

```typescript
interface SpellbookPanelProps {
  characterId: string;
  onSpellSelected?: (spellId: string) => void;
  showSlots?: boolean;  // 显示法术位
}
```

### 4.3 多角色切换 UI 设计

#### 4.3.1 设计概述

多角色切换允许玩家在队伍中的角色之间切换，控制不同角色进行行动。

**核心功能**：
- 显示队伍成员列表
- 高亮当前控制的角色
- 一键切换控制角色
- 战斗中遵循先攻顺序限制

#### 4.3.2 切换交互设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    多角色切换交互流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   探索模式                        战斗模式                      │
│   ┌──────────────┐               ┌──────────────┐             │
│   │ 点击角色头像  │               │ 先攻顺序约束  │             │
│   └───────┬──────┘               └───────┬──────┘             │
│           │                              │                      │
│           ▼                              ▼                      │
│   ┌──────────────┐               ┌──────────────┐             │
│   │  立即切换    │               │ 仅当前回合角色│             │
│   │ updateActive │               │ 可切换查看    │             │
│   └───────┬──────┘               └───────┬──────┘             │
│           │                              │                      │
│           ▼                              ▼                      │
│   ┌──────────────┐               ┌──────────────┐             │
│   │ 更新面板内容  │               │ 查看其他角色  │             │
│   │ 聚焦游戏视角  │               │ 但无法操作    │             │
│   └──────────────┘               └──────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.3 角色切换组件

**CharacterSwitcher（角色切换器）**

```typescript
// components/panels/CharacterSwitcher/CharacterSwitcher.tsx

interface CharacterSwitcherProps {
  mode: 'exploration' | 'combat';
  onCharacterSelect?: (characterId: string) => void;
}

/**
 * 角色切换器组件
 * - 探索模式：自由切换控制角色
 * - 战斗模式：只能查看，控制权由先攻顺序决定
 */
function CharacterSwitcher({ mode, onCharacterSelect }: CharacterSwitcherProps) {
  const party = useGameStore(state => state.party);
  const activeCharacterId = useGameStore(state => state.activeCharacterId);
  const currentTurnCombatantId = useCombatStore(state => state.currentTurnCombatantId);

  // 当前可控制的角色
  const controllableId = mode === 'combat' ? currentTurnCombatantId : activeCharacterId;

  return (
    <div className="flex gap-2 p-2 bg-slate-800 rounded-lg">
      {party.map(character => (
        <CharacterAvatar
          key={character.id}
          character={character}
          isActive={character.id === controllableId}
          isViewing={character.id === activeCharacterId}
          canControl={mode === 'exploration' || character.id === currentTurnCombatantId}
          onClick={() => handleSelect(character.id)}
        />
      ))}
    </div>
  );
}
```

**CharacterAvatar（角色头像）**

```typescript
// components/panels/CharacterSwitcher/CharacterAvatar.tsx

interface CharacterAvatarProps {
  character: Character;
  isActive: boolean;     // 当前可控制
  isViewing: boolean;    // 当前正在查看
  canControl: boolean;   // 是否可操作
  onClick: () => void;
}

function CharacterAvatar({ character, isActive, isViewing, canControl, onClick }: CharacterAvatarProps) {
  return (
    <button
      className={cn(
        "relative w-12 h-12 rounded-full border-2 transition-all",
        isActive && "border-green-500 ring-2 ring-green-500/50",  // 可控制
        isViewing && !isActive && "border-blue-500",              // 正在查看
        !canControl && "opacity-50 cursor-not-allowed",           // 不可操作
        canControl && "hover:border-yellow-400 cursor-pointer"
      )}
      onClick={onClick}
      disabled={!canControl}
    >
      <img src={character.portrait} alt={character.name} />
      {/* 状态效果图标 */}
      {character.conditions.length > 0 && (
        <ConditionBadges conditions={character.conditions} />
      )}
      {/* HP 指示器 */}
      <HPIndicator current={character.currentHP} max={character.maxHP} />
    </button>
  );
}
```

#### 4.3.4 快捷操作按钮

```typescript
// components/ui/QuickActions/QuickActions.tsx

interface QuickActionsProps {
  characterId: string;
  context: 'exploration' | 'combat' | 'dialogue';
}

/**
 * 快捷操作按钮面板
 * - 攻击（战斗中）
 * - 施法
 * - 使用物品
 * - 检定
 * - 结束回合（战斗中）
 */
function QuickActions({ characterId, context }: QuickActionsProps) {
  const isCombatTurn = useCombatStore(state =>
    state.currentTurnCombatantId === characterId
  );

  return (
    <div className="flex gap-2 p-2">
      {context === 'combat' && (
        <>
          <QuickActionButton icon="sword" label="攻击" disabled={!isCombatTurn} />
          <QuickActionButton icon="sparkles" label="法术" disabled={!isCombatTurn} />
          <QuickActionButton icon="package" label="物品" disabled={!isCombatTurn} />
          <QuickActionButton icon="skip" label="结束回合" disabled={!isCombatTurn} variant="danger" />
        </>
      )}
      {context === 'exploration' && (
        <>
          <QuickActionButton icon="search" label="检定" />
          <QuickActionButton icon="package" label="物品" />
          <QuickActionButton icon="camp" label="休息" />
        </>
      )}
    </div>
  );
}
```

#### 4.3.5 键盘快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `1-4` | 切换角色 | 切换到队伍中第 N 个角色 |
| `Tab` | 下一个角色 | 循环切换到下一个角色 |
| `Escape` | 取消选择 | 取消当前操作，关闭面板 |

```typescript
// hooks/useCharacterHotkeys.ts

function useCharacterHotkeys() {
  const party = useGameStore(state => state.party);
  const activeCharacterId = useGameStore(state => state.activeCharacterId);
  const setActiveCharacter = useGameStore(state => state.setActiveCharacter);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 数字键 1-4 切换角色
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (party[index]) {
          setActiveCharacter(party[index].id);
        }
      }
      // Tab 切换到下一个角色
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = party.findIndex(c => c.id === activeCharacterId);
        const nextIndex = (currentIndex + 1) % party.length;
        setActiveCharacter(party[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [party, activeCharacterId]);
}
```

#### 4.3.6 状态同步

```typescript
// stores/gameStore.ts

// 切换角色时触发的事件
function setActiveCharacter(characterId: string) {
  set(state => {
    state.activeCharacterId = characterId;
  });

  // 1. 通知游戏引擎聚焦到新角色
  game.events.emit('character:focus', characterId);

  // 2. 通知后端（如需要）
  websocket.send({
    type: 'character_select',
    payload: { characterId }
  });
}
```

### 4.3 聊天组件

#### ChatContainer

```typescript
interface ChatContainerProps {
  // 无 props，内部连接 chatStore
}
```

#### MessageInput

```typescript
interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}
```

#### NarrationDisplay

```typescript
interface NarrationDisplayProps {
  text: string;
  isStreaming: boolean;
  typewriter?: boolean;  // 打字机效果
}
```

### 4.4 战斗 UI 组件

#### CombatHUD

```typescript
interface CombatHUDProps {
  // 无 props，内部连接 combatStore
}
```

#### InitiativeTracker

```typescript
interface InitiativeTrackerProps {
  // 无 props，内部连接 combatStore
}
```

#### ActionSelector

```typescript
interface ActionSelectorProps {
  characterId: string;
  onActionSelect: (action: CombatAction) => void;
  availableActions?: ActionType[];
}
```

---

## 5. 状态设计

UI 模块本身不管理业务状态，所有状态通过 Zustand Store 管理。UI 组件通过以下方式访问状态：

### 5.1 状态访问方式

```typescript
// 方式 1: 直接使用 Store Hook
import { useGameStore } from '@/stores/gameStore';

function CharacterPanel({ characterId }: Props) {
  const character = useGameStore(state =>
    state.characters.find(c => c.id === characterId)
  );
  // ...
}

// 方式 2: 使用自定义 Hook（推荐）
import { useCharacter } from '@/hooks/useCharacter';

function CharacterPanel({ characterId }: Props) {
  const { character, stats, equipment } = useCharacter(characterId);
  // ...
}
```

### 5.2 状态更新方式

```typescript
// 通过 Store Action 更新
import { useUIStore } from '@/stores/uiStore';

function SettingsDialog() {
  const { setTheme, setVolume } = useUIStore();

  const handleThemeChange = (theme: string) => {
    setTheme(theme);
  };
}
```

### 5.3 本地 UI 状态

组件内部的临时状态（如输入框内容、展开/折叠状态）可以使用 React 本地状态：

```typescript
function CollapsiblePanel({ title, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  // ...
}
```

---

## 6. 模块间通信

### 6.1 与状态管理模块

```typescript
// 读取状态
const gameState = useGameStore();
const combatState = useCombatStore();
const chatState = useChatStore();
const uiState = useUIStore();

// 更新状态
useGameStore.getState().updateCharacter(id, data);
```

### 6.2 与通信模块

```typescript
// 通过 Store Action 间接触发通信
import { useChatStore } from '@/stores/chatStore';

function MessageInput() {
  const sendMessage = useChatStore(state => state.sendMessage);

  const handleSend = (text: string) => {
    sendMessage(text);  // 内部调用通信模块
  };
}
```

### 6.3 与游戏引擎模块

```typescript
// 通过事件系统通信
import { useGame } from '@/hooks/useGame';

function CombatSceneUI() {
  const { game } = useGame();

  const handleMoveClick = () => {
    game.events.emit('ui:move-mode', true);
  };
}
```

---

## 7. 样式规范

### 7.1 Tailwind CSS 使用

```typescript
// 使用 Tailwind 类名
<div className="flex items-center gap-2 p-4 bg-slate-800 rounded-lg">
  <span className="text-white font-semibold">Character Name</span>
</div>
```

### 7.2 CSS 变量

```css
/* globals.css */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6366f1;
  --color-danger: #ef4444;
  --color-success: #22c55e;
  --color-warning: #f59e0b;

  --bg-panel: #1e293b;
  --bg-panel-header: #334155;
  --border-color: #475569;

  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
}
```

### 7.3 组件样式封装

```typescript
// Button.styles.ts
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-slate-600 text-white hover:bg-slate-700',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'bg-transparent hover:bg-slate-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

---

## 8. 可测试性设计

### 8.1 组件测试

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### 8.2 测试工具

- **Jest**: 测试框架
- **React Testing Library**: 组件测试
- **MSW**: API Mock

---

## 9. 性能优化

### 9.1 组件懒加载

```typescript
// 对话框懒加载
const SaveLoadDialog = lazy(() => import('./dialogs/SaveLoadDialog'));
const SettingsDialog = lazy(() => import('./dialogs/SettingsDialog'));
```

### 9.2 状态选择器优化

```typescript
// 使用选择器避免不必要的重渲染
const character = useGameStore(
  state => state.characters.find(c => c.id === characterId),
  shallow  // 浅比较
);
```

### 9.3 虚拟列表

```typescript
// 消息列表使用虚拟滚动
import { VirtualList } from '@/components/ui/VirtualList';

function MessageList() {
  return (
    <VirtualList
      items={messages}
      itemHeight={60}
      renderItem={(message) => <Message data={message} />}
    />
  );
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：模块设计师
