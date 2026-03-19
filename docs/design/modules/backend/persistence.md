# 持久化模块设计

> **模块名称**: persistence
> **版本**: v2.0
> **创建日期**: 2026-03-17
> **更新日期**: 2026-03-17
> **变更说明**: 从 SQLite + BadgerDB 方案改为内存 + JSONL 持久化方案

---

## 1. 模块概述

### 1.1 模块职责

持久化模块负责游戏数据的存储和检索：
- 内存状态管理（运行时全量存储）
- JSONL 文件持久化（追加写入、便于查看）
- 存档管理（完整状态快照）
- 消息历史存储（JSONL 格式）
- 剧本/地图数据加载

### 1.2 设计理念

**为什么选择内存 + JSONL？**

| 特性 | 内存 + JSONL | SQLite + BadgerDB |
|------|-------------|-------------------|
| **性能** | 内存访问，无 I/O 延迟 | 需要数据库查询 |
| **简单性** | 无需 ORM、无需 SQL | 需要学习 ORM 和 SQL |
| **调试** | 可直接用文本编辑器查看 | 需要数据库工具 |
| **备份** | 复制文件夹即可 | 需要数据库备份 |
| **依赖** | 仅 Go 标准库 | 需要额外依赖 |

### 1.3 模块边界

**包含**：
- 内存状态容器管理
- JSONL 文件追加写入
- 存档创建和加载
- 文件系统操作

**不包含**：
- 业务逻辑（由其他模块负责）
- 数据验证（由各模块负责）
- 并发控制（由状态管理器负责）

---

## 2. 目录结构

```
internal/persistence/
├── manager.go             # 持久化管理器（核心）
├── state.go               # 状态快照管理
├── messages.go            # 消息追加写入
├── save.go                # 存档管理
├── file_loader.go         # 文件加载器
└── backup.go              # 备份管理
```

**数据文件结构**：

```
data/
├── sessions/
│   └── {session_id}/
│       ├── state.jsonl          # 游戏状态快照（每次保存覆盖）
│       ├── messages.jsonl       # 消息历史（追加写入）
│       └── events.jsonl         # 游戏事件日志（追加写入）
├── saves/
│   ├── save_001.json            # 手动存档（完整快照）
│   ├── save_002.json
│   └── autosave.json            # 自动存档
├── scenarios/                   # 剧本数据（只读）
│   └── lost_mine_of_phandelver/
│       ├── scenario.yaml
│       ├── chapters/
│       └── npcs/
└── maps/                        # 地图数据（只读）
    └── *.json
```

---

## 3. 数据格式设计

### 3.1 JSONL 状态快照格式

每行是一个完整的游戏状态快照：

```jsonl
{"type":"state_snapshot","timestamp":"2026-03-17T10:00:00Z","version":"1.0","data":{"sessionId":"abc123","scenarioId":"lmop","gameTime":{"days":1,"hours":8,"minutes":0},"party":[...],"flags":{},"variables":{}}}
```

### 3.2 JSONL 消息格式

消息采用追加写入，每行一条消息：

```jsonl
{"type":"message","timestamp":"2026-03-17T10:00:05Z","role":"user","content":"我想创建一个精灵法师"}
{"type":"message","timestamp":"2026-03-17T10:00:10Z","role":"assistant","content":"好的，让我们开始创建...","toolCalls":[{"id":"tc1","name":"create_character","arguments":{...}}]}
{"type":"message","timestamp":"2026-03-17T10:00:15Z","role":"tool","toolCallId":"tc1","content":"{\"success\":true,\"characterId\":\"char_001\"}"}
```

### 3.3 JSONL 事件格式

记录游戏中的重要事件：

```jsonl
{"type":"dice_roll","timestamp":"2026-03-17T10:01:00Z","formula":"1d20+5","result":18,"description":"攻击检定"}
{"type":"state_change","timestamp":"2026-03-17T10:01:05Z","path":"party.0.hp","oldValue":10,"newValue":8}
{"type":"combat_start","timestamp":"2026-03-17T10:02:00Z","participants":["char_001","goblin_01","goblin_02"]}
{"type":"combat_end","timestamp":"2026-03-17T10:05:00Z","result":"victory","xp":200}
```

### 3.4 存档文件格式

存档是完整的游戏状态快照（JSON 格式）：

```json
{
  "version": "1.0",
  "saveId": "save_001",
  "saveName": "进入矿坑前",
  "createdAt": "2026-03-17T10:30:00Z",
  "sessionId": "abc123",
  "scenarioId": "lmop",
  "gameTime": {
    "days": 3,
    "hours": 14,
    "minutes": 30
  },
  "state": {
    "party": [...],
    "npcs": {...},
    "flags": {...},
    "variables": {...},
    "currentMapId": "map_cragmaw",
    "combat": null
  },
  "metadata": {
    "playTime": "4h30m",
    "totalMessages": 156,
    "version": "0.2.0"
  }
}
```

---

## 4. 核心组件设计

### 4.1 持久化管理器

```go
// internal/persistence/manager.go

// Manager 持久化管理器
type Manager struct {
    config       *Config
    stateManager *state.Manager

    // 文件路径
    sessionsPath string
    savesPath    string

    // 文件句柄缓存
    messageFiles map[string]*os.File // sessionId -> file
    mu           sync.RWMutex
}

// Config 持久化配置
type Config struct {
    BasePath      string // 数据根目录
    SessionsPath  string // 会话数据目录
    SavesPath     string // 存档目录
    AutoSave      bool   // 是否自动保存
    AutoSaveInterval time.Duration // 自动保存间隔
}

// NewManager 创建持久化管理器
func NewManager(cfg *Config, stateManager *state.Manager) (*Manager, error) {
    // 确保目录存在
    if err := os.MkdirAll(cfg.SessionsPath, 0755); err != nil {
        return nil, err
    }
    if err := os.MkdirAll(cfg.SavesPath, 0755); err != nil {
        return nil, err
    }

    return &Manager{
        config:       cfg,
        stateManager: stateManager,
        sessionsPath: cfg.SessionsPath,
        savesPath:    cfg.SavesPath,
        messageFiles: make(map[string]*os.File),
    }, nil
}

// InitializeSession 初始化新会话的存储
func (m *Manager) InitializeSession(sessionID string) error {
    sessionDir := filepath.Join(m.sessionsPath, sessionID)
    if err := os.MkdirAll(sessionDir, 0755); err != nil {
        return err
    }

    // 创建空的 messages.jsonl 文件
    messagesPath := filepath.Join(sessionDir, "messages.jsonl")
    file, err := os.OpenFile(messagesPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return err
    }

    m.mu.Lock()
    m.messageFiles[sessionID] = file
    m.mu.Unlock()

    return nil
}

// Close 关闭所有文件句柄
func (m *Manager) Close() error {
    m.mu.Lock()
    defer m.mu.Unlock()

    var errs []error
    for _, file := range m.messageFiles {
        if err := file.Close(); err != nil {
            errs = append(errs, err)
        }
    }

    if len(errs) > 0 {
        return fmt.Errorf("close errors: %v", errs)
    }
    return nil
}
```

### 4.2 状态快照管理

```go
// internal/persistence/state.go

// StateSnapshot 状态快照
type StateSnapshot struct {
    Type      string          `json:"type"`      // "state_snapshot"
    Timestamp time.Time       `json:"timestamp"`
    Version   string          `json:"version"`
    Data      json.RawMessage `json:"data"`      // 完整游戏状态
}

// SaveState 保存游戏状态快照
func (m *Manager) SaveState(sessionID string) error {
    // 获取当前游戏状态
    gameState := m.stateManager.GetGameState(sessionID)

    // 序列化状态
    stateData, err := json.Marshal(gameState)
    if err != nil {
        return fmt.Errorf("marshal state: %w", err)
    }

    // 创建快照
    snapshot := StateSnapshot{
        Type:      "state_snapshot",
        Timestamp: time.Now(),
        Version:   "1.0",
        Data:      stateData,
    }

    // 序列化快照
    snapshotData, err := json.Marshal(snapshot)
    if err != nil {
        return fmt.Errorf("marshal snapshot: %w", err)
    }

    // 写入文件（覆盖）
    statePath := filepath.Join(m.sessionsPath, sessionID, "state.jsonl")
    if err := os.WriteFile(statePath, append(snapshotData, '\n'), 0644); err != nil {
        return fmt.Errorf("write state: %w", err)
    }

    return nil
}

// LoadState 加载游戏状态快照
func (m *Manager) LoadState(sessionID string) (*state.GameState, error) {
    statePath := filepath.Join(m.sessionsPath, sessionID, "state.jsonl")

    data, err := os.ReadFile(statePath)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil // 没有快照，返回 nil
        }
        return nil, fmt.Errorf("read state: %w", err)
    }

    var snapshot StateSnapshot
    if err := json.Unmarshal(data, &snapshot); err != nil {
        return nil, fmt.Errorf("unmarshal snapshot: %w", err)
    }

    var gameState state.GameState
    if err := json.Unmarshal(snapshot.Data, &gameState); err != nil {
        return nil, fmt.Errorf("unmarshal state: %w", err)
    }

    return &gameState, nil
}
```

### 4.3 消息追加写入

```go
// internal/persistence/messages.go

// MessageEntry 消息条目
type MessageEntry struct {
    Type      string    `json:"type"`      // "message"
    Timestamp time.Time `json:"timestamp"`
    Role      string    `json:"role"`      // "user", "assistant", "tool"
    Content   string    `json:"content"`

    // 工具调用相关
    ToolCallID string     `json:"toolCallId,omitempty"`
    ToolCalls  []ToolCall `json:"toolCalls,omitempty"`
}

// ToolCall 工具调用
type ToolCall struct {
    ID        string                 `json:"id"`
    Name      string                 `json:"name"`
    Arguments map[string]interface{} `json:"arguments"`
}

// AppendMessage 追加消息到 JSONL 文件
func (m *Manager) AppendMessage(sessionID string, msg *MessageEntry) error {
    m.mu.RLock()
    file, ok := m.messageFiles[sessionID]
    m.mu.RUnlock()

    if !ok {
        // 打开或创建文件
        sessionDir := filepath.Join(m.sessionsPath, sessionID)
        messagesPath := filepath.Join(sessionDir, "messages.jsonl")

        var err error
        file, err = os.OpenFile(messagesPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
        if err != nil {
            return fmt.Errorf("open messages file: %w", err)
        }

        m.mu.Lock()
        m.messageFiles[sessionID] = file
        m.mu.Unlock()
    }

    // 设置时间戳
    if msg.Timestamp.IsZero() {
        msg.Timestamp = time.Now()
    }
    msg.Type = "message"

    // 序列化消息
    data, err := json.Marshal(msg)
    if err != nil {
        return fmt.Errorf("marshal message: %w", err)
    }

    // 追加写入
    if _, err := file.Write(append(data, '\n')); err != nil {
        return fmt.Errorf("write message: %w", err)
    }

    // 确保写入磁盘
    return file.Sync()
}

// LoadMessages 加载消息历史
func (m *Manager) LoadMessages(sessionID string, limit int) ([]*MessageEntry, error) {
    messagesPath := filepath.Join(m.sessionsPath, sessionID, "messages.jsonl")

    file, err := os.Open(messagesPath)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, fmt.Errorf("open messages: %w", err)
    }
    defer file.Close()

    var messages []*MessageEntry
    scanner := bufio.NewScanner(file)

    // 如果有限制，先读取到切片中
    var allLines []string
    for scanner.Scan() {
        allLines = append(allLines, scanner.Text())
    }

    if err := scanner.Err(); err != nil {
        return nil, fmt.Errorf("scan messages: %w", err)
    }

    // 确定起始位置
    start := 0
    if limit > 0 && len(allLines) > limit {
        start = len(allLines) - limit
    }

    // 解析消息
    for i := start; i < len(allLines); i++ {
        var msg MessageEntry
        if err := json.Unmarshal([]byte(allLines[i]), &msg); err != nil {
            log.Warn("skip invalid message line", "error", err)
            continue
        }
        messages = append(messages, &msg)
    }

    return messages, nil
}
```

### 4.4 存档管理

```go
// internal/persistence/save.go

// SaveFile 存档文件结构
type SaveFile struct {
    Version   string          `json:"version"`
    SaveID    string          `json:"saveId"`
    SaveName  string          `json:"saveName"`
    CreatedAt time.Time       `json:"createdAt"`
    SessionID string          `json:"sessionId"`
    ScenarioID string         `json:"scenarioId"`
    GameTime  GameTime        `json:"gameTime"`
    State     json.RawMessage `json:"state"`
    Metadata  SaveMetadata    `json:"metadata"`
}

// SaveMetadata 存档元数据
type SaveMetadata struct {
    PlayTime      string `json:"playTime"`
    TotalMessages int    `json:"totalMessages"`
    Version       string `json:"version"`
}

// GameTime 游戏时间
// 注意：字段名与 shared-types.md 保持一致
type GameTime struct {
    Days    int `json:"days"`
    Hours   int `json:"hours"`
    Minutes int `json:"minutes"`
}

// CreateSave 创建存档
func (m *Manager) CreateSave(sessionID, saveName string) (*SaveFile, error) {
    // 获取当前状态
    gameState := m.stateManager.GetGameState(sessionID)

    // 序列化状态
    stateData, err := json.MarshalIndent(gameState, "", "  ")
    if err != nil {
        return nil, fmt.Errorf("marshal state: %w", err)
    }

    // 生成存档 ID
    saveID := fmt.Sprintf("save_%s", time.Now().Format("20060102_150405"))

    // 创建存档文件
    save := &SaveFile{
        Version:    "1.0",
        SaveID:     saveID,
        SaveName:   saveName,
        CreatedAt:  time.Now(),
        SessionID:  sessionID,
        ScenarioID: gameState.ScenarioID,
        GameTime:   gameState.GameTime,
        State:      stateData,
        Metadata: SaveMetadata{
            PlayTime:      gameState.PlayTime,
            TotalMessages: gameState.TotalMessages,
            Version:       "0.1.0",
        },
    }

    // 序列化存档
    saveData, err := json.MarshalIndent(save, "", "  ")
    if err != nil {
        return nil, fmt.Errorf("marshal save: %w", err)
    }

    // 写入文件
    savePath := filepath.Join(m.savesPath, saveID+".json")
    if err := os.WriteFile(savePath, saveData, 0644); err != nil {
        return nil, fmt.Errorf("write save: %w", err)
    }

    return save, nil
}

// LoadSave 加载存档
func (m *Manager) LoadSave(saveID string) (*state.GameState, error) {
    savePath := filepath.Join(m.savesPath, saveID+".json")

    data, err := os.ReadFile(savePath)
    if err != nil {
        return nil, fmt.Errorf("read save: %w", err)
    }

    var save SaveFile
    if err := json.Unmarshal(data, &save); err != nil {
        return nil, fmt.Errorf("unmarshal save: %w", err)
    }

    var gameState state.GameState
    if err := json.Unmarshal(save.State, &gameState); err != nil {
        return nil, fmt.Errorf("unmarshal state: %w", err)
    }

    return &gameState, nil
}

// ListSaves 列出所有存档
func (m *Manager) ListSaves() ([]*SaveFile, error) {
    entries, err := os.ReadDir(m.savesPath)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, fmt.Errorf("read saves dir: %w", err)
    }

    var saves []*SaveFile
    for _, entry := range entries {
        if !strings.HasSuffix(entry.Name(), ".json") {
            continue
        }

        savePath := filepath.Join(m.savesPath, entry.Name())
        data, err := os.ReadFile(savePath)
        if err != nil {
            log.Warn("skip unreadable save", "path", savePath)
            continue
        }

        var save SaveFile
        if err := json.Unmarshal(data, &save); err != nil {
            log.Warn("skip invalid save", "path", savePath)
            continue
        }

        saves = append(saves, &save)
    }

    // 按时间倒序排列
    sort.Slice(saves, func(i, j int) bool {
        return saves[i].CreatedAt.After(saves[j].CreatedAt)
    })

    return saves, nil
}

// DeleteSave 删除存档
func (m *Manager) DeleteSave(saveID string) error {
    savePath := filepath.Join(m.savesPath, saveID+".json")
    return os.Remove(savePath)
}
```

### 4.5 事件日志

```go
// internal/persistence/events.go

// EventEntry 事件条目
type EventEntry struct {
    Type      string                 `json:"type"`
    Timestamp time.Time              `json:"timestamp"`
    Data      map[string]interface{} `json:"data"`
}

// AppendEvent 追加事件到日志
func (m *Manager) AppendEvent(sessionID string, eventType string, data map[string]interface{}) error {
    eventsPath := filepath.Join(m.sessionsPath, sessionID, "events.jsonl")

    file, err := os.OpenFile(eventsPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return fmt.Errorf("open events file: %w", err)
    }
    defer file.Close()

    event := EventEntry{
        Type:      eventType,
        Timestamp: time.Now(),
        Data:      data,
    }

    eventData, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("marshal event: %w", err)
    }

    if _, err := file.Write(append(eventData, '\n')); err != nil {
        return fmt.Errorf("write event: %w", err)
    }

    return nil
}

// 常用事件记录函数

// LogDiceRoll 记录掷骰事件
func (m *Manager) LogDiceRoll(sessionID, formula string, result int, description string) error {
    return m.AppendEvent(sessionID, "dice_roll", map[string]interface{}{
        "formula":     formula,
        "result":      result,
        "description": description,
    })
}

// LogStateChange 记录状态变更
func (m *Manager) LogStateChange(sessionID, path string, oldValue, newValue interface{}) error {
    return m.AppendEvent(sessionID, "state_change", map[string]interface{}{
        "path":     path,
        "oldValue": oldValue,
        "newValue": newValue,
    })
}

// LogCombatStart 记录战斗开始
func (m *Manager) LogCombatStart(sessionID string, participants []string) error {
    return m.AppendEvent(sessionID, "combat_start", map[string]interface{}{
        "participants": participants,
    })
}

// LogCombatEnd 记录战斗结束
func (m *Manager) LogCombatEnd(sessionID, result string, xp int) error {
    return m.AppendEvent(sessionID, "combat_end", map[string]interface{}{
        "result": result,
        "xp":    xp,
    })
}
```

---

## 5. 启动和恢复流程

### 5.1 应用启动流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       应用启动流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                             │
│   │  启动应用    │                                             │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐                                             │
│   │ 创建持久化管理器│                                           │
│   │ NewManager   │                                             │
│   └───────┬──────┘                                             │
│           │                                                     │
│           ▼                                                     │
│   ┌──────────────┐     是否有自动存档？                          │
│   │ 检查自动存档  │                                             │
│   └───────┬──────┘                                             │
│           │                                                     │
│     ┌─────┴─────┐                                               │
│     │           │                                               │
│   有 │           │ 无                                            │
│     ▼           ▼                                               │
│ ┌─────────┐ ┌─────────┐                                        │
│ │加载存档  │ │显示新建  │                                        │
│ │恢复状态  │ │会话界面  │                                        │
│ └────┬────┘ └─────────┘                                        │
│      │                                                          │
│      ▼                                                          │
│ ┌─────────┐                                                    │
│ │加载消息  │                                                    │
│ │历史记录  │                                                    │
│ └────┬────┘                                                    │
│      │                                                          │
│      ▼                                                          │
│ ┌─────────┐                                                    │
│ │ 启动完成 │                                                    │
│ └─────────┘                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 恢复会话流程

```go
// 恢复会话
func (m *Manager) RestoreSession(sessionID string) (*state.GameState, []*MessageEntry, error) {
    // 1. 加载状态快照
    gameState, err := m.LoadState(sessionID)
    if err != nil {
        return nil, nil, fmt.Errorf("load state: %w", err)
    }

    if gameState == nil {
        return nil, nil, nil // 新会话
    }

    // 2. 加载消息历史（最近 100 条）
    messages, err := m.LoadMessages(sessionID, 100)
    if err != nil {
        log.Warn("load messages failed, continuing without history", "error", err)
    }

    return gameState, messages, nil
}
```

---

## 6. 自动保存机制

```go
// internal/persistence/autosave.go

// AutoSaver 自动保存器
type AutoSaver struct {
    manager   *Manager
    interval  time.Duration
    stopCh    chan struct{}
    running   bool
    mu        sync.Mutex
}

// NewAutoSaver 创建自动保存器
func NewAutoSaver(manager *Manager, interval time.Duration) *AutoSaver {
    return &AutoSaver{
        manager:  manager,
        interval: interval,
        stopCh:   make(chan struct{}),
    }
}

// Start 启动自动保存
func (as *AutoSaver) Start(sessionID string) {
    as.mu.Lock()
    defer as.mu.Unlock()

    if as.running {
        return
    }

    as.running = true
    go func() {
        ticker := time.NewTicker(as.interval)
        defer ticker.Stop()

        for {
            select {
            case <-ticker.C:
                if err := as.manager.SaveState(sessionID); err != nil {
                    log.Error("auto save failed", "error", err)
                } else {
                    log.Debug("auto saved", "sessionId", sessionID)
                }
            case <-as.stopCh:
                return
            }
        }
    }()
}

// Stop 停止自动保存
func (as *AutoSaver) Stop() {
    as.mu.Lock()
    defer as.mu.Unlock()

    if as.running {
        close(as.stopCh)
        as.running = false
    }
}
```

---

## 7. 备份和恢复

### 7.1 完整备份

```go
// internal/persistence/backup.go

// CreateBackup 创建完整备份
func (m *Manager) CreateBackup(backupPath string) error {
    // 创建备份目录
    timestamp := time.Now().Format("20060102_150405")
    backupDir := filepath.Join(backupPath, fmt.Sprintf("backup_%s", timestamp))

    if err := os.MkdirAll(backupDir, 0755); err != nil {
        return fmt.Errorf("create backup dir: %w", err)
    }

    // 复制 sessions 目录
    if err := copyDir(m.sessionsPath, filepath.Join(backupDir, "sessions")); err != nil {
        return fmt.Errorf("backup sessions: %w", err)
    }

    // 复制 saves 目录
    if err := copyDir(m.savesPath, filepath.Join(backupDir, "saves")); err != nil {
        return fmt.Errorf("backup saves: %w", err)
    }

    // 写入备份信息
    info := map[string]interface{}{
        "timestamp": timestamp,
        "version":   "1.0",
    }
    infoData, _ := json.MarshalIndent(info, "", "  ")
    os.WriteFile(filepath.Join(backupDir, "backup_info.json"), infoData, 0644)

    return nil
}

// RestoreBackup 从备份恢复
func (m *Manager) RestoreBackup(backupPath string) error {
    // 关闭所有打开的文件
    m.Close()

    // 清空当前数据
    os.RemoveAll(m.sessionsPath)
    os.RemoveAll(m.savesPath)

    // 从备份恢复
    if err := copyDir(filepath.Join(backupPath, "sessions"), m.sessionsPath); err != nil {
        return fmt.Errorf("restore sessions: %w", err)
    }
    if err := copyDir(filepath.Join(backupPath, "saves"), m.savesPath); err != nil {
        return fmt.Errorf("restore saves: %w", err)
    }

    return nil
}

func copyDir(src, dst string) error {
    return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }

        relPath, _ := filepath.Rel(src, path)
        dstPath := filepath.Join(dst, relPath)

        if info.IsDir() {
            return os.MkdirAll(dstPath, info.Mode())
        }

        data, err := os.ReadFile(path)
        if err != nil {
            return err
        }
        return os.WriteFile(dstPath, data, info.Mode())
    })
}
```

---

## 8. 配置项

```yaml
persistence:
  # 数据目录配置
  base_path: "./data"
  sessions_path: "./data/sessions"
  saves_path: "./data/saves"

  # 自动保存配置
  auto_save:
    enabled: true
    interval: 300s  # 5分钟

  # 消息历史配置
  messages:
    max_load: 100  # 加载时最多读取的消息数

  # 备份配置
  backup:
    enabled: true
    path: "./backups"
    max_backups: 10  # 最多保留的备份数
```

---

## 9. 错误处理

```go
// 错误类型
var (
    ErrSessionNotFound = errors.New("session not found")
    ErrSaveNotFound    = errors.New("save not found")
    ErrInvalidFormat   = errors.New("invalid file format")
    ErrWriteFailed     = errors.New("write failed")
)

// isCorruptedFile 检查文件是否损坏
func isCorruptedFile(err error) bool {
    return strings.Contains(err.Error(), "unexpected EOF") ||
           strings.Contains(err.Error(), "invalid character")
}

// repairJSONLFile 尝试修复损坏的 JSONL 文件
func repairJSONLFile(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }

    // 逐行检查，跳过损坏的行
    var validLines []string
    scanner := bufio.NewScanner(bytes.NewReader(data))
    for scanner.Scan() {
        line := scanner.Text()
        if json.Valid([]byte(line)) {
            validLines = append(validLines, line)
        }
    }

    // 重写文件
    output := strings.Join(validLines, "\n") + "\n"
    return os.WriteFile(path, []byte(output), 0644)
}
```

---

**文档版本**：v2.0
**创建日期**：2026-03-16
**更新日期**：2026-03-17
**作者**：模块设计师
