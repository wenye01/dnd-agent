# Client 模块设计

> **模块名称**: client
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

Client 模块是游戏后端的 AI Agent 部分，负责：
- LLM 会话管理和生命周期
- 上下文构建和管理（Prompt 组装）
- LLM API 适配（OpenAI、Anthropic）
- 工具调用处理和执行
- 流式响应处理

### 1.2 模块边界

**包含**：
- LLM Provider 接口和各提供商适配器
- 会话管理器（创建、恢复、销毁会话）
- 上下文构建器（Prompt 模板、历史压缩）
- 工具注册表和调用分发
- 流式响应处理器

**不包含**：
- 游戏规则实现（由 Server 模块负责）
- 网络通信（由 API 模块负责）
- 数据持久化（由持久化模块负责）

---

## 2. 目录结构

```
internal/client/
├── llm/
│   ├── provider.go         # Provider 接口定义
│   ├── types.go            # 通用类型定义
│   ├── openai/
│   │   ├── client.go       # OpenAI 客户端
│   │   ├── chat.go         # Chat API
│   │   └── stream.go       # 流式响应处理
│   └── anthropic/
│       ├── client.go       # Anthropic 客户端
│       ├── chat.go         # Messages API
│       └── stream.go       # 流式响应处理
├── context/
│   ├── builder.go          # 上下文构建器
│   ├── compressor.go       # 历史压缩器
│   ├── templates.go        # Prompt 模板管理
│   └── rules.go            # 规则上下文提供者
├── session/
│   ├── manager.go          # 会话管理器
│   ├── state.go            # 会话状态
│   └── conversation.go     # 对话历史管理
├── tools/
│   ├── registry.go         # 工具注册表
│   ├── executor.go         # 工具执行器
│   ├── definitions.go      # 工具定义
│   └── handlers/           # 工具处理器
│       ├── character.go
│       ├── combat.go
│       ├── dice.go
│       ├── spell.go
│       ├── item.go
│       └── map.go
└── module.go               # 模块入口
```

---

## 3. 对外接口

### 3.1 Module 接口

```go
// internal/client/module.go

type Module struct {
    sessionManager *LLMSessionManager
    toolRegistry   *ToolRegistry
    stateManager   *state.Manager
    hub            *websocket.Hub
}

func NewModule(cfg *Config, stateManager *state.Manager, hub *websocket.Hub) (*Module, error)

// 处理用户输入（核心入口）
func (m *Module) ProcessUserInput(ctx context.Context, sessionID, input string) error

// 获取工具列表（供 LLM 调用）
func (m *Module) GetToolDefinitions() []ToolDefinition
```

### 3.2 LLM Provider 接口

```go
// internal/client/llm/provider.go

type Provider interface {
    // 发送消息，获取响应
    SendMessage(ctx context.Context, req *ChatRequest) (*ChatResponse, error)

    // 流式发送消息
    StreamMessage(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)

    // 获取支持的特性
    Capabilities() ProviderCapabilities
}

type ProviderCapabilities struct {
    SupportsStreaming    bool
    SupportsToolCalling  bool
    SupportsVision       bool
    MaxTokens           int
}
```

### 3.3 类型定义

```go
// internal/client/llm/types.go

type Message struct {
    Role       string          `json:"role"` // "system", "user", "assistant", "tool"
    Content    string          `json:"content"`
    ToolCalls  []ToolCall      `json:"toolCalls,omitempty"`
    ToolCallID string          `json:"toolCallId,omitempty"`
}

type ToolCall struct {
    ID       string                 `json:"id"`
    Name     string                 `json:"name"`
    Arguments map[string]interface{} `json:"arguments"`
}

type ToolDefinition struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"inputSchema"` // JSON Schema
}

type ChatRequest struct {
    Messages    []Message        `json:"messages"`
    Tools       []ToolDefinition `json:"tools,omitempty"`
    MaxTokens   int              `json:"maxTokens"`
    Temperature float64          `json:"temperature"`
}

type ChatResponse struct {
    Message   Message `json:"message"`
    Usage     Usage   `json:"usage"`
    StopReason string `json:"stopReason"`
}

type StreamChunk struct {
    Type      string `json:"type"` // "content", "tool_call", "done", "error"
    Content   string `json:"content,omitempty"`
    ToolCall  *ToolCall `json:"toolCall,omitempty"`
    Error     error   `json:"error,omitempty"`
}

type Usage struct {
    InputTokens  int `json:"inputTokens"`
    OutputTokens int `json:"outputTokens"`
}
```

---

## 4. 组件划分

### 4.1 会话管理器

```go
// internal/client/session/manager.go

type LLMSessionManager struct {
    provider     llm.Provider
    sessions     map[string]*LLMSession
    contextBuilder *ContextBuilder
    toolExecutor *ToolExecutor
    mu           sync.RWMutex
}

func NewLLMSessionManager(provider llm.Provider, contextBuilder *ContextBuilder, toolExecutor *ToolExecutor) *LLMSessionManager

// 创建新会话
func (sm *LLMSessionManager) CreateSession(ctx context.Context, sessionID string, scenario *scenario.Scenario) error

// 恢复会话
func (sm *LLMSessionManager) RestoreSession(ctx context.Context, sessionID string, history []Message) error

// 处理用户输入
func (sm *LLMSessionManager) ProcessInput(ctx context.Context, sessionID, input string) error

// 获取会话
func (sm *LLMSessionManager) GetSession(sessionID string) (*LLMSession, bool)

// 销毁会话
func (sm *LLMSessionManager) DestroySession(sessionID string)
```

### 4.2 会话状态

```go
// internal/client/session/state.go

type LLMSession struct {
    ID           string
    Scenario     *scenario.Scenario
    Conversation *Conversation
    State        LLMSessionState
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

type LLMSessionState struct {
    // 当前上下文模式
    ContextMode ContextMode // "exploration", "combat", "dialogue"

    // 累计 token 使用
    TotalInputTokens  int
    TotalOutputTokens int
}
```

### 4.3 对话历史管理

```go
// internal/client/session/conversation.go

type Conversation struct {
    messages []Message
    maxMessages int
    compressor *Compressor
}

func NewConversation(maxMessages int, compressor *Compressor) *Conversation

// 添加消息
func (c *Conversation) AddMessage(msg Message)

// 获取消息历史
func (c *Conversation) GetMessages() []Message

// 压缩历史
func (c *Conversation) Compress() error

// 序列化/反序列化（用于持久化）
func (c *Conversation) MarshalJSON() ([]byte, error)
func (c *Conversation) UnmarshalJSON(data []byte) error
```

### 4.4 上下文构建器

```go
// internal/client/context/builder.go

type ContextBuilder struct {
    templates   *TemplateManager
    compressor  *Compressor
    rulesProvider *RulesProvider
}

func NewContextBuilder(templates *TemplateManager, compressor *Compressor, rulesProvider *RulesProvider) *ContextBuilder

// 构建系统消息
func (cb *ContextBuilder) BuildSystemPrompt(ctx context.Context, gameState *state.GameState, scenario *scenario.Scenario) string

// 构建上下文消息
func (cb *ContextBuilder) BuildContextMessages(ctx context.Context, session *LLMSession) []Message

// 构建战斗上下文
func (cb *ContextBuilder) BuildCombatContext(ctx context.Context, combatState *state.CombatState) string
```

### 4.5 Prompt 模板管理

```go
// internal/client/context/templates.go

type TemplateManager struct {
    templates map[string]string
}

func NewTemplateManager(templateDir string) (*TemplateManager, error)

// 获取模板
func (tm *TemplateManager) Get(name string) (string, bool)

// 渲染模板
func (tm *TemplateManager) Render(name string, data interface{}) (string, error)
```

**核心模板**：

| 模板名称 | 用途 |
|----------|------|
| `system_prompt` | 基础系统 Prompt |
| `dm_instructions` | DM 角色说明 |
| `rules_summary` | D&D 5e 规则摘要 |
| `combat_context` | 战斗场景上下文 |
| `exploration_context` | 探索场景上下文 |
| `character_sheet` | 角色卡格式 |
| `npc_description` | NPC 描述格式 |

### 4.6 历史压缩器

```go
// internal/client/context/compressor.go

type Compressor struct {
    provider llm.Provider
}

func NewCompressor(provider llm.Provider) *Compressor

// 压缩对话历史
func (c *Compressor) Compress(ctx context.Context, messages []Message) ([]Message, error)

// 总结历史片段
func (c *Compressor) Summarize(ctx context.Context, messages []Message) (string, error)
```

### 4.7 工具注册表

```go
// internal/client/tools/registry.go

type ToolRegistry struct {
    tools map[string]ToolHandler
    defs  []ToolDefinition
}

type ToolHandler func(ctx context.Context, args map[string]interface{}) (*ToolResult, error)

func NewToolRegistry() *ToolRegistry

// 注册工具
func (r *ToolRegistry) Register(def ToolDefinition, handler ToolHandler)

// 获取工具定义列表
func (r *ToolRegistry) GetDefinitions() []ToolDefinition

// 执行工具
func (r *ToolRegistry) Execute(ctx context.Context, name string, args map[string]interface{}) (*ToolResult, error)
```

### 4.8 工具执行器

```go
// internal/client/tools/executor.go

type ToolExecutor struct {
    registry     *ToolRegistry
    stateManager *state.Manager
    eventBus     *events.Bus
}

func NewToolExecutor(registry *ToolRegistry, stateManager *state.Manager, eventBus *events.Bus) *ToolExecutor

// 执行工具调用
func (e *ToolExecutor) Execute(ctx context.Context, sessionID string, toolCall ToolCall) (*ToolResult, error)

// 批量执行工具调用
func (e *ToolExecutor) ExecuteBatch(ctx context.Context, sessionID string, toolCalls []ToolCall) ([]ToolResult, error)
```

---

## 5. 状态设计

### 5.1 会话状态流转

```
┌─────────────────────────────────────────────────────────────────┐
│                        会话状态流转                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     创建会话     ┌──────────┐                   │
│   │  Idle    │ ───────────────▶ │  Active  │                   │
│   └──────────┘                  └────┬─────┘                   │
│        ▲                             │                         │
│        │                             │                         │
│        │    销毁会话                 │ 用户输入                 │
│        │                             ▼                         │
│        │                        ┌──────────┐                   │
│        │                        │Processing│                   │
│        │                        └────┬─────┘                   │
│        │                             │                         │
│        │                             │ LLM 响应完成            │
│        │                             ▼                         │
│        │                        ┌──────────┐                   │
│        └────────────────────────│  Active  │                   │
│                                 └──────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 上下文模式切换

#### 5.2.1 上下文类型定义

```go
type ContextMode string

const (
    ContextModeExploration ContextMode = "exploration"  // 探索（默认）
    ContextModeCombat      ContextMode = "combat"       // 战斗
    ContextModeDialogue    ContextMode = "dialogue"     // 对话
)
```

#### 5.2.2 上下文特性对比

| 特性 | 探索模式 | 战斗模式 | 对话模式 |
|------|----------|----------|----------|
| **触发条件** | 默认/战斗结束/对话结束 | 战斗开始 | 与 NPC 对话 |
| **主要工具集** | 移动、交互、检定 | 攻击、法术、物品 | 仅对话相关 |
| **System Prompt** | exploration_context | combat_context | dialogue_context |
| **响应速度** | 正常 | 快速（战斗中） | 正常 |
| **历史保留** | 完整 | 仅战斗相关 | 对话历史 |

#### 5.2.3 各上下文可用工具集

```go
// 工具集定义
var ContextToolSets = map[ContextMode][]string{
    ContextModeExploration: {
        // 移动与探索
        "move_character",
        "interact",
        "load_map",
        "get_visible_area",

        // 检定
        "roll_dice",
        "ability_check",
        "saving_throw",
        "skill_check",

        // 角色管理
        "get_character",
        "update_character",
        "use_item",
        "equip_item",

        // 对话触发
        "start_dialogue",

        // 休息
        "short_rest",
        "long_rest",

        // 存档
        "save_game",
        "load_game",
    },

    ContextModeCombat: {
        // 战斗核心
        "attack",
        "cast_spell",
        "use_item",
        "end_turn",

        // 战斗辅助
        "roll_dice",
        "skill_check",
        "saving_throw",

        // 战斗状态
        "get_combat_state",
        "get_character",

        // 战斗控制
        "start_combat",
        "end_combat",
    },

    ContextModeDialogue: {
        // 对话核心
        "roll_dice",
        "skill_check",      // 欺瞒、说服、威吓等
        "ability_check",    // 属性检定

        // 对话辅助
        "get_character",

        // 对话结束
        "end_dialogue",
    },
}
```

#### 5.2.4 上下文切换触发条件

```go
// 上下文切换检测
func (sm *LLMSessionManager) detectContextMode(gameState *state.GameState) ContextMode {
    // 优先级：战斗 > 对话 > 探索

    // 1. 战斗模式检测
    if gameState.Combat != nil && gameState.Combat.Active {
        return ContextModeCombat
    }

    // 2. 对话模式检测
    if gameState.Dialogue != nil && gameState.Dialogue.Active {
        return ContextModeDialogue
    }

    // 3. 默认探索模式
    return ContextModeExploration
}

// 上下文切换处理
func (sm *LLMSessionManager) handleContextSwitch(ctx context.Context, session *LLMSession, newMode ContextMode) error {
    oldMode := session.State.ContextMode
    if oldMode == newMode {
        return nil
    }

    // 1. 保存旧上下文状态（如需要）
    if oldMode == ContextModeCombat {
        // 战斗结束后总结战斗日志
        sm.summarizeCombat(ctx, session)
    }

    // 2. 切换上下文
    session.State.ContextMode = newMode

    // 3. 更新可用工具集
    session.AvailableTools = sm.getToolsForContext(newMode)

    // 4. 构建新的上下文提示
    contextPrompt := sm.contextBuilder.BuildContextPrompt(ctx, newMode, session)

    // 5. 添加上下文切换系统消息
    session.Conversation.AddMessage(Message{
        Role:    "system",
        Content: fmt.Sprintf("游戏场景切换：%s → %s\n\n%s", oldMode, newMode, contextPrompt),
    })

    return nil
}
```

#### 5.2.5 上下文切换流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                      上下文切换流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                             │
│   │  状态变更事件  │                                            │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 检测新模式    │                                             │
│   │ detectContext │                                            │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐     否      ┌──────────────┐               │
│   │ 模式是否改变？ │ ──────────▶│    无操作     │               │
│   └───────┬──────┘             └──────────────┘               │
│           │ 是                                                  │
│           ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 保存旧上下文  │                                             │
│   │ (战斗总结等)  │                                             │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 更新工具集    │                                             │
│   │ getToolsForCtx│                                            │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 构建上下文提示│                                             │
│   │ BuildContext  │                                            │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 添加系统消息  │                                             │
│   │ (场景切换说明)│                                             │
│   └──────────────┘                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 模块间通信

### 6.1 与 Server 模块通信（工具调用）

```
工具调用流程：

┌─────────────┐     ToolCall      ┌─────────────┐
│     LLM     │ ─────────────────▶│   Client    │
│   Provider  │                    │   Module    │
└─────────────┘                    └──────┬──────┘
                                          │
                                          │ 调用 ToolExecutor
                                          ▼
                                   ┌─────────────┐
                                   │    Tool     │
                                   │  Registry   │
                                   └──────┬──────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
        ┌──────────┐               ┌──────────┐               ┌──────────┐
        │ Character│               │  Combat  │               │   Dice   │
        │ Handler  │               │ Handler  │               │ Handler  │
        │(Server)  │               │(Server)  │               │(Server)  │
        └────┬─────┘               └────┬─────┘               └────┬─────┘
             │                          │                          │
             │                          │                          │
             └──────────────────────────┴──────────────────────────┘
                                        │
                                        │ ToolResult
                                        ▼
                                 ┌─────────────┐
                                 │   Client    │
                                 │   Module    │
                                 └──────┬──────┘
                                        │
                                        │ 返回给 LLM
                                        ▼
                                 ┌─────────────┐
                                 │     LLM     │
                                 │   Provider  │
                                 └─────────────┘
```

### 6.2 与状态管理器通信

```go
// 订阅状态变更
func (sm *LLMSessionManager) subscribeStateChanges(ctx context.Context, sessionID string) {
    ch := sm.stateManager.Subscribe(sessionID)
    go func() {
        for {
            select {
            case update := <-ch:
                sm.handleStateUpdate(sessionID, update)
            case <-ctx.Done():
                return
            }
        }
    }()
}

// 处理状态更新
func (sm *LLMSessionManager) handleStateUpdate(sessionID string, update *state.Update) {
    session, ok := sm.GetSession(sessionID)
    if !ok {
        return
    }

    // 检查是否需要切换上下文模式
    newMode := sm.detectContextMode(update.GameState)
    if session.State.ContextMode != newMode {
        session.State.ContextMode = newMode
        // 可能需要通知 LLM 上下文变化
    }
}
```

### 6.3 与 Hub 通信（推送消息）

```go
// 发送叙述文本（流式）
func (sm *LLMSessionManager) streamNarration(ctx context.Context, sessionID string, ch <-chan llm.StreamChunk) {
    var buffer strings.Builder

    for chunk := range ch {
        if chunk.Type == "content" {
            buffer.WriteString(chunk.Content)

            // 推送给前端
            sm.hub.Broadcast(sessionID, &websocket.ServerMessage{
                Type: websocket.ServerMessageNarration,
                Payload: NarrationPayload{
                    Text:        buffer.String(),
                    IsStreaming: true,
                    IsDone:      false,
                },
            })
        } else if chunk.Type == "tool_call" {
            // 处理工具调用
            result, err := sm.toolExecutor.Execute(ctx, sessionID, *chunk.ToolCall)
            // ...
        }
    }

    // 发送完成消息
    sm.hub.Broadcast(sessionID, &websocket.ServerMessage{
        Type: websocket.ServerMessageNarration,
        Payload: NarrationPayload{
            Text:        buffer.String(),
            IsStreaming: false,
            IsDone:      true,
        },
    })
}
```

---

## 7. LLM 适配器实现

### 7.1 OpenAI 适配器

```go
// internal/client/llm/openai/client.go

type OpenAIClient struct {
    apiKey     string
    baseURL    string
    model      string
    httpClient *http.Client
}

func NewOpenAIClient(cfg *OpenAIConfig) (*OpenAIClient, error)

func (c *OpenAIClient) SendMessage(ctx context.Context, req *ChatRequest) (*ChatResponse, error)

func (c *OpenAIClient) StreamMessage(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)

func (c *OpenAIClient) Capabilities() ProviderCapabilities
```

### 7.2 Anthropic 适配器

```go
// internal/client/llm/anthropic/client.go

type AnthropicClient struct {
    apiKey     string
    baseURL    string
    model      string
    httpClient *http.Client
}

func NewAnthropicClient(cfg *AnthropicConfig) (*AnthropicClient, error)

func (c *AnthropicClient) SendMessage(ctx context.Context, req *ChatRequest) (*ChatResponse, error)

func (c *AnthropicClient) StreamMessage(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)

func (c *AnthropicClient) Capabilities() ProviderCapabilities
```

---

## 8. 工具定义示例

### 8.1 检定工具

```go
// internal/client/tools/handlers/dice.go

var RollDiceDefinition = ToolDefinition{
    Name: "roll_dice",
    Description: "掷骰子进行检定。支持标准 D&D 骰子表达式，如 '1d20+5' 或 '2d6+3'。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "formula": map[string]interface{}{
                "type":        "string",
                "description": "骰子表达式，如 '1d20+5'",
            },
            "advantage": map[string]interface{}{
                "type":        "string",
                "enum":        []string{"normal", "advantage", "disadvantage"},
                "description": "优势/劣势状态",
            },
            "description": map[string]interface{}{
                "type":        "string",
                "description": "检定描述，如 '攻击检定' 或 '察觉检定'",
            },
        },
        "required": []string{"formula"},
    },
}
```

### 8.2 战斗工具

```go
// internal/client/tools/handlers/combat.go

var AttackDefinition = ToolDefinition{
    Name: "attack",
    Description: "执行攻击动作。包含攻击检定和伤害掷骰。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "attackerId": map[string]interface{}{
                "type":        "string",
                "description": "攻击者 ID",
            },
            "targetId": map[string]interface{}{
                "type":        "string",
                "description": "目标 ID",
            },
            "weaponId": map[string]interface{}{
                "type":        "string",
                "description": "使用的武器 ID（可选，默认使用主手武器）",
            },
        },
        "required": []string{"attackerId", "targetId"},
    },
}

var CastSpellDefinition = ToolDefinition{
    Name: "cast_spell",
    Description: "施放法术。消耗法术位，执行法术效果。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "casterId": map[string]interface{}{
                "type":        "string",
                "description": "施法者 ID",
            },
            "spellId": map[string]interface{}{
                "type":        "string",
                "description": "法术 ID",
            },
            "targetId": map[string]interface{}{
                "type":        "string",
                "description": "目标 ID（可选，取决于法术类型）",
            },
            "position": map[string]interface{}{
                "type":        "object",
                "description": "目标位置（可选，用于范围法术）",
            },
            "level": map[string]interface{}{
                "type":        "integer",
                "description": "施展法术的环阶（可选，用于升环施法）",
            },
        },
        "required": []string{"casterId", "spellId"},
    },
}
```

---

## 9. 错误处理

### 9.1 错误类型

```go
type ClientError struct {
    Code    ErrorCode
    Message string
    Cause   error
}

type ErrorCode string

const (
    ErrCodeLLMConnection  ErrorCode = "LLM_CONNECTION_ERROR"
    ErrCodeLLMRateLimit   ErrorCode = "LLM_RATE_LIMIT"
    ErrCodeLLMTimeout     ErrorCode = "LLM_TIMEOUT"
    ErrCodeToolExecution  ErrorCode = "TOOL_EXECUTION_ERROR"
    ErrCodeContextOverflow ErrorCode = "CONTEXT_OVERFLOW"
)
```

### 9.2 重试与超时机制

```go
// LLM 调用配置（含重试和超时）
type LLMConfig struct {
    // 超时配置
    Timeout           time.Duration // 单次请求超时（默认 30s）
    StreamTimeout     time.Duration // 流式响应超时（默认 60s）
    ConnectionTimeout time.Duration // 连接建立超时（默认 10s）

    // 重试配置
    Retry RetryConfig

    // 降级配置
    Fallback FallbackConfig
}

type RetryConfig struct {
    MaxRetries     int           // 最大重试次数（默认 3）
    InitialBackoff time.Duration // 初始退避时间（默认 1s）
    MaxBackoff     time.Duration // 最大退避时间（默认 30s）
    BackoffFactor  float64       // 退避因子（默认 2.0）
    RetryOnTimeout bool          // 超时是否重试（默认 true）
}

type FallbackConfig struct {
    Enabled         bool          // 是否启用降级响应（默认 true）
    ResponseTimeout time.Duration // 等待降级响应时间（默认 5s）
    Template        string        // 降级响应模板
}

// 默认配置
var DefaultLLMConfig = LLMConfig{
    Timeout:           30 * time.Second,
    StreamTimeout:     60 * time.Second,
    ConnectionTimeout: 10 * time.Second,
    Retry: RetryConfig{
        MaxRetries:     3,
        InitialBackoff: 1 * time.Second,
        MaxBackoff:     30 * time.Second,
        BackoffFactor:  2.0,
        RetryOnTimeout: true,
    },
    Fallback: FallbackConfig{
        Enabled:         true,
        ResponseTimeout: 5 * time.Second,
        Template:        "DM思考中，请稍候...",
    },
}
```

#### 9.2.1 超时重试实现

```go
func (sm *LLMSessionManager) callLLMWithRetry(ctx context.Context, session *LLMSession, req *ChatRequest) (*ChatResponse, error) {
    var lastErr error
    backoff := sm.config.Retry.InitialBackoff

    for i := 0; i < sm.config.Retry.MaxRetries; i++ {
        // 创建带超时的上下文
        timeoutCtx, cancel := context.WithTimeout(ctx, sm.config.Timeout)

        resp, err := sm.provider.SendMessage(timeoutCtx, req)
        cancel()

        if err == nil {
            return resp, nil
        }

        lastErr = err

        // 分类错误处理
        switch {
        case isTimeoutError(err):
            // 超时错误
            if !sm.config.Retry.RetryOnTimeout {
                return nil, sm.handleTimeout(session, err)
            }
            log.Warn("LLM timeout, retrying", "attempt", i+1, "backoff", backoff)

        case isRateLimitError(err):
            // 速率限制，等待更长时间
            retryAfter := getRetryAfter(err)
            if retryAfter > 0 {
                backoff = retryAfter
            }

        case isRetryableError(err):
            // 其他可重试错误
            log.Warn("LLM error, retrying", "attempt", i+1, "error", err)

        default:
            // 不可重试错误，直接返回
            return nil, err
        }

        // 指数退避
        time.Sleep(backoff)
        backoff = time.Duration(float64(backoff) * sm.config.Retry.BackoffFactor)
        if backoff > sm.config.Retry.MaxBackoff {
            backoff = sm.config.Retry.MaxBackoff
        }
    }

    // 所有重试失败，尝试降级响应
    return sm.handleFallback(session, lastErr)
}

// 判断超时错误
func isTimeoutError(err error) bool {
    return errors.Is(err, context.DeadlineExceeded) ||
           strings.Contains(err.Error(), "timeout") ||
           strings.Contains(err.Error(), "deadline exceeded")
}

// 判断速率限制错误
func isRateLimitError(err error) bool {
    var apiErr *APIError
    if errors.As(err, &apiErr) {
        return apiErr.StatusCode == 429
    }
    return false
}

// 判断可重试错误
func isRetryableError(err error) bool {
    var apiErr *APIError
    if errors.As(err, &apiErr) {
        // 5xx 错误和 429 可重试
        return apiErr.StatusCode >= 500 || apiErr.StatusCode == 429
    }
    // 网络错误、超时错误可重试
    return isTimeoutError(err) || isNetworkError(err)
}
```

#### 9.2.2 降级响应处理

```go
// 处理超时（记录状态，准备重试）
func (sm *LLMSessionManager) handleTimeout(session *LLMSession, err error) error {
    log.Error("LLM request timeout", "sessionId", session.ID, "error", err)

    // 通知前端超时状态
    sm.hub.Broadcast(session.ID, &websocket.ServerMessage{
        Type: websocket.ServerMessageNarration,
        Payload: NarrationPayload{
            Text:        "DM似乎陷入了沉思...",
            IsStreaming: false,
            IsComplete:  false,
            IsTimeout:   true,  // 新增字段
        },
    })

    return &ClientError{
        Code:    ErrCodeLLMTimeout,
        Message: "LLM request timeout after retries",
        Cause:   err,
    }
}

// 处理降级响应
func (sm *LLMSessionManager) handleFallback(session *LLMSession, lastErr error) (*ChatResponse, error) {
    if !sm.config.Fallback.Enabled {
        return nil, lastErr
    }

    log.Warn("All LLM retries failed, using fallback response", "sessionId", session.ID)

    // 返回降级响应
    return &ChatResponse{
        Message: Message{
            Role:    "assistant",
            Content: sm.config.Fallback.Template,
        },
        StopReason: "fallback",
    }, nil
}
```

#### 9.2.3 超时监控指标

```go
// LLM 调用监控指标
type LLMMetrics struct {
    TotalRequests     int64
    SuccessfulRequests int64
    FailedRequests    int64
    TimeoutRequests   int64
    RetryCount        int64
    AvgLatency        time.Duration
    P99Latency        time.Duration
}

func (sm *LLMSessionManager) recordMetrics(start time.Time, success bool, retries int, timeout bool) {
    sm.metricsMutex.Lock()
    defer sm.metricsMutex.Unlock()

    sm.metrics.TotalRequests++
    if success {
        sm.metrics.SuccessfulRequests++
    } else {
        sm.metrics.FailedRequests++
    }
    if timeout {
        sm.metrics.TimeoutRequests++
    }
    sm.metrics.RetryCount += int64(retries)

    latency := time.Since(start)
    sm.updateLatency(latency)
}
```

---

## 10. 配置项

```yaml
client:
  llm:
    provider: "openai"  # openai, anthropic
    openai:
      api_key: "${OPENAI_API_KEY}"
      base_url: "https://api.openai.com/v1"
      model: "gpt-4"
    anthropic:
      api_key: "${ANTHROPIC_API_KEY}"
      base_url: "https://api.anthropic.com"
      model: "claude-3-opus-20240229"

  conversation:
    max_messages: 100
    compression_threshold: 50
    compression_target: 20

  retry:
    max_retries: 3
    initial_backoff: 1s
    max_backoff: 30s

  templates:
    dir: "./configs/prompts"
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
