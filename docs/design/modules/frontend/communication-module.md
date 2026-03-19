# 通信模块设计

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属子系统**: Web 前端子系统

---

## 1. 模块概述

### 1.1 模块职责

通信模块负责前端与后端的所有网络通信，包括：

- WebSocket 连接管理
- 消息序列化/反序列化
- 消息路由和分发
- 断线重连机制
- REST API 调用

### 1.2 设计原则

- **单一职责**：只负责网络通信，不处理业务逻辑
- **可靠性**：确保消息可靠传输，支持重连
- **可观测**：提供连接状态和消息日志
- **类型安全**：所有消息类型都有 TypeScript 定义

### 1.3 模块边界

**包含**：
- WebSocket 客户端封装
- 消息处理器
- 重连机制
- REST API 客户端

**不包含**：
- 状态管理（由状态管理模块负责）
- 业务逻辑（由各业务模块负责）
- UI 展示（由 UI 模块负责）

---

## 2. 目录结构

```
services/
├── websocket/                    # WebSocket 服务
│   ├── client.ts                 # WebSocket 客户端
│   ├── messageHandler.ts         # 消息处理器
│   ├── reconnection.ts           # 重连机制
│   ├── heartbeat.ts              # 心跳检测
│   ├── types.ts                  # 消息类型定义
│   └── index.ts
│
├── api/                          # REST API 服务
│   ├── client.ts                 # API 客户端
│   ├── session.ts                # 会话相关 API
│   ├── save.ts                   # 存档相关 API
│   ├── scenario.ts               # 剧本相关 API
│   ├── config.ts                 # 配置相关 API
│   └── index.ts
│
├── types/                        # 服务类型定义
│   ├── websocket.ts
│   ├── api.ts
│   └── index.ts
│
└── index.ts                      # 统一导出
```

---

## 3. 对外接口

### 3.1 WebSocket 客户端接口

```typescript
// services/websocket/client.ts
export interface WebSocketClient {
  // 连接管理
  connect(): void;
  disconnect(): void;
  reconnect(): void;

  // 状态
  isConnected(): boolean;
  getStatus(): ConnectionStatus;

  // 消息发送
  send(message: ClientMessage): void;
  sendWithResponse<T>(message: ClientMessage): Promise<T>;

  // 事件订阅
  on(event: WebSocketEvent, handler: EventHandler): () => void;
  once(event: WebSocketEvent, handler: EventHandler): void;

  // 消息订阅
  subscribe(type: ServerMessageType, handler: MessageHandler): () => void;
}

// 单例实例
export const websocketClient: WebSocketClient;
```

### 3.2 REST API 客户端接口

```typescript
// services/api/client.ts
export interface ApiClient {
  // 通用方法
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  put<T>(url: string, data?: any): Promise<T>;
  delete<T>(url: string): Promise<T>;

  // 特定 API
  session: SessionApi;
  save: SaveApi;
  scenario: ScenarioApi;
  config: ConfigApi;
}

// 单例实例
export const apiClient: ApiClient;
```

### 3.3 统一导出

```typescript
// services/index.ts
export { websocketClient } from './websocket';
export { apiClient } from './api';

export type {
  ClientMessage,
  ServerMessage,
  WebSocketEvent,
  ConnectionStatus
} from './types';
```

---

## 4. WebSocket 消息协议

### 4.1 消息格式

```typescript
// services/websocket/types.ts

// 客户端 -> 服务端
interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
  requestId?: string;  // 用于请求-响应匹配
}

// 服务端 -> 客户端
interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
  requestId?: string;  // 匹配客户端请求
  timestamp: number;   // 服务器时间戳
}
```

### 4.2 消息类型定义

```typescript
// 客户端消息类型
type ClientMessageType =
  | 'user_input'      // 用户自然语言输入
  | 'map_action'      // 地图操作
  | 'combat_action'   // 战斗行动
  | 'subscribe'       // 订阅事件
  | 'management'      // 管理操作
  | 'ping';           // 心跳

// 服务端消息类型
type ServerMessageType =
  | 'state_update'    // 状态更新
  | 'narration'       // DM 叙述
  | 'combat_event'    // 战斗事件
  | 'dice_result'     // 检定结果
  | 'error'           // 错误
  | 'pong';           // 心跳响应
```

### 4.3 消息 Payload 定义

```typescript
// 用户输入
interface UserInputPayload {
  text: string;
}

// 地图操作
interface MapActionPayload {
  action: 'move' | 'interact' | 'examine';
  position?: { x: number; y: number };
  targetId?: string;
}

// 战斗行动
// 注意: 完整定义见 interfaces.md，此处为简版引用
interface CombatActionPayload {
  actionType: 'attack' | 'spell' | 'item' | 'move' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'search' | 'ready' | 'end_turn';
  unitId: string;
  targetId?: string;
  spellId?: string;
  itemId?: string;
  position?: { x: number; y: number };
  advantage?: 'normal' | 'advantage' | 'disadvantage';
}

// 状态更新
// 注意: 完整定义见 interfaces.md，此处为简版引用
interface StateUpdatePayload {
  stateType: 'game' | 'party' | 'combat' | 'character' | 'inventory' | 'scenario' | 'map' | 'dialogue';
  data: unknown;
  diff?: unknown;  // 增量更新
}

// DM 叙述
interface NarrationPayload {
  text: string;
  isStreaming: boolean;
  isComplete: boolean;
}

// 战斗事件
// 注意: 完整定义见 interfaces.md，此处为简版引用
interface CombatEventPayload {
  eventType: 'initiative_rolled' | 'turn_start' | 'turn_end' | 'attack' | 'damage' | 'heal' | 'death' | 'unconscious' | 'condition_applied' | 'condition_removed' | 'round_end' | 'combat_end';
  combatId: string;
  sourceId: string;
  targetId?: string;
  result?: {
    hit?: boolean;
    critical?: boolean;
    damage?: number;
    damageType?: string;
    healing?: number;
    condition?: string;
  };
  timestamp: number;
}

// 检定结果
interface DiceResultPayload {
  rollType: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
}

// 错误
interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
}
```

---

## 5. WebSocket 客户端实现

### 5.1 客户端类

```typescript
// services/websocket/client.ts
import { MessageHandler } from './messageHandler';
import { ReconnectionManager } from './reconnection';
import { HeartbeatManager } from './heartbeat';

class WebSocketClientImpl implements WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler;
  private reconnectionManager: ReconnectionManager;
  private heartbeatManager: HeartbeatManager;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  private eventHandlers: Map<WebSocketEvent, Set<EventHandler>> = new Map();

  constructor(private url: string) {
    this.messageHandler = new MessageHandler();
    this.reconnectionManager = new ReconnectionManager(this);
    this.heartbeatManager = new HeartbeatManager(this);
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(this.url);
    this.setupEventListeners();
  }

  disconnect(): void {
    this.reconnectionManager.disable();
    this.heartbeatManager.stop();
    this.ws?.close();
    this.ws = null;
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(message: ClientMessage): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected');
    }

    const data = JSON.stringify(message);
    this.ws!.send(data);
  }

  sendWithResponse<T>(message: ClientMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();
      message.requestId = requestId;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.send(message);
    });
  }

  on(event: WebSocketEvent, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  private setupEventListeners(): void {
    this.ws!.onopen = () => {
      this.emit('connected');
      this.reconnectionManager.onConnected();
      this.heartbeatManager.start();
    };

    this.ws!.onclose = (event) => {
      this.emit('disconnected', { code: event.code, reason: event.reason });
      this.reconnectionManager.onDisconnected();
      this.heartbeatManager.stop();
    };

    this.ws!.onerror = (error) => {
      this.emit('error', error);
    };

    this.ws!.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(data: string): void {
    try {
      const message: ServerMessage = JSON.parse(data);

      // 处理心跳响应
      if (message.type === 'pong') {
        this.heartbeatManager.onPong();
        return;
      }

      // 处理请求响应
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const pending = this.pendingRequests.get(message.requestId)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.type === 'error') {
          pending.reject(new Error((message.payload as ErrorPayload).message));
        } else {
          pending.resolve(message.payload);
        }
        return;
      }

      // 分发消息到处理器
      this.messageHandler.handle(message);
      this.emit('message', message);

    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private emit(event: WebSocketEvent, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    handlers?.forEach(handler => handler(data));
  }
}

// 创建单例
export const websocketClient = new WebSocketClientImpl(
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`
);
```

### 5.2 消息处理器（事件驱动解耦版）

> **重要设计决策**：通信模块不直接依赖状态模块，而是通过事件总线发布消息，由状态模块订阅处理。这避免了循环依赖。

```typescript
// services/websocket/messageHandler.ts
// ❌ 不再直接导入 stores
// import { useGameStore } from '@/stores/gameStore';  // 移除
// import { useCombatStore } from '@/stores/combatStore';  // 移除

import { eventBus, GameEvents } from '@/events';

type MessageHandlerFn = (payload: any) => void;

export class MessageHandler {
  private handlers: Map<ServerMessageType, MessageHandlerFn[]> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // 状态更新 - 发布事件，由状态模块订阅处理
    this.register('state_update', (payload: StateUpdatePayload) => {
      eventBus.emit(GameEvents.STATE_UPDATE, payload);
    });

    // DM 叙述 - 发布事件
    this.register('narration', (payload: NarrationPayload) => {
      eventBus.emit(GameEvents.NARRATION, payload);
    });

    // 战斗事件 - 发布事件
    this.register('combat_event', (payload: CombatEventPayload) => {
      eventBus.emit(GameEvents.COMBAT_EVENT, payload);
    });

    // 检定结果 - 发布事件
    this.register('dice_result', (payload: DiceResultPayload) => {
      eventBus.emit(GameEvents.DICE_RESULT, payload);
    });

    // 错误 - 发布事件
    this.register('error', (payload: ErrorPayload) => {
      eventBus.emit(GameEvents.ERROR, payload);
    });
  }

  register(type: ServerMessageType, handler: MessageHandlerFn): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  handle(message: ServerMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error('Handler error:', error);
        }
      });
    }
  }
}
```

### 5.2.1 事件总线设计

> **重要**：事件总线定义在 utils-module 中，所有模块从 `@/events` 导入。详见 `utils-module.md §7.事件总线`。

```typescript
// 从 utils-module 导入事件总线
import { eventBus, GameEvents } from '@/events';

// 使用示例：发布事件
eventBus.emit(GameEvents.STATE_UPDATE, payload);

// 使用示例：订阅事件
const unsubscribe = eventBus.on(GameEvents.STATE_UPDATE, (payload) => {
  // 处理状态更新
});
```

### 5.2.2 状态模块订阅事件

```typescript
// stores/gameStore.ts - 状态模块订阅事件，避免循环依赖
import { eventBus, GameEvents } from '@/events';

// 在 Store 初始化时订阅事件
function initStoreSubscriptions() {
  // 订阅状态更新
  eventBus.on(GameEvents.STATE_UPDATE, (payload) => {
    const store = useGameStore.getState();
    switch (payload.stateType) {
      case 'game':
        store.syncState(payload.data);
        break;
      case 'party':
        store.syncParty(payload.data);
        break;
    }
  });

  // 订阅错误
  eventBus.on(GameEvents.ERROR, (payload) => {
    useChatStore.getState().addMessage({
      id: generateId(),
      type: 'system',
      content: `错误: ${payload.message}`,
      timestamp: Date.now()
    });
  });
}

// 在应用启动时调用
initStoreSubscriptions();
```

### 5.2.3 依赖关系图（解耦后）

```
解耦前（循环依赖）：
┌──────────────┐      ┌──────────────┐
│  Communication │ ───▶ │    State     │
│    Module     │ ◀─── │    Module    │
└──────────────┘      └──────────────┘

解耦后（事件驱动）：
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Communication │ ───▶ │   EventBus   │ ◀─── │    State     │
│    Module     │      │   (中介者)    │      │    Module    │
└──────────────┘      └──────────────┘      └──────────────┘
        │                    │                     │
        │                    │                     │
        └────────────────────┴─────────────────────┘
                      发射/订阅
```

### 5.3 重连机制

```typescript
// services/websocket/reconnection.ts
export class ReconnectionManager {
  private enabled: boolean = true;
  private attempts: number = 0;
  private maxAttempts: number = 5;
  private baseDelay: number = 1000;
  private maxDelay: number = 30000;
  private timeout: NodeJS.Timeout | null = null;

  constructor(private client: WebSocketClient) {}

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.clearTimeout();
  }

  onConnected(): void {
    this.attempts = 0;
  }

  onDisconnected(): void {
    if (!this.enabled) return;

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.attempts >= this.maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.attempts + 1})`);

    this.timeout = setTimeout(() => {
      this.attempts++;
      this.client.reconnect();
    }, delay);
  }

  private clearTimeout(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
```

### 5.4 心跳检测

```typescript
// services/websocket/heartbeat.ts
export class HeartbeatManager {
  private interval: NodeJS.Timeout | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private intervalMs: number = 30000;
  private timeoutMs: number = 10000;

  constructor(private client: WebSocketClient) {}

  start(): void {
    this.stop();
    this.schedulePing();
  }

  stop(): void {
    this.clearInterval();
    this.clearTimeout();
  }

  onPong(): void {
    this.clearTimeout();
  }

  private schedulePing(): void {
    this.interval = setInterval(() => {
      this.sendPing();
    }, this.intervalMs);
  }

  private sendPing(): void {
    this.client.send({ type: 'ping', payload: {} });

    this.timeout = setTimeout(() => {
      console.warn('Heartbeat timeout, reconnecting...');
      this.client.reconnect();
    }, this.timeoutMs);
  }

  private clearInterval(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private clearTimeout(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
```

---

## 6. REST API 实现

### 6.1 API 客户端

```typescript
// services/api/client.ts
class ApiClientImpl implements ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.code, error.message);
    }

    const result = await response.json();
    return result.data;
  }

  // 子 API
  session = createSessionApi(this);
  save = createSaveApi(this);
  scenario = createScenarioApi(this);
  config = createConfigApi(this);
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClientImpl();
```

### 6.2 会话 API

```typescript
// services/api/session.ts
interface SessionApi {
  list(): Promise<Session[]>;
  get(id: string): Promise<Session>;
  create(data: CreateSessionData): Promise<Session>;
  delete(id: string): Promise<void>;
}

function createSessionApi(client: ApiClient): SessionApi {
  return {
    list: () => client.get<Session[]>('/sessions'),
    get: (id) => client.get<Session>(`/sessions/${id}`),
    create: (data) => client.post<Session>('/sessions', data),
    delete: (id) => client.delete(`/sessions/${id}`),
  };
}
```

### 6.3 存档 API

```typescript
// services/api/save.ts
interface SaveApi {
  list(sessionId?: string): Promise<Save[]>;
  get(id: string): Promise<Save>;
  create(data: CreateSaveData): Promise<Save>;
  load(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

function createSaveApi(client: ApiClient): SaveApi {
  return {
    list: (sessionId) =>
      client.get<Save[]>(sessionId ? `/saves?sessionId=${sessionId}` : '/saves'),
    get: (id) => client.get<Save>(`/saves/${id}`),
    create: (data) => client.post<Save>('/saves', data),
    load: (id) => client.post(`/saves/${id}/load`),
    delete: (id) => client.delete(`/saves/${id}`),
  };
}
```

---

## 7. 模块间通信

### 7.1 与状态管理模块（通过 eventBus 解耦）

> **重要设计决策**：通信模块不直接依赖状态模块，而是通过 eventBus 发布消息，由状态模块订阅处理。

```typescript
// 消息处理器发布事件（不直接调用 Store）
this.register('state_update', (payload) => {
  eventBus.emit(GameEvents.STATE_UPDATE, payload);
});

// 状态模块订阅事件（在 state-module 中实现）
// eventBus.on(GameEvents.STATE_UPDATE, (payload) => {
//   useGameStore.getState().syncState(payload.data);
// });
```

### 7.2 与游戏引擎模块（通过 eventBus 解耦）

```typescript
// 通过 eventBus 通信（不使用 DOM 事件）
this.register('combat_event', (payload) => {
  eventBus.emit(GameEvents.COMBAT_EVENT, payload);
});

// 游戏引擎订阅事件
eventBus.on(GameEvents.COMBAT_EVENT, (payload) => {
  // 播放特效
});
```

### 7.3 通信模块订阅客户端请求（由状态模块发起）

```typescript
// services/websocket/requestHandler.ts
// 通信模块订阅状态模块发送的请求事件
import { eventBus, GameEvents } from '@/events';

// 订阅用户输入请求
eventBus.on(GameEvents.USER_INPUT_REQUEST, ({ text }) => {
  websocketClient.send({
    type: 'user_input',
    payload: { text }
  });
});

// 订阅战斗行动请求
eventBus.on(GameEvents.COMBAT_ACTION_REQUEST, (data) => {
  websocketClient.send({
    type: 'combat_action',
    payload: data
  });
});

// 订阅 WebSocket 连接请求
eventBus.on(GameEvents.WEBSOCKET_CONNECT_REQUEST, () => {
  websocketClient.connect();
});
```

### 7.4 与 UI 模块

```typescript
// UI 模块监听连接状态
useEffect(() => {
  const unsubscribe = websocketClient.on('connected', () => {
    console.log('Connected to server');
  });

  return unsubscribe;
}, []);
```

---

## 8. 错误处理

### 8.1 错误类型

```typescript
// services/types/api.ts
export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### 8.2 错误处理策略

```typescript
// 全局错误处理
websocketClient.on('error', (error) => {
  // 记录错误
  console.error('WebSocket error:', error);

  // 更新连接状态
  useConnectionStore.getState().setError(error.message);
});

// 请求错误处理
async function safeRequest<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError) {
      // 显示用户友好错误
      showErrorToast(error.message);
    }
    throw error;
  }
}
```

---

## 9. 可测试性设计

### 9.1 Mock WebSocket

```typescript
// __tests__/mocks/websocket.ts
export class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send(data: string): void {
    // 处理发送的消息
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  }

  // 测试辅助方法
  simulateMessage(data: any): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(error: any): void {
    this.onerror?.(error);
  }
}
```

### 9.2 测试用例

```typescript
// __tests__/services/websocket/client.test.ts
describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClientImpl('ws://localhost/ws');
  });

  it('should connect successfully', async () => {
    client.connect();

    await waitFor(() => {
      expect(client.isConnected()).toBe(true);
    });
  });

  it('should send and receive messages', async () => {
    client.connect();
    await waitFor(() => client.isConnected());

    const responsePromise = client.sendWithResponse({
      type: 'ping',
      payload: {}
    });

    // 模拟服务器响应
    mockWs.simulateMessage({
      type: 'pong',
      payload: {},
      requestId: /* ... */
    });

    await expect(responsePromise).resolves.toBeDefined();
  });
});
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：模块设计师
