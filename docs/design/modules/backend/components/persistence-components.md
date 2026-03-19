# 持久化系统组件设计

> **模块名称**: persistence
> **版本**: v2.0
> **创建日期**: 2026-03-17
> **更新说明**: 从 SQLite + BadgerDB 方案改为内存 + JSONL 持久化方案

---

## 1. 组件概述

### 1.1 组件职责划分

持久化系统由以下核心组件组成：

| 组件 | 职责 | 文件 |
|------|------|------|
| **Manager** | 持久化管理器（核心协调） | manager.go |
| **StateManager** | 状态快照管理 | state.go |
| **MessageAppender** | 消息追加写入 | messages.go |
| **EventManager** | 事件日志记录 | events.go |
| **SaveManager** | 存档创建、加载、删除 | save.go |
| **AutoSaver** | 自动保存机制 | autosave.go |
| **BackupManager** | 备份管理 | backup.go |
| **FileLoader** | 文件数据加载 | file_loader.go |

### 1.2 组件依赖图

```
                        ┌─────────────────────┐
                        │      Manager        │
                        │  (持久化管理器)      │
                        └──────────┬──────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  StateManager     │    │ MessageAppender  │    │  EventManager    │
│ (状态快照管理)     │    │ (消息追加写入)    │    │ (事件日志记录)    │
└───────────────────┘    └──────────────────┘    └──────────────────┘

        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   SaveManager     │    │   AutoSaver      │    │  BackupManager   │
│ (存档管理)         │    │ (自动保存)        │    │ (备份管理)        │
└───────────────────┘    └──────────────────┘    └──────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │    FileLoader       │
                        │  (文件加载器)        │
                        └─────────────────────┘
```

---

## 2. 组件接口定义

### 2.1 Manager 组件

```go
// internal/persistence/manager.go

package persistence

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sync"
    "time"

    "dnd-game/internal/shared/state"
)

// Manager 持久化管理器
type Manager struct {
    config       *Config
    stateManager *state.Manager

    // 文件路径
    sessionsPath string
    savesPath    string

    // 文件句柄缓存
    messageFiles map[string]*os.File // sessionId -> file
    eventFiles   map[string]*os.File // sessionId -> file
    mu           sync.RWMutex
}

// Config 持久化配置
type Config struct {
    BasePath         string        // 数据根目录
    SessionsPath     string        // 会话数据目录
    SavesPath        string        // 存档目录
    AutoSave         bool          // 是否自动保存
    AutoSaveInterval time.Duration // 自动保存间隔
    MaxMessagesLoad  int           // 加载时最多读取的消息数
}

// NewManager 创建持久化管理器
func NewManager(cfg *Config, stateManager *state.Manager) (*Manager, error) {
    // 使用默认配置
    if cfg == nil {
        cfg = DefaultConfig()
    }

    // 确保目录存在
    if err := os.MkdirAll(cfg.SessionsPath, 0755); err != nil {
        return nil, fmt.Errorf("create sessions dir: %w", err)
    }
    if err := os.MkdirAll(cfg.SavesPath, 0755); err != nil {
        return nil, fmt.Errorf("create saves dir: %w", err)
    }

    return &Manager{
        config:       cfg,
        stateManager: stateManager,
        sessionsPath: cfg.SessionsPath,
        savesPath:    cfg.SavesPath,
        messageFiles: make(map[string]*os.File),
        eventFiles:   make(map[string]*os.File),
    }, nil
}

// DefaultConfig 默认配置
func DefaultConfig() *Config {
    return &Config{
        BasePath:         "./data",
        SessionsPath:     "./data/sessions",
        SavesPath:        "./data/saves",
        AutoSave:         true,
        AutoSaveInterval: 5 * time.Minute,
        MaxMessagesLoad:  100,
    }
}

// InitializeSession 初始化新会话的存储
func (m *Manager) InitializeSession(sessionID string) error {
    sessionDir := filepath.Join(m.sessionsPath, sessionID)
    if err := os.MkdirAll(sessionDir, 0755); err != nil {
        return fmt.Errorf("create session dir: %w", err)
    }

    // 创建空的 messages.jsonl 文件
    messagesPath := filepath.Join(sessionDir, "messages.jsonl")
    file, err := os.OpenFile(messagesPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return fmt.Errorf("create messages file: %w", err)
    }

    m.mu.Lock()
    m.messageFiles[sessionID] = file
    m.mu.Unlock()

    // 创建空的 events.jsonl 文件
    eventsPath := filepath.Join(sessionDir, "events.jsonl")
    eventFile, err := os.OpenFile(eventsPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return fmt.Errorf("create events file: %w", err)
    }

    m.mu.Lock()
    m.eventFiles[sessionID] = eventFile
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

    for _, file := range m.eventFiles {
        if err := file.Close(); err != nil {
            errs = append(errs, err)
        }
    }

    if len(errs) > 0 {
        return fmt.Errorf("close errors: %v", errs)
    }
    return nil
}

// DeleteSession 删除会话数据
func (m *Manager) DeleteSession(sessionID string) error {
    // 关闭文件句柄
    m.mu.Lock()
    if file, ok := m.messageFiles[sessionID]; ok {
        file.Close()
        delete(m.messageFiles, sessionID)
    }
    if file, ok := m.eventFiles[sessionID]; ok {
        file.Close()
        delete(m.eventFiles, sessionID)
    }
    m.mu.Unlock()

    // 删除目录
    sessionDir := filepath.Join(m.sessionsPath, sessionID)
    return os.RemoveAll(sessionDir)
}

// GetSessionPath 获取会话目录路径
func (m *Manager) GetSessionPath(sessionID string) string {
    return filepath.Join(m.sessionsPath, sessionID)
}
```

### 2.2 StateManager 组件

```go
// internal/persistence/state.go

package persistence

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "time"

    "dnd-game/internal/shared/state"
)

// StateSnapshot 状态快照
type StateSnapshot struct {
    Type      string          `json:"type"`      // "state_snapshot"
    Timestamp time.Time       `json:"timestamp"`
    Version   string          `json:"version"`   // 快照格式版本
    Data      json.RawMessage `json:"data"`      // 完整游戏状态
}

// SaveState 保存游戏状态快照
func (m *Manager) SaveState(sessionID string) error {
    // 获取当前游戏状态
    gameState := m.stateManager.GetGameState(sessionID)
    if gameState == nil {
        return fmt.Errorf("session not found: %s", sessionID)
    }

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
    snapshotData, err := json.MarshalIndent(snapshot, "", "  ")
    if err != nil {
        return fmt.Errorf("marshal snapshot: %w", err)
    }

    // 确保目录存在
    sessionDir := filepath.Join(m.sessionsPath, sessionID)
    if err := os.MkdirAll(sessionDir, 0755); err != nil {
        return fmt.Errorf("create session dir: %w", err)
    }

    // 写入文件（覆盖）
    statePath := filepath.Join(sessionDir, "state.jsonl")
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
            return nil, nil // 没有快照，返回 nil（新会话）
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

// HasState 检查是否存在状态快照
func (m *Manager) HasState(sessionID string) bool {
    statePath := filepath.Join(m.sessionsPath, sessionID, "state.jsonl")
    _, err := os.Stat(statePath)
    return err == nil
}

// GetStateTimestamp 获取状态快照的时间戳
func (m *Manager) GetStateTimestamp(sessionID string) (time.Time, error) {
    statePath := filepath.Join(m.sessionsPath, sessionID, "state.jsonl")

    data, err := os.ReadFile(statePath)
    if err != nil {
        return time.Time{}, err
    }

    var snapshot StateSnapshot
    if err := json.Unmarshal(data, &snapshot); err != nil {
        return time.Time{}, err
    }

    return snapshot.Timestamp, nil
}
```

### 2.3 MessageAppender 组件

```go
// internal/persistence/messages.go

package persistence

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sync"
    "time"
)

// MessageEntry 消息条目
type MessageEntry struct {
    Type      string    `json:"type"`              // "message"
    Timestamp time.Time `json:"timestamp"`
    Role      string    `json:"role"`              // "user", "assistant", "tool"
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
        if err := os.MkdirAll(sessionDir, 0755); err != nil {
            return fmt.Errorf("create session dir: %w", err)
        }

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

    // 设置时间戳和类型
    if msg.Timestamp.IsZero() {
        msg.Timestamp = time.Now()
    }
    msg.Type = "message"

    // 序列化消息
    data, err := json.Marshal(msg)
    if err != nil {
        return fmt.Errorf("marshal message: %w", err)
    }

    // 追加写入（带换行）
    if _, err := fmt.Fprintln(file, string(data)); err != nil {
        return fmt.Errorf("write message: %w", err)
    }

    // 确保写入磁盘
    return file.Sync()
}

// AppendMessageBatch 批量追加消息
func (m *Manager) AppendMessageBatch(sessionID string, messages []*MessageEntry) error {
    m.mu.RLock()
    file, ok := m.messageFiles[sessionID]
    m.mu.RUnlock()

    if !ok {
        sessionDir := filepath.Join(m.sessionsPath, sessionID)
        if err := os.MkdirAll(sessionDir, 0755); err != nil {
            return fmt.Errorf("create session dir: %w", err)
        }

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

    // 批量写入
    for _, msg := range messages {
        if msg.Timestamp.IsZero() {
            msg.Timestamp = time.Now()
        }
        msg.Type = "message"

        data, err := json.Marshal(msg)
        if err != nil {
            return fmt.Errorf("marshal message: %w", err)
        }

        if _, err := fmt.Fprintln(file, string(data)); err != nil {
            return fmt.Errorf("write message: %w", err)
        }
    }

    return file.Sync()
}

// LoadMessages 加载消息历史
func (m *Manager) LoadMessages(sessionID string) ([]*MessageEntry, error) {
    return m.LoadMessagesWithLimit(sessionID, m.config.MaxMessagesLoad)
}

// LoadMessagesWithLimit 加载消息历史（带限制）
func (m *Manager) LoadMessagesWithLimit(sessionID string, limit int) ([]*MessageEntry, error) {
    messagesPath := filepath.Join(m.sessionsPath, sessionID, "messages.jsonl")

    file, err := os.Open(messagesPath)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil // 没有消息文件
        }
        return nil, fmt.Errorf("open messages: %w", err)
    }
    defer file.Close()

    var allLines []string
    scanner := bufio.NewScanner(file)
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
    var messages []*MessageEntry
    for i := start; i < len(allLines); i++ {
        var msg MessageEntry
        if err := json.Unmarshal([]byte(allLines[i]), &msg); err != nil {
            // 跳过无效行
            continue
        }
        messages = append(messages, &msg)
    }

    return messages, nil
}

// CountMessages 统计消息数量
func (m *Manager) CountMessages(sessionID string) (int, error) {
    messagesPath := filepath.Join(m.sessionsPath, sessionID, "messages.jsonl")

    file, err := os.Open(messagesPath)
    if err != nil {
        if os.IsNotExist(err) {
            return 0, nil
        }
        return 0, err
    }
    defer file.Close()

    count := 0
    scanner := bufio.NewScanner(file)
    for scanner.Scan() {
        if len(scanner.Text()) > 0 {
            count++
        }
    }

    return count, scanner.Err()
}
```

### 2.4 EventManager 组件

```go
// internal/persistence/events.go

package persistence

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "time"
)

// EventEntry 事件条目
type EventEntry struct {
    Type      string                 `json:"type"`      // 事件类型
    Timestamp time.Time              `json:"timestamp"`
    Data      map[string]interface{} `json:"data"`      // 事件数据
}

// AppendEvent 追加事件到日志
func (m *Manager) AppendEvent(sessionID string, eventType string, data map[string]interface{}) error {
    m.mu.RLock()
    file, ok := m.eventFiles[sessionID]
    m.mu.RUnlock()

    if !ok {
        sessionDir := filepath.Join(m.sessionsPath, sessionID)
        if err := os.MkdirAll(sessionDir, 0755); err != nil {
            return fmt.Errorf("create session dir: %w", err)
        }

        eventsPath := filepath.Join(sessionDir, "events.jsonl")
        var err error
        file, err = os.OpenFile(eventsPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
        if err != nil {
            return fmt.Errorf("open events file: %w", err)
        }

        m.mu.Lock()
        m.eventFiles[sessionID] = file
        m.mu.Unlock()
    }

    event := EventEntry{
        Type:      eventType,
        Timestamp: time.Now(),
        Data:      data,
    }

    eventData, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("marshal event: %w", err)
    }

    if _, err := fmt.Fprintln(file, string(eventData)); err != nil {
        return fmt.Errorf("write event: %w", err)
    }

    return file.Sync()
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

// LogCharacterCreated 记录角色创建
func (m *Manager) LogCharacterCreated(sessionID, characterID, name, race, class string) error {
    return m.AppendEvent(sessionID, "character_created", map[string]interface{}{
        "characterId": characterID,
        "name":        name,
        "race":        race,
        "class":       class,
    })
}

// LogLevelUp 记录升级
func (m *Manager) LogLevelUp(sessionID, characterID string, newLevel int) error {
    return m.AppendEvent(sessionID, "level_up", map[string]interface{}{
        "characterId": characterID,
        "newLevel":    newLevel,
    })
}

// LogItemAcquired 记录获得物品
func (m *Manager) LogItemAcquired(sessionID, characterID, itemID, itemName string) error {
    return m.AppendEvent(sessionID, "item_acquired", map[string]interface{}{
        "characterId": characterID,
        "itemId":      itemID,
        "itemName":    itemName,
    })
}

// LogSpellCast 记录施法
func (m *Manager) LogSpellCast(sessionID, casterID, spellID, spellName string, level int) error {
    return m.AppendEvent(sessionID, "spell_cast", map[string]interface{}{
        "casterId":  casterID,
        "spellId":   spellID,
        "spellName": spellName,
        "level":     level,
    })
}
```

### 2.5 SaveManager 组件

```go
// internal/persistence/save.go

package persistence

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sort"
    "strings"
    "time"

    "dnd-game/internal/shared/state"
)

// SaveFile 存档文件结构
type SaveFile struct {
    Version    string          `json:"version"`
    SaveID     string          `json:"saveId"`
    SaveName   string          `json:"saveName"`
    CreatedAt  time.Time       `json:"createdAt"`
    SessionID  string          `json:"sessionId"`
    ScenarioID string          `json:"scenarioId"`
    GameTime   GameTimeInfo    `json:"gameTime"`
    State      json.RawMessage `json:"state"`
    Metadata   SaveMetadata    `json:"metadata"`
}

// GameTimeInfo 游戏时间信息
type GameTimeInfo struct {
    Day    int    `json:"day"`
    Hour   int    `json:"hour"`
    Minute int    `json:"minute"`
    String string `json:"string"` // 可读格式 "Day 3, 14:30"
}

// SaveMetadata 存档元数据
type SaveMetadata struct {
    PlayTime      string `json:"playTime"`      // 游戏时长
    TotalMessages int    `json:"totalMessages"` // 消息总数
    Version       string `json:"version"`       // 游戏版本
}

// CreateSave 创建存档
func (m *Manager) CreateSave(sessionID, saveName string) (*SaveFile, error) {
    // 获取当前状态
    gameState := m.stateManager.GetGameState(sessionID)
    if gameState == nil {
        return nil, fmt.Errorf("session not found: %s", sessionID)
    }

    // 统计消息数
    totalMessages, _ := m.CountMessages(sessionID)

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
        GameTime: GameTimeInfo{
            Day:    gameState.GameTime.Day,
            Hour:   gameState.GameTime.Hour,
            Minute: gameState.GameTime.Minute,
            String: gameState.GameTime.String(),
        },
        State: stateData,
        Metadata: SaveMetadata{
            PlayTime:      gameState.PlayTime,
            TotalMessages: totalMessages,
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
        if os.IsNotExist(err) {
            return nil, ErrSaveNotFound
        }
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
            continue
        }

        var save SaveFile
        if err := json.Unmarshal(data, &save); err != nil {
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

    if _, err := os.Stat(savePath); os.IsNotExist(err) {
        return ErrSaveNotFound
    }

    return os.Remove(savePath)
}

// GetSaveInfo 获取存档信息（不加载完整状态）
func (m *Manager) GetSaveInfo(saveID string) (*SaveFile, error) {
    savePath := filepath.Join(m.savesPath, saveID+".json")

    data, err := os.ReadFile(savePath)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, ErrSaveNotFound
        }
        return nil, fmt.Errorf("read save: %w", err)
    }

    var save SaveFile
    if err := json.Unmarshal(data, &save); err != nil {
        return nil, fmt.Errorf("unmarshal save: %w", err)
    }

    // 清空 State 字段以节省内存
    save.State = nil

    return &save, nil
}
```

### 2.6 AutoSaver 组件

```go
// internal/persistence/autosave.go

package persistence

import (
    "sync"
    "time"
)

// AutoSaver 自动保存器
type AutoSaver struct {
    manager   *Manager
    interval  time.Duration
    sessions  map[string]chan struct{} // sessionID -> stop channel
    mu        sync.Mutex
    running   bool
}

// NewAutoSaver 创建自动保存器
func NewAutoSaver(manager *Manager, interval time.Duration) *AutoSaver {
    return &AutoSaver{
        manager:  manager,
        interval: interval,
        sessions: make(map[string]chan struct{}),
    }
}

// Start 为会话启动自动保存
func (as *AutoSaver) Start(sessionID string) {
    as.mu.Lock()
    defer as.mu.Unlock()

    // 已经在运行
    if _, ok := as.sessions[sessionID]; ok {
        return
    }

    stopCh := make(chan struct{})
    as.sessions[sessionID] = stopCh
    as.running = true

    go func() {
        ticker := time.NewTicker(as.interval)
        defer ticker.Stop()

        for {
            select {
            case <-ticker.C:
                if err := as.manager.SaveState(sessionID); err != nil {
                    // 记录错误但继续运行
                    fmt.Printf("auto save failed for session %s: %v\n", sessionID, err)
                }
            case <-stopCh:
                return
            }
        }
    }()
}

// Stop 停止会话的自动保存
func (as *AutoSaver) Stop(sessionID string) {
    as.mu.Lock()
    defer as.mu.Unlock()

    if stopCh, ok := as.sessions[sessionID]; ok {
        close(stopCh)
        delete(as.sessions, sessionID)
    }

    if len(as.sessions) == 0 {
        as.running = false
    }
}

// StopAll 停止所有自动保存
func (as *AutoSaver) StopAll() {
    as.mu.Lock()
    defer as.mu.Unlock()

    for sessionID, stopCh := range as.sessions {
        close(stopCh)
        delete(as.sessions, sessionID)
    }

    as.running = false
}

// IsRunning 检查是否在运行
func (as *AutoSaver) IsRunning() bool {
    as.mu.Lock()
    defer as.mu.Unlock()
    return as.running
}
```

### 2.7 BackupManager 组件

```go
// internal/persistence/backup.go

package persistence

import (
    "encoding/json"
    "fmt"
    "io"
    "os"
    "path/filepath"
    "sort"
    "strings"
    "time"
)

// BackupInfo 备份信息
type BackupInfo struct {
    Name      string    `json:"name"`
    Path      string    `json:"path"`
    CreatedAt time.Time `json:"createdAt"`
    Size      int64     `json:"size"`
}

// CreateBackup 创建完整备份
func (m *Manager) CreateBackup() (*BackupInfo, error) {
    timestamp := time.Now().Format("20060102_150405")
    backupName := fmt.Sprintf("backup_%s", timestamp)

    // 在 backups 子目录下创建
    backupDir := filepath.Join(m.config.BasePath, "backups", backupName)

    if err := os.MkdirAll(backupDir, 0755); err != nil {
        return nil, fmt.Errorf("create backup dir: %w", err)
    }

    // 复制 sessions 目录
    if err := copyDir(m.sessionsPath, filepath.Join(backupDir, "sessions")); err != nil {
        return nil, fmt.Errorf("backup sessions: %w", err)
    }

    // 复制 saves 目录
    if err := copyDir(m.savesPath, filepath.Join(backupDir, "saves")); err != nil {
        return nil, fmt.Errorf("backup saves: %w", err)
    }

    // 写入备份信息
    info := map[string]interface{}{
        "name":      backupName,
        "createdAt": time.Now().Format(time.RFC3339),
        "version":   "1.0",
    }
    infoData, _ := json.MarshalIndent(info, "", "  ")
    os.WriteFile(filepath.Join(backupDir, "backup_info.json"), infoData, 0644)

    // 计算备份大小
    size, _ := dirSize(backupDir)

    return &BackupInfo{
        Name:      backupName,
        Path:      backupDir,
        CreatedAt: time.Now(),
        Size:      size,
    }, nil
}

// ListBackups 列出所有备份
func (m *Manager) ListBackups() ([]*BackupInfo, error) {
    backupsDir := filepath.Join(m.config.BasePath, "backups")

    entries, err := os.ReadDir(backupsDir)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, nil
        }
        return nil, fmt.Errorf("read backups dir: %w", err)
    }

    var backups []*BackupInfo
    for _, entry := range entries {
        if !entry.IsDir() {
            continue
        }

        backupPath := filepath.Join(backupsDir, entry.Name())

        // 读取备份信息
        infoPath := filepath.Join(backupPath, "backup_info.json")
        var createdAt time.Time

        if data, err := os.ReadFile(infoPath); err == nil {
            var info map[string]interface{}
            if json.Unmarshal(data, &info) == nil {
                if t, ok := info["createdAt"].(string); ok {
                    createdAt, _ = time.Parse(time.RFC3339, t)
                }
            }
        }

        if createdAt.IsZero() {
            createdAt = time.Now()
        }

        size, _ := dirSize(backupPath)

        backups = append(backups, &BackupInfo{
            Name:      entry.Name(),
            Path:      backupPath,
            CreatedAt: createdAt,
            Size:      size,
        })
    }

    // 按时间倒序排列
    sort.Slice(backups, func(i, j int) bool {
        return backups[i].CreatedAt.After(backups[j].CreatedAt)
    })

    return backups, nil
}

// RestoreBackup 从备份恢复
func (m *Manager) RestoreBackup(backupName string) error {
    backupDir := filepath.Join(m.config.BasePath, "backups", backupName)

    if _, err := os.Stat(backupDir); os.IsNotExist(err) {
        return fmt.Errorf("backup not found: %s", backupName)
    }

    // 关闭所有打开的文件
    m.Close()

    // 清空当前数据
    os.RemoveAll(m.sessionsPath)
    os.RemoveAll(m.savesPath)

    // 从备份恢复
    if err := copyDir(filepath.Join(backupDir, "sessions"), m.sessionsPath); err != nil {
        return fmt.Errorf("restore sessions: %w", err)
    }
    if err := copyDir(filepath.Join(backupDir, "saves"), m.savesPath); err != nil {
        return fmt.Errorf("restore saves: %w", err)
    }

    return nil
}

// DeleteBackup 删除备份
func (m *Manager) DeleteBackup(backupName string) error {
    backupDir := filepath.Join(m.config.BasePath, "backups", backupName)
    return os.RemoveAll(backupDir)
}

// CleanupOldBackups 清理旧备份（保留最近 N 个）
func (m *Manager) CleanupOldBackups(keepCount int) error {
    backups, err := m.ListBackups()
    if err != nil {
        return err
    }

    if len(backups) <= keepCount {
        return nil
    }

    // 删除旧备份
    for i := keepCount; i < len(backups); i++ {
        if err := os.RemoveAll(backups[i].Path); err != nil {
            return fmt.Errorf("delete backup %s: %w", backups[i].Name, err)
        }
    }

    return nil
}

// 辅助函数

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

        return copyFile(path, dstPath)
    })
}

func copyFile(src, dst string) error {
    srcFile, err := os.Open(src)
    if err != nil {
        return err
    }
    defer srcFile.Close()

    dstFile, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer dstFile.Close()

    _, err = io.Copy(dstFile, srcFile)
    return err
}

func dirSize(path string) (int64, error) {
    var size int64
    err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }
        if !info.IsDir() {
            size += info.Size()
        }
        return nil
    })
    return size, err
}
```

### 2.8 FileLoader 组件

```go
// internal/persistence/file_loader.go

package persistence

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "strings"

    "gopkg.in/yaml.v3"
)

// FileLoader 文件加载器
type FileLoader struct {
    basePath string
}

// NewFileLoader 创建文件加载器
func NewFileLoader(basePath string) *FileLoader {
    return &FileLoader{
        basePath: basePath,
    }
}

// LoadJSON 加载 JSON 文件
func (fl *FileLoader) LoadJSON(relativePath string, dest interface{}) error {
    fullPath := filepath.Join(fl.basePath, relativePath)

    data, err := os.ReadFile(fullPath)
    if err != nil {
        return fmt.Errorf("read file: %w", err)
    }

    if err := json.Unmarshal(data, dest); err != nil {
        return fmt.Errorf("unmarshal JSON: %w", err)
    }

    return nil
}

// LoadYAML 加载 YAML 文件
func (fl *FileLoader) LoadYAML(relativePath string, dest interface{}) error {
    fullPath := filepath.Join(fl.basePath, relativePath)

    data, err := os.ReadFile(fullPath)
    if err != nil {
        return fmt.Errorf("read file: %w", err)
    }

    if err := yaml.Unmarshal(data, dest); err != nil {
        return fmt.Errorf("unmarshal YAML: %w", err)
    }

    return nil
}

// LoadJSONL 加载 JSONL 文件（返回所有行）
func (fl *FileLoader) LoadJSONL(relativePath string) ([]json.RawMessage, error) {
    fullPath := filepath.Join(fl.basePath, relativePath)

    file, err := os.Open(fullPath)
    if err != nil {
        return nil, fmt.Errorf("open file: %w", err)
    }
    defer file.Close()

    var lines []json.RawMessage
    scanner := NewScanner(file)

    for scanner.Scan() {
        line := strings.TrimSpace(scanner.Text())
        if len(line) == 0 {
            continue
        }
        lines = append(lines, json.RawMessage(line))
    }

    if err := scanner.Err(); err != nil {
        return nil, fmt.Errorf("scan file: %w", err)
    }

    return lines, nil
}

// ListFiles 列出目录下的文件
func (fl *FileLoader) ListFiles(relativePath string) ([]string, error) {
    fullPath := filepath.Join(fl.basePath, relativePath)

    entries, err := os.ReadDir(fullPath)
    if err != nil {
        return nil, err
    }

    var files []string
    for _, entry := range entries {
        if !entry.IsDir() {
            files = append(files, entry.Name())
        }
    }

    return files, nil
}

// ListDirectories 列出目录下的子目录
func (fl *FileLoader) ListDirectories(relativePath string) ([]string, error) {
    fullPath := filepath.Join(fl.basePath, relativePath)

    entries, err := os.ReadDir(fullPath)
    if err != nil {
        return nil, err
    }

    var dirs []string
    for _, entry := range entries {
        if entry.IsDir() {
            dirs = append(dirs, entry.Name())
        }
    }

    return dirs, nil
}

// FileExists 检查文件是否存在
func (fl *FileLoader) FileExists(relativePath string) bool {
    fullPath := filepath.Join(fl.basePath, relativePath)
    _, err := os.Stat(fullPath)
    return err == nil
}

// DirectoryExists 检查目录是否存在
func (fl *FileLoader) DirectoryExists(relativePath string) bool {
    fullPath := filepath.Join(fl.basePath, relativePath)
    info, err := os.Stat(fullPath)
    return err == nil && info.IsDir()
}

// GetFullPath 获取完整路径
func (fl *FileLoader) GetFullPath(relativePath string) string {
    return filepath.Join(fl.basePath, relativePath)
}
```

---

## 3. 错误处理设计

### 3.1 错误类型

```go
// internal/persistence/errors.go

package persistence

import "errors"

var (
    ErrSessionNotFound    = errors.New("session not found")
    ErrSaveNotFound       = errors.New("save not found")
    ErrBackupNotFound     = errors.New("backup not found")
    ErrInvalidFormat      = errors.New("invalid file format")
    ErrWriteFailed        = errors.New("write failed")
    ErrReadFailed         = errors.New("read failed")
    ErrFileCorrupted      = errors.New("file corrupted")
)

// PersistenceError 持久化错误
type PersistenceError struct {
    Op      string // 操作
    Path    string // 文件路径
    Err     error  // 原始错误
}

func (e *PersistenceError) Error() string {
    return fmt.Sprintf("persistence %s failed on %s: %v", e.Op, e.Path, e.Err)
}

func (e *PersistenceError) Unwrap() error {
    return e.Err
}
```

### 3.2 文件修复

```go
// internal/persistence/repair.go

package persistence

import (
    "bufio"
    "encoding/json"
    "os"
    "strings"
)

// RepairJSONLFile 尝试修复损坏的 JSONL 文件
func RepairJSONLFile(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }

    // 逐行检查，跳过损坏的行
    var validLines []string
    scanner := bufio.NewScanner(strings.NewReader(string(data)))
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

// ValidateJSONLFile 验证 JSONL 文件
func ValidateJSONLFile(path string) (valid, invalid int, err error) {
    file, err := os.Open(path)
    if err != nil {
        return 0, 0, err
    }
    defer file.Close()

    scanner := bufio.NewScanner(file)
    for scanner.Scan() {
        line := scanner.Text()
        if len(line) == 0 {
            continue
        }
        if json.Valid([]byte(line)) {
            valid++
        } else {
            invalid++
        }
    }

    return valid, invalid, scanner.Err()
}
```

---

## 4. 配置项

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
    path: "./data/backups"
    max_backups: 10  # 最多保留的备份数
```

---

**文档版本**: v2.0
**创建日期**: 2026-03-16
**更新日期**: 2026-03-17
**组件设计师**: component-designer
