# API 模块设计

> **模块名称**: api
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

API 模块是游戏后端的接口层，负责：
- WebSocket 连接管理和消息路由
- REST API 端点定义和处理
- 请求验证和响应序列化
- 静态资源服务（前端文件）

### 1.2 模块边界

**包含**：
- WebSocket Hub 和客户端连接管理
- REST API 路由和处理函数
- 消息类型定义和序列化
- 中间件（认证、日志、错误处理）

**不包含**：
- 业务逻辑（由 Client/Server 模块负责）
- 状态管理（由共享状态层负责）
- 数据持久化（由持久化模块负责）

---

## 2. 目录结构

```
internal/api/
├── websocket/
│   ├── hub.go           # 连接管理中心
│   ├── client.go        # 客户端连接封装
│   ├── handler.go       # 消息处理器
│   ├── message.go       # 消息类型定义
│   └── writer.go        # 消息写入器
├── rest/
│   ├── router.go        # 路由定义
│   ├── session.go       # 会话相关接口
│   ├── save.go          # 存档相关接口
│   ├── scenario.go      # 剧本相关接口
│   ├── config.go        # 配置相关接口
│   └── health.go        # 健康检查
├── middleware/
│   ├── logger.go        # 日志中间件
│   ├── recovery.go      # 错误恢复中间件
│   └── cors.go          # CORS 中间件
└── static/
    └── server.go        # 静态文件服务
```

---

## 3. 对外接口

### 3.1 WebSocket 接口

#### 3.1.1 连接端点

```
GET /ws
```

WebSocket 连接端点，支持以下查询参数：
- `sessionId`: 会话 ID（可选，用于断线重连）

#### 3.1.2 客户端消息类型

```go
// internal/api/websocket/message.go

type ClientMessageType string

const (
    ClientMessageUserInput    ClientMessageType = "user_input"
    ClientMessageMapAction    ClientMessageType = "map_action"
    ClientMessageCombatAction ClientMessageType = "combat_action"
    ClientMessageSubscribe    ClientMessageType = "subscribe"
    ClientMessageManagement   ClientMessageType = "management"
    ClientMessagePing         ClientMessageType = "ping"
)

type ClientMessage struct {
    Type      ClientMessageType `json:"type"`
    Payload   json.RawMessage   `json:"payload"`
    RequestID string            `json:"requestId,omitempty"`
}
```

#### 3.1.3 服务端消息类型

```go
type ServerMessageType string

const (
    ServerMessageStateUpdate  ServerMessageType = "state_update"
    ServerMessageNarration    ServerMessageType = "narration"
    ServerMessageCombatEvent  ServerMessageType = "combat_event"
    ServerMessageDiceResult   ServerMessageType = "dice_result"
    ServerMessageError        ServerMessageType = "error"
    ServerMessagePong         ServerMessageType = "pong"
)

type ServerMessage struct {
    Type      ServerMessageType `json:"type"`
    Payload   interface{}       `json:"payload"`
    RequestID string            `json:"requestId,omitempty"`
    Timestamp int64             `json:"timestamp"`
}
```

#### 3.1.4 消息 Payload 定义

**用户输入消息**：

```go
type UserInputPayload struct {
    Text string `json:"text"`
}
```

**地图操作消息**：

```go
type MapActionPayload struct {
    Action   string   `json:"action"`   // "move", "interact", "select"
    Position *Position `json:"position,omitempty"`
    TargetID string   `json:"targetId,omitempty"`
}
```

**战斗行动消息**：

```go
type CombatActionPayload struct {
    ActionType string `json:"actionType"` // "attack", "spell", "item", "move", "end_turn"
    TargetID   string `json:"targetId,omitempty"`
    SpellID    string `json:"spellId,omitempty"`
    ItemID     string `json:"itemId,omitempty"`
    Position   *Position `json:"position,omitempty"`
}
```

**管理操作消息**：

```go
type ManagementPayload struct {
    Operation string                 `json:"operation"` // "save", "load", "delete_save"
    Params    map[string]interface{} `json:"params"`
}
```

**状态更新消息**：

```go
type StateUpdatePayload struct {
    StateType string      `json:"stateType"` // "game", "combat", "character", "inventory"
    Data      interface{} `json:"data"`
    Diff      interface{} `json:"diff,omitempty"` // 增量更新
}
```

**DM 叙述消息**：

```go
type NarrationPayload struct {
    Text       string `json:"text"`
    IsStreaming bool  `json:"isStreaming"`
    IsDone     bool   `json:"isDone"`
}
```

**战斗事件消息**：

```go
type CombatEventPayload struct {
    EventType string      `json:"eventType"` // "attack", "damage", "heal", "death", "turn_start", "turn_end"
    SourceID  string      `json:"sourceId,omitempty"`
    TargetID  string      `json:"targetId,omitempty"`
    Result    interface{} `json:"result"`
}
```

**检定结果消息**：

```go
type DiceResultPayload struct {
    RollType  string `json:"rollType"`  // "ability_check", "saving_throw", "attack", "damage"
    Formula   string `json:"formula"`
    Rolls     []int  `json:"rolls"`
    Modifier  int    `json:"modifier"`
    Total     int    `json:"total"`
    Success   *bool  `json:"success,omitempty"` // 对比 DC 时
}
```

### 3.2 REST API 接口

#### 3.2.1 会话管理

```go
// GET /api/sessions - 获取会话列表
type SessionListResponse struct {
    Sessions []SessionSummary `json:"sessions"`
}

type SessionSummary struct {
    ID           string `json:"id"`
    Name         string `json:"name"`
    ScenarioID   string `json:"scenarioId"`
    ScenarioName string `json:"scenarioName"`
    CreatedAt    int64  `json:"createdAt"`
    UpdatedAt    int64  `json:"updatedAt"`
    PlayTime     int    `json:"playTime"` // 秒
}

// POST /api/sessions - 创建新会话
type CreateSessionRequest struct {
    Name       string `json:"name"`
    ScenarioID string `json:"scenarioId"`
}

type CreateSessionResponse struct {
    SessionID string `json:"sessionId"`
}

// GET /api/sessions/:id - 获取会话详情
type SessionDetailResponse struct {
    Session  SessionSummary `json:"session"`
    Party    []Character    `json:"party"`
    GameTime GameTime       `json:"gameTime"`
}

// DELETE /api/sessions/:id - 删除会话
```

#### 3.2.2 存档管理

```go
// GET /api/saves - 获取存档列表
type SaveListResponse struct {
    Saves []SaveSummary `json:"saves"`
}

type SaveSummary struct {
    ID           string `json:"id"`
    Name         string `json:"name"`
    SessionID    string `json:"sessionId"`
    SessionName  string `json:"sessionName"`
    CreatedAt    int64  `json:"createdAt"`
    GameTime     GameTime `json:"gameTime"`
    PlayTime     int    `json:"playTime"`
}

// POST /api/saves - 创建存档
type CreateSaveRequest struct {
    SessionID string `json:"sessionId"`
    Name      string `json:"name"`
}

// POST /api/saves/:id/load - 加载存档
type LoadSaveResponse struct {
    SessionID string `json:"sessionId"`
}

// DELETE /api/saves/:id - 删除存档
```

#### 3.2.3 剧本查询

```go
// GET /api/scenarios - 获取剧本列表
type ScenarioListResponse struct {
    Scenarios []ScenarioSummary `json:"scenarios"`
}

type ScenarioSummary struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    Description string   `json:"description"`
    LevelRange  [2]int   `json:"levelRange"` // [min, max]
    Tags        []string `json:"tags"`
}

// GET /api/scenarios/:id - 获取剧本详情
```

#### 3.2.4 配置查询

```go
// GET /api/config - 获取配置信息
type ConfigResponse struct {
    LLMProviders []string `json:"llmProviders"`
    Version      string   `json:"version"`
}

// GET /api/health - 健康检查
type HealthResponse struct {
    Status  string `json:"status"`
    Version string `json:"version"`
}
```

---

## 4. 组件划分

### 4.1 WebSocket Hub

```go
// internal/api/websocket/hub.go

type Hub struct {
    // 客户端连接管理
    clients    map[string]*Client
    register   chan *Client
    unregister chan *Client

    // 消息广播
    broadcast  chan *BroadcastMessage

    // 依赖注入
    clientModule *client.Module
    stateManager *state.Manager

    // 控制
    done chan struct{}
}

type BroadcastMessage struct {
    SessionID string
    Message   *ServerMessage
    ExcludeID string // 排除的客户端 ID
}

func NewHub(clientModule *client.Module, stateManager *state.Manager) *Hub
func (h *Hub) Run()
func (h *Hub) Register(c *Client)
func (h *Hub) Unregister(c *Client)
func (h *Hub) Broadcast(sessionID string, msg *ServerMessage)
func (h *Hub) BroadcastExcept(sessionID, excludeID string, msg *ServerMessage)
```

### 4.2 WebSocket Client

```go
// internal/api/websocket/client.go

type Client struct {
    ID        string
    SessionID string
    conn      *websocket.Conn
    hub       *Hub
    handler   *MessageHandler
    send      chan []byte
    done      chan struct{}
}

func NewClient(id, sessionID string, conn *websocket.Conn, hub *Hub) *Client
func (c *Client) ReadPump()
func (c *Client) WritePump()
func (c *Client) Close()
```

### 4.3 Message Handler

```go
// internal/api/websocket/handler.go

type MessageHandler struct {
    clientModule *client.Module
    stateManager *state.Manager
}

func NewMessageHandler(clientModule *client.Module, stateManager *state.Manager) *MessageHandler

func (h *MessageHandler) Handle(ctx context.Context, client *Client, msg *ClientMessage) error

// 具体处理方法
func (h *MessageHandler) handleUserInput(ctx context.Context, client *Client, payload json.RawMessage) error
func (h *MessageHandler) handleMapAction(ctx context.Context, client *Client, payload json.RawMessage) error
func (h *MessageHandler) handleCombatAction(ctx context.Context, client *Client, payload json.RawMessage) error
func (h *MessageHandler) handleManagement(ctx context.Context, client *Client, payload json.RawMessage) error
```

### 4.4 REST Router

```go
// internal/api/rest/router.go

type Router struct {
    engine       *gin.Engine
    sessionHandler *SessionHandler
    saveHandler    *SaveHandler
    scenarioHandler *ScenarioHandler
    configHandler  *ConfigHandler
}

func NewRouter(
    sessionHandler *SessionHandler,
    saveHandler *SaveHandler,
    scenarioHandler *ScenarioHandler,
    configHandler *ConfigHandler,
) *Router

func (r *Router) Setup() *gin.Engine
```

---

## 5. 状态设计

### 5.1 Hub 状态

```go
type HubState struct {
    mu         sync.RWMutex
    clients    map[string]*Client  // clientID -> Client
    sessions   map[string][]string // sessionID -> []clientID
}
```

### 5.2 Client 状态

```go
type ClientState struct {
    ID           string
    SessionID    string
    ConnectedAt  time.Time
    LastActivity time.Time
}
```

---

## 6. 模块间通信

### 6.1 与 Client 模块通信

```
用户输入流程：

┌────────┐     user_input      ┌─────────────┐
│ Client │ ──────────────────▶ │  Message    │
│  (WS)  │                     │  Handler    │
└────────┘                     └──────┬──────┘
                                      │
                                      │ 调用 ProcessUserInput
                                      ▼
                               ┌─────────────┐
                               │   Client    │
                               │   Module    │
                               └──────┬──────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
        ┌──────────┐           ┌──────────┐           ┌──────────┐
        │ narration│           │state_    │           │ dice_    │
        │ (流式)   │           │ update   │           │ result   │
        └──────────┘           └──────────┘           └──────────┘
```

### 6.2 与状态管理器通信

```go
// 订阅状态变更
func (h *MessageHandler) subscribeStateChanges(ctx context.Context, client *Client) {
    ch := h.stateManager.Subscribe(client.SessionID)
    go func() {
        for {
            select {
            case update := <-ch:
                client.Send(&ServerMessage{
                    Type: ServerMessageStateUpdate,
                    Payload: update,
                })
            case <-ctx.Done():
                return
            }
        }
    }()
}
```

### 6.3 事件流程

```
状态变更事件流：

┌─────────────┐     状态变更     ┌─────────────┐
│   Server    │ ──────────────▶ │   State     │
│   Module    │                 │  Manager    │
└─────────────┘                 └──────┬──────┘
                                       │
                                       │ 发布事件
                                       ▼
                                ┌─────────────┐
                                │    Hub      │
                                │  (订阅者)   │
                                └──────┬──────┘
                                       │
                                       │ 广播给客户端
                                       ▼
                                ┌─────────────┐
                                │   Web 客户端│
                                └─────────────┘
```

---

## 7. 错误处理

### 7.1 错误码定义

```go
type ErrorCode string

const (
    ErrCodeInvalidMessage   ErrorCode = "INVALID_MESSAGE"
    ErrCodeUnauthorized     ErrorCode = "UNAUTHORIZED"
    ErrCodeSessionNotFound  ErrorCode = "SESSION_NOT_FOUND"
    ErrCodeInvalidAction    ErrorCode = "INVALID_ACTION"
    ErrCodeInternalError    ErrorCode = "INTERNAL_ERROR"
    ErrCodeLLMError         ErrorCode = "LLM_ERROR"
)

type ErrorResponse struct {
    Code        ErrorCode `json:"code"`
    Message     string    `json:"message"`
    Recoverable bool      `json:"recoverable"`
    Details     any       `json:"details,omitempty"`
}
```

### 7.2 错误响应发送

```go
func (c *Client) SendError(requestID string, err error) {
    var appErr *AppError
    if errors.As(err, &appErr) {
        c.Send(&ServerMessage{
            Type:      ServerMessageError,
            RequestID: requestID,
            Payload: ErrorResponse{
                Code:        appErr.Code,
                Message:     appErr.Message,
                Recoverable: appErr.Recoverable,
            },
        })
    } else {
        c.Send(&ServerMessage{
            Type:      ServerMessageError,
            RequestID: requestID,
            Payload: ErrorResponse{
                Code:        ErrCodeInternalError,
                Message:     "Internal server error",
                Recoverable: false,
            },
        })
    }
}
```

---

## 8. 配置项

```yaml
api:
  websocket:
    read_buffer_size: 1024
    write_buffer_size: 1024
    ping_interval: 30s
    pong_wait: 60s
    max_message_size: 65536

  rest:
    read_timeout: 10s
    write_timeout: 10s
    max_request_size: 1048576  # 1MB

  static:
    enabled: true
    root: "./web"
    index: "index.html"
```

---

## 9. 测试策略

### 9.1 单元测试

- 消息序列化/反序列化测试
- 路由处理函数测试
- 中间件测试

### 9.2 集成测试

- WebSocket 连接和消息流测试
- REST API 端到端测试
- 错误处理测试

---

**文档版本**：v1.0
**创建日期**：2026-03-16
