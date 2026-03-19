# API 模块组件设计

> **模块名称**: api
> **文档类型**: 组件设计
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 组件列表和职责

### 1.1 组件概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API 模块组件架构                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Router (Gin)                                │   │
│  │  职责: HTTP 路由、中间件管理、静态文件服务                            │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  WebSocket   │  │  REST API    │  │   Static     │              │   │
│  │  │  Endpoint    │  │  Handlers    │  │   Files      │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │   │
│  └─────────┼──────────────────┼──────────────────┼───────────────────────┘   │
│            │                  │                  │                           │
│            ▼                  ▼                  ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        WebSocketHub                                │   │
│  │  职责: 连接管理、消息广播、客户端注册/注销                            │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MessageHandler                                 │   │
│  │  职责: 消息解析、路由处理、响应生成                                    │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                             │
│         ┌────────────────────┼────────────────────┐                       │
│         │                    │                    │                       │
│         ▼                    ▼                    ▼                       │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐                 │
│  │  Client  │         │  Server  │         │  State   │                 │
│  │  Module  │         │  Module  │         │  Manager │                 │
│  └──────────┘         └──────────┘         └──────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 组件职责矩阵

| 组件名称 | 主要职责 | 输入 | 输出 |
|----------|----------|------|------|
| **Router** | HTTP 路由管理、中间件配置 | HTTP Request | HTTP Response |
| **WebSocketHub** | WebSocket 连接生命周期管理 | Client 连接 | 广播消息 |
| **WSClient** | 单个客户端连接封装 | WebSocket Conn | 消息发送/接收 |
| **MessageHandler** | 消息处理和路由 | ClientMessage | ServerMessage |
| **RestRouter** | REST API 端点定义 | HTTP Request | JSON Response |
| **SessionHandler** | 会话管理接口 | Session 请求 | Session 数据 |
| **SaveHandler** | 存档管理接口 | Save 请求 | Save 数据 |
| **StaticServer** | 静态文件服务 | 文件路径 | 文件内容 |
| **MiddlewareChain** | 中间件链（日志、CORS、恢复） | Request | Request/Response |

---

## 2. WebSocketHub 组件

### 2.1 组件职责

- 管理 WebSocket 客户端连接
- 处理客户端注册和注销
- 广播消息到会话中的所有客户端
- 支持点对点消息发送
- 管理会话到客户端的映射关系

### 2.2 接口定义

```go
// internal/api/websocket/hub.go

package websocket

import (
    "context"
    "sync"
    "time"

    "github.com/gorilla/websocket"
)

// Hub WebSocket 连接管理中心
type Hub struct {
    // 客户端管理
    clients    map[string]*Client      // clientID -> Client
    sessions   map[string][]string     // sessionID -> []clientID

    // 通道
    register   chan *Client            // 新客户端注册
    unregister chan *Client            // 客户端注销
    broadcast  chan *BroadcastMessage  // 广播消息

    // 依赖注入
    messageHandler *MessageHandler
    stateManager   StateManager

    // 控制
    ctx    context.Context
    cancel context.CancelFunc
    wg     sync.WaitGroup

    // 配置
    config HubConfig
    mu     sync.RWMutex
}

// HubConfig Hub 配置
type HubConfig struct {
    MaxClientsPerSession int           // 单会话最大客户端数
    ClientTimeout        time.Duration // 客户端超时时间
    PingInterval         time.Duration // 心跳间隔
    PongWait             time.Duration // 等待 Pong 超时
}

// NewHub 创建 Hub
func NewHub(messageHandler *MessageHandler, stateManager StateManager, cfg HubConfig) *Hub {
    ctx, cancel := context.WithCancel(context.Background())

    return &Hub{
        clients:        make(map[string]*Client),
        sessions:       make(map[string][]string),
        register:       make(chan *Client),
        unregister:     make(chan *Client),
        broadcast:      make(chan *BroadcastMessage, 256),
        messageHandler: messageHandler,
        stateManager:   stateManager,
        ctx:            ctx,
        cancel:         cancel,
        config:         cfg,
    }
}

// Run 启动 Hub 主循环
func (h *Hub) Run() {
    h.wg.Add(1)
    go func() {
        defer h.wg.Done()
        h.run()
    }()
}

// run Hub 主循环
func (h *Hub) run() {
    // 启动心跳检查
    heartbeatTicker := time.NewTicker(h.config.PingInterval)
    defer heartbeatTicker.Stop()

    for {
        select {
        case <-h.ctx.Done():
            // 清理所有客户端
            h.cleanup()
            return

        case client := <-h.register:
            h.handleRegister(client)

        case client := <-h.unregister:
            h.handleUnregister(client)

        case message := <-h.broadcast:
            h.handleBroadcast(message)

        case <-heartbeatTicker.C:
            h.sendHeartbeat()
        }
    }
}

// Shutdown 优雅关闭
func (h *Hub) Shutdown(ctx context.Context) error {
    h.cancel()

    // 等待主循环退出
    done := make(chan struct{})
    go func() {
        h.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

// handleRegister 处理客户端注册
func (h *Hub) handleRegister(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    // 检查会话客户端数量限制
    sessionClients := h.sessions[client.SessionID]
    if h.config.MaxClientsPerSession > 0 && len(sessionClients) >= h.config.MaxClientsPerSession {
        client.SendError("", ErrTooManyClients)
        client.Close()
        return
    }

    // 添加到客户端映射
    h.clients[client.ID] = client

    // 添加到会话映射
    h.sessions[client.SessionID] = append(sessionClients, client.ID)

    // 启动客户端读写循环
    client.Start(h.ctx, h.messageHandler)
}

// handleUnregister 处理客户端注销
func (h *Hub) handleUnregister(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    // 从客户端映射删除
    delete(h.clients, client.ID)

    // 从会话映射删除
    sessionClients := h.sessions[client.SessionID]
    for i, id := range sessionClients {
        if id == client.ID {
            h.sessions[client.SessionID] = append(sessionClients[:i], sessionClients[i+1:]...)
            break
        }
    }

    // 如果会话没有客户端了，删除会话条目
    if len(h.sessions[client.SessionID]) == 0 {
        delete(h.sessions, client.SessionID)
    }

    // 关闭客户端
    client.Close()
}

// handleBroadcast 处理广播消息
func (h *Hub) handleBroadcast(msg *BroadcastMessage) {
    h.mu.RLock()
    sessionClients := h.sessions[msg.SessionID]
    h.mu.RUnlock()

    for _, clientID := range sessionClients {
        // 排除指定客户端
        if msg.ExcludeID != "" && clientID == msg.ExcludeID {
            continue
        }

        if client, ok := h.clients[clientID]; ok {
            client.Send(msg.Message)
        }
    }
}

// Broadcast 广播消息到会话
func (h *Hub) Broadcast(sessionID string, msg *ServerMessage) {
    h.broadcast <- &BroadcastMessage{
        SessionID: sessionID,
        Message:   msg,
    }
}

// BroadcastExcept 广播消息到会话（排除指定客户端）
func (h *Hub) BroadcastExcept(sessionID, excludeID string, msg *ServerMessage) {
    h.broadcast <- &BroadcastMessage{
        SessionID: sessionID,
        Message:   msg,
        ExcludeID: excludeID,
    }
}

// SendToClient 发送消息到指定客户端
func (h *Hub) SendToClient(clientID string, msg *ServerMessage) error {
    h.mu.RLock()
    client, ok := h.clients[clientID]
    h.mu.RUnlock()

    if !ok {
        return ErrClientNotFound
    }

    client.Send(msg)
    return nil
}

// GetSessionClients 获取会话的所有客户端
func (h *Hub) GetSessionClients(sessionID string) []*Client {
    h.mu.RLock()
    defer h.mu.RUnlock()

    clientIDs := h.sessions[sessionID]
    clients := make([]*Client, 0, len(clientIDs))

    for _, id := range clientIDs {
        if client, ok := h.clients[id]; ok {
            clients = append(clients, client)
        }
    }

    return clients
}

// GetClientCount 获取客户端总数
func (h *Hub) GetClientCount() int {
    h.mu.RLock()
    defer h.mu.RUnlock()
    return len(h.clients)
}

// GetSessionCount 获取会话总数
func (h *Hub) GetSessionCount() int {
    h.mu.RLock()
    defer h.mu.RUnlock()
    return len(h.sessions)
}

// sendHeartbeat 发送心跳
func (h *Hub) sendHeartbeat() {
    h.mu.RLock()
    clients := make([]*Client, 0, len(h.clients))
    for _, client := range h.clients {
        clients = append(clients, client)
    }
    h.mu.RUnlock()

    pingMsg := &ServerMessage{
        Type:      ServerMessagePing,
        Timestamp: time.Now().UnixMilli(),
    }

    for _, client := range clients {
        if !client.IsActive() {
            // 客户端超时，注销
            h.unregister <- client
            continue
        }
        client.Send(pingMsg)
    }
}

// cleanup 清理所有客户端
func (h *Hub) cleanup() {
    h.mu.Lock()
    defer h.mu.Unlock()

    for _, client := range h.clients {
        client.Close()
    }

    h.clients = make(map[string]*Client)
    h.sessions = make(map[string][]string)
}

// BroadcastMessage 广播消息
type BroadcastMessage struct {
    SessionID string
    Message   *ServerMessage
    ExcludeID string // 排除的客户端 ID
}

// StateManager 状态管理器接口
type StateManager interface {
    Get(sessionID string) (interface{}, error)
    Subscribe(sessionID string) <-chan interface{}
}

// 错误定义
var (
    ErrClientNotFound     = &APIError{Code: "CLIENT_NOT_FOUND", Message: "Client not found"}
    ErrTooManyClients     = &APIError{Code: "TOO_MANY_CLIENTS", Message: "Too many clients in session"}
    ErrSessionNotFound    = &APIError{Code: "SESSION_NOT_FOUND", Message: "Session not found"}
)
```

### 2.3 WSClient 组件

```go
// internal/api/websocket/client.go

package websocket

import (
    "context"
    "encoding/json"
    "fmt"
    "sync"
    "time"

    "github.com/gorilla/websocket"
)

// Client WebSocket 客户端连接
type Client struct {
    ID        string
    SessionID string
    conn      *websocket.Conn
    hub       *Hub
    send      chan *ServerMessage
    receive   chan *ClientMessage

    // 状态
    connectedAt  time.Time
    lastActivity time.Time
    mu           sync.RWMutex

    // 配置
    writeWait     time.Duration
    pongWait      time.Duration
    maxMessageSize int64
}

// NewClient 创建客户端
func NewClient(id, sessionID string, conn *websocket.Conn, hub *Hub) *Client {
    return &Client{
        ID:            id,
        SessionID:     sessionID,
        conn:          conn,
        hub:           hub,
        send:          make(chan *ServerMessage, 256),
        receive:       make(chan *ClientMessage, 16),
        connectedAt:   time.Now(),
        lastActivity:  time.Now(),
        writeWait:     10 * time.Second,
        pongWait:      60 * time.Second,
        maxMessageSize: 65536,
    }
}

// Start 启动客户端读写循环
func (c *Client) Start(ctx context.Context, handler *MessageHandler) {
    go c.readPump(ctx, handler)
    go c.writePump(ctx)
}

// readPump 读取循环
func (c *Client) readPump(ctx context.Context, handler *MessageHandler) {
    defer func() {
        c.hub.unregister <- c
    }()

    // 配置连接
    c.conn.SetReadLimit(c.maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(c.pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(c.pongWait))
        return nil
    })

    for {
        select {
        case <-ctx.Done():
            return
        default:
        }

        // 读取消息
        _, messageData, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                // 记录错误日志
            }
            return
        }

        // 更新活动时间
        c.mu.Lock()
        c.lastActivity = time.Now()
        c.mu.Unlock()

        // 解析消息
        var clientMsg ClientMessage
        if err := json.Unmarshal(messageData, &clientMsg); err != nil {
            c.SendError(clientMsg.RequestID, ErrInvalidMessage)
            continue
        }

        // 处理消息
        if err := handler.Handle(ctx, c, &clientMsg); err != nil {
            c.SendError(clientMsg.RequestID, err)
        }
    }
}

// writePump 写入循环
func (c *Client) writePump(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case <-ctx.Done():
            return
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(c.writeWait))
            if !ok {
                // Hub 关闭了通道
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            // 序列化消息
            data, err := json.Marshal(message)
            if err != nil {
                // 记录错误，继续
                continue
            }

            // 发送消息
            if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(c.writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// Send 发送消息
func (c *Client) Send(msg *ServerMessage) {
    select {
    case c.send <- msg:
    default:
        // 通道已满，关闭客户端
        close(c.send)
    }
}

// SendError 发送错误消息
func (c *Client) SendError(requestID string, err error) {
    var apiErr *APIError
    if errors.As(err, &apiErr) {
        c.Send(&ServerMessage{
            Type:      ServerMessageError,
            RequestID: requestID,
            Payload: ErrorResponse{
                Code:        apiErr.Code,
                Message:     apiErr.Message,
                Recoverable: apiErr.Recoverable,
                Details:     apiErr.Details,
            },
            Timestamp: time.Now().UnixMilli(),
        })
    } else {
        c.Send(&ServerMessage{
            Type:      ServerMessageError,
            RequestID: requestID,
            Payload: ErrorResponse{
                Code:        "INTERNAL_ERROR",
                Message:     "Internal server error",
                Recoverable: false,
            },
            Timestamp: time.Now().UnixMilli(),
        })
    }
}

// IsActive 检查客户端是否活跃
func (c *Client) IsActive() bool {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return time.Since(c.lastActivity) < c.hub.config.ClientTimeout
}

// Close 关闭连接
func (c *Client) Close() {
    c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
    c.conn.Close()
    close(c.send)
}

// GetStats 获取客户端统计
func (c *Client) GetStats() ClientStats {
    c.mu.RLock()
    defer c.mu.RUnlock()

    return ClientStats{
        ID:           c.ID,
        SessionID:    c.SessionID,
        ConnectedAt:  c.connectedAt,
        LastActivity: c.lastActivity,
        Duration:     time.Since(c.connectedAt),
    }
}

// ClientStats 客户端统计
type ClientStats struct {
    ID           string
    SessionID    string
    ConnectedAt  time.Time
    LastActivity time.Time
    Duration     time.Duration
}
```

---

## 3. MessageHandler 组件

### 3.1 组件职责

- 解析客户端消息
- 路由消息到对应的处理器
- 验证消息格式和权限
- 生成响应消息

### 3.2 接口定义

```go
// internal/api/websocket/handler.go

package websocket

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/yourproject/internal/client"
    "github.com/yourproject/internal/shared/state"
)

// MessageHandler 消息处理器
type MessageHandler struct {
    clientModule  *client.Module
    stateManager  *state.Manager
    hub           *Hub

    // 处理器映射
    handlers map[ClientMessageType]MessageHandlerFunc
}

// MessageHandlerFunc 消息处理函数
type MessageHandlerFunc func(ctx context.Context, client *Client, payload json.RawMessage) error

// NewMessageHandler 创建消息处理器
func NewMessageHandler(
    clientModule *client.Module,
    stateManager *state.Manager,
    hub *Hub,
) *MessageHandler {
    h := &MessageHandler{
        clientModule: clientModule,
        stateManager: stateManager,
        hub:          hub,
        handlers:     make(map[ClientMessageType]MessageHandlerFunc),
    }

    // 注册处理器
    h.registerHandlers()

    return h
}

// registerHandlers 注册所有消息处理器
func (h *MessageHandler) registerHandlers() {
    h.handlers[ClientMessageUserInput] = h.handleUserInput
    h.handlers[ClientMessageMapAction] = h.handleMapAction
    h.handlers[ClientMessageCombatAction] = h.handleCombatAction
    h.handlers[ClientMessageSubscribe] = h.handleSubscribe
    h.handlers[ClientMessageManagement] = h.handleManagement
    h.handlers[ClientMessagePing] = h.handlePing
}

// Handle 处理消息
func (h *MessageHandler) Handle(ctx context.Context, client *Client, msg *ClientMessage) error {
    // 查找处理器
    handler, ok := h.handlers[msg.Type]
    if !ok {
        return ErrUnknownMessageType
    }

    // 执行处理器
    if err := handler(ctx, client, msg.Payload); err != nil {
        return fmt.Errorf("handle %s: %w", msg.Type, err)
    }

    return nil
}

// handleUserInput 处理用户输入
func (h *MessageHandler) handleUserInput(ctx context.Context, client *Client, payload json.RawMessage) error {
    var req UserInputRequest
    if err := json.Unmarshal(payload, &req); err != nil {
        return ErrInvalidPayload
    }

    // 传递给 Client 模块处理
    if err := h.clientModule.ProcessUserInput(ctx, client.SessionID, req.Text); err != nil {
        return fmt.Errorf("process user input: %w", err)
    }

    return nil
}

// UserInputRequest 用户输入请求
type UserInputRequest struct {
    Text string `json:"text"`
}

// handleMapAction 处理地图操作
func (h *MessageHandler) handleMapAction(ctx context.Context, client *Client, payload json.RawMessage) error {
    var req MapActionRequest
    if err := json.Unmarshal(payload, &req); err != nil {
        return ErrInvalidPayload
    }

    switch req.Action {
    case "move":
        return h.handleMapMove(ctx, client, &req)
    case "interact":
        return h.handleMapInteract(ctx, client, &req)
    case "select":
        return h.handleMapSelect(ctx, client, &req)
    default:
        return ErrInvalidAction
    }
}

// MapActionRequest 地图操作请求
type MapActionRequest struct {
    Action   string         `json:"action"`   // "move", "interact", "select"
    Position *MapPosition   `json:"position,omitempty"`
    TargetID string         `json:"targetId,omitempty"`
}

// MapPosition 地图位置
type MapPosition struct {
    X int `json:"x"`
    Y int `json:"y"`
}

// handleMapMove 处理地图移动
func (h *MessageHandler) handleMapMove(ctx context.Context, client *Client, req *MapActionRequest) error {
    if req.Position == nil {
        return ErrMissingPosition
    }

    // 通过状态管理器更新位置
    // ...

    // 推送状态更新
    h.hub.Broadcast(client.SessionID, &ServerMessage{
        Type: ServerMessageStateUpdate,
        Payload: StateUpdatePayload{
            StateType: "map",
            Data: map[string]interface{}{
                "action":   "move",
                "position": req.Position,
            },
        },
        Timestamp: time.Now().UnixMilli(),
    })

    return nil
}

// handleMapInteract 处理地图交互
func (h *MessageHandler) handleMapInteract(ctx context.Context, client *Client, req *MapActionRequest) error {
    if req.TargetID == "" {
        return ErrMissingTargetID
    }

    // 处理交互逻辑
    // ...

    return nil
}

// handleMapSelect 处理地图选择
func (h *MessageHandler) handleMapSelect(ctx context.Context, client *Client, req *MapActionRequest) error {
    // 处理选择逻辑
    return nil
}

// handleCombatAction 处理战斗操作
func (h *MessageHandler) handleCombatAction(ctx context.Context, client *Client, payload json.RawMessage) error {
    var req CombatActionRequest
    if err := json.Unmarshal(payload, &req); err != nil {
        return ErrInvalidPayload
    }

    switch req.ActionType {
    case "attack":
        return h.handleCombatAttack(ctx, client, &req)
    case "spell":
        return h.handleCombatSpell(ctx, client, &req)
    case "item":
        return h.handleCombatItem(ctx, client, &req)
    case "move":
        return h.handleCombatMove(ctx, client, &req)
    case "end_turn":
        return h.handleCombatEndTurn(ctx, client, &req)
    default:
        return ErrInvalidAction
    }
}

// CombatActionRequest 战斗操作请求
type CombatActionRequest struct {
    ActionType string      `json:"actionType"` // "attack", "spell", "item", "move", "end_turn"
    TargetID   string      `json:"targetId,omitempty"`
    SpellID    string      `json:"spellId,omitempty"`
    ItemID     string      `json:"itemId,omitempty"`
    Position   *MapPosition `json:"position,omitempty"`
}

// handleCombatAttack 处理战斗攻击
func (h *MessageHandler) handleCombatAttack(ctx context.Context, client *Client, req *CombatActionRequest) error {
    // 通过 Client 模块处理工具调用
    // 或者直接调用 Server 模块
    return nil
}

// handleCombatSpell 处理战斗施法
func (h *MessageHandler) handleCombatSpell(ctx context.Context, client *Client, req *CombatActionRequest) error {
    return nil
}

// handleCombatItem 处理战斗物品
func (h *MessageHandler) handleCombatItem(ctx context.Context, client *Client, req *CombatActionRequest) error {
    return nil
}

// handleCombatMove 处理战斗移动
func (h *MessageHandler) handleCombatMove(ctx context.Context, client *Client, req *CombatActionRequest) error {
    return nil
}

// handleCombatEndTurn 处理结束回合
func (h *MessageHandler) handleCombatEndTurn(ctx context.Context, client *Client, req *CombatActionRequest) error {
    return nil
}

// handleSubscribe 处理订阅请求
func (h *MessageHandler) handleSubscribe(ctx context.Context, client *Client, payload json.RawMessage) error {
    var req SubscribeRequest
    if err := json.Unmarshal(payload, &req); err != nil {
        return ErrInvalidPayload
    }

    // 订阅事件
    for _, event := range req.Events {
        h.stateManager.SubscribeClient(client.SessionID, client.ID, event)
    }

    return nil
}

// SubscribeRequest 订阅请求
type SubscribeRequest struct {
    Events []string `json:"events"`
}

// handleManagement 处理管理操作
func (h *MessageHandler) handleManagement(ctx context.Context, client *Client, payload json.RawMessage) error {
    var req ManagementRequest
    if err := json.Unmarshal(payload, &req); err != nil {
        return ErrInvalidPayload
    }

    switch req.Operation {
    case "save":
        return h.handleSave(ctx, client, &req)
    case "load":
        return h.handleLoad(ctx, client, &req)
    case "delete_save":
        return h.handleDeleteSave(ctx, client, &req)
    default:
        return ErrInvalidOperation
    }
}

// ManagementRequest 管理操作请求
type ManagementRequest struct {
    Operation string                 `json:"operation"` // "save", "load", "delete_save"
    Params    map[string]interface{} `json:"params"`
}

// handleSave 处理存档
func (h *MessageHandler) handleSave(ctx context.Context, client *Client, req *ManagementRequest) error {
    // 调用持久化层
    return nil
}

// handleLoad 处理读档
func (h *MessageHandler) handleLoad(ctx context.Context, client *Client, req *ManagementRequest) error {
    return nil
}

// handleDeleteSave 处理删除存档
func (h *MessageHandler) handleDeleteSave(ctx context.Context, client *Client, req *ManagementRequest) error {
    return nil
}

// handlePing 处理心跳
func (h *MessageHandler) handlePing(ctx context.Context, client *Client, payload json.RawMessage) error {
    client.Send(&ServerMessage{
        Type:      ServerMessagePong,
        Timestamp: time.Now().UnixMilli(),
    })
    return nil
}
```

---

## 4. 消息类型定义

### 4.1 客户端消息类型

```go
// internal/api/websocket/message.go

package websocket

import "encoding/json"

// ClientMessageType 客户端消息类型
type ClientMessageType string

const (
    ClientMessageUserInput    ClientMessageType = "user_input"
    ClientMessageMapAction    ClientMessageType = "map_action"
    ClientMessageCombatAction ClientMessageType = "combat_action"
    ClientMessageSubscribe    ClientMessageType = "subscribe"
    ClientMessageManagement   ClientMessageType = "management"
    ClientMessagePing         ClientMessageType = "ping"
)

// ClientMessage 客户端消息
type ClientMessage struct {
    Type      ClientMessageType `json:"type"`
    Payload   json.RawMessage   `json:"payload"`
    RequestID string            `json:"requestId,omitempty"`
}
```

### 4.2 服务端消息类型

```go
// ServerMessageType 服务端消息类型
type ServerMessageType string

const (
    ServerMessageStateUpdate  ServerMessageType = "state_update"
    ServerMessageNarration    ServerMessageType = "narration"
    ServerMessageCombatEvent  ServerMessageType = "combat_event"
    ServerMessageDiceResult   ServerMessageType = "dice_result"
    ServerMessageError        ServerMessageType = "error"
    ServerMessagePong         ServerMessageType = "pong"
)

// ServerMessage 服务端消息
type ServerMessage struct {
    Type      ServerMessageType `json:"type"`
    Payload   interface{}       `json:"payload"`
    RequestID string            `json:"requestId,omitempty"`
    Timestamp int64             `json:"timestamp"`
}

// NarrationPayload 叙述消息
type NarrationPayload struct {
    Text        string `json:"text"`
    IsStreaming bool   `json:"isStreaming"`
    IsDone      bool   `json:"isDone"`
}

// StateUpdatePayload 状态更新消息
type StateUpdatePayload struct {
    StateType string      `json:"stateType"` // "game", "combat", "character", "inventory"
    Data      interface{} `json:"data"`
    Diff      interface{} `json:"diff,omitempty"` // 增量更新
}

// CombatEventPayload 战斗事件消息
type CombatEventPayload struct {
    EventType string      `json:"eventType"` // "attack", "damage", "heal", "death", "turn_start", "turn_end"
    SourceID  string      `json:"sourceId,omitempty"`
    TargetID  string      `json:"targetId,omitempty"`
    Result    interface{} `json:"result"`
}

// DiceResultPayload 检定结果消息
type DiceResultPayload struct {
    RollType  string `json:"rollType"`  // "ability_check", "saving_throw", "attack", "damage"
    Formula   string `json:"formula"`
    Rolls     []int  `json:"rolls"`
    Modifier  int    `json:"modifier"`
    Total     int    `json:"total"`
    Success   *bool  `json:"success,omitempty"` // 对比 DC 时
}

// ErrorResponse 错误响应
type ErrorResponse struct {
    Code        string      `json:"code"`
    Message     string      `json:"message"`
    Recoverable bool        `json:"recoverable"`
    Details     interface{} `json:"details,omitempty"`
}
```

---

## 5. RestRouter 组件

### 5.1 组件职责

- 定义 REST API 路由
- 处理 HTTP 请求和响应
- 参数验证和序列化
- 错误处理

### 5.2 接口定义

```go
// internal/api/rest/router.go

package rest

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// Router REST 路由器
type Router struct {
    engine         *gin.Engine
    sessionHandler *SessionHandler
    saveHandler    *SaveHandler
    scenarioHandler *ScenarioHandler
    configHandler  *ConfigHandler
    healthHandler  *HealthHandler
}

// NewRouter 创建路由器
func NewRouter(
    sessionHandler *SessionHandler,
    saveHandler *SaveHandler,
    scenarioHandler *ScenarioHandler,
    configHandler *ConfigHandler,
    healthHandler *HealthHandler,
) *Router {
    gin.SetMode(gin.ReleaseMode)
    engine := gin.New()

    r := &Router{
        engine:          engine,
        sessionHandler:  sessionHandler,
        saveHandler:     saveHandler,
        scenarioHandler: scenarioHandler,
        configHandler:   configHandler,
        healthHandler:   healthHandler,
    }

    r.setupMiddleware()
    r.setupRoutes()

    return r
}

// setupMiddleware 设置中间件
func (r *Router) setupMiddleware() {
    r.engine.Use(
        MiddlewareRecovery(),
        MiddlewareLogger(),
        MiddlewareCORS(),
        MiddlewareRequestID(),
    )
}

// setupRoutes 设置路由
func (r *Router) setupRoutes() {
    // API 路由组
    api := r.engine.Group("/api")
    {
        // 会话管理
        sessions := api.Group("/sessions")
        {
            sessions.GET("", r.sessionHandler.List)
            sessions.POST("", r.sessionHandler.Create)
            sessions.GET(":id", r.sessionHandler.Get)
            sessions.DELETE(":id", r.sessionHandler.Delete)
        }

        // 存档管理
        saves := api.Group("/saves")
        {
            saves.GET("", r.saveHandler.List)
            saves.POST("", r.saveHandler.Create)
            saves.GET(":id", r.saveHandler.Get)
            saves.POST(":id/load", r.saveHandler.Load)
            saves.DELETE(":id", r.saveHandler.Delete)
        }

        // 剧本查询
        scenarios := api.Group("/scenarios")
        {
            scenarios.GET("", r.scenarioHandler.List)
            scenarios.GET(":id", r.scenarioHandler.Get)
        }

        // 配置查询
        api.GET("/config", r.configHandler.GetConfig)
    }

    // 健康检查
    r.engine.GET("/api/health", r.healthHandler.Health)
}

// Engine 返回 Gin 引擎
func (r *Router) Engine() *gin.Engine {
    return r.engine
}

// ServeHTTP 实现 http.Handler
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    r.engine.ServeHTTP(w, req)
}
```

### 5.3 SessionHandler

```go
// internal/api/rest/session.go

package rest

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// SessionHandler 会话处理器
type SessionHandler struct {
    sessionManager SessionManager
    stateManager   StateManager
}

// SessionManager 会话管理器接口
type SessionManager interface {
    CreateSession(ctx context.Context, req *CreateSessionRequest) (*Session, error)
    GetSession(ctx context.Context, sessionID string) (*Session, error)
    DeleteSession(ctx context.Context, sessionID string) error
    ListSessions(ctx context.Context) ([]*Session, error)
}

// NewSessionHandler 创建会话处理器
func NewSessionHandler(sessionManager SessionManager, stateManager StateManager) *SessionHandler {
    return &SessionHandler{
        sessionManager: sessionManager,
        stateManager:   stateManager,
    }
}

// List 获取会话列表
func (h *SessionHandler) List(c *gin.Context) {
    sessions, err := h.sessionManager.ListSessions(c.Request.Context())
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to list sessions",
        })
        return
    }

    summaries := make([]SessionSummary, len(sessions))
    for i, s := range sessions {
        summaries[i] = SessionSummary{
            ID:           s.ID,
            Name:         s.Name,
            ScenarioID:   s.ScenarioID,
            ScenarioName: s.ScenarioName,
            CreatedAt:    s.CreatedAt,
            UpdatedAt:    s.UpdatedAt,
            PlayTime:     s.PlayTime,
        }
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    summaries,
    })
}

// Create 创建新会话
func (h *SessionHandler) Create(c *gin.Context) {
    var req CreateSessionRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Code:    "INVALID_REQUEST",
            Message: err.Error(),
        })
        return
    }

    session, err := h.sessionManager.CreateSession(c.Request.Context(), &req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to create session",
        })
        return
    }

    c.JSON(http.StatusCreated, SuccessResponse{
        Success: true,
        Data: CreateSessionResponse{
            SessionID: session.ID,
        },
    })
}

// Get 获取会话详情
func (h *SessionHandler) Get(c *gin.Context) {
    sessionID := c.Param("id")

    session, err := h.sessionManager.GetSession(c.Request.Context(), sessionID)
    if err != nil {
        c.JSON(http.StatusNotFound, ErrorResponse{
            Code:    "SESSION_NOT_FOUND",
            Message: "Session not found",
        })
        return
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    session,
    })
}

// Delete 删除会话
func (h *SessionHandler) Delete(c *gin.Context) {
    sessionID := c.Param("id")

    if err := h.sessionManager.DeleteSession(c.Request.Context(), sessionID); err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to delete session",
        })
        return
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
    })
}

// CreateSessionRequest 创建会话请求
type CreateSessionRequest struct {
    Name       string `json:"name" binding:"required"`
    ScenarioID string `json:"scenarioId" binding:"required"`
}

// CreateSessionResponse 创建会话响应
type CreateSessionResponse struct {
    SessionID string `json:"sessionId"`
}

// SessionSummary 会话摘要
type SessionSummary struct {
    ID           string `json:"id"`
    Name         string `json:"name"`
    ScenarioID   string `json:"scenarioId"`
    ScenarioName string `json:"scenarioName"`
    CreatedAt    int64  `json:"createdAt"`
    UpdatedAt    int64  `json:"updatedAt"`
    PlayTime     int    `json:"playTime"` // 秒
}

// Session 会话详情
type Session struct {
    SessionSummary
    Party    []Character `json:"party"`
    GameTime GameTime    `json:"gameTime"`
}

// Character 角色
type Character struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    Level     int    `json:"level"`
    Race      string `json:"race"`
    Class     string `json:"class"`
    CurrentHP int    `json:"currentHp"`
    MaxHP     int    `json:"maxHp"`
}

// GameTime 游戏时间
type GameTime struct {
    Days    int `json:"days"`
    Hours   int `json:"hours"`
    Minutes int `json:"minutes"`
}
```

### 5.4 SaveHandler

```go
// internal/api/rest/save.go

package rest

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// SaveHandler 存档处理器
type SaveHandler struct {
    saveManager SaveManager
}

// SaveManager 存档管理器接口
type SaveManager interface {
    CreateSave(ctx context.Context, req *CreateSaveRequest) (*Save, error)
    GetSave(ctx context.Context, saveID string) (*Save, error)
    ListSaves(ctx context.Context) ([]*Save, error)
    LoadSave(ctx context.Context, saveID string) (*LoadSaveResponse, error)
    DeleteSave(ctx context.Context, saveID string) error
}

// NewSaveHandler 创建存档处理器
func NewSaveHandler(saveManager SaveManager) *SaveHandler {
    return &SaveHandler{
        saveManager: saveManager,
    }
}

// List 获取存档列表
func (h *SaveHandler) List(c *gin.Context) {
    saves, err := h.saveManager.ListSaves(c.Request.Context())
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to list saves",
        })
        return
    }

    summaries := make([]SaveSummary, len(saves))
    for i, s := range saves {
        summaries[i] = SaveSummary{
            ID:          s.ID,
            Name:        s.Name,
            SessionID:   s.SessionID,
            SessionName: s.SessionName,
            CreatedAt:   s.CreatedAt,
            GameTime:    s.GameTime,
            PlayTime:    s.PlayTime,
        }
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    summaries,
    })
}

// Create 创建存档
func (h *SaveHandler) Create(c *gin.Context) {
    var req CreateSaveRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Code:    "INVALID_REQUEST",
            Message: err.Error(),
        })
        return
    }

    save, err := h.saveManager.CreateSave(c.Request.Context(), &req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to create save",
        })
        return
    }

    c.JSON(http.StatusCreated, SuccessResponse{
        Success: true,
        Data:    save,
    })
}

// Get 获取存档详情
func (h *SaveHandler) Get(c *gin.Context) {
    saveID := c.Param("id")

    save, err := h.saveManager.GetSave(c.Request.Context(), saveID)
    if err != nil {
        c.JSON(http.StatusNotFound, ErrorResponse{
            Code:    "SAVE_NOT_FOUND",
            Message: "Save not found",
        })
        return
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    save,
    })
}

// Load 加载存档
func (h *SaveHandler) Load(c *gin.Context) {
    saveID := c.Param("id")

    resp, err := h.saveManager.LoadSave(c.Request.Context(), saveID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to load save",
        })
        return
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
        Data:    resp,
    })
}

// Delete 删除存档
func (h *SaveHandler) Delete(c *gin.Context) {
    saveID := c.Param("id")

    if err := h.saveManager.DeleteSave(c.Request.Context(), saveID); err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "Failed to delete save",
        })
        return
    }

    c.JSON(http.StatusOK, SuccessResponse{
        Success: true,
    })
}

// CreateSaveRequest 创建存档请求
type CreateSaveRequest struct {
    SessionID string `json:"sessionId" binding:"required"`
    Name      string `json:"name" binding:"required"`
}

// Save 存档
type Save struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    SessionID   string   `json:"sessionId"`
    SessionName string   `json:"sessionName"`
    CreatedAt   int64    `json:"createdAt"`
    GameTime    GameTime `json:"gameTime"`
    PlayTime    int      `json:"playTime"`
}

// SaveSummary 存档摘要
type SaveSummary struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    SessionID   string   `json:"sessionId"`
    SessionName string   `json:"sessionName"`
    CreatedAt   int64    `json:"createdAt"`
    GameTime    GameTime `json:"gameTime"`
    PlayTime    int      `json:"playTime"`
}

// LoadSaveResponse 加载存档响应
type LoadSaveResponse struct {
    SessionID string `json:"sessionId"`
}
```

---

## 6. 中间件组件

### 6.1 日志中间件

```go
// internal/api/middleware/logger.go

package middleware

import (
    "time"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// Logger 日志中间件
func Logger(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery

        // 处理请求
        c.Next()

        // 记录日志
        latency := time.Since(start)
        status := c.Writer.Status()

        fields := []zap.Field{
            zap.String("method", c.Request.Method),
            zap.String("path", path),
            zap.String("query", query),
            zap.Int("status", status),
            zap.Duration("latency", latency),
            zap.String("client_ip", c.ClientIP()),
            zap.String("user_agent", c.Request.UserAgent()),
            zap.String("request_id", c.GetString("request_id")),
        }

        if status >= 500 {
            logger.Error("HTTP request", fields...)
        } else if status >= 400 {
            logger.Warn("HTTP request", fields...)
        } else {
            logger.Info("HTTP request", fields...)
        }
    }
}
```

### 6.2 CORS 中间件

```go
// internal/api/middleware/cors.go

package middleware

import (
    "github.com/gin-gonic/gin"
)

// CORS CORS 中间件
func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
        c.Header("Access-Control-Expose-Headers", "Content-Length")
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Max-Age", "86400")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}
```

### 6.3 错误恢复中间件

```go
// internal/api/middleware/recovery.go

package middleware

import (
    "net/http"
    "runtime/debug"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// Recovery 错误恢复中间件
func Recovery(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // 记录堆栈
                logger.Error("Panic recovered",
                    zap.Any("error", err),
                    zap.String("stack", string(debug.Stack())),
                )

                // 返回错误
                c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                    "code":    "INTERNAL_ERROR",
                    "message": "Internal server error",
                })
            }
        }()

        c.Next()
    }
}
```

### 6.4 请求 ID 中间件

```go
// internal/api/middleware/request_id.go

package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

// RequestID 请求 ID 中间件
func RequestID() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 从 header 获取或生成新的
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }

        c.Set("request_id", requestID)
        c.Header("X-Request-ID", requestID)

        c.Next()
    }
}
```

---

## 7. 静态文件服务

```go
// internal/api/static/server.go

package static

import (
    "net/http"
    "os"
    "path/filepath"

    "github.com/gin-gonic/gin"
)

// Server 静态文件服务器
type Server struct {
    rootDir string
    index   string
}

// NewServer 创建静态文件服务器
func NewServer(rootDir, index string) *Server {
    return &Server{
        rootDir: rootDir,
        index:   index,
    }
}

// Register 注册路由
func (s *Server) Register(engine *gin.Engine) {
    // 静态资源
    engine.Static("/assets", filepath.Join(s.rootDir, "assets"))

    // HTML 文件
    engine.GET("/", s.serveIndex)
    engine.NoRoute(s.serveIndex)
}

// serveIndex 服务 index.html
func (s *Server) serveIndex(c *gin.Context) {
    indexPath := filepath.Join(s.rootDir, s.index)

    // 检查文件是否存在
    if _, err := os.Stat(indexPath); os.IsNotExist(err) {
        c.String(http.StatusNotFound, "Frontend not built")
        return
    }

    c.File(indexPath)
}
```

---

## 8. 组件间通信方式

### 8.1 通信流程图

```
请求处理流程：

┌─────────────┐     HTTP Request     ┌─────────────┐
│   Web 客户端 │ ──────────────────▶ │   Router    │
└─────────────┘                     └──────┬──────┘
                                           │
                                           ├─────────────────┐
                                           │                 │
                                           ▼                 ▼
                                    ┌─────────────┐  ┌─────────────┐
                                    │  WebSocket  │  │  REST API   │
                                    │  Endpoint   │  │  Handlers   │
                                    └──────┬──────┘  └──────┬──────┘
                                           │                 │
                                           │                 │
                                           ▼                 │
                                    ┌─────────────┐          │
                                    │     Hub     │          │
                                    └──────┬──────┘          │
                                           │                 │
                                           ▼                 │
                                    ┌─────────────┐          │
                                    │   Message   │          │
                                    │   Handler   │          │
                                    └──────┬──────┘          │
                                           │                 │
                     ┌─────────────────────┼─────────────────┤
                     │                     │                 │
                     ▼                     ▼                 ▼
              ┌─────────────┐      ┌─────────────┐   ┌─────────────┐
              │   Client    │      │   Server    │   │   State     │
              │   Module    │      │   Module    │   │   Manager   │
              └─────────────┘      └─────────────┘   └─────────────┘
                     │                     │                 │
                     └─────────────────────┴─────────────────┘
                                           │
                                           │ State Update
                                           ▼
                                    ┌─────────────┐
                                    │     Hub     │
                                    └──────┬──────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │  WebSocket  │
                                    │  Broadcast  │
                                    └─────────────┘
```

### 8.2 消息流向

**WebSocket 消息流**:
1. 客户端 → WebSocket 连接 → Hub
2. Hub → MessageHandler → Client/Server Module
3. Client/Server Module → State Update
4. State Manager → Hub (通过订阅)
5. Hub → 广播给所有客户端

**REST API 消息流**:
1. 客户端 → HTTP Request → Router
2. Router → Handler → Module
3. Module → Response
4. Handler → JSON Response → 客户端

---

## 9. 状态管理设计

### 9.1 Hub 状态

```go
// HubState Hub 状态
type HubState struct {
    mu         sync.RWMutex
    clients    map[string]*Client      // clientID -> Client
    sessions   map[string][]string     // sessionID -> []clientID
    registered time.Time               // 启动时间
}

// GetStats 获取统计信息
func (h *Hub) GetStats() HubStats {
    h.mu.RLock()
    defer h.mu.RUnlock()

    return HubStats{
        ClientCount:  len(h.clients),
        SessionCount: len(h.sessions),
        Uptime:       time.Since(h.registered),
    }
}

// HubStats Hub 统计
type HubStats struct {
    ClientCount  int
    SessionCount int
    Uptime       time.Duration
}
```

### 9.2 客户端状态

```go
// ClientState 客户端状态
type ClientState struct {
    ID           string
    SessionID    string
    ConnectedAt  time.Time
    LastActivity time.Time
    BytesSent    int64
    BytesRecv    int64
    MessagesSent int
    MessagesRecv int
}
```

---

## 10. 错误处理设计

### 10.1 错误码定义

```go
// internal/api/errors.go

package api

import "net/http"

// APIError API 错误
type APIError struct {
    Code        string      `json:"code"`
    Message     string      `json:"message"`
    StatusCode  int         `json:"-"`
    Recoverable bool        `json:"recoverable"`
    Details     interface{} `json:"details,omitempty"`
}

func (e *APIError) Error() string {
    return e.Message
}

// 错误码常量
const (
    ErrCodeInvalidRequest   = "INVALID_REQUEST"
    ErrCodeInvalidMessage   = "INVALID_MESSAGE"
    ErrCodeInvalidPayload   = "INVALID_PAYLOAD"
    ErrCodeInvalidAction    = "INVALID_ACTION"
    ErrCodeInvalidOperation = "INVALID_OPERATION"
    ErrCodeMissingPosition  = "MISSING_POSITION"
    ErrCodeMissingTargetID  = "MISSING_TARGET_ID"
    ErrCodeUnknownMessage   = "UNKNOWN_MESSAGE_TYPE"
    ErrCodeClientNotFound   = "CLIENT_NOT_FOUND"
    ErrCodeSessionNotFound  = "SESSION_NOT_FOUND"
    ErrCodeTooManyClients   = "TOO_MANY_CLIENTS"
    ErrCodeInternalError    = "INTERNAL_ERROR"
)

// 预定义错误
var (
    ErrInvalidRequest    = &APIError{Code: ErrCodeInvalidRequest, Message: "Invalid request", StatusCode: http.StatusBadRequest}
    ErrInvalidMessage    = &APIError{Code: ErrCodeInvalidMessage, Message: "Invalid message format", StatusCode: http.StatusBadRequest}
    ErrInvalidPayload    = &APIError{Code: ErrCodeInvalidPayload, Message: "Invalid payload", StatusCode: http.StatusBadRequest}
    ErrInvalidAction     = &APIError{Code: ErrCodeInvalidAction, Message: "Invalid action", StatusCode: http.StatusBadRequest}
    ErrInvalidOperation  = &APIError{Code: ErrCodeInvalidOperation, Message: "Invalid operation", StatusCode: http.StatusBadRequest}
    ErrMissingPosition   = &APIError{Code: ErrCodeMissingPosition, Message: "Missing position", StatusCode: http.StatusBadRequest}
    ErrMissingTargetID   = &APIError{Code: ErrCodeMissingTargetID, Message: "Missing target ID", StatusCode: http.StatusBadRequest}
    ErrUnknownMessageType = &APIError{Code: ErrCodeUnknownMessage, Message: "Unknown message type", StatusCode: http.StatusBadRequest}
)

// ErrorResponse 错误响应
type ErrorResponse struct {
    Success bool   `json:"success"`
    Error   *APIError `json:"error"`
}

// SuccessResponse 成功响应
type SuccessResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
}
```

---

## 11. 配置项

```yaml
api:
  host: "0.0.0.0"
  port: 8080

  websocket:
    read_buffer_size: 1024
    write_buffer_size: 1024
    ping_interval: 30s
    pong_wait: 60s
    max_message_size: 65536
    max_clients_per_session: 5
    client_timeout: 5m

  rest:
    read_timeout: 10s
    write_timeout: 10s
    max_request_size: 1048576  # 1MB

  static:
    enabled: true
    root: "./web/dist"
    index: "index.html"

  cors:
    enabled: true
    allowed_origins:
      - "*"
    allowed_methods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowed_headers:
      - Origin
      - Content-Type
      - Authorization
      - X-Request-ID
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
