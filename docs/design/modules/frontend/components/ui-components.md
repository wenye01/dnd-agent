# 通用 UI 和布局组件设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: UI 模块

---

## 1. 组件列表

### 1.1 通用 UI 组件

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| Button | `components/ui/Button/` | 按钮组件，支持多种样式和状态 |
| Input | `components/ui/Input/` | 文本输入框 |
| TextArea | `components/ui/Input/` | 多行文本输入框 |
| Panel | `components/ui/Panel/` | 面板容器组件 |
| PanelHeader | `components/ui/Panel/` | 面板头部 |
| PanelBody | `components/ui/Panel/` | 面板内容区 |
| Tooltip | `components/ui/Tooltip/` | 工具提示组件 |
| Modal | `components/ui/Modal/` | 模态对话框组件 |
| ProgressBar | `components/ui/ProgressBar/` | 进度条组件 |
| Icon | `components/ui/Icon/` | 图标组件 |
| Badge | `components/ui/Badge/` | 徽章/标签组件 |
| Divider | `components/ui/Divider/` | 分隔线组件 |
| Select | `components/ui/Select/` | 下拉选择组件 |
| Checkbox | `components/ui/Checkbox/` | 复选框组件 |
| Slider | `components/ui/Slider/` | 滑块组件 |

### 1.2 布局组件

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| MainLayout | `components/layout/MainLayout/` | 主布局容器 |
| GameLayout | `components/layout/GameLayout/` | 游戏界面布局 |
| Sidebar | `components/layout/GameLayout/` | 侧边栏 |
| Header | `components/layout/GameLayout/` | 顶部导航栏 |
| ContentArea | `components/layout/GameLayout/` | 内容区域 |

---

## 2. 通用 UI 组件

### 2.1 Button（按钮）

#### Props 接口

```typescript
// components/ui/Button/Button.tsx
import { cva, type VariantProps } from 'cva';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'bg-transparent text-slate-300 hover:bg-slate-800',
        link: 'bg-transparent text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 加载状态 */
  loading?: boolean;
  /** 图标（左侧） */
  iconLeft?: React.ReactNode;
  /** 图标（右侧） */
  iconRight?: React.ReactNode;
  /** 全宽 */
  fullWidth?: boolean;
  /** 子元素 */
  children: React.ReactNode;
}
```

#### 内部状态

```typescript
// Button 组件无内部状态，完全由 props 控制
```

#### 交互设计

- **点击反馈**: 按下时添加 scale 缩放效果
- **加载状态**: 显示旋转图标，禁用交互
- **焦点样式**: 键盘导航时显示焦点环
- **禁用状态**: 降低透明度，禁用指针事件

#### 样式方案

```typescript
// Tailwind CSS 类名组合
<button
  className={cn(
    buttonVariants({ variant, size }),
    fullWidth && 'w-full',
    className
  )}
>
  {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
  {!loading && iconLeft && <span className="mr-2">{iconLeft}</span>}
  {children}
  {!loading && iconRight && <span className="ml-2">{iconRight}</span>}
</button>
```

---

### 2.2 Input（输入框）

#### Props 接口

```typescript
// components/ui/Input/Input.tsx
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 输入框尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 错误状态 */
  error?: string;
  /** 左侧图标 */
  iconLeft?: React.ReactNode;
  /** 右侧图标 */
  iconRight?: React.ReactNode;
  /** 容器类名 */
  containerClassName?: string;
  /** 标签 */
  label?: string;
  /** 必填标记 */
  required?: boolean;
}
```

#### 内部状态

```typescript
// 输入框值由父组件控制（受控组件）
// 可选：内部 focus 状态用于样式
const [isFocused, setIsFocused] = useState(false);
```

#### 交互设计

- **焦点状态**: 边框高亮
- **错误状态**: 红色边框 + 错误信息
- **图标位置**: 左右图标与文字对齐
- **标签点击**: 点击标签聚焦输入框

#### 样式方案

```typescript
// Tailwind CSS
<div className={cn('relative', containerClassName)}>
  {label && (
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )}
  <div className="relative">
    {iconLeft && (
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {iconLeft}
      </div>
    )}
    <input
      className={cn(
        'flex w-full rounded-md border bg-slate-800 px-3 py-2 text-white',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-red-500 focus:ring-red-500',
        iconLeft && 'pl-10',
        iconRight && 'pr-10',
        {
          'h-8 text-sm': size === 'sm',
          'h-10 text-base': size === 'md',
          'h-12 text-lg': size === 'lg',
        }
      )}
      {...props}
    />
    {iconRight && (
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        {iconRight}
      </div>
    )}
  </div>
  {error && (
    <p className="mt-1 text-sm text-red-400">{error}</p>
  )}
</div>
```

---

### 2.3 TextArea（多行输入）

#### Props 接口

```typescript
// components/ui/Input/TextArea.tsx
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 行数 */
  rows?: number;
  /** 最大行数（超过后滚动） */
  maxRows?: number;
  /** 自动调整高度 */
  autoResize?: boolean;
  /** 错误信息 */
  error?: string;
  /** 字符计数 */
  showCount?: boolean;
  /** 最大长度 */
  maxLength?: number;
}
```

#### 内部状态

```typescript
// 自动调整高度需要 ref
const textareaRef = useRef<HTMLTextAreaElement>(null);

// 自动调整高度逻辑
useEffect(() => {
  if (autoResize && textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }
}, [value, autoResize]);
```

---

### 2.4 Panel（面板）

#### Props 接口

```typescript
// components/ui/Panel/Panel.tsx
export interface PanelProps {
  /** 面板标题 */
  title?: string;
  /** 可折叠 */
  collapsible?: boolean;
  /** 默认折叠状态 */
  defaultCollapsed?: boolean;
  /** 额外操作按钮 */
  actions?: React.ReactNode;
  /** 类名 */
  className?: string;
  /** 子元素 */
  children: React.ReactNode;
}

export interface PanelHeaderProps {
  /** 标题 */
  title: string;
  /** 折叠状态 */
  collapsed?: boolean;
  /** 切换折叠 */
  onToggle?: () => void;
  /** 操作按钮 */
  actions?: React.ReactNode;
  /** 类名 */
  className?: string;
}

export interface PanelBodyProps {
  /** 折叠状态 */
  collapsed?: boolean;
  /** 子元素 */
  children: React.ReactNode;
  /** 类名 */
  className?: string;
}
```

#### 内部状态

```typescript
// Panel 折叠状态
const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
```

#### 交互设计

- **折叠动画**: 使用 CSS transition 实现平滑展开/收起
- **折叠按钮**: 右侧显示折叠图标（点击切换）
- **固定头部**: 头部始终可见，内容区可滚动

#### 样式方案

```typescript
// Panel 容器
<div className={cn(
  'bg-slate-800 rounded-lg border border-slate-700 overflow-hidden',
  className
)}>
  <PanelHeader title={title} collapsed={collapsed} onToggle={onToggle} />
  <PanelBody collapsed={collapsed}>{children}</PanelBody>
</div>

// PanelHeader
<div className={cn(
  'flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-700'
)}>
  <h3 className="font-semibold text-white">{title}</h3>
  <div className="flex items-center gap-2">
    {actions}
    {collapsible && (
      <button onClick={onToggle}>
        <ChevronIcon className={cn('transition-transform', collapsed && 'rotate-180')} />
      </button>
    )}
  </div>
</div>

// PanelBody
<div className={cn(
  'transition-all duration-200 ease-in-out',
  collapsed ? 'max-h-0 overflow-hidden' : 'max-h-none'
)}>
  <div className="p-4">{children}</div>
</div>
```

---

### 2.5 Tooltip（工具提示）

#### Props 接口

```typescript
// components/ui/Tooltip/Tooltip.tsx
export interface TooltipProps {
  /** 提示内容 */
  content: React.ReactNode;
  /** 显示位置 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 延迟显示（ms） */
  delay?: number;
  /** 箭头 */
  arrow?: boolean;
  /** 子元素 */
  children: React.ReactElement;
  /** 类名 */
  className?: string;
}
```

#### 内部状态

```typescript
// 显示状态
const [visible, setVisible] = useState(false);
// 位置计算
const [position, setPosition] = useState({ x: 0, y: 0 });
```

#### 交互设计

- **触发方式**: 鼠标悬停/键盘焦点
- **延迟显示**: 避免误触发
- **位置计算**: 自动调整避免超出视口
- **动画**: 淡入淡出 + 轻微位移

---

### 2.6 Modal（模态对话框）

#### Props 接口

```typescript
// components/ui/Modal/Modal.tsx
export interface ModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
  /** ESC 键关闭 */
  closeOnEscape?: boolean;
  /** 显示关闭按钮 */
  showCloseButton?: boolean;
  /** 底部操作区 */
  footer?: React.ReactNode;
  /** 类名 */
  className?: string;
  /** 子元素 */
  children: React.ReactNode;
}
```

#### 内部状态

```typescript
// 焦点陷阱状态
const [previouslyFocused, setPreviouslyFocused] = useState<HTMLElement | null>(null);
```

#### 交互设计

- **打开动画**: 缩放 + 淡入
- **焦点管理**: 打开时聚焦对话框，关闭时恢复原焦点
- **焦点陷阱**: Tab 键只在对话框内循环
- **滚动锁定**: 打开时禁止背景滚动
- **Body 隐藏**: 使用 `aria-hidden` 隐藏背景内容

#### 样式方案

```typescript
// 遮罩层
<div
  className={cn(
    'fixed inset-0 z-50 flex items-center justify-center',
    'bg-black/50 backdrop-blur-sm',
    'transition-opacity duration-200',
    open ? 'opacity-100' : 'opacity-0 pointer-events-none'
  )}
  onClick={onOverlayClick}
>
  {/* 对话框 */}
  <div
    className={cn(
      'bg-slate-800 rounded-lg shadow-xl border border-slate-700',
      'transition-all duration-200',
      open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
      {
        'w-full max-w-sm': size === 'sm',
        'w-full max-w-md': size === 'md',
        'w-full max-w-lg': size === 'lg',
        'w-full max-w-2xl': size === 'xl',
        'w-full h-full': size === 'full',
      }
    )}
  >
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {showCloseButton && (
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <XIcon />
        </button>
      )}
    </div>

    {/* Body */}
    <div className="px-6 py-4">{children}</div>

    {/* Footer */}
    {footer && (
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700">
        {footer}
      </div>
    )}
  </div>
</div>
```

---

### 2.7 ProgressBar（进度条）

#### Props 接口

```typescript
// components/ui/ProgressBar/ProgressBar.tsx
export interface ProgressBarProps {
  /** 当前值 */
  current: number;
  /** 最大值 */
  max: number;
  /** 颜色主题 */
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
  /** 显示文本 */
  showText?: boolean;
  /** 文本格式 */
  textFormat?: 'percent' | 'fraction' | 'current';
  /** 动画 */
  animated?: boolean;
  /** 高度 */
  size?: 'sm' | 'md' | 'lg';
  /** 类名 */
  className?: string;
}
```

#### 内部状态

```typescript
// 动画过渡值（可选）
const [displayValue, setDisplayValue] = useState(current);
```

#### 样式方案

```typescript
// 颜色映射
const colorClasses = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
};

// 进度条
<div className={cn('relative', className)}>
  <div
    className={cn(
      'w-full bg-slate-700 rounded-full overflow-hidden',
      {
        'h-1': size === 'sm',
        'h-2': size === 'md',
        'h-3': size === 'lg',
      }
    )}
  >
    <div
      className={cn(
        'h-full transition-all duration-300',
        colorClasses[color],
        animated && 'animate-pulse'
      )}
      style={{ width: `${percentage}%` }}
    />
  </div>
  {showText && (
    <span className="text-sm text-slate-300">
      {formatText(percentage, current, max)}
    </span>
  )}
</div>
```

---

### 2.8 Icon（图标）

#### Props 接口

```typescript
// components/ui/Icon/Icon.tsx
export type IconName = keyof typeof iconDefinitions;

export interface IconProps {
  /** 图标名称 */
  name: IconName;
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  /** 自定义尺寸（size=custom 时） */
  customSize?: number;
  /** 颜色 */
  color?: string;
  /** 类名 */
  className?: string;
}
```

#### 图标定义

```typescript
// components/ui/Icon/icons.ts
export const iconDefinitions = {
  // 箭头
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  arrowLeft: 'M5 12h14M12 5l7 7-7 7',
  arrowRight: 'M19 12H5M12 5l-7 7 7 7',

  // 操作
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',

  // 界面
  menu: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2',
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',

  // 游戏
  sword: 'M6 3l12 12M9 9l3 3M15 15l3 3',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',

  // D&D 特定
  dice: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  scroll: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  spellbook: 'M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z',

  // 状态
  hp: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  mp: 'M13 10V3L4 14h7v7l9-11h-7z',
  xp: 'M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z',

  // ... 更多图标
} as const;
```

---

### 2.9 Select（下拉选择）

#### Props 接口

```typescript
// components/ui/Select/Select.tsx
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  /** 选项列表 */
  options: SelectOption[];
  /** 选中的值 */
  value?: string;
  /** 默认值（非受控） */
  defaultValue?: string;
  /** 变化回调 */
  onChange?: (value: string) => void;
  /** 占位符 */
  placeholder?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 错误状态 */
  error?: string;
  /** 禁用状态 */
  disabled?: boolean;
  /** 类名 */
  className?: string;
}
```

#### 内部状态

```typescript
// 下拉菜单显示状态
const [open, setOpen] = useState(false);
// 高亮选项索引（键盘导航）
const [highlightedIndex, setHighlightedIndex] = useState(-1);
```

#### 交互设计

- **键盘导航**: ↑↓ 选择，Enter 确认，Esc 关闭
- **点击外部**: 关闭下拉菜单
- **选项搜索**: 输入字符快速定位
- **虚拟滚动**: 大量选项时优化性能

---

## 3. 布局组件

### 3.1 MainLayout（主布局）

#### Props 接口

```typescript
// components/layout/MainLayout/MainLayout.tsx
export interface MainLayoutProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 类名 */
  className?: string;
}
```

#### 结构设计

```
┌─────────────────────────────────────────────────────────────┐
│                         MainLayout                           │
├─────────────────────────────────────────────────────────────┤
│  <div className="h-screen w-screen overflow-hidden bg-slate-900"> │
│    {children}                                               │
│  </div>                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 GameLayout（游戏布局）

#### Props 接口

```typescript
// components/layout/GameLayout/GameLayout.tsx
export interface GameLayoutProps {
  /** 游戏内容（Phaser 容器） */
  gameContent: React.ReactNode;
  /** 侧边栏内容 */
  sidebarContent?: React.ReactNode;
  /** 聊天内容 */
  chatContent?: React.ReactNode;
  /** 面板内容 */
  panelContent?: React.ReactNode;
  /** 对话框内容 */
  dialogs?: React.ReactNode;
  /** 侧边栏位置 */
  sidebarPosition?: 'left' | 'right';
  /** 聊天位置 */
  chatPosition?: 'left' | 'right' | 'bottom';
  /** 侧边栏折叠状态 */
  sidebarCollapsed?: boolean;
  /** 类名 */
  className?: string;
}
```

#### 结构设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              GameLayout                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────┐  ┌──────────────────────────────────────┐  ┌─────────────┐   │
│  │     │  │                                      │  │             │   │
│  │Side │  │          Game Content                │  │   Chat      │   │
│  │ bar │  │         (Phaser Canvas)              │  │   Area      │   │
│  │     │  │                                      │  │             │   │
│  │     │  │                                      │  │             │   │
│  ├─────┤  ├──────────────────────────────────────┤  ├─────────────┤   │
│  │     │  │          Panel Overlay               │  │             │   │
│  │Menu │  │        (Optional Panels)             │  │  Messages   │   │
│  │     │  │                                      │  │             │   │
│  └─────┘  └──────────────────────────────────────┘  └─────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Dialog Layer (Fixed)                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 响应式设计

```typescript
// Tailwind 响应式类
<div className="flex h-screen">
  {/* 侧边栏 */}
  <aside
    className={cn(
      'flex-shrink-0 transition-all duration-200',
      'bg-slate-800 border-r border-slate-700',
      sidebarCollapsed ? 'w-12' : 'w-64',
      'md:w-64', // 桌面端固定宽度
      'hidden', // 移动端隐藏
      'md:flex' // 桌面端显示
    )}
  >
    {sidebarContent}
  </aside>

  {/* 游戏区域 */}
  <main className="flex-1 relative">
    {gameContent}
    {/* 面板覆盖层 */}
    <div className="absolute inset-0 pointer-events-none">
      {panelContent}
    </div>
  </main>

  {/* 聊天区域 */}
  <aside
    className={cn(
      'flex-shrink-0 bg-slate-800 border-l border-slate-700',
      chatPosition === 'right' && 'order-last',
      'w-80',
      'hidden md:flex' // 移动端隐藏
    )}
  >
    {chatContent}
  </aside>
</div>
```

---

### 3.3 Sidebar（侧边栏）

#### Props 接口

```typescript
// components/layout/GameLayout/Sidebar.tsx
export interface SidebarProps {
  /** 折叠状态 */
  collapsed?: boolean;
  /** 折叠切换回调 */
  onToggle?: () => void;
  /** 导航项 */
  navigation?: NavigationItem[];
  /** 类名 */
  className?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: number | string;
  disabled?: boolean;
  onClick?: () => void;
}
```

#### 结构设计

```
Collapsed (48px):          Expanded (256px):
┌────┐                     ┌────────────────┐
│ ☰  │                     │ ☰  Menu        │
├────┤                     ├────────────────┤
│ 🎮 │                     │ 🎮  Game        │
│ 📊 │                     │ 📊  Stats       │
│ ⚙️  │                     │ ⚙️  Settings    │
└────┘                     └────────────────┘
```

---

### 3.4 Header（顶部栏）

#### Props 接口

```typescript
// components/layout/GameLayout/Header.tsx
export interface HeaderProps {
  /** 标题 */
  title?: string;
  /** 左侧操作区 */
  leftActions?: React.ReactNode;
  /** 右侧操作区 */
  rightActions?: React.ReactNode;
  /** 显示菜单按钮 */
  showMenuButton?: boolean;
  /** 菜单点击回调 */
  onMenuClick?: () => void;
  /** 类名 */
  className?: string;
}
```

#### 结构设计

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰]  D&D Adventure                    [⚙️] [🔔] [👤]            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 组件样式规范

### 4.1 颜色系统

```css
/* globals.css */
:root {
  /* 主色调 */
  --color-primary: #3b82f6;      /* blue-500 */
  --color-primary-hover: #2563eb; /* blue-600 */

  /* 状态颜色 */
  --color-success: #22c55e;      /* green-500 */
  --color-warning: #f59e0b;      /* amber-500 */
  --color-danger: #ef4444;       /* red-500 */
  --color-info: #06b6d4;         /* cyan-500 */

  /* 背景色 */
  --bg-primary: #0f172a;         /* slate-900 */
  --bg-secondary: #1e293b;       /* slate-800 */
  --bg-tertiary: #334155;        /* slate-700 */
  --bg-hover: #475569;           /* slate-600 */

  /* 文字颜色 */
  --text-primary: #f8fafc;       /* slate-50 */
  --text-secondary: #cbd5e1;     /* slate-300 */
  --text-tertiary: #94a3b8;      /* slate-400 */
  --text-disabled: #64748b;      /* slate-500 */

  /* 边框颜色 */
  --border-color: #334155;       /* slate-700 */
  --border-color-hover: #475569; /* slate-600 */

  /* 焦点环 */
  --focus-ring: rgba(59, 130, 246, 0.5);
}
```

### 4.2 间距系统

```typescript
// Tailwind 默认间距
// 0: 0, 1: 0.25rem, 2: 0.5rem, 3: 0.75rem, 4: 1rem,
// 5: 1.25rem, 6: 1.5rem, 8: 2rem, 10: 2.5rem, 12: 3rem

// 推荐使用
const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '2.5rem', // 40px
};
```

### 4.3 圆角系统

```typescript
const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  full: '9999px',
};
```

### 4.4 字体系统

```typescript
const typography = {
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],     // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

---

## 5. 组件测试

### 5.1 单元测试示例

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });
});
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
