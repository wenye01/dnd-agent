# Client 模块组件设计

> **模块名称**: client
> **文档类型**: 组件设计
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 组件列表和职责

### 1.1 组件概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Client 模块组件架构                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          LLMSessionManager                          │   │
│  │  职责: 会话生命周期管理、输入处理流程协调                             │   │
│  └────────────┬────────────────────────────────────────────────────────┘   │
│               │                                                             │
│       ┌───────┴────────┬──────────────┬──────────────┐                     │
│       │                │              │              │                     │
│       ▼                ▼              ▼              ▼                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│  │  LLM     │   │ Context  │   │  Tool    │   │ Stream   │               │
│  │ Adapter  │   │ Builder  │   │ Registry │   │ Handler  │               │
│  │          │   │          │   │          │   │          │               │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘               │
│       │              │              │              │                       │
│       └──────────────┴──────────────┴──────────────┘                       │
│                              │                                             │
│                              ▼                                             │
│                    ┌──────────────────┐                                   │
│                    │  ToolExecutor   │                                   │
│                    └──────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 组件职责矩阵

| 组件名称 | 主要职责 | 输入 | 输出 |
|----------|----------|------|------|
| **LLMAdapter** | LLM API 适配、统一接口 | ChatRequest | ChatResponse/StreamChunk |
| **ContextBuilder** | 构建系统 Prompt、组装上下文 | GameState, Scenario | []Message |
| **LLMSessionManager** | 会话生命周期、输入处理 | SessionID, UserInput | StreamChunk, StateUpdate |
| **ToolRegistry** | 工具定义管理、工具注册 | ToolDefinition, Handler | ToolList |
| **ToolExecutor** | 工具调用执行、结果处理 | ToolCall | ToolResult |
| **StreamHandler** | 流式响应处理、分块推送 | StreamChunk | ServerMessage |
| **ConversationManager** | 对话历史管理、历史压缩 | Message | []Message |
| **TemplateManager** | Prompt 模板管理、渲染 | TemplateName, Data | string |

---

## 2. LLMAdapter 组件

### 2.1 组件职责

- 提供 LLM Provider 的统一抽象接口
- 实现 OpenAI 和 Anthropic 的适配器
- 处理流式和非流式响应
- 管理请求重试和错误恢复

### 2.2 接口定义

```go
// internal/client/llm/provider.go

package llm

import (
    "context"
    "io"
)

// Provider 是 LLM Provider 的统一接口
type Provider interface {
    // SendMessage 发送消息并获取完整响应
    SendMessage(ctx context.Context, req *ChatRequest) (*ChatResponse, error)

    // StreamMessage 发送消息并返回流式响应
    StreamMessage(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)

    // Capabilities 返回 Provider 支持的特性
    Capabilities() ProviderCapabilities

    // EstimateTokens 估算消息的 token 数量
    EstimateTokens(messages []Message) int
}

// ProviderCapabilities 描述 Provider 支持的特性
type ProviderCapabilities struct {
    SupportsStreaming    bool
    SupportsToolCalling  bool
    SupportsVision       bool
    MaxTokens           int
    SupportsJSONMode    bool
}

// ChatRequest 聊天请求
type ChatRequest struct {
    Messages    []Message        `json:"messages"`
    Tools       []ToolDefinition `json:"tools,omitempty"`
    MaxTokens   int              `json:"max_tokens,omitempty"`
    Temperature float64          `json:"temperature,omitempty"`
    TopP        float64          `json:"top_p,omitempty"`
    Stop        []string         `json:"stop,omitempty"`
    Metadata    map[string]string `json:"-"` // 不发送给 LLM 的元数据
}

// ChatResponse 聊天响应
type ChatResponse struct {
    ID           string          `json:"id"`
    Message      Message         `json:"message"`
    Usage        Usage           `json:"usage"`
    StopReason   string          `json:"stop_reason"` // "end_turn", "max_tokens", "stop_sequence"
    Model        string          `json:"model"`
    RawResponse  json.RawMessage `json:"-"` // 原始响应，用于调试
}

// StreamChunk 流式响应块
type StreamChunk struct {
    // Type: "content", "tool_call", "done", "error"
    Type      string    `json:"type"`

    // Content: 当 Type = "content" 时，增量文本内容
    Content   string    `json:"content,omitempty"`

    // ToolCall: 当 Type = "tool_call" 时，工具调用信息
    ToolCall  *ToolCall `json:"tool_call,omitempty"`

    // Delta: 文本增量（兼容不同提供商）
    Delta     *MessageDelta `json:"delta,omitempty"`

    // Done: 完成标志
    Done      bool      `json:"done,omitempty"`

    // Usage: token 使用情况（流结束时）
    Usage     *Usage    `json:"usage,omitempty"`

    // Error: 错误信息
    Error     error     `json:"error,omitempty"`

    // Raw: 原始数据
    Raw       json.RawMessage `json:"-"`
}

// MessageDelta 消息增量
type MessageDelta struct {
    Role    string    `json:"role,omitempty"`
    Content string    `json:"content,omitempty"`
}

// Usage token 使用情况
type Usage struct {
    InputTokens  int `json:"input_tokens"`
    OutputTokens int `json:"output_tokens"`
    TotalTokens  int `json:"total_tokens,omitempty"`
}

// Message 消息
type Message struct {
    Role       string          `json:"role"` // "system", "user", "assistant", "tool"
    Content    string          `json:"content,omitempty"`
    ToolCalls  []ToolCall      `json:"tool_calls,omitempty"`
    ToolCallID string          `json:"tool_call_id,omitempty"` // 用于 tool 角色的响应
    Metadata   map[string]string `json:"-"` // 不发送给 LLM 的元数据
}

// ToolCall 工具调用
type ToolCall struct {
    ID       string                 `json:"id"`
    Name     string                 `json:"name"`
    Arguments map[string]interface{} `json:"arguments"`
}

// ToolDefinition 工具定义
type ToolDefinition struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"input_schema"` // JSON Schema
}

// RetryConfig 重试配置
type RetryConfig struct {
    MaxRetries     int           // 最大重试次数
    InitialBackoff time.Duration // 初始退避时间
    MaxBackoff     time.Duration // 最大退避时间
    BackoffFactor  float64       // 退避因子
}
```

### 2.3 OpenAI 适配器实现

```go
// internal/client/llm/openai/adapter.go

package openai

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "sync"

    "github.com/yourproject/internal/client/llm"
)

// OpenAIAdapter OpenAI API 适配器
type OpenAIAdapter struct {
    apiKey     string
    baseURL    string
    model      string
    httpClient *http.Client
    retryCfg   llm.RetryConfig
    mu         sync.Mutex
}

// NewOpenAIAdapter 创建 OpenAI 适配器
func NewOpenAIAdapter(apiKey, baseURL, model string, retryCfg llm.RetryConfig) *OpenAIAdapter {
    if baseURL == "" {
        baseURL = "https://api.openai.com/v1"
    }
    return &OpenAIAdapter{
        apiKey:     apiKey,
        baseURL:    baseURL,
        model:      model,
        httpClient: &http.Client{Timeout: 120 * time.Second},
        retryCfg:   retryCfg,
    }
}

// SendMessage 实现 Provider 接口
func (a *OpenAIAdapter) SendMessage(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
    var lastErr error
    backoff := a.retryCfg.InitialBackoff

    for attempt := 0; attempt <= a.retryCfg.MaxRetries; attempt++ {
        resp, err := a.sendMessageOnce(ctx, req)
        if err == nil {
            return resp, nil
        }

        lastErr = err

        // 检查是否可重试
        if !a.isRetryableError(err) {
            return nil, fmt.Errorf("non-retryable error: %w", err)
        }

        if attempt < a.retryCfg.MaxRetries {
            time.Sleep(backoff)
            backoff = time.Duration(float64(backoff) * a.retryCfg.BackoffFactor)
            if backoff > a.retryCfg.MaxBackoff {
                backoff = a.retryCfg.MaxBackoff
            }
        }
    }

    return nil, fmt.Errorf("after %d retries: %w", a.retryCfg.MaxRetries, lastErr)
}

// sendMessageOnce 执行单次请求
func (a *OpenAIAdapter) sendMessageOnce(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
    // 构建请求体
    body := a.buildChatRequest(req)
    jsonData, err := json.Marshal(body)
    if err != nil {
        return nil, fmt.Errorf("marshal request: %w", err)
    }

    // 创建 HTTP 请求
    httpReq, err := http.NewRequestWithContext(ctx, "POST", a.baseURL+"/chat/completions", bytes.NewReader(jsonData))
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+a.apiKey)

    // 发送请求
    httpResp, err := a.httpClient.Do(httpReq)
    if err != nil {
        return nil, fmt.Errorf("send request: %w", err)
    }
    defer httpResp.Body.Close()

    // 读取响应
    respBody, err := io.ReadAll(httpResp.Body)
    if err != nil {
        return nil, fmt.Errorf("read response: %w", err)
    }

    // 检查 HTTP 状态码
    if httpResp.StatusCode != http.StatusOK {
        return nil, a.parseErrorResponse(respBody, httpResp.StatusCode)
    }

    // 解析响应
    return a.parseChatResponse(respBody)
}

// StreamMessage 实现流式请求
func (a *OpenAIAdapter) StreamMessage(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
    ch := make(chan llm.StreamChunk, 16)

    go func() {
        defer close(ch)

        // 构建请求体
        body := a.buildChatRequest(req)
        jsonData, err := json.Marshal(body)
        if err != nil {
            ch <- llm.StreamChunk{Type: "error", Error: err}
            return
        }

        // 创建 HTTP 请求
        httpReq, err := http.NewRequestWithContext(ctx, "POST", a.baseURL+"/chat/completions", bytes.NewReader(jsonData))
        if err != nil {
            ch <- llm.StreamChunk{Type: "error", Error: err}
            return
        }

        httpReq.Header.Set("Content-Type", "application/json")
        httpReq.Header.Set("Authorization", "Bearer "+a.apiKey)

        // 发送请求
        httpResp, err := a.httpClient.Do(httpReq)
        if err != nil {
            ch <- llm.StreamChunk{Type: "error", Error: err}
            return
        }
        defer httpResp.Body.Close()

        if httpResp.StatusCode != http.StatusOK {
            ch <- llm.StreamChunk{Type: "error", Error: fmt.Errorf("HTTP %d", httpResp.StatusCode)}
            return
        }

        // 处理流式响应
        a.processStream(httpResp.Body, ch)
    }()

    return ch, nil
}

// Capabilities 返回支持的特性
func (a *OpenAIAdapter) Capabilities() llm.ProviderCapabilities {
    return llm.ProviderCapabilities{
        SupportsStreaming:   true,
        SupportsToolCalling: true,
        SupportsVision:      strings.Contains(a.model, "vision") || strings.HasPrefix(a.model, "gpt-4o"),
        MaxTokens:          128000,
        SupportsJSONMode:   true,
    }
}

// EstimateTokens 估算 token 数量
func (a *OpenAIAdapter) EstimateTokens(messages []llm.Message) int {
    // 简单估算：英文约 4 字符/token，中文约 2 字符/token
    totalChars := 0
    for _, msg := range messages {
        totalChars += len(msg.Content)
    }
    return (totalChars / 3) + 100 // 加上一些固定开销
}

// openAIChatRequest OpenAI 格式的请求
type openAIChatRequest struct {
    Model       string              `json:"model"`
    Messages    []openAIMessage     `json:"messages"`
    Tools       []openAITool        `json:"tools,omitempty"`
    MaxTokens   int                 `json:"max_tokens,omitempty"`
    Temperature float64             `json:"temperature,omitempty"`
    TopP        float64             `json:"top_p,omitempty"`
    Stop        []string            `json:"stop,omitempty"`
    Stream      bool                `json:"stream,omitempty"`
    ResponseFormat *map[string]string `json:"response_format,omitempty"` // {"type": "json_object"}
}

// openAIMessage OpenAI 格式的消息
type openAIMessage struct {
    Role       string               `json:"role"`
    Content    string               `json:"content,omitempty"`
    ToolCalls  []openAIToolCall     `json:"tool_calls,omitempty"`
    ToolCallID string               `json:"tool_call_id,omitempty"`
}

// openAIToolCall OpenAI 格式的工具调用
type openAIToolCall struct {
    ID       string                `json:"id"`
    Type     string                `json:"type"` // "function"
    Function openAIFunctionCall    `json:"function"`
}

// openAIFunctionCall OpenAI 格式的函数调用
type openAIFunctionCall struct {
    Name      string `json:"name"`
    Arguments string `json:"arguments"`
}

// openAITool OpenAI 格式的工具定义
type openAITool struct {
    Type     string                `json:"type"` // "function"
    Function openAIFunctionDefinition `json:"function"`
}

// openAIFunctionDefinition OpenAI 格式的函数定义
type openAIFunctionDefinition struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Parameters  map[string]interface{} `json:"parameters"`
}
```

### 2.4 Anthropic 适配器实现

```go
// internal/client/llm/anthropic/adapter.go

package anthropic

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"

    "github.com/yourproject/internal/client/llm"
)

// AnthropicAdapter Anthropic Claude API 适配器
type AnthropicAdapter struct {
    apiKey     string
    baseURL    string
    model      string
    httpClient *http.Client
    retryCfg   llm.RetryConfig
}

// NewAnthropicAdapter 创建 Anthropic 适配器
func NewAnthropicAdapter(apiKey, baseURL, model string, retryCfg llm.RetryConfig) *AnthropicAdapter {
    if baseURL == "" {
        baseURL = "https://api.anthropic.com"
    }
    return &AnthropicAdapter{
        apiKey:     apiKey,
        baseURL:    baseURL,
        model:      model,
        httpClient: &http.Client{Timeout: 120 * time.Second},
        retryCfg:   retryCfg,
    }
}

// SendMessage 实现 Provider 接口
func (a *AnthropicAdapter) SendMessage(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
    // 类似 OpenAI 实现，但使用 Anthropic 的 API 格式
    // ...
}

// StreamMessage 实现流式请求
func (a *AnthropicAdapter) StreamMessage(ctx context.Context, req *llm.ChatRequest) (<-chan llm.StreamChunk, error) {
    // Anthropic 使用 Server-Sent Events (SSE) 格式
    // ...
}

// Capabilities 返回支持的特性
func (a *AnthropicAdapter) Capabilities() llm.ProviderCapabilities {
    return llm.ProviderCapabilities{
        SupportsStreaming:   true,
        SupportsToolCalling: true,
        SupportsVision:      strings.Contains(a.model, "vision"),
        MaxTokens:          200000,
        SupportsJSONMode:   false, // Anthropic 使用 system prompt 控制
    }
}

// anthropicMessageRequest Anthropic 格式的请求
type anthropicMessageRequest struct {
    Model        string                       `json:"model"`
    Messages     []anthropicMessage           `json:"messages"`
    System       string                       `json:"system,omitempty"`
    Tools        []anthropicTool              `json:"tools,omitempty"`
    MaxTokens    int                          `json:"max_tokens"`
    Temperature  float64                      `json:"temperature,omitempty"`
    TopP         float64                      `json:"top_p,omitempty"`
    StopSequences []string                    `json:"stop_sequences,omitempty"`
    Stream       bool                         `json:"stream,omitempty"`
}

// anthropicMessage Anthropic 格式的消息
type anthropicMessage struct {
    Role    string                 `json:"role"` // "user", "assistant"
    Content []anthropicContentBlock `json:"content"`
}

// anthropicContentBlock Anthropic 内容块
type anthropicContentBlock struct {
    Type     string                   `json:"type"` // "text", "image", "tool_use", "tool_result"
    Text     string                   `json:"text,omitempty"`
    Source   *anthropicImageSource    `json:"source,omitempty"`
    ID       string                   `json:"id,omitempty"`
    Name     string                   `json:"name,omitempty"`
    Input    map[string]interface{}   `json:"input,omitempty"`
    Content  string                   `json:"content,omitempty"` // tool result
    IsError  bool                     `json:"is_error,omitempty"`
}
```

### 2.5 错误处理

```go
// internal/client/llm/errors.go

package llm

import (
    "errors"
    "fmt"
)

// ErrorCode 错误码类型
type ErrorCode string

const (
    ErrCodeConnection    ErrorCode = "CONNECTION_ERROR"
    ErrCodeTimeout       ErrorCode = "TIMEOUT"
    ErrCodeRateLimit     ErrorCode = "RATE_LIMIT"
    ErrCodeInvalidAuth   ErrorCode = "INVALID_AUTH"
    ErrCodeInvalidRequest ErrorCode = "INVALID_REQUEST"
    ErrCodeContextOverflow ErrorCode = "CONTEXT_OVERFLOW"
    ErrCodeServerError   ErrorCode = "SERVER_ERROR"
    ErrCodeUnknown       ErrorCode = "UNKNOWN_ERROR"
)

// LLMError LLM 相关错误
type LLMError struct {
    Code       ErrorCode
    Message    string
    StatusCode int // HTTP 状态码
    Retryable  bool
    Cause      error
}

func (e *LLMError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
    }
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *LLMError) Unwrap() error {
    return e.Cause
}

// IsRetryable 检查错误是否可重试
func IsRetryable(err error) bool {
    var llmErr *LLMError
    if errors.As(err, &llmErr) {
        return llmErr.Retryable
    }
    return false
}

// NewConnectionError 创建连接错误
func NewConnectionError(cause error) *LLMError {
    return &LLMError{
        Code:      ErrCodeConnection,
        Message:   "Failed to connect to LLM API",
        Retryable: true,
        Cause:     cause,
    }
}

// NewRateLimitError 创建限流错误
func NewRateLimitError(retryAfter string) *LLMError {
    return &LLMError{
        Code:      ErrCodeRateLimit,
        Message:   fmt.Sprintf("Rate limited. Retry after: %s", retryAfter),
        Retryable: true,
    }
}
```

---

## 3. ContextBuilder 组件

### 3.1 组件职责

- 构建系统 Prompt（DM 角色说明）
- 根据游戏状态组装上下文消息
- 管理不同场景的 Prompt 模板
- 处理战斗、探索、对话等不同模式的上下文

### 3.2 接口定义

```go
// internal/client/context/builder.go

package context

import (
    "context"
    "fmt"
    "strings"

    "github.com/yourproject/internal/client/llm"
    "github.com/yourproject/internal/shared/state"
    "github.com/yourproject/internal/server/scenario"
)

// ContextBuilder 上下文构建器
type ContextBuilder struct {
    templates    *TemplateManager
    gameState    *state.Manager
    maxTokens    int
    debugMode    bool
}

// NewContextBuilder 创建上下文构建器
func NewContextBuilder(templates *TemplateManager, gameState *state.Manager, maxTokens int) *ContextBuilder {
    return &ContextBuilder{
        templates: templates,
        gameState: gameState,
        maxTokens: maxTokens,
    }
}

// BuildSystemPrompt 构建系统 Prompt
func (cb *ContextBuilder) BuildSystemPrompt(ctx context.Context, sessionID string, gameMode string) (string, error) {
    // 获取基础系统 Prompt
    basePrompt, err := cb.templates.Get("system_prompt")
    if err != nil {
        return "", fmt.Errorf("get system prompt template: %w", err)
    }

    // 获取 DM 指令
    dmInstructions, err := cb.templates.Get("dm_instructions")
    if err != nil {
        return "", fmt.Errorf("get dm instructions: %w", err)
    }

    // 获取规则摘要
    rulesSummary, err := cb.templates.Get("rules_summary")
    if err != nil {
        return "", fmt.Errorf("get rules summary: %w", err)
    }

    // 组装系统 Prompt
    systemPrompt := strings.Join([]string{
        basePrompt,
        dmInstructions,
        rulesSummary,
    }, "\n\n")

    // 根据游戏模式添加额外上下文
    switch gameMode {
    case "combat":
        combatContext, err := cb.templates.Get("combat_context")
        if err == nil {
            systemPrompt += "\n\n" + combatContext
        }
    case "exploration":
        explorationContext, err := cb.templates.Get("exploration_context")
        if err == nil {
            systemPrompt += "\n\n" + explorationContext
        }
    }

    return systemPrompt, nil
}

// BuildContextMessages 构建完整的上下文消息列表
func (cb *ContextBuilder) BuildContextMessages(ctx context.Context, req *BuildContextRequest) ([]llm.Message, error) {
    messages := []llm.Message{}

    // 1. 添加系统 Prompt
    systemPrompt, err := cb.BuildSystemPrompt(ctx, req.SessionID, req.GameMode)
    if err != nil {
        return nil, err
    }

    messages = append(messages, llm.Message{
        Role:    "system",
        Content: systemPrompt,
    })

    // 2. 添加场景上下文（如果是新会话或场景变更）
    if req.IncludeScenarioContext {
        scenarioMsg, err := cb.buildScenarioContext(ctx, req.Scenario)
        if err != nil {
            return nil, err
        }
        if scenarioMsg != "" {
            messages = append(messages, llm.Message{
                Role:    "system",
                Content: scenarioMsg,
            })
        }
    }

    // 3. 添加当前游戏状态摘要
    if req.IncludeStateSummary {
        stateSummary, err := cb.buildStateSummary(ctx, req.SessionID)
        if err != nil {
            return nil, err
        }
        if stateSummary != "" {
            messages = append(messages, llm.Message{
                Role:    "system",
                Content: stateSummary,
            })
        }
    }

    // 4. 添加对话历史
    messages = append(messages, req.ConversationHistory...)

    return messages, nil
}

// BuildContextRequest 构建上下文请求
type BuildContextRequest struct {
    SessionID            string
    GameMode             string // "exploration", "combat", "dialogue"
    Scenario             *scenario.Scenario
    IncludeScenarioContext bool
    IncludeStateSummary    bool
    ConversationHistory    []llm.Message
    MaxContextTokens       int
}

// buildScenarioContext 构建场景上下文
func (cb *ContextBuilder) buildScenarioContext(ctx context.Context, sc *scenario.Scenario) (string, error) {
    if sc == nil {
        return "", nil
    }

    data := map[string]interface{}{
        "Name":        sc.Name,
        "Description": sc.Description,
        "LevelRange":  fmt.Sprintf("%d-%d", sc.MinLevel, sc.MaxLevel),
        "Introduction": sc.Introduction,
    }

    return cb.templates.Render("scenario_context", data)
}

// buildStateSummary 构建状态摘要
func (cb *ContextBuilder) buildStateSummary(ctx context.Context, sessionID string) (string, error) {
    gameState, err := cb.gameState.Get(sessionID)
    if err != nil {
        return "", err
    }

    // 构建队伍信息
    partyInfo := cb.buildPartyInfo(gameState.Party)

    // 构建位置信息
    locationInfo := cb.buildLocationInfo(gameState.CurrentLocation)

    // 构建战斗信息（如果在战斗中）
    combatInfo := ""
    if gameState.Combat != nil && gameState.Combat.Active {
        combatInfo = cb.buildCombatInfo(gameState.Combat)
    }

    return cb.templates.Render("state_summary", map[string]interface{}{
        "Party":    partyInfo,
        "Location": locationInfo,
        "Combat":   combatInfo,
    })
}

// buildPartyInfo 构建队伍信息
func (cb *ContextBuilder) buildPartyInfo(party []state.PartyMember) string {
    var sb strings.Builder
    sb.WriteString("## 当前队伍\n\n")

    for _, member := range party {
        sb.WriteString(fmt.Sprintf("- **%s** (Lv.%d %s %s)\n",
            member.Name,
            member.Level,
            member.Race,
            member.Class,
        ))
        sb.WriteString(fmt.Sprintf("  HP: %d/%d | AC: %d\n",
            member.CurrentHP,
            member.MaxHP,
            member.AC,
        ))
    }

    return sb.String()
}

// buildLocationInfo 构建位置信息
func (cb *ContextBuilder) buildLocationInfo(loc *state.Location) string {
    if loc == nil {
        return "当前位置：未知"
    }
    return fmt.Sprintf("当前位置：%s", loc.Name)
}

// buildCombatInfo 构建战斗信息
func (cb *ContextBuilder) buildCombatInfo(combat *state.CombatState) string {
    var sb strings.Builder
    sb.WriteString("## 战斗状态\n\n")
    sb.WriteString(fmt.Sprintf("回合 %d，轮到：%s\n\n",
        combat.Round,
        combat.CurrentTurn,
    ))

    sb.WriteString("### 先攻顺序\n")
    for _, entry := range combat.Initiative {
        status := ""
        if entry.CurrentHP <= 0 {
            status = " (已倒下)"
        }
        sb.WriteString(fmt.Sprintf("%d. %s (先攻 %d)%s\n",
            entry.Initiative,
            entry.Name,
            entry.Initiative,
            status,
        ))
    }

    return sb.String()
}
```

### 3.3 TemplateManager 组件

```go
// internal/client/context/templates.go

package context

import (
    "embed"
    "fmt"
    "os"
    "path/filepath"
    "sync"
    "text/template"
)

//go:embed templates/*
var embeddedTemplates embed.FS

// TemplateManager Prompt 模板管理器
type TemplateManager struct {
    templates map[string]*template.Template
    textData  map[string]string // 原始文本数据
    mu        sync.RWMutex
    funcMap   template.FuncMap
}

// NewTemplateManager 创建模板管理器
func NewTemplateManager(templateDir string) (*TemplateManager, error) {
    tm := &TemplateManager{
        templates: make(map[string]*template.Template),
        textData:  make(map[string]string),
        funcMap:   defaultFuncMap(),
    }

    // 首先尝试从嵌入的 FS 加载
    if err := tm.loadEmbeddedTemplates(); err != nil {
        return nil, fmt.Errorf("load embedded templates: %w", err)
    }

    // 如果有外部模板目录，覆盖加载
    if templateDir != "" {
        if err := tm.loadExternalTemplates(templateDir); err != nil {
            return nil, fmt.Errorf("load external templates: %w", err)
        }
    }

    return tm, nil
}

// defaultFuncMap 默认模板函数
func defaultFuncMap() template.FuncMap {
    return template.FuncMap{
        "add": func(a, b int) int { return a + b },
        "sub": func(a, b int) int { return a - b },
        "mul": func(a, b int) int { return a * b },
        "div": func(a, b int) int { return a / b },
        "join": strings.Join,
        "title": strings.Title,
        "lower": strings.ToLower,
        "upper": strings.ToUpper,
    }
}

// loadEmbeddedTemplates 加载嵌入的模板
func (tm *TemplateManager) loadEmbeddedTemplates() error {
    entries, err := embeddedTemplates.ReadDir("templates")
    if err != nil {
        return err
    }

    for _, entry := range entries {
        if entry.IsDir() {
            continue
        }

        name := entry.Name()
        // 移除 .tmpl 扩展名
        if strings.HasSuffix(name, ".tmpl") {
            name = strings.TrimSuffix(name, ".tmpl")
        }

        data, err := embeddedTemplates.ReadFile("templates/" + entry.Name())
        if err != nil {
            return err
        }

        if err := tm.parseTemplate(name, string(data)); err != nil {
            return err
        }
    }

    return nil
}

// loadExternalTemplates 加载外部模板
func (tm *TemplateManager) loadExternalTemplates(dir string) error {
    entries, err := os.ReadDir(dir)
    if err != nil {
        if os.IsNotExist(err) {
            return nil // 目录不存在不是错误
        }
        return err
    }

    for _, entry := range entries {
        if entry.IsDir() {
            continue
        }

        path := filepath.Join(dir, entry.Name())
        data, err := os.ReadFile(path)
        if err != nil {
            return err
        }

        name := entry.Name()
        if strings.HasSuffix(name, ".tmpl") {
            name = strings.TrimSuffix(name, ".tmpl")
        }

        if err := tm.parseTemplate(name, string(data)); err != nil {
            return err
        }
    }

    return nil
}

// parseTemplate 解析模板
func (tm *TemplateManager) parseTemplate(name, content string) error {
    tm.mu.Lock()
    defer tm.mu.Unlock()

    tmpl, err := template.New(name).Funcs(tm.funcMap).Parse(content)
    if err != nil {
        return fmt.Errorf("parse template %s: %w", name, err)
    }

    tm.templates[name] = tmpl
    tm.textData[name] = content
    return nil
}

// Get 获取模板文本
func (tm *TemplateManager) Get(name string) (string, error) {
    tm.mu.RLock()
    defer tm.mu.RUnlock()

    text, ok := tm.textData[name]
    if !ok {
        return "", fmt.Errorf("template not found: %s", name)
    }

    return text, nil
}

// Render 渲染模板
func (tm *TemplateManager) Render(name string, data interface{}) (string, error) {
    tm.mu.RLock()
    tmpl, ok := tm.templates[name]
    tm.mu.RUnlock()

    if !ok {
        return "", fmt.Errorf("template not found: %s", name)
    }

    var buf strings.Builder
    if err := tmpl.Execute(&buf, data); err != nil {
        return "", fmt.Errorf("execute template %s: %w", name, err)
    }

    return buf.String(), nil
}
```

---

## 4. LLMSessionManager 组件

### 4.1 组件职责

- 管理会话生命周期（创建、恢复、销毁）
- 处理用户输入并协调各组件
- 管理会话状态和上下文模式
- 处理 LLM 流式响应并推送到前端

### 4.2 接口定义

```go
// internal/client/session/manager.go

package session

import (
    "context"
    "fmt"
    "sync"
    "time"

    "github.com/yourproject/internal/client/context"
    "github.com/yourproject/internal/client/llm"
    "github.com/yourproject/internal/client/tools"
    "github.com/yourproject/internal/server/scenario"
    "github.com/yourproject/internal/shared/state"
    "github.com/yourproject/internal/api/websocket"
)

// LLMSessionManager 会话管理器
type LLMSessionManager struct {
    provider        llm.Provider
    contextBuilder  *context.ContextBuilder
    toolRegistry    *tools.ToolRegistry
    stateManager    *state.Manager
    hub             *websocket.Hub

    sessions        map[string]*LLMSession
    mu              sync.RWMutex

    config          Config
}

// Config 配置
type Config struct {
    MaxHistoryMessages   int
    CompressionThreshold int
    IdleTimeout         time.Duration
}

// NewLLMSessionManager 创建会话管理器
func NewLLMSessionManager(
    provider llm.Provider,
    contextBuilder *context.ContextBuilder,
    toolRegistry *tools.ToolRegistry,
    stateManager *state.Manager,
    hub *websocket.Hub,
    cfg Config,
) *LLMSessionManager {
    return &LLMSessionManager{
        provider:       provider,
        contextBuilder: contextBuilder,
        toolRegistry:   toolRegistry,
        stateManager:   stateManager,
        hub:            hub,
        sessions:       make(map[string]*LLMSession),
        config:         cfg,
    }
}

// LLMSession 会话
type LLMSession struct {
    ID             string
    Scenario       *scenario.Scenario
    Conversation   *Conversation
    State          LLMSessionState
    CreatedAt      time.Time
    UpdatedAt      time.Time
    LastActivityAt time.Time
    mu             sync.RWMutex
}

// LLMSessionState 会话状态
type LLMSessionState struct {
    ContextMode       ContextMode // "exploration", "combat", "dialogue"
    TotalInputTokens  int
    TotalOutputTokens int
    CurrentToolCalls  []llm.ToolCall
}

// ContextMode 上下文模式
type ContextMode string

const (
    ContextModeExploration ContextMode = "exploration"
    ContextModeCombat      ContextMode = "combat"
    ContextModeDialogue    ContextMode = "dialogue"
)

// CreateSession 创建新会话
func (sm *LLMSessionManager) CreateSession(ctx context.Context, req *CreateSessionRequest) (*LLMSession, error) {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    if _, exists := sm.sessions[req.SessionID]; exists {
        return nil, fmt.Errorf("session already exists: %s", req.SessionID)
    }

    // 获取剧本
    scn, err := sm.loadScenario(ctx, req.ScenarioID)
    if err != nil {
        return nil, fmt.Errorf("load scenario: %w", err)
    }

    // 创建会话
    session := &LLMSession{
        ID: req.SessionID,
        Scenario: scn,
        Conversation: NewConversation(sm.config.MaxHistoryMessages),
        State: LLMSessionState{
            ContextMode: ContextModeExploration,
        },
        CreatedAt:      time.Now(),
        UpdatedAt:      time.Now(),
        LastActivityAt: time.Now(),
    }

    sm.sessions[req.SessionID] = session

    return session, nil
}

// CreateSessionRequest 创建会话请求
type CreateSessionRequest struct {
    SessionID  string
    ScenarioID string
    Party      []state.PartyMember
}

// RestoreSession 恢复会话
func (sm *LLMSessionManager) RestoreSession(ctx context.Context, sessionID string, history []llm.Message) error {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    session, exists := sm.sessions[sessionID]
    if !exists {
        return fmt.Errorf("session not found: %s", sessionID)
    }

    // 恢复对话历史
    for _, msg := range history {
        session.Conversation.AddMessage(msg)
    }

    return nil
}

// ProcessInput 处理用户输入
func (sm *LLMSessionManager) ProcessInput(ctx context.Context, sessionID, userInput string) error {
    // 1. 获取会话
    session, err := sm.GetSession(sessionID)
    if err != nil {
        return err
    }

    session.mu.Lock()
    session.LastActivityAt = time.Now()
    session.UpdatedAt = time.Now()
    session.mu.Unlock()

    // 2. 添加用户消息到历史
    session.Conversation.AddMessage(llm.Message{
        Role:    "user",
        Content: userInput,
    })

    // 3. 构建上下文
    gameMode := sm.detectGameMode(ctx, sessionID)

    messages, err := sm.contextBuilder.BuildContextMessages(ctx, &context.BuildContextRequest{
        SessionID:            sessionID,
        GameMode:             gameMode,
        Scenario:             session.Scenario,
        IncludeScenarioContext: false, // 已在系统 Prompt 中
        IncludeStateSummary:    true,
        ConversationHistory:    session.Conversation.GetMessages(),
        MaxContextTokens:       120000,
    })
    if err != nil {
        return fmt.Errorf("build context: %w", err)
    }

    // 4. 调用 LLM（流式）
    streamCh, err := sm.provider.StreamMessage(ctx, &llm.ChatRequest{
        Messages:    messages,
        Tools:       sm.toolRegistry.GetDefinitions(),
        MaxTokens:   4096,
        Temperature: 0.7,
    })
    if err != nil {
        return fmt.Errorf("stream message: %w", err)
    }

    // 5. 处理流式响应
    go sm.processStreamResponse(ctx, sessionID, streamCh)

    return nil
}

// processStreamResponse 处理流式响应
func (sm *LLMSessionManager) processStreamResponse(ctx context.Context, sessionID string, streamCh <-chan llm.StreamChunk) {
    var assistantContent strings.Builder
    var toolCalls []llm.ToolCall

    for chunk := range streamCh {
        if chunk.Error != nil {
            // 发送错误消息
            sm.hub.Broadcast(sessionID, &websocket.ServerMessage{
                Type: websocket.ServerMessageError,
                Payload: map[string]interface{}{
                    "code":    "LLM_ERROR",
                    "message": chunk.Error.Error(),
                },
            })
            return
        }

        switch chunk.Type {
        case "content":
            assistantContent.WriteString(chunk.Content)

            // 推送流式文本
            sm.hub.Broadcast(sessionID, &websocket.ServerMessage{
                Type: websocket.ServerMessageNarration,
                Payload: websocket.NarrationPayload{
                    Text:        assistantContent.String(),
                    IsStreaming: true,
                    IsDone:      false,
                },
            })

        case "tool_call":
            toolCalls = append(toolCalls, *chunk.ToolCall)

        case "done":
            // 保存助手消息
            session, _ := sm.GetSession(sessionID)
            if session != nil {
                session.Conversation.AddMessage(llm.Message{
                    Role:      "assistant",
                    Content:   assistantContent.String(),
                    ToolCalls: toolCalls,
                })

                // 更新 token 统计
                if chunk.Usage != nil {
                    session.mu.Lock()
                    session.State.TotalInputTokens += chunk.Usage.InputTokens
                    session.State.TotalOutputTokens += chunk.Usage.OutputTokens
                    session.mu.Unlock()
                }
            }

            // 发送完成消息
            sm.hub.Broadcast(sessionID, &websocket.ServerMessage{
                Type: websocket.ServerMessageNarration,
                Payload: websocket.NarrationPayload{
                    Text:        assistantContent.String(),
                    IsStreaming: false,
                    IsDone:      true,
                },
            })

            // 处理工具调用
            if len(toolCalls) > 0 {
                sm.processToolCalls(ctx, sessionID, toolCalls)
            }

        default:
            // 未知类型，忽略
        }
    }
}

// processToolCalls 处理工具调用
func (sm *LLMSessionManager) processToolCalls(ctx context.Context, sessionID string, toolCalls []llm.ToolCall) {
    results := make([]tools.ToolResult, len(toolCalls))

    for i, tc := range toolCalls {
        result, err := sm.toolRegistry.Execute(ctx, sessionID, tc.Name, tc.Arguments)
        if err != nil {
            result = tools.ToolResult{
                Success: false,
                Error:   err.Error(),
            }
        }
        results[i] = result

        // 添加工具消息到对话历史
        session, _ := sm.GetSession(sessionID)
        if session != nil {
            session.Conversation.AddMessage(llm.Message{
                Role:       "tool",
                Content:    result.Content,
                ToolCallID: tc.ID,
            })
        }
    }

    // 继续调用 LLM 获取最终响应
    sm.continueAfterToolCalls(ctx, sessionID, toolCalls, results)
}

// continueAfterToolCalls 工具调用后继续对话
func (sm *LLMSessionManager) continueAfterToolCalls(ctx context.Context, sessionID string, toolCalls []llm.ToolCall, results []tools.ToolResult) {
    session, err := sm.GetSession(sessionID)
    if err != nil {
        return
    }

    // 构建后续消息
    messages := session.Conversation.GetMessages()

    streamCh, err := sm.provider.StreamMessage(ctx, &llm.ChatRequest{
        Messages:    messages,
        Tools:       sm.toolRegistry.GetDefinitions(),
        MaxTokens:   4096,
        Temperature: 0.7,
    })
    if err != nil {
        sm.hub.Broadcast(sessionID, &websocket.ServerMessage{
            Type: websocket.ServerMessageError,
            Payload: map[string]interface{}{
                "code":    "LLM_ERROR",
                "message": err.Error(),
            },
        })
        return
    }

    go sm.processStreamResponse(ctx, sessionID, streamCh)
}

// GetSession 获取会话
func (sm *LLMSessionManager) GetSession(sessionID string) (*LLMSession, error) {
    sm.mu.RLock()
    defer sm.mu.RUnlock()

    session, exists := sm.sessions[sessionID]
    if !exists {
        return nil, fmt.Errorf("session not found: %s", sessionID)
    }

    return session, nil
}

// DestroySession 销毁会话
func (sm *LLMSessionManager) DestroySession(sessionID string) {
    sm.mu.Lock()
    defer sm.mu.Unlock()

    delete(sm.sessions, sessionID)
}

// detectGameMode 检测当前游戏模式
func (sm *LLMSessionManager) detectGameMode(ctx context.Context, sessionID string) ContextMode {
    gameState, err := sm.stateManager.Get(sessionID)
    if err != nil {
        return ContextModeExploration
    }

    if gameState.Combat != nil && gameState.Combat.Active {
        return ContextModeCombat
    }

    return ContextModeExploration
}

// loadScenario 加载剧本
func (sm *LLMSessionManager) loadScenario(ctx context.Context, scenarioID string) (*scenario.Scenario, error) {
    // 从持久化层加载剧本
    // ...
}
```

### 4.3 ConversationManager 组件

```go
// internal/client/session/conversation.go

package session

import (
    "encoding/json"
    "strings"
    "sync"

    "github.com/yourproject/internal/client/llm"
)

// Conversation 对话历史管理
type Conversation struct {
    messages   []llm.Message
    maxMessages int
    compressor *Compressor
    mu         sync.RWMutex
}

// NewConversation 创建对话历史
func NewConversation(maxMessages int, compressor *Compressor) *Conversation {
    return &Conversation{
        messages:    make([]llm.Message, 0, maxMessages),
        maxMessages: maxMessages,
        compressor:  compressor,
    }
}

// AddMessage 添加消息
func (c *Conversation) AddMessage(msg llm.Message) {
    c.mu.Lock()
    defer c.mu.Unlock()

    c.messages = append(c.messages, msg)

    // 检查是否需要压缩
    if len(c.messages) >= c.maxMessages {
        c.compress()
    }
}

// GetMessages 获取消息历史
func (c *Conversation) GetMessages() []llm.Message {
    c.mu.RLock()
    defer c.mu.RUnlock()

    result := make([]llm.Message, len(c.messages))
    copy(result, c.messages)
    return result
}

// compress 压缩对话历史
func (c *Conversation) compress() {
    if c.compressor == nil {
        // 简单截断
        cutoff := len(c.messages) / 2
        c.messages = c.messages[cutoff:]
        return
    }

    // 使用压缩器
    compressed, err := c.compressor.Compress(c.messages)
    if err != nil {
        // 压缩失败，简单截断
        cutoff := len(c.messages) / 2
        c.messages = c.messages[cutoff:]
        return
    }

    c.messages = compressed
}

// MarshalJSON 序列化为 JSON
func (c *Conversation) MarshalJSON() ([]byte, error) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    return json.Marshal(c.messages)
}

// UnmarshalJSON 从 JSON 反序列化
func (c *Conversation) UnmarshalJSON(data []byte) error {
    c.mu.Lock()
    defer c.mu.Unlock()

    return json.Unmarshal(data, &c.messages)
}

// Compressor 历史压缩器
type Compressor struct {
    provider llm.Provider
}

// NewCompressor 创建压缩器
func NewCompressor(provider llm.Provider) *Compressor {
    return &Compressor{provider: provider}
}

// Compress 压缩对话历史
func (c *Compressor) Compress(messages []llm.Message) ([]llm.Message, error) {
    // 保留系统消息
    var result []llm.Message
    for _, msg := range messages {
        if msg.Role == "system" {
            result = append(result, msg)
        }
    }

    // 提取用户和助手消息进行总结
    var toSummarize []llm.Message
    for _, msg := range messages {
        if msg.Role == "user" || msg.Role == "assistant" {
            toSummarize = append(toSummarize, msg)
        }
    }

    if len(toSummarize) == 0 {
        return result, nil
    }

    // 调用 LLM 总结
    summary, err := c.Summarize(nil, toSummarize)
    if err != nil {
        return nil, err
    }

    // 添加总结消息
    result = append(result, llm.Message{
        Role:    "system",
        Content: "以下是之前的对话总结：\n" + summary,
    })

    return result, nil
}

// Summarize 总结历史
func (c *Compressor) Summarize(ctx context.Context, messages []llm.Message) (string, error) {
    // 构建总结请求
    var content strings.Builder
    content.WriteString("请简要总结以下对话，保留关键信息：\n\n")
    for _, msg := range messages {
        content.WriteString(fmt.Sprintf("[%s]: %s\n", msg.Role, msg.Content))
    }

    resp, err := c.provider.SendMessage(ctx, &llm.ChatRequest{
        Messages: []llm.Message{
            {Role: "system", Content: "你是一个对话总结助手。"},
            {Role: "user", Content: content.String()},
        },
        MaxTokens: 500,
    })
    if err != nil {
        return "", err
    }

    return resp.Message.Content, nil
}
```

---

## 5. ToolRegistry 组件

### 5.1 组件职责

- 管理工具定义和处理器
- 提供工具列表供 LLM 调用
- 分发工具调用到对应的处理器
- 管理工具执行权限和验证

### 5.2 接口定义

```go
// internal/client/tools/registry.go

package tools

import (
    "context"
    "fmt"
    "sync"

    "github.com/yourproject/internal/client/llm"
)

// ToolHandler 工具处理器函数
type ToolHandler func(ctx context.Context, sessionID string, args map[string]interface{}) (*ToolResult, error)

// ToolRegistry 工具注册表
type ToolRegistry struct {
    tools  map[string]ToolHandler
    defs   []llm.ToolDefinition
    mu     sync.RWMutex
}

// NewToolRegistry 创建工具注册表
func NewToolRegistry() *ToolRegistry {
    return &ToolRegistry{
        tools: make(map[string]ToolHandler),
        defs:  make([]llm.ToolDefinition, 0),
    }
}

// Register 注册工具
func (r *ToolRegistry) Register(def llm.ToolDefinition, handler ToolHandler) {
    r.mu.Lock()
    defer r.mu.Unlock()

    r.tools[def.Name] = handler
    r.defs = append(r.defs, def)
}

// GetDefinitions 获取工具定义列表
func (r *ToolRegistry) GetDefinitions() []llm.ToolDefinition {
    r.mu.RLock()
    defer r.mu.RUnlock()

    result := make([]llm.ToolDefinition, len(r.defs))
    copy(result, r.defs)
    return result
}

// Execute 执行工具
func (r *ToolRegistry) Execute(ctx context.Context, sessionID, name string, args map[string]interface{}) (*ToolResult, error) {
    r.mu.RLock()
    handler, exists := r.tools[name]
    r.mu.RUnlock()

    if !exists {
        return nil, fmt.Errorf("tool not found: %s", name)
    }

    // 验证参数
    if err := r.validateArguments(name, args); err != nil {
        return nil, fmt.Errorf("invalid arguments: %w", err)
    }

    // 执行处理器
    return handler(ctx, sessionID, args)
}

// validateArguments 验证参数
func (r *ToolRegistry) validateArguments(toolName string, args map[string]interface{}) error {
    // 根据 JSON Schema 验证参数
    // 可以使用 github.com/xeipuuv/gojsonschema
    return nil
}

// ToolResult 工具执行结果
type ToolResult struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Content string      `json:"content,omitempty"` // 文本内容（用于 LLM）
    Error   string      `json:"error,omitempty"`
}

// NewSuccessResult 创建成功结果
func NewSuccessResult(data interface{}) *ToolResult {
    return &ToolResult{
        Success: true,
        Data:    data,
    }
}

// NewSuccessTextResult 创建文本成功结果
func NewSuccessTextResult(content string) *ToolResult {
    return &ToolResult{
        Success: true,
        Content: content,
    }
}

// NewErrorResult 创建错误结果
func NewErrorResult(err error) *ToolResult {
    return &ToolResult{
        Success: false,
        Error:   err.Error(),
    }
}
```

### 5.3 工具定义示例

```go
// internal/client/tools/definitions.go

package tools

import (
    "github.com/yourproject/internal/client/llm"
)

// 核心工具定义

// RollDiceDefinition 掷骰子工具
var RollDiceDefinition = llm.ToolDefinition{
    Name: "roll_dice",
    Description: "掷骰子进行检定。支持标准 D&D 骰子表达式，如 '1d20+5' 或 '2d6+3'。" +
        "用于属性检定、攻击检定、伤害掷骰等场景。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "formula": map[string]interface{}{
                "type":        "string",
                "description": "骰子表达式，如 '1d20+5' 或 '2d6+3'",
            },
            "advantage": map[string]interface{}{
                "type":        "string",
                "enum":        []string{"normal", "advantage", "disadvantage"},
                "description": "优势/劣势状态，默认为 normal",
            },
            "description": map[string]interface{}{
                "type":        "string",
                "description": "检定描述，如 '攻击检定' 或 '察觉检定'",
            },
        },
        "required": []string{"formula"},
    },
}

// AttackDefinition 攻击工具
var AttackDefinition = llm.ToolDefinition{
    Name: "attack",
    Description: "执行攻击动作。包含攻击检定和伤害掷骰。自动计算属性加值和加成。",
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

// CastSpellDefinition 施法工具
var CastSpellDefinition = llm.ToolDefinition{
    Name: "cast_spell",
    Description: "施放法术。消耗法术位，执行法术效果。需要验证法术位、专注状态等。",
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
                "properties": map[string]interface{}{
                    "x": map[string]interface{}{"type": "integer"},
                    "y": map[string]interface{}{"type": "integer"},
                },
            },
            "level": map[string]interface{}{
                "type":        "integer",
                "description": "施展法术的环阶（可选，用于升环施法）",
            },
        },
        "required": []string{"casterId", "spellId"},
    },
}

// GetCharacterDefinition 获取角色信息工具
var GetCharacterDefinition = llm.ToolDefinition{
    Name: "get_character",
    Description: "获取角色详细信息。用于查看角色属性、状态、装备等。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "characterId": map[string]interface{}{
                "type":        "string",
                "description": "角色 ID",
            },
        },
        "required": []string{"characterId"},
    },
}

// MoveCharacterDefinition 移动角色工具
var MoveCharacterDefinition = llm.ToolDefinition{
    Name: "move_character",
    Description: "移动角色到指定位置。需要验证移动距离、地形消耗等。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "characterId": map[string]interface{}{
                "type":        "string",
                "description": "角色 ID",
            },
            "position": map[string]interface{}{
                "type":        "object",
                "description": "目标位置",
                "properties": map[string]interface{}{
                    "x": map[string]interface{}{"type": "integer"},
                    "y": map[string]interface{}{"type": "integer"},
                },
            },
        },
        "required": []string{"characterId", "position"},
    },
}

// StartCombatDefinition 开始战斗工具
var StartCombatDefinition = llm.ToolDefinition{
    Name: "start_combat",
    Description: "开始战斗模式。初始化先攻轮，切换到战斗上下文。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "participantIds": map[string]interface{}{
                "type":        "array",
                "items":       map[string]interface{}{"type": "string"},
                "description": "参与者 ID 列表",
            },
            "surprise": map[string]interface{}{
                "type":        "string",
                "enum":        []string{"none", "party", "enemies"},
                "description": "突袭方",
            },
        },
        "required": []string{"participantIds"},
    },
}

// EndTurnDefinition 结束回合工具
var EndTurnDefinition = llm.ToolDefinition{
    Name: "end_turn",
    Description: "结束当前角色的回合。切换到下一个单位。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "characterId": map[string]interface{}{
                "type":        "string",
                "description": "当前行动的角色 ID",
            },
        },
        "required": []string{"characterId"},
    },
}

// UseItemDefinition 使用物品工具
var UseItemDefinition = llm.ToolDefinition{
    Name: "use_item",
    Description: "使用物品。包括消耗品、装备使用等。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "characterId": map[string]interface{}{
                "type":        "string",
                "description": "角色 ID",
            },
            "itemId": map[string]interface{}{
                "type":        "string",
                "description": "物品 ID",
            },
            "targetId": map[string]interface{}{
                "type":        "string",
                "description": "目标 ID（可选，用于指向性物品）",
            },
        },
        "required": []string{"characterId", "itemId"},
    },
}

// SaveGameDefinition 存档工具
var SaveGameDefinition = llm.ToolDefinition{
    Name: "save_game",
    Description: "保存当前游戏进度。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "saveName": map[string]interface{}{
                "type":        "string",
                "description": "存档名称",
            },
        },
        "required": []string{"saveName"],
    },
}

// LoadMapDefinition 加载地图工具
var LoadMapDefinition = llm.ToolDefinition{
    Name: "load_map",
    Description: "加载指定地图。用于切换场景。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "mapId": map[string]interface{}{
                "type":        "string",
                "description": "地图 ID",
            },
        },
        "required": []string{"mapId"],
    },
}
```

### 5.4 工具处理器示例

```go
// internal/client/tools/handlers/dice.go

package handlers

import (
    "context"
    "fmt"

    "github.com/yourproject/internal/client/tools"
    "github.com/yourproject/internal/server/dice"
)

// RollDiceHandler 掷骰子处理器
func RollDiceHandler(roller *dice.Roller) tools.ToolHandler {
    return func(ctx context.Context, sessionID string, args map[string]interface{}) (*tools.ToolResult, error) {
        // 解析参数
        formula, ok := args["formula"].(string)
        if !ok {
            return nil, fmt.Errorf("missing formula")
        }

        advantage := "normal"
        if a, ok := args["advantage"].(string); ok {
            advantage = a
        }

        description := ""
        if d, ok := args["description"].(string); ok {
            description = d
        }

        // 执行掷骰
        result, err := roller.RollFormula(ctx, formula, advantage)
        if err != nil {
            return tools.NewErrorResult(err), nil
        }

        // 构建返回内容
        content := fmt.Sprintf("掷骰结果：%s\n", formula)
        if description != "" {
            content = fmt.Sprintf("%s：", description) + content
        }
        content += fmt.Sprintf("掷骰: %v\n", result.Rolls)
        content += fmt.Sprintf("修正: %+d\n", result.Modifier)
        content += fmt.Sprintf("总计: %d\n", result.Total)

        return tools.NewSuccessTextResult(content), nil
    }
}

// DiceRollResult 掷骰结果
type DiceRollResult struct {
    Formula  string `json:"formula"`
    Rolls    []int  `json:"rolls"`
    Modifier int    `json:"modifier"`
    Total    int    `json:"total"`
}
```

```go
// internal/client/tools/handlers/combat.go

package handlers

import (
    "context"
    "fmt"

    "github.com/yourproject/internal/client/tools"
    "github.com/yourproject/internal/server/combat"
)

// AttackHandler 攻击处理器
func AttackHandler(combatMgr *combat.Manager) tools.ToolHandler {
    return func(ctx context.Context, sessionID string, args map[string]interface{}) (*tools.ToolResult, error) {
        attackerId, ok := args["attackerId"].(string)
        if !ok {
            return nil, fmt.Errorf("missing attackerId")
        }

        targetId, ok := args["targetId"].(string)
        if !ok {
            return nil, fmt.Errorf("missing targetId")
        }

        weaponId := ""
        if w, ok := args["weaponId"].(string); ok {
            weaponId = w
        }

        // 执行攻击
        result, err := combatMgr.Attack(ctx, sessionID, attackerId, targetId, weaponId)
        if err != nil {
            return tools.NewErrorResult(err), nil
        }

        // 构建返回内容
        content := fmt.Sprintf("%s 攻击 %s！\n", result.AttackerName, result.TargetName)
        content += fmt.Sprintf("攻击检定: %d (AC %d)\n", result.AttackRoll, result.TargetAC)

        if result.Hit {
            content += fmt.Sprintf("命中！伤害: %d\n", result.Damage)
            if result.TargetRemainingHP <= 0 {
                content += fmt.Sprintf("%s 倒下了！\n", result.TargetName)
            }
        } else {
            content += "未命中。\n"
        }

        return tools.NewSuccessResult(map[string]interface{}{
            "content": content,
            "hit":     result.Hit,
            "damage":  result.Damage,
            "attackRoll": result.AttackRoll,
        }), nil
    }
}
```

---

## 6. 组件间通信方式

### 6.1 组件依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Client 模块组件依赖关系                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌───────────────────────┐                           │
│                         │   LLMSessionManager   │                           │
│                         │   (核心协调器)         │                           │
│                         └───────────┬───────────┘                           │
│                                     │                                       │
│         ┌───────────────────────────┼───────────────────────────┐           │
│         │                           │                           │           │
│         ▼                           ▼                           ▼           │
│  ┌────────────┐           ┌────────────┐            ┌────────────┐          │
│  │LLMAdapter  │           │Context     │            │Tool        │          │
│  │            │           │Builder     │            │Registry    │          │
│  └────────────┘           └──────┬─────┘            └──────┬─────┘          │
│         │                        │                         │                │
│         │                        │                         │                │
│         │                        ▼                         │                │
│         │              ┌────────────┐                      │                │
│         │              │Template    │                      │                │
│         │              │Manager     │                      │                │
│         │              └────────────┘                      │                │
│         │                                                 │                │
│         │─────────────────────────────────────────────────│                │
│                                     │                                      │
│                                     ▼                                      │
│                            ┌────────────┐                                   │
│                            │Tool        │                                   │
│                            │Executor    │                                   │
│                            └────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 通信协议

组件间通信主要采用以下方式：

1. **直接函数调用**：同一进程内的组件通过 Go 函数调用通信
2. **通道 (Channel)**：流式数据使用 Go channel 传递
3. **接口抽象**：通过定义的接口进行解耦

### 6.3 数据流

```
用户输入处理流程：

┌─────────────┐     userInput     ┌──────────────────┐
│   API Hub   │ ─────────────────▶│ LLMSessionManager│
└─────────────┘                   └────────┬─────────┘
                                           │
                                           │ 1. 获取会话状态
                                           ▼
                                    ┌─────────────────┐
                                    │ State Manager   │
                                    └────────┬────────┘
                                             │
                                             │ 2. 构建上下文
                                             ▼
                                    ┌─────────────────┐
                                    │ ContextBuilder  │
                                    │                 │
                                    │ ┌─────────────┐ │
                                    │ │ TemplateMgr │ │
                                    │ └─────────────┘ │
                                    └────────┬────────┘
                                             │
                                             │ 3. 调用 LLM
                                             ▼
                                    ┌─────────────────┐
                                    │  LLMAdapter     │
                                    │  (流式响应)      │
                                    └────────┬────────┘
                                             │
                                             │ 4. 推送流式内容
                                             ▼
                                    ┌─────────────────┐
                                    │   API Hub       │
                                    │   (WebSocket)   │
                                    └─────────────────┘
                                             │
                                             │ 5. 工具调用
                                             ▼
                                    ┌─────────────────┐
                                    │  ToolExecutor   │
                                    │                 │
                                    │ ┌─────────────┐ │
                                    │ │ ToolRegistry│ │
                                    │ └─────────────┘ │
                                    └────────┬────────┘
                                             │
                                             │ 6. 继续对话
                                             ▼
                                    ┌─────────────────┐
                                    │  LLMAdapter     │
                                    └─────────────────┘
```

---

## 7. 状态管理设计

### 7.1 会话状态

```go
// LLMSessionState 会话状态
type LLMSessionState struct {
    // 上下文模式
    ContextMode ContextMode

    // 累计 token 使用
    TotalInputTokens  int
    TotalOutputTokens int

    // 当前工具调用
    CurrentToolCalls []llm.ToolCall

    // 最后活动时间
    LastActivityAt time.Time

    // 会话阶段
    Phase LLMSessionPhase
}

// LLMSessionPhase 会话阶段
type LLMSessionPhase string

const (
    PhaseIdle       LLMSessionPhase = "idle"
    PhaseProcessing LLMSessionPhase = "processing"
    PhaseStreaming  LLMSessionPhase = "streaming"
    PhaseToolCall  LLMSessionPhase = "tool_call"
)
```

### 7.2 状态转换

```
会话状态转换：

     ┌─────────┐
     │  Idle   │◀─────────────────┐
     └────┬────┘                  │
          │                       │
          │ 用户输入              │ 处理完成
          ▼                       │
    ┌────────────┐                │
    │Processing  │                │
    └────┬───────┘                │
         │                        │
         │ LLM 响应               │
         ▼                        │
    ┌────────────┐                │
    │ Streaming  │                │
    └────┬───────┘                │
         │                        │
         │ 需要工具调用            │
         ▼                        │
    ┌────────────┐                │
    │ Tool Call  │                │
    └────┬───────┘                │
         │                        │
         │ 工具执行完成            │
         └────────────────────────┘
```

---

## 8. 错误处理设计

### 8.1 错误分类

```go
// ClientError Client 模块错误
type ClientError struct {
    Code    ErrorCode
    Message string
    Cause   error
    Context map[string]interface{}
}

type ErrorCode string

const (
    // LLM 相关错误
    ErrLLMConnection    ErrorCode = "LLM_CONNECTION_ERROR"
    ErrLLMRateLimit     ErrorCode = "LLM_RATE_LIMIT"
    ErrLLMTimeout       ErrorCode = "LLM_TIMEOUT"
    ErrLLMContextLimit  ErrorCode = "LLM_CONTEXT_LIMIT"

    // 会话相关错误
    ErrSessionNotFound  ErrorCode = "SESSION_NOT_FOUND"
    ErrSessionExpired   ErrorCode = "SESSION_EXPIRED"

    // 工具相关错误
    ErrToolNotFound     ErrorCode = "TOOL_NOT_FOUND"
    ErrToolExecution    ErrorCode = "TOOL_EXECUTION_ERROR"

    // 上下文相关错误
    ErrContextBuild     ErrorCode = "CONTEXT_BUILD_ERROR"
)
```

### 8.2 错误恢复策略

| 错误类型 | 恢复策略 |
|----------|----------|
| LLM 连接错误 | 重试 3 次，指数退避 |
| LLM 限流 | 等待 Retry-After 后重试 |
| 工具执行错误 | 返回错误给 LLM，继续对话 |
| 上下文溢出 | 压缩历史，重试 |

---

## 9. 配置项

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

  session:
    idle_timeout: 30m
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
