# 边缘情况处理设计文档

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **基于**: 架构文档 v1.0 + 质量审核报告

---

## 1. 文档概述

本文档定义了系统在各种边缘和异常情况下的处理策略，确保系统稳定性和用户体验。

---

## 2. WebSocket 连接异常

### 2.1 断线检测

```go
// 心跳机制
type HeartbeatConfig struct {
    Interval     time.Duration // 心跳间隔（默认 30s）
    Timeout      time.Duration // 超时时间（默认 10s）
    MaxMissed    int           // 最大丢失次数（默认 3）
}

func (c *WebSocketClient) startHeartbeat() {
    ticker := time.NewTicker(c.config.Interval)
    for {
        select {
        case <-ticker.C:
            if err := c.sendPing(); err != nil {
                c.missedHeartbeats++
                if c.missedHeartbeats >= c.config.MaxMissed {
                    c.handleDisconnect()
                }
            } else {
                c.missedHeartbeats = 0
            }
        }
    }
}
```

### 2.2 断线期间消息处理

```
断线消息处理策略：

┌─────────────────────────────────────────────────────────────────┐
│                        客户端消息队列                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  正常状态                        断线状态                        │
│  ┌─────────┐                    ┌─────────┐                    │
│  │ 用户输入 │ ──发送──▶ 服务器   │ 用户输入 │ ──入队──▶ 等待队列 │
│  └─────────┘                    └─────────┘                    │
│                                      │                         │
│                                      │ 重连后                   │
│                                      ▼                         │
│                                 ┌─────────┐                    │
│                                 │ 批量发送 │ ───────▶ 服务器     │
│                                 └─────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// 前端消息队列
class MessageQueue {
    private queue: QueuedMessage[] = [];
    private maxQueueSize = 100;

    enqueue(message: ClientMessage): boolean {
        if (this.queue.length >= this.maxQueueSize) {
            // 队列满，丢弃最旧的消息（保留关键消息）
            this.pruneQueue();
        }
        this.queue.push({
            message,
            timestamp: Date.now(),
            retries: 0
        });
        return true;
    }

    async flush(wsClient: WebSocketClient): Promise<void> {
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            try {
                await wsClient.send(item.message);
            } catch (error) {
                // 重试逻辑
                if (item.retries < 3) {
                    item.retries++;
                    this.queue.unshift(item);
                    await sleep(1000 * item.retries);
                }
            }
        }
    }
}
```

### 2.3 重连策略

```go
// 指数退避重连
type ReconnectConfig struct {
    InitialDelay time.Duration // 初始延迟（默认 1s）
    MaxDelay     time.Duration // 最大延迟（默认 30s）
    Multiplier   float64       // 乘数（默认 2.0）
    MaxAttempts  int           // 最大尝试次数（默认 10，0 = 无限）
}

func (c *WebSocketClient) reconnect() error {
    delay := c.config.InitialDelay

    for attempt := 1; ; attempt++ {
        if err := c.connect(); err == nil {
            // 重连成功，同步状态
            c.onReconnected()
            return nil
        }

        if c.config.MaxAttempts > 0 && attempt >= c.config.MaxAttempts {
            return ErrMaxReconnectAttempts
        }

        time.Sleep(delay)
        delay = time.Duration(float64(delay) * c.config.Multiplier)
        if delay > c.config.MaxDelay {
            delay = c.config.MaxDelay
        }
    }
}
```

---

## 3. LLM API 调用异常

### 3.1 错误类型与处理

| 错误类型 | HTTP 状态码 | 处理策略 | 用户提示 |
|----------|-------------|----------|----------|
| 网络超时 | - | 重试 (3次) | "正在重连..." |
| 请求超时 | 408 | 重试 (2次) | "响应超时，正在重试..." |
| 速率限制 | 429 | 等待后重试 | "请求过于频繁，请稍候..." |
| 服务错误 | 500-503 | 重试 (3次) | "服务暂时不可用..." |
| 认证失败 | 401 | 不重试，通知用户 | "API 密钥无效" |
| 配额超限 | 402 | 不重试，通知用户 | "API 配额已用尽" |

### 3.2 降级方案

```go
// LLM 调用降级策略
type LLMFallbackStrategy struct {
    primaryProvider   llm.Provider
    fallbackProviders []llm.Provider
    currentProvider   int
}

func (s *LLMFallbackStrategy) SendMessage(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
    providers := append([]llm.Provider{s.primaryProvider}, s.fallbackProviders...)

    for i, provider := range providers {
        resp, err := provider.SendMessage(ctx, req)
        if err == nil {
            s.currentProvider = i
            return resp, nil
        }

        // 判断是否应该降级
        if isRecoverableError(err) && i < len(providers)-1 {
            log.Warn("LLM provider failed, trying fallback",
                "provider", i, "error", err)
            continue
        }

        return nil, err
    }

    return nil, ErrAllProvidersFailed
}
```

### 3.3 响应缓存

```go
// 相似请求缓存（用于降级时）
type ResponseCache struct {
    cache map[string]*CachedResponse
    mu    sync.RWMutex
    ttl   time.Duration
}

func (rc *ResponseCache) GetSimilar(ctx context.Context, input string) (*ChatResponse, bool) {
    // 使用语义相似度查找相似的历史响应
    // 仅用于极端情况下的降级
}
```

---

## 4. 存档文件损坏

### 4.1 损坏检测

```go
func (sm *SaveManager) ValidateSave(path string) error {
    // 1. 文件存在性检查
    if _, err := os.Stat(path); os.IsNotExist(err) {
        return ErrSaveNotFound
    }

    // 2. 文件大小检查
    info, _ := os.Stat(path)
    if info.Size() == 0 {
        return ErrSaveEmpty
    }

    // 3. JSON 格式检查
    data, err := os.ReadFile(path)
    if err != nil {
        return err
    }

    var snapshot SaveSnapshot
    if err := json.Unmarshal(data, &snapshot); err != nil {
        return ErrSaveCorrupted
    }

    // 4. 版本兼容性检查
    if !isCompatibleVersion(snapshot.Version) {
        return ErrSaveVersionIncompatible
    }

    // 5. 数据完整性检查（校验和）
    if !verifyChecksum(data) {
        return ErrSaveChecksumFailed
    }

    return nil
}
```

### 4.2 恢复策略

```
存档恢复流程：

┌─────────────────────────────────────────────────────────────────┐
│                        存档恢复策略                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 尝试加载                                                    │
│     │                                                           │
│     ├── 成功 ──▶ 继续游戏                                       │
│     │                                                           │
│     └── 失败                                                    │
│          │                                                      │
│          ├── 损坏 ──▶ 2. 尝试修复                               │
│          │              │                                       │
│          │              ├── 修复成功 ──▶ 继续游戏               │
│          │              │                                       │
│          │              └── 修复失败 ──▶ 3. 查找备份             │
│          │                              │                       │
│          │                              ├── 有备份 ──▶ 加载备份  │
│          │                              │                       │
│          │                              └── 无备份 ──▶ 4. 降级   │
│          │                                      │               │
│          │                                      ├── 恢复基础状态  │
│          │                                      └── 通知用户     │
│          │                                                      │
│          └── 版本不兼容 ──▶ 迁移数据                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 自动备份

```go
type BackupConfig struct {
    Enabled      bool          // 是否启用
    Interval     time.Duration // 备份间隔
    MaxBackups   int           // 最大备份数
    BackupDir    string        // 备份目录
}

func (sm *SaveManager) CreateBackup(saveID string) error {
    // 创建备份副本
    save, _ := sm.saveRepo.GetByID(context.Background(), saveID)

    backupPath := filepath.Join(sm.backupDir,
        fmt.Sprintf("%s_%s.bak", saveID, time.Now().Format("20060102_150405")))

    // 复制文件
    if err := copyFile(save.SnapshotPath, backupPath); err != nil {
        return err
    }

    // 清理旧备份
    sm.cleanupOldBackups(saveID)

    return nil
}
```

---

## 5. 其他边缘情况

### 5.1 内存不足

| 场景 | 检测方式 | 处理策略 |
|------|----------|----------|
| 消息历史过长 | 长度 > 1000 | 触发压缩 |
| 地图数据过大 | 内存 > 100MB | 分块加载 |
| 战斗单位过多 | 单位 > 50 | 虚拟化渲染 |

### 5.2 长时间无响应

```go
// 操作超时处理
func (sm *StateManager) ExecuteWithTimeout(op string, fn func() error) error {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    done := make(chan error, 1)
    go func() {
        done <- fn()
    }()

    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        // 超时处理
        sm.eventBus.Emit("operation_timeout", op)
        return ErrOperationTimeout
    }
}
```

### 5.3 并发冲突

```go
// 乐观锁重试
func (r *Repository) UpdateWithRetry(entity *Entity, maxRetries int) error {
    for i := 0; i < maxRetries; i++ {
        current, _ := r.GetByID(entity.ID)
        entity.Version = current.Version + 1

        if err := r.Update(entity); err != ErrOptimisticLockFailed {
            return err
        }

        // 冲突，等待后重试
        time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
    }
    return ErrMaxRetriesExceeded
}
```

---

## 6. 错误恢复优先级

| 优先级 | 错误类型 | 恢复时间目标 | 用户体验 |
|--------|----------|--------------|----------|
| P0 | WebSocket 断线 | < 5s | 自动重连，无感知 |
| P0 | 游戏状态丢失 | < 10s | 从最后存档恢复 |
| P1 | LLM 调用失败 | < 30s | 显示错误，允许重试 |
| P1 | 存档损坏 | < 1min | 从备份恢复 |
| P2 | 内存不足 | 立即 | 清理缓存，继续 |

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：架构设计师
