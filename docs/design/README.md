# D&D Agent 设计文档索引

> **版本**: v1.0
> **最后更新**: 2026-03-25
> **用途**: Agent 开发指南，涵盖架构、模块设计、接口定义、开发计划

---

## 目录

1. [架构与规范](#1-架构与规范)
2. [后端模块 (Go)](#2-后端模块-go)
3. [前端模块 (React+Phaser)](#3-前端模块-reactphaser)
4. [开发计划](#4-开发计划)
5. [快速入口](#5-快速入口)

---

## 1. 架构与规范

| 文档 | 说明 | 开发者必读 |
|------|------|-----------|
| [architecture.md](./architecture.md) | 系统架构、子系统划分、数据流向 | ✅ |
| [interfaces.md](./interfaces.md) | WebSocket 协议、REST API、MCP 工具 | ✅ |
| [shared-types.md](./shared-types.md) | 前后端共享数据类型定义 | ✅ |
| [tech-roadmap.md](./tech-roadmap.md) | 技术决策、实现阶段 | 🔍 |
| [quality-audit.md](./quality-audit.md) | 性能、可靠性指标 | 🔍 |
| [edge-cases.md](./edge-cases.md) | 边界情况处理 | 🔍 |

---

## 2. 后端模块 (Go)

**完整索引**: [modules/backend/index.md](./modules/backend/index.md)

### 模块列表

| 模块 | 文档 | 职责 |
|------|------|------|
| **API 模块** | [modules/backend/api.md](./modules/backend/api.md) | WebSocket Hub、REST API |
| **Client 模块** | [modules/backend/client.md](./modules/backend/client.md) | LLM 会话、上下文、适配器 |
| **角色系统** | [modules/backend/character.md](./modules/backend/character.md) | 角色创建、属性、升级 |
| **战斗系统** | [modules/backend/combat.md](./modules/backend/combat.md) | 先攻、回合、攻击、伤害 |
| **法术系统** | [modules/backend/spell.md](./modules/backend/spell.md) | 法术位、施法、专注 |
| **物品系统** | [modules/backend/item.md](./modules/backend/item.md) | 背包、装备、消耗品 |
| **地图系统** | [modules/backend/map.md](./modules/backend/map.md) | 地图加载、位置、碰撞 |
| **剧本系统** | [modules/backend/scenario.md](./modules/backend/scenario.md) | 剧本加载、章节、事件 |
| **检定系统** | [modules/backend/dice.md](./modules/backend/dice.md) | 掷骰、属性检定、豁免 |
| **持久化** | [modules/backend/persistence.md](./modules/backend/persistence.md) | 状态存储、存档管理 |

### 目录结构

```
apps/server/              # Go 后端根目录
├── cmd/server/          # 主入口
├── internal/
│   ├── api/            # API 模块 (WebSocket/REST)
│   ├── client/         # Client 模块 (LLM/会话/工具)
│   ├── server/         # Server 模块 (规则引擎)
│   │   ├── character/  # 角色系统
│   │   ├── combat/     # 战斗系统
│   │   ├── spell/      # 法术系统
│   │   ├── item/       # 物品系统
│   │   ├── map/        # 地图系统
│   │   ├── scenario/   # 剧本系统
│   │   ├── dice/       # 检定系统
│   │   └── effects/    # 状态效果
│   ├── shared/         # 共享数据 (types/models/events)
│   └── persistence/    # 持久化层
└── pkg/dnd5e/          # D&D 5e 规则常量
```

---

## 3. 前端模块 (React+Phaser)

**完整索引**: [modules/frontend/index.md](./modules/frontend/index.md)

### 模块列表

| 模块 | 文档 | 职责 |
|------|------|------|
| **UI 模块** | [modules/frontend/ui-module.md](./modules/frontend/ui-module.md) | React 组件，用户界面 |
| **游戏引擎** | [modules/frontend/game-engine-module.md](./modules/frontend/game-engine-module.md) | Phaser 场景，游戏渲染 |
| **状态管理** | [modules/frontend/state-module.md](./modules/frontend/state-module.md) | Zustand stores |
| **通信模块** | [modules/frontend/communication-module.md](./modules/frontend/communication-module.md) | WebSocket 客户端 |

### 组件列表

| 组件类型 | 文档 |
|----------|------|
| 通用 UI | [modules/frontend/components/ui-components.md](./modules/frontend/components/ui-components.md) |
| 面板组件 | [modules/frontend/components/panel-components.md](./modules/frontend/components/panel-components.md) |
| 聊天组件 | [modules/frontend/components/chat-components.md](./modules/frontend/components/chat-components.md) |
| 战斗 UI | [modules/frontend/components/combat-ui-components.md](./modules/frontend/components/combat-ui-components.md) |
| 游戏引擎 | [modules/frontend/components/game-engine-components.md](./modules/frontend/components/game-engine-components.md) |

### 目录结构

```
apps/web/                # React 前端根目录
├── src/
│   ├── components/      # UI 组件
│   │   ├── ui/         # 通用组件 (Button/Input/Panel)
│   │   ├── layout/     # 布局组件
│   │   ├── panels/     # 游戏面板 (角色/背包/法术)
│   │   ├── chat/       # 聊天组件
│   │   ├── dialogs/    # 对话框
│   │   └── combat/     # 战斗 UI
│   ├── game/           # Phaser 游戏引擎
│   │   ├── scenes/     # 游戏场景
│   │   ├── entities/   # 游戏实体
│   │   └── effects/    # 特效系统
│   ├── stores/         # Zustand 状态管理
│   ├── services/       # 通信服务 (WebSocket/API)
│   ├── hooks/          # 自定义 Hooks
│   └── types/          # 类型定义
└── public/assets/      # 静态资源
```

---

## 4. 开发计划

**完整索引**: [dev-plans/README.md](./dev-plans/README.md)

### 版本路线图

```
v0.1 ──▶ v0.2 ──▶ v0.3 ──▶ v0.4 ──▶ v0.5 ──▶ v1.0
基础设施  角色+UI   战斗系统  法术+物品  剧本+地图  完整版本
```

### 版本计划

| 版本 | 任务总览 | 后端指南 | 前端指南 |
|------|----------|----------|----------|
| **v0.1** 基础设施 | [v0.1.md](./dev-plans/v0.1.md) | [v0.1-backend.md](./dev-plans/v0.1-backend.md) | [v0.1-frontend.md](./dev-plans/v0.1-frontend.md) |
| **v0.2** 角色+UI | [v0.2.md](./dev-plans/v0.2.md) | [v0.2-backend.md](./dev-plans/v0.2-backend.md) | [v0.2-frontend.md](./dev-plans/v0.2-frontend.md) |
| **v0.3** 战斗系统 | [v0.3.md](./dev-plans/v0.3.md) | [v0.3-backend.md](./dev-plans/v0.3-backend.md) | [v0.3-frontend.md](./dev-plans/v0.3-frontend.md) |
| **v0.4** 法术+物品 | [v0.4.md](./dev-plans/v0.4.md) | [v0.4-backend.md](./dev-plans/v0.4-backend.md) | [v0.4-frontend.md](./dev-plans/v0.4-frontend.md) |
| **v0.5** 剧本+地图 | [v0.5.md](./dev-plans/v0.5.md) | [v0.5-backend.md](./dev-plans/v0.5-backend.md) | [v0.5-frontend.md](./dev-plans/v0.5-frontend.md) |
| **v1.0** 完整版 | [v1.0.md](./dev-plans/v1.0.md) | [v1.0-backend.md](./dev-plans/v1.0-backend.md) | [v1.0-frontend.md](./dev-plans/v1.0-frontend.md) |

---

## 5. 快速入口

### 按任务类型选择入口

| 任务类型 | 首先阅读 |
|----------|----------|
| **后端开发** | 本文档 + [modules/backend/index.md](./modules/backend/index.md) + 对应版本后端指南 |
| **前端开发** | 本文档 + [modules/frontend/index.md](./modules/frontend/index.md) + 对应版本前端指南 |
| **跨层功能** | 本文档 + [architecture.md](./architecture.md) + [interfaces.md](./interfaces.md) |
| **测试验证** | 任务 `prd.md` + [dev-plans/README.md](./dev-plans/README.md) |

### Agent 工作流

```
1. 读取本文档了解项目结构
2. 根据任务类型阅读对应模块索引
3. 阅读具体模块设计文档
4. 参考对应版本的开发计划
5. 实现功能
```

### 核心 D&D 5e 规则

- [关键业务规则](../../需求定稿/04-关键业务规则.md) - D&D 5e 核心规则实现
- [原始需求](../../需求定稿/10-原始需求.md) - 原始需求描述
- [系统能力](../../需求定稿/07-系统能力.md) - 系统能力矩阵

---

## 文档版本

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-03-25 | 初始版本，建立完整索引 |

---

**索引维护**: 本文档由设计文档索引生成，Agent 启动时自动加载
