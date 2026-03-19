# 通信组件设计文档

> **版本**: v1.0
> **创建日期**: 2026-03-16
> **所属模块**: 通信模块
> **技术栈**: WebSocket API + TypeScript

---

## 1. 组件概览

### 1.1 组件职责划分

```
services/websocket/
├── client.ts                        # WebSocket 客户端组件
├── messageHandler.ts                # 消息处理器组件
├── reconnection.ts                  # 重连机制组件
├── heartbeat.ts                     # 心跳检测组件
├── queue.ts                         # 消息队列组件
├── types.ts                         # 类型定义组件
└── index.ts                         # 统一导出

services/api/
├── client.ts                        # API 客户端组件
├── session.ts                       # 会话 API 组件
├── save.ts                          # 存档 API 组件
├── scenario.ts                      # 剧本 API 组件
├── config.ts                        # 配置 API 组件
└── index.ts                         # 统一导出
```

### 1.2 组件依赖关系（事件驱动架构）

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocketClient                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Reconnection  │  │  Heartbeat   │  │MessageQueue  │      │
│  │  Manager     │  │   Manager    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                            ▼                                 │
│                   ┌──────────────┐                          │
│                   │MessageHandler│                          │
│                   └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ emit events
                            ▼
                    ┌──────────────┐
                    │   EventBus   │
                    │  (中介者)     │
                    └──────────────┘
                            ▲
                            │ subscribe
                    ┌──────────────┐
                    │   Stores     │
                    │  (状态模块)   │
                    └──────────────┘
```

---

## 2. WebSocket 客户端组件

### 2.1 类型定义

```typescript
// services/websocket/types.ts

/**
 * 连接状态
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * WebSocket 事件类型
 */
export type WebSocketEvent =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'message'
  | 'state_change';

/**
 * 客户端消息类型
 */
export type ClientMessageType =
  | 'user_input'      // 用户自然语言输入
  | 'map_action'      // 地图操作
  | 'combat_action'   // 战斗行动
  | 'subscribe'       // 订阅事件
  | 'management'      // 管理操作
  | 'ping';           // 心跳

/**
 * 服务端消息类型
 */
export type ServerMessageType =
  | 'state_update'    // 状态更新
  | 'narration'       // DM 叙述
  | 'combat_event'    // 战斗事件
  | 'dice_result'     // 检定结果
  | 'error'           // 错误
  | 'pong';           // 心跳响应

/**
 * 客户端消息
 */
export interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
  requestId?: string;
  timestamp: number;
}

/**
 * 服务端消息
 */
export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
  requestId?: string;
  timestamp: number;
}

/**
 * 用户输入载荷
 */
export interface UserInputPayload {
  text: string;
  context?: string;
}

/**
 * 地图操作载荷
 */
export interface MapActionPayload {
  action: 'move' | 'interact' | 'examine' | 'rest' | 'search';
  position?: { x: number; y: number };
  targetId?: string;
  itemId?: string;
}

/**
 * 战斗行动载荷
 */
export interface CombatActionPayload {
  actionType: 'attack' | 'spell' | 'item' | 'move' | 'dodge' | 'dash' | 'end_turn' | 'get_move_range';
  unitId: string;
  targetId?: string;
  spellId?: string;
  itemId?: string;
  position?: { x: number; y: number };
  weaponId?: string;
}

/**
 * 状态更新载荷
 */
export interface StateUpdatePayload {
  stateType: 'game' | 'combat' | 'character';
  data: unknown;
  diff?: unknown;
}

/**
 * DM 叙述载荷
 */
export interface NarrationPayload {
  text: string;
  isStreaming: boolean;
  isComplete: boolean;
  chunkIndex?: number;
}

/**
 * 战斗事件载荷
 */
export interface CombatEventPayload {
  eventType: 'attack' | 'damage' | 'heal' | 'spell' | 'move' | 'turn_start' | 'turn_end';
  sourceId: string;
  targetId?: string;
  result?: {
    hit?: boolean;
    critical?: boolean;
    damage?: number;
    healing?: number;
    damageType?: string;
  };
}

/**
 * 检定结果载荷
 */
export interface DiceResultPayload {
  rollType: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  success?: boolean;
  dc?: number;
}

/**
 * 错误载荷
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

/**
 * 事件处理器
 */
export type EventHandler = (data?: any) => void;

/**
 * 消息处理器
 */
export type MessageHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * 请求状态
 */
export interface RequestState {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
}
```

### 2.2 WebSocketClient 组件

```typescript
// services/websocket/client.ts
import { ReconnectionManager } from './reconnection';
import { HeartbeatManager } from './heartbeat';
import { MessageHandler } from './messageHandler';
import { MessageQueue } from './queue';
import {
  ClientMessage,
  ServerMessage,
  ConnectionStatus,
  WebSocketEvent,
  EventHandler,
  RequestState
} from './types';

/**
 * WebSocket 客户端配置
 */
export interface WebSocketClientConfig {
  url?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectMaxAttempts?: number;
  reconnectBaseDelay?: number;
  reconnectMaxDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  requestTimeout?: number;
  enableQueue?: boolean;
  maxQueueSize?: number;
}

/**
 * WebSocket 客户端接口
 */
export interface IWebSocketClient {
  // ========== 连接管理 ==========
  /**
   * 连接到服务器
   */
  connect(): void;

  /**
   * 断开连接
   */
  disconnect(): void;

  /**
   * 重新连接
   */
  reconnect(): void;

  // ========== 状态查询 ==========
  /**
   * 是否已连接
   */
  isConnected(): boolean;

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus;

  /**
   * 获取连接 URL
   */
  getUrl(): string;

  // ========== 消息发送 ==========
  /**
   * 发送消息（不等待响应）
   */
  send(message: ClientMessage): void;

  /**
   * 发送消息并等待响应
   */
  sendWithResponse<T>(message: ClientMessage): Promise<T>;

  /**
   * 批量发送消息
   */
  sendBatch(messages: ClientMessage[]): void;

  // ========== 事件订阅 ==========
  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  on(event: WebSocketEvent, handler: EventHandler): () => void;

  /**
   * 订阅一次性事件
   */
  once(event: WebSocketEvent, handler: EventHandler): void;

  /**
   * 取消订阅
   */
  off(event: WebSocketEvent, handler: EventHandler): void;

  // ========== 消息订阅 ==========
  /**
   * 订阅特定类型的消息
   * @returns 取消订阅函数
   */
  subscribe<T = unknown>(
    type: ServerMessageType,
    handler: MessageHandler<T>
  ): () => void;

  /**
   * 取消订阅消息类型
   */
  unsubscribe(type: ServerMessageType, handler: MessageHandler): void;

  // ========== 配置 ==========
  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebSocketClientConfig>): void;

  /**
   * 销毁客户端
   */
  destroy(): void;
}

/**
 * WebSocket 客户端实现
 */
export class WebSocketClient implements IWebSocketClient {
  // WebSocket 实例
  private ws: WebSocket | null = null;

  // 子组件
  private reconnectionManager: ReconnectionManager;
  private heartbeatManager: HeartbeatManager;
  private messageHandler: MessageHandler;
  private messageQueue: MessageQueue;

  // 配置
  private config: Required<WebSocketClientConfig>;

  // 状态
  private status: ConnectionStatus = 'disconnected';
  private eventHandlers: Map<WebSocketEvent, Set<EventHandler>> = new Map();
  private pendingRequests: Map<string, RequestState> = new Map();

  // 统计
  private stats = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    lastMessageTime: 0
  };

  constructor(config: WebSocketClientConfig = {}) {
    // 默认配置
    this.config = {
      url: config.url || this.getDefaultUrl(),
      autoConnect: config.autoConnect ?? true,
      autoReconnect: config.autoReconnect ?? true,
      reconnectMaxAttempts: config.reconnectMaxAttempts ?? 5,
      reconnectBaseDelay: config.reconnectBaseDelay ?? 1000,
      reconnectMaxDelay: config.reconnectMaxDelay ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatTimeout: config.heartbeatTimeout ?? 10000,
      requestTimeout: config.requestTimeout ?? 30000,
      enableQueue: config.enableQueue ?? true,
      maxQueueSize: config.maxQueueSize ?? 100
    };

    // 初始化子组件
    this.reconnectionManager = new ReconnectionManager(this, this.config);
    this.heartbeatManager = new HeartbeatManager(this, this.config);
    this.messageHandler = new MessageHandler(this);
    this.messageQueue = new MessageQueue(this.config);

    // 自动连接
    if (this.config.autoConnect) {
      this.connect();
    }
  }

  // ========== 连接管理 ==========

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    if (this.status === 'connecting') {
      console.warn('[WebSocket] Already connecting');
      return;
    }

    this.setStatus('connecting');
    this.emit('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public disconnect(): void {
    this.reconnectionManager.disable();
    this.heartbeatManager.stop();
    this.messageQueue.clear();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
    this.emit('disconnected');
  }

  public reconnect(): void {
    this.disconnect();

    // 延迟重连
    setTimeout(() => {
      this.connect();
    }, 100);
  }

  // ========== 状态查询 ==========

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getUrl(): string {
    return this.config.url;
  }

  // ========== 消息发送 ==========

  public send(message: ClientMessage): void {
    if (!this.isConnected()) {
      if (this.config.enableQueue) {
        this.messageQueue.enqueue(message);
      } else {
        throw new Error('WebSocket is not connected');
      }
      return;
    }

    try {
      // 添加时间戳
      message.timestamp = Date.now();

      const data = JSON.stringify(message);
      this.ws!.send(data);

      // 更新统计
      this.stats.messagesSent++;
      this.stats.bytesSent += data.length;
      this.stats.lastMessageTime = Date.now();

      // 发送队列中的消息
      this.flushQueue();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public async sendWithResponse<T>(message: ClientMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      message.requestId = requestId;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${message.type}`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        timestamp: Date.now()
      });

      this.send(message);
    });
  }

  public sendBatch(messages: ClientMessage[]): void {
    messages.forEach(message => this.send(message));
  }

  // ========== 事件订阅 ==========

  public on(event: WebSocketEvent, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  public once(event: WebSocketEvent, handler: EventHandler): void {
    const wrappedHandler: EventHandler = (data) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  public off(event: WebSocketEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // ========== 消息订阅 ==========

  public subscribe<T>(
    type: ServerMessageType,
    handler: MessageHandler<T>
  ): () => void {
    this.messageHandler.register(type, handler);
    return () => this.messageHandler.unregister(type, handler);
  }

  public unsubscribe(type: ServerMessageType, handler: MessageHandler): void {
    this.messageHandler.unregister(type, handler);
  }

  // ========== 配置 ==========

  public updateConfig(config: Partial<WebSocketClientConfig>): void {
    Object.assign(this.config, config);

    // 更新子组件配置
    this.reconnectionManager.updateConfig(this.config);
    this.heartbeatManager.updateConfig(this.config);
  }

  public destroy(): void {
    this.disconnect();
    this.eventHandlers.clear();
    this.pendingRequests.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Client destroyed'));
    });
    this.pendingRequests.clear();
  }

  // ========== 内部方法 ==========

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      const oldStatus = this.status;
      this.status = status;
      this.emit('state_change', { oldStatus, newStatus: status });
    }
  }

  private emit(event: WebSocketEvent, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} handler:`, error);
        }
      });
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => this.handleOpen();
    this.ws.onclose = (event) => this.handleClose(event);
    this.ws.onerror = (error) => this.handleError(error);
    this.ws.onmessage = (event) => this.handleMessage(event.data);
  }

  private handleOpen(): void {
    this.setStatus('connected');
    this.emit('connected');

    // 通知子组件
    this.reconnectionManager.onConnected();
    this.heartbeatManager.start();

    // 发送队列中的消息
    this.flushQueue();
  }

  private handleClose(event: CloseEvent): void {
    const wasConnected = this.status === 'connected';

    this.setStatus('disconnected');
    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // 通知子组件
    this.heartbeatManager.stop();

    if (wasConnected && this.config.autoReconnect) {
      this.reconnectionManager.onDisconnected();
    }

    // 清理待处理请求
    this.pendingRequests.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }

  private handleError(error: any): void {
    console.error('[WebSocket] Error:', error);
    this.setStatus('error');
    this.emit('error', error);
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const message: ServerMessage = JSON.parse(data);

      // 更新统计
      this.stats.messagesReceived++;
      this.stats.bytesReceived += data.length;
      this.stats.lastMessageTime = Date.now();

      // 处理心跳响应
      if (message.type === 'pong') {
        this.heartbeatManager.onPong();
        return;
      }

      // 处理请求响应
      if (message.requestId) {
        this.handleRequestResponse(message);
        return;
      }

      // 分发到消息处理器
      await this.messageHandler.handle(message);

      // 派发消息事件
      this.emit('message', message);
    } catch (error) {
      console.error('[WebSocket] Failed to handle message:', error);
    }
  }

  private handleRequestResponse(message: ServerMessage): void {
    const pending = this.pendingRequests.get(message.requestId!);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.requestId!);

    if (message.type === 'error') {
      const error = message.payload as ErrorPayload;
      pending.reject(new Error(`${error.code}: ${error.message}`));
    } else {
      pending.resolve(message.payload);
    }
  }

  private flushQueue(): void {
    if (!this.config.enableQueue) return;

    const messages = this.messageQueue.flush();
    messages.forEach(message => {
      try {
        const data = JSON.stringify(message);
        this.ws!.send(data);
      } catch (error) {
        console.error('[WebSocket] Failed to send queued message:', error);
      }
    });
  }

  private getDefaultUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建单例实例
export const websocketClient = new WebSocketClient();
```

---

## 3. 重连机制组件

```typescript
// services/websocket/reconnection.ts
import { WebSocketClient, WebSocketClientConfig } from './client';

/**
 * 重连状态
 */
interface ReconnectionState {
  enabled: boolean;
  attempts: number;
  lastAttempt: number;
  nextDelay: number;
}

/**
 * 重连管理器
 */
export class ReconnectionManager {
  private state: ReconnectionState = {
    enabled: true,
    attempts: 0,
    lastAttempt: 0,
    nextDelay: 0
  };

  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private client: WebSocketClient,
    private config: Required<WebSocketClientConfig>
  ) {}

  /**
   * 启用重连
   */
  public enable(): void {
    this.state.enabled = true;
  }

  /**
   * 禁用重连
   */
  public disable(): void {
    this.state.enabled = false;
    this.clearTimeout();
  }

  /**
   * 连接成功时调用
   */
  public onConnected(): void {
    this.state.attempts = 0;
    this.state.nextDelay = 0;
    this.clearTimeout();
  }

  /**
   * 连接断开时调用
   */
  public onDisconnected(): void {
    if (!this.state.enabled) return;

    this.scheduleReconnect();
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Required<WebSocketClientConfig>): void {
    this.config = config;
  }

  /**
   * 获取重连状态
   */
  public getState(): ReconnectionState {
    return { ...this.state };
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    // 检查是否超过最大尝试次数
    if (this.state.attempts >= this.config.reconnectMaxAttempts) {
      console.error('[Reconnection] Max attempts reached');
      return;
    }

    // 计算延迟
    this.state.nextDelay = this.calculateDelay();
    this.state.lastAttempt = Date.now();

    console.log(
      `[Reconnection] Scheduling attempt ${this.state.attempts + 1} ` +
      `in ${this.state.nextDelay}ms`
    );

    // 设置定时器
    this.timeoutId = setTimeout(() => {
      this.state.attempts++;
      this.client.reconnect();
    }, this.state.nextDelay);
  }

  /**
   * 计算重连延迟（指数退避）
   */
  private calculateDelay(): number {
    const baseDelay = this.config.reconnectBaseDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.state.attempts);
    const jitter = Math.random() * 1000; // 添加随机抖动

    return Math.min(
      exponentialDelay + jitter,
      this.config.reconnectMaxDelay
    );
  }

  /**
   * 清除定时器
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

---

## 4. 心跳检测组件

```typescript
// services/websocket/heartbeat.ts
import { WebSocketClient, WebSocketClientConfig } from './client';

/**
 * 心跳状态
 */
interface HeartbeatState {
  interval: NodeJS.Timeout | null;
  timeout: NodeJS.Timeout | null;
  lastPong: number;
  latency: number;
}

/**
 * 心跳管理器
 */
export class HeartbeatManager {
  private state: HeartbeatState = {
    interval: null,
    timeout: null,
    lastPong: 0,
    latency: 0
  };

  constructor(
    private client: WebSocketClient,
    private config: Required<WebSocketClientConfig>
  ) {}

  /**
   * 启动心跳
   */
  public start(): void {
    this.stop();

    this.state.lastPong = Date.now();

    // 定期发送 ping
    this.state.interval = setInterval(() => {
      this.sendPing();
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  public stop(): void {
    this.clearInterval();
    this.clearTimeout();
  }

  /**
   * 收到 pong 时调用
   */
  public onPong(): void {
    this.state.lastPong = Date.now();
    this.state.latency = Date.now() - (this.state.lastPong || Date.now());
    this.clearTimeout();
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Required<WebSocketClientConfig>): void {
    this.config = config;

    // 如果正在运行，重启以应用新配置
    if (this.state.interval) {
      this.start();
    }
  }

  /**
   * 获取心跳状态
   */
  public getState(): HeartbeatState {
    return { ...this.state };
  }

  /**
   * 发送 ping
   */
  private sendPing(): void {
    if (!this.client.isConnected()) {
      this.stop();
      return;
    }

    this.client.send({
      type: 'ping',
      payload: {},
      timestamp: Date.now()
    });

    // 设置超时
    this.state.timeout = setTimeout(() => {
      console.warn('[Heartbeat] Timeout, reconnecting...');
      this.client.reconnect();
    }, this.config.heartbeatTimeout);
  }

  /**
   * 清除定时器
   */
  private clearInterval(): void {
    if (this.state.interval) {
      clearInterval(this.state.interval);
      this.state.interval = null;
    }
  }

  /**
   * 清除超时
   */
  private clearTimeout(): void {
    if (this.state.timeout) {
      clearTimeout(this.state.timeout);
      this.state.timeout = null;
    }
  }
}
```

---

## 5. 消息处理器组件（事件驱动解耦版）

> **重要设计决策**：消息处理器不直接依赖状态模块（stores），而是通过事件总线发布消息。这避免了循环依赖，状态模块通过订阅事件来处理消息。

### 5.1 事件总线定义

```typescript
// events/index.ts - 统一事件定义
import { EventEmitter } from 'events';

// 类型安全的事件映射
interface GameEventMap {
  // 来自服务端的消息事件
  [GameEvents.STATE_UPDATE]: StateUpdatePayload;
  [GameEvents.NARRATION]: NarrationPayload;
  [GameEvents.COMBAT_EVENT]: CombatEventPayload;
  [GameEvents.DICE_RESULT]: DiceResultPayload;
  [GameEvents.ERROR]: ErrorPayload;

  // UI 事件
  [GameEvents.UI_CHARACTER_SELECT]: { characterId: string };
  [GameEvents.UI_ACTION_TRIGGER]: { actionType: string; data: unknown };

  // 游戏引擎事件
  [GameEvents.GAME_SCENE_READY]: void;
  [GameEvents.GAME_FOCUS_CHARACTER]: { characterId: string };
}

// 事件类型常量
export enum GameEvents {
  // 服务端消息事件
  STATE_UPDATE = 'server:state_update',
  NARRATION = 'server:narration',
  COMBAT_EVENT = 'server:combat_event',
  DICE_RESULT = 'server:dice_result',
  ERROR = 'server:error',

  // UI 事件
  UI_CHARACTER_SELECT = 'ui:character_select',
  UI_ACTION_TRIGGER = 'ui:action_trigger',

  // 游戏引擎事件
  GAME_SCENE_READY = 'game:scene_ready',
  GAME_FOCUS_CHARACTER = 'game:focus_character',
}

// 类型安全的事件总线
class TypedEventBus {
  private emitter = new EventEmitter();

  on<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): () => void {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  once<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): void {
    this.emitter.once(event, handler);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
}

export const eventBus = new TypedEventBus();
```

### 5.2 消息处理器实现

```typescript
// services/websocket/messageHandler.ts
import { ServerMessage, ServerMessageType, MessageHandler } from './types';
import { WebSocketClient } from './client';
import { eventBus, GameEvents } from '@/events';
import {
  StateUpdatePayload,
  NarrationPayload,
  CombatEventPayload,
  DiceResultPayload,
  ErrorPayload
} from './types';

/**
 * 消息处理器注册表
 */
type HandlerRegistry = Map<ServerMessageType, Set<MessageHandler>>;

/**
 * 消息处理器
 *
 * 职责：接收来自服务端的消息，通过事件总线发布，不直接操作状态
 */
export class MessageHandler {
  private handlers: HandlerRegistry = new Map();

  constructor(private client: WebSocketClient) {
    this.registerDefaultHandlers();
  }

  /**
   * 注册处理器
   */
  public register<T>(type: ServerMessageType, handler: MessageHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);
  }

  /**
   * 取消注册处理器
   */
  public unregister<T>(type: ServerMessageType, handler: MessageHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as MessageHandler);

      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  /**
   * 处理消息
   */
  public async handle(message: ServerMessage): Promise<void> {
    const handlers = this.handlers.get(message.type);
    if (!handlers || handlers.size === 0) {
      console.warn(`[MessageHandler] No handlers for message type: ${message.type}`);
      return;
    }

    // 并行执行所有处理器
    const promises = Array.from(handlers).map(handler =>
      this.executeHandler(handler, message.payload)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 执行单个处理器
   */
  private async executeHandler(
    handler: MessageHandler,
    payload: unknown
  ): Promise<void> {
    try {
      await handler(payload);
    } catch (error) {
      console.error('[MessageHandler] Handler error:', error);
    }
  }

  /**
   * 注册默认处理器（事件驱动模式）
   *
   * 关键设计：不直接导入 stores，而是通过 eventBus 发布事件
   * 状态模块订阅这些事件来更新状态
   */
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
}
```

### 5.3 状态模块订阅事件示例

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
      case 'combat':
        useCombatStore.getState().syncCombatState(payload.data);
        break;
    }
  });

  // 订阅 DM 叙述
  eventBus.on(GameEvents.NARRATION, (payload) => {
    const chatStore = useChatStore.getState();
    const { text, isStreaming, isComplete } = payload;

    if (isStreaming) {
      chatStore.appendNarration(text);
    } else if (isComplete) {
      chatStore.endNarration();
      chatStore.completeNarration();
      chatStore.setWaitingForDM(false);
    } else {
      chatStore.startNarration({
        id: `nar-${Date.now()}`,
        content: text,
        isComplete: true
      });
    }
  });

  // 订阅战斗事件
  eventBus.on(GameEvents.COMBAT_EVENT, (payload) => {
    const combatStore = useCombatStore.getState();
    combatStore.handleCombatEvent(payload);

    // 触发游戏引擎特效（通过 DOM 事件）
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('combat-event', {
        detail: payload
      }));
    }
  });

  // 订阅检定结果
  eventBus.on(GameEvents.DICE_RESULT, (payload) => {
    const chatStore = useChatStore.getState();
    chatStore.addMessage({
      id: `dice-${Date.now()}`,
      type: 'dice_roll',
      content: `${payload.rollType}: ${payload.total}`,
      timestamp: Date.now(),
      ...payload
    });
  });

  // 订阅错误
  eventBus.on(GameEvents.ERROR, (payload) => {
    console.error('[Server] Error:', payload);
    const chatStore = useChatStore.getState();
    chatStore.addMessage({
      id: `error-${Date.now()}`,
      type: 'system',
      content: `错误: ${payload.message}`,
      timestamp: Date.now()
    });
  });
}

// 在应用启动时调用
initStoreSubscriptions();
```

### 5.4 依赖关系图（解耦后）

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

---

## 6. 消息队列组件

```typescript
// services/websocket/queue.ts
import { ClientMessage } from './types';
import { WebSocketClientConfig } from './client';

/**
 * 队列状态
 */
interface QueueState {
  messages: ClientMessage[];
  maxSize: number;
  droppedCount: number;
}

/**
 * 消息队列
 */
export class MessageQueue {
  private state: QueueState;

  constructor(config: Pick<WebSocketClientConfig, 'maxQueueSize'>) {
    this.state = {
      messages: [],
      maxSize: config.maxQueueSize,
      droppedCount: 0
    };
  }

  /**
   * 入队
   */
  public enqueue(message: ClientMessage): boolean {
    // 检查队列是否已满
    if (this.state.messages.length >= this.state.maxSize) {
      // 移除最旧的消息
      this.state.messages.shift();
      this.state.droppedCount++;
      console.warn('[MessageQueue] Queue full, dropped oldest message');
    }

    this.state.messages.push(message);
    return true;
  }

  /**
   * 出队（全部）
   */
  public flush(): ClientMessage[] {
    const messages = this.state.messages;
    this.state.messages = [];
    return messages;
  }

  /**
   * 清空队列
   */
  public clear(): void {
    this.state.messages = [];
  }

  /**
   * 获取队列大小
   */
  public size(): number {
    return this.state.messages.length;
  }

  /**
   * 获取队列状态
   */
  public getState(): QueueState {
    return {
      messages: [...this.state.messages],
      maxSize: this.state.maxSize,
      droppedCount: this.state.droppedCount
    };
  }
}
```

---

## 7. REST API 组件

### 7.1 API 客户端组件

```typescript
// services/api/client.ts

/**
 * API 错误
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 成功响应
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * API 客户端配置
 */
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * API 客户端接口
 */
export interface IApiClient {
  // ========== 通用方法 ==========
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  put<T>(url: string, data?: any): Promise<T>;
  patch<T>(url: string, data?: any): Promise<T>;
  delete<T>(url: string): Promise<T>;

  // ========== 子 API ==========
  session: SessionApi;
  save: SaveApi;
  scenario: ScenarioApi;
  config: ConfigApi;

  // ========== 配置 ==========
  setBaseUrl(url: string): void;
  setHeader(key: string, value: string): void;
  removeHeader(key: string): void;
}

/**
 * API 客户端实现
 */
export class ApiClient implements IApiClient {
  private config: Required<ApiClientConfig>;

  // 子 API
  public session: SessionApi;
  public save: SaveApi;
  public scenario: ScenarioApi;
  public config: ConfigApi;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/api',
      timeout: config.timeout || 30000,
      headers: config.headers || {}
    };

    // 初始化子 API
    this.session = createSessionApi(this);
    this.save = createSaveApi(this);
    this.scenario = createScenarioApi(this);
    this.config = createConfigApi(this);
  }

  public async get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  public async patch<T>(url: string, data?: any): Promise<T> {
    return this.request<T>('PATCH', url, data);
  }

  public async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  public setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }

  public setHeader(key: string, value: string): void {
    this.config.headers[key] = value;
  }

  public removeHeader(key: string): void {
    delete this.config.headers[key];
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any
  ): Promise<T> {
    const fullUrl = `${this.config.baseUrl}${url}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullUrl, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error?.code || 'HTTP_ERROR',
          errorData.error?.message || `HTTP ${response.status}`,
          errorData.error?.details
        );
      }

      const result: ApiResponse<T> = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('NETWORK_ERROR', 'Network request failed', error);
    }
  }
}

// 创建单例
export const apiClient = new ApiClient();
```

### 7.2 会话 API 组件

```typescript
// services/api/session.ts
import { ApiClient } from './client';

/**
 * 会话数据
 */
export interface Session {
  id: string;
  scenarioId: string;
  createdAt: number;
  lastAccessedAt: number;
}

/**
 * 创建会话数据
 */
export interface CreateSessionData {
  scenarioId: string;
}

/**
 * 会话 API 接口
 */
export interface SessionApi {
  list(): Promise<Session[]>;
  get(id: string): Promise<Session>;
  create(data: CreateSessionData): Promise<Session>;
  delete(id: string): Promise<void>;
}

/**
 * 创建会话 API
 */
export function createSessionApi(client: ApiClient): SessionApi {
  return {
    list: () => client.get<Session[]>('/sessions'),
    get: (id) => client.get<Session>(`/sessions/${id}`),
    create: (data) => client.post<Session>('/sessions', data),
    delete: (id) => client.delete(`/sessions/${id}`)
  };
}
```

### 7.3 存档 API 组件

```typescript
// services/api/save.ts
import { ApiClient } from './client';

/**
 * 存档数据
 */
export interface Save {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  createdAt: number;
  thumbnail?: string;
}

/**
 * 创建存档数据
 */
export interface CreateSaveData {
  name: string;
  description?: string;
  sessionId?: string;
}

/**
 * 存档 API 接口
 */
export interface SaveApi {
  list(sessionId?: string): Promise<Save[]>;
  get(id: string): Promise<Save>;
  create(data: CreateSaveData): Promise<Save>;
  load(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * 创建存档 API
 */
export function createSaveApi(client: ApiClient): SaveApi {
  return {
    list: (sessionId) =>
      client.get<Save[]>(
        sessionId
          ? `/saves?sessionId=${sessionId}`
          : '/saves'
      ),
    get: (id) => client.get<Save>(`/saves/${id}`),
    create: (data) => client.post<Save>('/saves', data),
    load: (id) => client.post<void>(`/saves/${id}/load`),
    delete: (id) => client.delete(`/saves/${id}`)
  };
}
```

### 7.4 剧本 API 组件

```typescript
// services/api/scenario.ts
import { ApiClient } from './client';

/**
 * 剧本数据
 */
export interface Scenario {
  id: string;
  name: string;
  description?: string;
  level: {
    min: number;
    max: number;
  };
  numberOfPlayers: {
    min: number;
    max: number;
  };
  tags: string[];
  createdAt: number;
}

/**
 * 剧本 API 接口
 */
export interface ScenarioApi {
  list(): Promise<Scenario[]>;
  get(id: string): Promise<Scenario>;
}

/**
 * 创建剧本 API
 */
export function createScenarioApi(client: ApiClient): ScenarioApi {
  return {
    list: () => client.get<Scenario[]>('/scenarios'),
    get: (id) => client.get<Scenario>(`/scenarios/${id}`)
  };
}
```

### 7.5 配置 API 组件

```typescript
// services/api/config.ts
import { ApiClient } from './client';

/**
 * 服务器配置
 */
export interface ServerConfig {
  version: string;
  features: string[];
  limits: {
    maxSessions: number;
    maxSaves: number;
  };
}

/**
 * 配置 API 接口
 */
export interface ConfigApi {
  get(): Promise<ServerConfig>;
}

/**
 * 创建配置 API
 */
export function createConfigApi(client: ApiClient): ConfigApi {
  return {
    get: () => client.get<ServerConfig>('/config')
  };
}
```

---

## 8. 组件间通信

### 8.1 与状态管理模块通信（事件驱动）

```typescript
// ===== 通信模块：发布事件 =====
// 消息处理器通过 eventBus 发布事件
this.register('state_update', (payload: StateUpdatePayload) => {
  eventBus.emit(GameEvents.STATE_UPDATE, payload);
});

// ===== 状态模块：订阅事件 =====
// stores/gameStore.ts - 状态模块订阅事件
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

// ===== 状态模块：发送消息 =====
// stores/gameStore.ts - Store 通过 WebSocket 发送请求
sendMessage: (text: string) => {
  websocketClient.send({
    type: 'user_input',
    payload: { text }
  });
}
```

### 8.2 与游戏引擎模块通信

```typescript
// 状态模块作为桥梁，通过 DOM 事件与游戏引擎通信
eventBus.on(GameEvents.COMBAT_EVENT, (payload) => {
  // 触发游戏引擎特效（通过 DOM 事件）
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('combat-event', {
      detail: payload
    }));
  }
});

// 游戏引擎模块监听
window.addEventListener('combat-event', (e) => {
  const event = e.detail;
  // 播放特效
});
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
**作者**：组件设计师
