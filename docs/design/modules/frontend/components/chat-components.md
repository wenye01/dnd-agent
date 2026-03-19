# 聊天组件设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: UI 模块

---

## 1. 组件列表

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| ChatContainer | `components/chat/ChatContainer/` | 聊天容器（主组件） |
| MessageList | `components/chat/MessageList/` | 消息列表 |
| Message | `components/chat/MessageList/` | 单条消息 |
| MessageInput | `components/chat/MessageInput/` | 消息输入框 |
| NarrationDisplay | `components/chat/NarrationDisplay/` | DM 叙述展示 |
| DiceRollMessage | `components/chat/MessageList/` | 骰子检定消息 |
| CombatEventMessage | `components/chat/MessageList/` | 战斗事件消息 |
| SystemMessage | `components/chat/MessageList/` | 系统消息 |
| ChatHeader | `components/chat/ChatContainer/` | 聊天头部 |
| ChatActions | `components/chat/ChatContainer/` | 聊天操作按钮 |

---

## 2. ChatContainer（聊天容器）

### 2.1 Props 接口

```typescript
// components/chat/ChatContainer/ChatContainer.tsx
export interface ChatContainerProps {
  /** 聊天位置 */
  position?: 'left' | 'right' | 'bottom';
  /** 默认展开状态 */
  defaultExpanded?: boolean;
  /** 可折叠 */
  collapsible?: boolean;
  /** 头部操作按钮 */
  headerActions?: React.ReactNode;
  /** 类名 */
  className?: string;
}

export interface ChatHeaderProps {
  /** 标题 */
  title?: string;
  /** 展开状态 */
  expanded?: boolean;
  /** 切换展开 */
  onToggle?: () => void;
  /** 操作按钮 */
  actions?: React.ReactNode;
  /** 未读消息数 */
  unreadCount?: number;
}

export interface ChatActionsProps {
  /** 快捷操作 */
  actions: ChatAction[];
}

export interface ChatAction {
  id: string;
  label: string;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
}
```

### 2.2 内部状态

```typescript
// 展开状态（如果未受控）
const [expanded, setExpanded] = useState(defaultExpanded ?? true);

// 自动滚动状态
const [autoScroll, setAutoScroll] = useState(true);
const messagesEndRef = useRef<HTMLDivElement>(null);
```

### 2.3 样式方案

```typescript
// 聊天容器布局
<div
  className={cn(
    'bg-slate-800 border border-slate-700 flex flex-col',
    'transition-all duration-200',
    position === 'left' && 'border-r rounded-r-lg',
    position === 'right' && 'border-l rounded-l-lg',
    position === 'bottom' && 'border-t rounded-t-lg',
    {
      'w-80 h-full': expanded && position !== 'bottom',
      'h-64': expanded && position === 'bottom',
      'w-12': !expanded && position !== 'bottom',
      'h-12': !expanded && position === 'bottom',
    }
  )}
>
  {/* 头部 */}
  <ChatHeader
    expanded={expanded}
    onToggle={() => setExpanded(!expanded)}
    unreadCount={unreadCount}
    actions={headerActions}
  />

  {/* 消息区域 */}
  {expanded && (
    <>
      <MessageList autoScroll={autoScroll} />

      {/* 快捷操作 */}
      <ChatActions actions={quickActions} />

      {/* 输入框 */}
      <MessageInput />
    </>
  )}
</div>
```

---

## 3. MessageList（消息列表）

### 3.1 Props 接口

```typescript
// components/chat/MessageList/MessageList.tsx
export interface MessageListProps {
  /** 消息列表（从 Store 读取） */
  messages?: ChatMessage[];
  /** 自动滚动 */
  autoScroll?: boolean;
  /** 最大显示消息数 */
  maxMessages?: number;
  /** 虚拟滚动（性能优化） */
  virtualized?: boolean;
  /** 类名 */
  className?: string;
}

// 消息类型
export type ChatMessage =
  | UserMessage
  | DMMessage
  | SystemMessage
  | DiceRollMessage
  | CombatEventMessage
  | NarrationMessage;

export interface BaseMessage {
  id: string;
  timestamp: number;
}

export interface UserMessage extends BaseMessage {
  type: 'user';
  content: string;
  characterId?: string;
  characterName?: string;
}

export interface DMMessage extends BaseMessage {
  type: 'dm';
  content: string;
  isNarration?: boolean;
}

export interface SystemMessage extends BaseMessage {
  type: 'system';
  content: string;
  severity?: 'info' | 'warning' | 'error';
}

export interface DiceRollMessage extends BaseMessage {
  type: 'dice_roll';
  rollType: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  characterId?: string;
  characterName?: string;
  success?: boolean;  // 优势/劣势/成功/失败
}

export interface CombatEventMessage extends BaseMessage {
  type: 'combat_event';
  eventType: 'attack' | 'damage' | 'spell' | 'death' | 'start' | 'end';
  sourceId: string;
  sourceName: string;
  targetId?: string;
  targetName?: string;
  result?: CombatEventResult;
}

export interface NarrationMessage extends BaseMessage {
  type: 'narration';
  content: string;
  streaming?: boolean;
}
```

### 3.2 内部状态

```typescript
// 滚动位置
const [scrolledToBottom, setScrolledToBottom] = useState(true);
const listRef = useRef<HTMLDivElement>(null);

// 自动滚动逻辑
useEffect(() => {
  if (autoScroll && messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages, autoScroll]);
```

### 3.3 样式方案

```typescript
// 消息列表容器
<div
  ref={listRef}
  className="flex-1 overflow-y-auto p-4 space-y-4"
  onScroll={handleScroll}
>
  {messages.slice(-maxMessages).map(message => (
    <Message key={message.id} data={message} />
  ))}
  <div ref={messagesEndRef} />
</div>

// 滚动到底部按钮
{!scrolledToBottom && (
  <button
    onClick={scrollToBottom}
    className="absolute bottom-20 right-4 bg-blue-600 hover:bg-blue-700 rounded-full p-2 shadow-lg"
  >
    <ChevronDownIcon />
  </button>
)}
```

---

## 4. Message（单条消息）

### 4.1 Props 接口

```typescript
// components/chat/MessageList/Message.tsx
export interface MessageProps {
  /** 消息数据 */
  data: ChatMessage;
  /** 显示模式 */
  mode?: 'full' | 'compact';
  /** 点击回调 */
  onClick?: () => void;
}

export interface MessageHeaderProps {
  /** 发送者名称 */
  name: string;
  /** 时间戳 */
  timestamp: number;
  /** 类型 */
  type: 'user' | 'dm' | 'system';
}

export interface MessageContentProps {
  /** 内容 */
  content: string;
  /** Markdown 渲染 */
  markdown?: boolean;
}
```

### 4.2 样式方案

```typescript
// 根据消息类型选择样式
function getMessageVariant(type: ChatMessage['type']): string {
  switch (type) {
    case 'user':
      return 'bg-blue-900/30 border-l-4 border-blue-500';
    case 'dm':
      return 'bg-purple-900/20 border-l-4 border-purple-500';
    case 'system':
      return 'bg-slate-700/50 text-slate-400 text-sm';
    case 'dice_roll':
      return 'bg-amber-900/20 border-l-4 border-amber-500';
    case 'combat_event':
      return 'bg-red-900/20 border-l-4 border-red-500';
    default:
      return 'bg-slate-700/50';
  }
}

// 消息组件
<div
  className={cn(
    'rounded-r-lg p-3',
    getMessageVariant(data.type)
  )}
>
  {/* 头部（用户/DM 消息） */}
  {(data.type === 'user' || data.type === 'dm') && (
    <MessageHeader
      name={data.characterName || (data.type === 'user' ? 'You' : 'DM')}
      timestamp={data.timestamp}
      type={data.type}
    />
  )}

  {/* 内容 */}
  {data.type !== 'dice_roll' && data.type !== 'combat_event' && (
    <MessageContent content={data.content} markdown />
  )}

  {/* 特殊消息类型 */}
  {data.type === 'dice_roll' && <DiceRollDisplay data={data} />}
  {data.type === 'combat_event' && <CombatEventDisplay data={data} />}
</div>

// 消息头部
<div className="flex items-center gap-2 mb-1">
  <span className="font-medium text-sm">
    {name}
  </span>
  <span className="text-xs text-slate-500">
    {formatTime(timestamp)}
  </span>
</div>

// 消息内容（支持 Markdown）
<div className="prose prose-invert prose-sm max-w-none">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

---

## 5. DiceRollMessage（骰子检定消息）

### 5.1 Props 接口

```typescript
// components/chat/MessageList/DiceRollMessage.tsx
export interface DiceRollDisplayProps {
  data: DiceRollMessage;
  /** 显示详情 */
  showDetails?: boolean;
}

export interface DiceResultProps {
  /** 掷骰结果 */
  rolls: number[];
  /** 修正值 */
  modifier: number;
  /** 总计 */
  total: number;
  /** 成功标志 */
  success?: boolean;
  /** 优势/劣势 */
  advantage?: 'advantage' | 'disadvantage' | 'normal';
}
```

### 5.2 视觉设计

```
骰子检定消息显示：

┌─────────────────────────────────────────────────────────────┐
│ 🔴 Strength Check: 15 (+2) = 17                            │
│                                                             │
│ Rolls: [12, 15] + 2 = 17  (Advantage)                       │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚔️ Attack Roll: 19 (+5) = 24  CRITICAL HIT!                │
│                                                             │
│ Natural 20!                                                 │
│ ████████████████████████████████████████████████████████  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 样式方案

```typescript
// 骰子检定显示
<div className="space-y-2">
  {/* 头部：检定类型和结果 */}
  <div className="flex items-center gap-2">
    <span className="text-2xl">{getRollIcon(data.rollType)}</span>
    <span className="font-medium">{data.rollType}</span>
    <span className="text-slate-400">:</span>
    {data.rolls.length > 1 && (
      <span className="text-xs text-slate-400">
        [{data.rolls.join(', ')}]
      </span>
    )}
    {data.modifier !== 0 && (
      <span className={cn(
        'text-sm',
        data.modifier > 0 ? 'text-green-400' : 'text-red-400'
      )}>
        {data.modifier > 0 ? '+' : ''}{data.modifier}
      </span>
    )}
    <span className="font-bold text-lg">=</span>
    <span className={cn(
      'text-2xl font-bold',
      getTotalColor(data.total)
    )}>
      {data.total}
    </span>

    {/* 成功/失败标记 */}
    {data.success !== undefined && (
      <span className={data.success ? 'text-green-400' : 'text-red-400'}>
        {data.success ? '✓ Success' : '✗ Failure'}
      </span>
    )}
  </div>

  {/* 大成功/大失败 */}
  {data.rolls.includes(20) && (
    <div className="text-yellow-400 font-bold animate-pulse">
      NATURAL 20! CRITICAL SUCCESS!
    </div>
  )}
  {data.rolls.includes(1) && (
    <div className="text-red-400 font-bold">
      Natural 1... Critical Failure!
    </div>
  )}

  {/* 掷骰可视化 */}
  <DiceVisualization rolls={data.rolls} modifier={data.modifier} />
</div>

// 掷骰可视化
<div className="flex gap-1 items-end">
  {rolls.map((roll, i) => (
    <div key={i} className="flex flex-col items-center">
      <div
        className={cn(
          'w-8 rounded-t transition-all duration-300',
          getDiceColor(roll)
        )}
        style={{ height: `${(roll / 20) * 40 + 20}px` }}
      >
        <div className="flex items-center justify-center h-full font-bold text-sm">
          {roll}
        </div>
      </div>
    </div>
  ))}

  {/* 修正值 */}
  {modifier !== 0 && (
    <div className="w-8 h-6 bg-slate-700 rounded flex items-center justify-center text-xs mx-1">
      {modifier > 0 ? '+' : ''}{modifier}
    </div>
  )}

  {/* 总计 */}
  <div className="ml-2 text-lg font-bold">
    = {total}
  </div>
</div>

// 骰子颜色
function getDiceColor(roll: number): string {
  if (roll === 20) return 'bg-yellow-500 text-black';
  if (roll === 1) return 'bg-red-500';
  if (roll >= 15) return 'bg-green-500';
  if (roll >= 10) return 'bg-blue-500';
  if (roll >= 5) return 'bg-slate-500';
  return 'bg-slate-600';
}

function getTotalColor(total: number): string {
  if (total >= 20) return 'text-yellow-400';
  if (total >= 15) return 'text-green-400';
  if (total >= 10) return 'text-blue-400';
  return 'text-slate-400';
}
```

---

## 6. CombatEventMessage（战斗事件消息）

### 6.1 Props 接口

```typescript
// components/chat/MessageList/CombatEventMessage.tsx
export interface CombatEventDisplayProps {
  data: CombatEventMessage;
}

export interface CombatEventResult {
  hit?: boolean;
  damage?: number;
  damageType?: string;
  critical?: boolean;
  savingThrow?: {
    ability: string;
    dc: number;
    roll: number;
    success: boolean;
  };
}
```

### 6.2 视觉设计

```
战斗事件消息：

攻击事件：
┌─────────────────────────────────────────────────────────────┐
│ ⚔️ Player attacks Goblin with Longsword                     │
│                                                             │
│ Attack Roll: 15 vs AC 13 → HIT!                             │
│ Damage: 8 (slashing)                                        │
└─────────────────────────────────────────────────────────────┘

法术事件：
┌─────────────────────────────────────────────────────────────┐
│ ✨ Player casts Fireball on 3 enemies                       │
│                                                             │
│ DC 15 Dexterity Saving Throw                                │
│ • Goblin 1: 8 → FAILED (16 fire damage)                    │
│ • Goblin 2: 18 → SUCCEEDED (8 fire damage)                 │
│ • Goblin 3: 5 → FAILED (16 fire damage)                    │
└─────────────────────────────────────────────────────────────┘

死亡事件：
┌─────────────────────────────────────────────────────────────┐
│ 💀 Goblin has been defeated!                                │
│                                                             │
│ ┌───────────────────────────────────────────────┐          │
│ │  XP Gained: 50                                │          │
│ │  Loot: 5 gp, Shortsword                       │          │
│ └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 样式方案

```typescript
// 战斗事件显示
<div className="space-y-2">
  {/* 头部：事件描述 */}
  <div className="flex items-center gap-2">
    <span className="text-xl">{getEventIcon(data.eventType)}</span>
    <span className="font-medium">{data.sourceName}</span>
    {data.targetName && (
      <>
        <span className="text-slate-400">→</span>
        <span className="font-medium">{data.targetName}</span>
      </>
    )}
  </div>

  {/* 攻击结果 */}
  {data.eventType === 'attack' && data.result && (
    <div className="pl-6 space-y-1 text-sm">
      <div>
        Attack Roll: <span className="font-bold">{data.result.attackRoll}</span>
        vs AC {data.result.ac} →
        <span className={data.result.hit ? 'text-green-400' : 'text-red-400'}>
          {data.result.hit ? 'HIT!' : 'MISS'}
        </span>
        {data.result.critical && <span className="text-yellow-400"> CRITICAL!</span>}
      </div>
      {data.result.hit && (
        <div>
          Damage: <span className="font-bold">{data.result.damage}</span>
          {data.result.damageType && (
            <span className="text-slate-400">({data.result.damageType})</span>
          )}
        </div>
      )}
    </div>
  )}

  {/* 法术结果 */}
  {data.eventType === 'spell' && data.result && (
    <div className="pl-6 space-y-1 text-sm">
      <div>DC {data.result.dc} {data.result.ability} Saving Throw</div>
      {data.result.targets?.map((target, i) => (
        <div key={i} className="flex items-center gap-2">
          <span>• {target.name}:</span>
          <span className="font-mono">{target.roll}</span>
          <span className={target.success ? 'text-green-400' : 'text-red-400'}>
            {target.success ? '→ SUCCEEDED' : '→ FAILED'}
          </span>
          {!target.success && target.damage && (
            <span className="text-slate-400">({target.damage} {target.damageType})</span>
          )}
        </div>
      ))}
    </div>
  )}

  {/* 死亡事件 */}
  {data.eventType === 'death' && data.result && (
    <div className="mt-2 p-2 bg-slate-900/50 rounded">
      <div className="font-medium">Rewards:</div>
      <div className="text-sm space-y-1">
        {data.result.xp && (
          <div>XP Gained: <span className="text-yellow-400">{data.result.xp}</span></div>
        )}
        {data.result.loot && (
          <div>Loot: {data.result.loot.join(', ')}</div>
        )}
      </div>
    </div>
  )}
</div>
```

---

## 7. MessageInput（消息输入框）

### 7.1 Props 接口

```typescript
// components/chat/MessageInput/MessageInput.tsx
export interface MessageInputProps {
  /** 占位符文本 */
  placeholder?: string;
  /** 最大长度 */
  maxLength?: number;
  /** 禁用状态 */
  disabled?: boolean;
  /** 发送回调 */
  onSend: (text: string) => void;
  /** 快捷命令 */
  quickCommands?: QuickCommand[];
  /** 显示发送按钮 */
  showSendButton?: boolean;
  /** 多行输入 */
  multiline?: boolean;
  /** 类名 */
  className?: string;
}

export interface QuickCommand {
  id: string;
  label: string;
  icon?: IconName;
  template: string;
  insertAt?: 'cursor' | 'end';
}
```

### 7.2 内部状态

```typescript
// 输入值
const [value, setValue] = useState('');

// 提及建议
const [mentionOpen, setMentionOpen] = useState(false);
const [mentionQuery, setMentionQuery] = useState('');

// 快捷命令建议
const [commandOpen, setCommandOpen] = useState(false);
```

### 7.3 交互设计

| 交互 | 描述 | 快捷键 |
|------|------|--------|
| 发送消息 | 发送输入内容 | Enter |
| 换行 | 插入新行 | Shift + Enter |
| 打开命令 | 显示快捷命令 | / |
| 提及角色 | 插入角色标签 | @ + 角色名 |
| 掷骰 | 快速掷骰命令 | /roll |
| 清空 | 清空输入 | Esc |

### 7.4 样式方案

```typescript
// 输入框容器
<div className="p-4 border-t border-slate-700">
  {/* 快捷命令提示 */}
  {commandOpen && (
    <CommandPalette
      query={commandQuery}
      onSelect={insertCommand}
    />
  )}

  {/* 提及建议 */}
  {mentionOpen && (
    <MentionMenu
      query={mentionQuery}
      onSelect={insertMention}
    />
  )}

  {/* 输入区域 */}
  <div className="flex items-end gap-2">
    {/* 快捷操作按钮 */}
    <div className="flex gap-1">
      <Tooltip content="Roll Dice">
        <Button size="sm" variant="ghost" onClick={() => insertCommand('/roll ')}>
          <DiceIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Quick Actions">
        <Button size="sm" variant="ghost" onClick={() => setCommandOpen(true)}>
          <SlashIcon />
        </Button>
      </Tooltip>
    </div>

    {/* 输入框 */}
    {multiline ? (
      <TextArea
        value={value}
        onChange={setValue}
        placeholder={placeholder || 'Type your action...'}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        disabled={disabled}
        autoResize
        rows={1}
        maxRows={4}
        className="flex-1"
      />
    ) : (
      <Input
        value={value}
        onChange={setValue}
        placeholder={placeholder || 'Type your action...'}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        disabled={disabled}
        className="flex-1"
      />
    )}

    {/* 发送按钮 */}
    {showSendButton && (
      <Button
        size="sm"
        onClick={() => {
          if (value.trim()) {
            onSend(value.trim());
            setValue('');
          }
        }}
        disabled={disabled || !value.trim()}
      >
        <SendIcon />
      </Button>
    )}
  </div>

  {/* 字符计数 */}
  {maxLength && (
    <div className="text-xs text-slate-500 text-right mt-1">
      {value.length} / {maxLength}
    </div>
  )}
</div>
```

---

## 8. NarrationDisplay（DM 叙述展示）

### 8.1 Props 接口

```typescript
// components/chat/NarrationDisplay/NarrationDisplay.tsx
export interface NarrationDisplayProps {
  /** 叙述文本 */
  text: string;
  /** 流式传输状态 */
  isStreaming?: boolean;
  /** 打字机效果 */
  typewriter?: boolean;
  /** 打字机速度（ms/字符） */
  typewriterSpeed?: number;
  /** 背景样式 */
  background?: 'none' | 'parchment' | 'dark' | 'mystical';
  /** 完成回调 */
  onComplete?: () => void;
}
```

### 8.2 内部状态

```typescript
// 打字机效果显示的文本
const [displayText, setDisplayText] = useState('');
const [currentIndex, setCurrentIndex] = useState(0);

// 流式传输缓冲区
const [streamBuffer, setStreamBuffer] = useState('');
```

### 8.3 交互设计

- **打字机效果**: 逐字显示叙述文本
- **点击跳过**: 点击叙述区域立即显示完整文本
- **流式接收**: 实时接收并显示 LLM 输出
- **滚动跟随**: 自动滚动到最新内容

### 8.4 样式方案

```typescript
// 叙述展示容器
<div
  className={cn(
    'relative p-6 rounded-lg border',
    'prose prose-invert prose-lg max-w-none',
    {
      'bg-amber-900/20 border-amber-700/50': background === 'parchment',
      'bg-slate-900/80 border-slate-700': background === 'dark',
      'bg-purple-900/20 border-purple-700/50': background === 'mystical',
      'border-slate-700': background === 'none',
    }
  )}
  onClick={() => {
    // 点击跳过打字机效果
    if (typewriter && currentIndex < text.length) {
      setCurrentIndex(text.length);
    }
  }}
>
  {/* 流式指示器 */}
  {isStreaming && (
    <div className="absolute top-2 right-2">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        DM is speaking...
      </div>
    </div>
  )}

  {/* 叙述内容 */}
  <div className="narration-content">
    {typewriter ? displayText : text}
    {(isStreaming || (typewriter && currentIndex < text.length)) && (
      <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse" />
    )}
  </div>

  {/* 背景装饰 */}
  {background === 'parchment' && (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      {/* 羊皮纸纹理 */}
    </div>
  )}
</div>

// 叙述内容样式（CSS）
.narration-content {
  line-height: 1.8;
  text-indent: 2em;
}

.narration-content p {
  margin-bottom: 1em;
}

.narration-content p:first-of-type::first-letter {
  font-size: 3em;
  font-weight: bold;
  float: left;
  line-height: 1;
  margin-right: 0.1em;
  color: #fbbf24; /* amber-400 */
}
```

---

## 9. 聊天组件集成

### 9.1 完整聊天界面

```typescript
// ChatContainer 完整结构
<div className={chatContainerClasses}>
  {/* 头部 */}
  <ChatHeader
    title="Game Chat"
    expanded={expanded}
    onToggle={toggleExpanded}
    unreadCount={unreadCount}
    actions={
      <>
        <Button size="sm" variant="ghost" onClick={clearChat}>
          <TrashIcon />
        </Button>
        <Button size="sm" variant="ghost" onClick={exportChat}>
          <DownloadIcon />
        </Button>
      </>
    }
  />

  {/* 展开时的内容 */}
  {expanded && (
    <>
      {/* 消息列表 */}
      <MessageList messages={messages} autoScroll={autoScroll} />

      {/* 叙述展示（如果有流式叙述） */}
      {currentNarration && (
        <NarrationDisplay
          text={currentNarration.text}
          isStreaming={currentNarration.streaming}
          typewriter
          background="parchment"
        />
      )}

      {/* 快捷操作 */}
      <ChatActions
        actions={[
          { id: 'roll', label: 'Roll', icon: 'dice', onClick: quickRoll },
          { id: 'check', label: 'Check', icon: 'search', onClick: quickCheck },
          { id: 'look', label: 'Look Around', icon: 'eye', onClick: lookAround },
        ]}
      />

      {/* 输入框 */}
      <MessageInput
        placeholder="What do you do?"
        onSend={sendMessage}
        multiline
        showSendButton
        quickCommands={quickCommands}
      />
    </>
  )}
</div>
```

### 9.2 快捷命令定义

```typescript
// 快捷命令列表
const quickCommands: QuickCommand[] = [
  {
    id: 'roll',
    label: 'Roll Dice',
    icon: 'dice',
    template: '/roll {dice}',
    insertAt: 'cursor',
  },
  {
    id: 'attack',
    label: 'Attack',
    icon: 'sword',
    template: 'I attack with my {weapon}!',
    insertAt: 'end',
  },
  {
    id: 'look',
    label: 'Look Around',
    icon: 'eye',
    template: 'I look around carefully.',
    insertAt: 'end',
  },
  {
    id: 'talk',
    label: 'Talk',
    icon: 'message',
    template: 'I say: "{message}"',
    insertAt: 'end',
  },
  {
    id: 'rest',
    label: 'Rest',
    icon: 'bed',
    template: 'We take a short rest.',
    insertAt: 'end',
  },
];
```

---

## 10. 性能优化

### 10.1 虚拟滚动

```typescript
// 使用 react-window 实现虚拟滚动
import { FixedSizeList } from 'react-window';

function VirtualMessageList({ messages }: MessageListProps) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Message data={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 10.2 消息分页

```typescript
// 分页加载历史消息
const [displayedCount, setDisplayedCount] = useState(50);

useEffect(() => {
  // 监听滚动到顶部
  const handleScrollTop = () => {
    if (listRef.current?.scrollTop === 0) {
      setDisplayedCount(prev => prev + 50);
    }
  };

  listRef.current?.addEventListener('scroll', handleScrollTop);
  return () => listRef.current?.removeEventListener('scroll', handleScrollTop);
}, []);
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
