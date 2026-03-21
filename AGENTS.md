# AGENTS.md - D&D 游戏项目开发指南

> 本项目的 AI Agent 开发指南。
>
> **阅读方式**：本文档是索引文档，按需加载详细文档。右侧目录可快速跳转。

---

<!-- TRELLIS:START -->
# Trellis 指令

这些指令是给在此项目中工作的 AI 助手使用的。

在开始新会话时使用 `/trellis:start` 命令：
- 初始化开发者身份
- 了解当前项目上下文
- 阅读相关指南

使用 `@/.trellis/` 了解：
- 开发工作流 (`workflow.md`)
- 项目结构指南 (`spec/`)
- 开发者工作区 (`workspace/`)

保留此管理块，以便 'trellis update' 可以刷新指令。

<!-- TRELLIS:END -->

---

## 工作语言

所有工作沟通、文档编写、代码注释均应使用**中文**。

---

## 1. 项目概述

| 文档 | 说明 |
|------|------|
| [需求概述](../docs/需求定稿/01-项目概述.md) | 项目定位、目标、技术选型 |
| [原始需求](../docs/需求定稿/10-原始需求.md) | 原始需求描述 |
| [系统能力](../docs/需求定稿/07-系统能力.md) | 系统能力矩阵 |

**核心技术**：
- **AI DM**：基于 LLM 的 DM，负责叙事和游戏管理
- **D&D 5e 规则**：角色创建、战斗、法术、物品、技能
- **Web 界面**：React + Phaser，支持战术战斗

---

## 2. 设计文档索引

### 2.1 架构与规范

| 文档 | 说明 |
|------|------|
| [系统架构](../docs/design/architecture.md) | 整体架构、子系统划分、数据流向 |
| [接口设计](../docs/design/interfaces.md) | WebSocket 协议、REST API、MCP 工具 |
| [共享类型](../docs/design/shared-types.md) | 前后端共享数据类型定义 |
| [技术路线](../docs/design/tech-roadmap.md) | 技术决策、实现阶段 |
| [质量标准](../docs/design/quality-audit.md) | 性能、可靠性指标 |

### 2.2 后端模块 (Go)

| 模块 | 索引文档 | 说明 |
|------|----------|------|
| **API 层** | [api.md](../docs/design/modules/backend/api.md) | WebSocket Hub、REST API |
| **Client 模块** | [client.md](../docs/design/modules/backend/client.md) | LLM 会话、上下文、适配器 |
| **角色系统** | [character.md](../docs/design/modules/backend/character.md) | 角色创建、属性、升级 |
| **战斗系统** | [combat.md](../docs/design/modules/backend/combat.md) | 先攻、回合、攻击、伤害 |
| **法术系统** | [spell.md](../docs/design/modules/backend/spell.md) | 法术位、施法、专注 |
| **物品系统** | [item.md](../docs/design/modules/backend/item.md) | 背包、装备、消耗品 |
| **地图系统** | [map.md](../docs/design/modules/backend/map.md) | 地图加载、位置、碰撞 |
| **剧本系统** | [scenario.md](../docs/design/modules/backend/scenario.md) | 剧本加载、章节、事件 |
| **检定系统** | [dice.md](../docs/design/modules/backend/dice.md) | 掷骰、属性检定、豁免 |
| **持久化** | [persistence.md](../docs/design/modules/backend/persistence.md) | 状态存储、存档管理 |

> 后端开发指南完整索引：[backend/index.md](../docs/design/modules/backend/index.md)

### 2.3 前端模块 (React + Phaser)

| 模块 | 索引文档 | 说明 |
|------|----------|------|
| **UI 组件** | [ui-components.md](../docs/design/modules/frontend/components/ui-components.md) | 通用 UI 组件 |
| **面板组件** | [panel-components.md](../docs/design/modules/frontend/components/panel-components.md) | 游戏面板组件 |
| **聊天组件** | [chat-components.md](../docs/design/modules/frontend/components/chat-components.md) | 聊天、叙述展示 |
| **战斗 UI** | [combat-ui-components.md](../docs/design/modules/frontend/components/combat-ui-components.md) | 战斗 HUD、先攻追踪 |
| **游戏引擎** | [game-engine-components.md](../docs/design/modules/frontend/components/game-engine-components.md) | Phaser 场景、实体 |
| **状态管理** | [state-module.md](../docs/design/modules/frontend/state-module.md) | Zustand stores |
| **通信模块** | [communication-module.md](../docs/design/modules/frontend/communication-module.md) | WebSocket 客户端 |

> 前端开发指南完整索引：[frontend/index.md](../docs/design/modules/frontend/index.md)

### 2.4 开发计划

| 版本 | 文档 | 说明 |
|------|------|------|
| v1.0 | [v1.0.md](../docs/design/dev-plans/v1.0.md) | 完整版计划 |
| v0.5 | [v0.5.md](../docs/design/dev-plans/v0.5.md) | 半成品版 |
| v0.4 | [v0.4.md](../docs/design/dev-plans/v0.4.md) | 早期版本 |
| v0.3 | [v0.3.md](../docs/design/dev-plans/v0.3.md) | 初始版本 |

---

## 3. 目录结构

### 3.1 项目根目录

```
dnd-agent/
├── apps/
│   ├── server/              # Go 后端
│   └── web/                 # React + Phaser 前端
├── packages/               # 共享包
├── configs/                # 项目配置
├── docs/                    # 设计文档（按需加载）
│   ├── design/             # 设计文档
│   │   ├── architecture.md
│   │   ├── interfaces.md
│   │   ├── shared-types.md
│   │   ├── modules/backend/
│   │   ├── modules/frontend/
│   │   └── dev-plans/
│   └── 需求定稿/           # 需求文档
├── test/                    # 测试文件（集中式测试，非就地测试）
│   ├── backend/            # Go 后端测试
│   │   ├── state/         # 状态管理测试
│   │   ├── models/        # 数据模型测试
│   │   └── dice/          # 骰子/检定测试
│   ├── frontend/          # React 前端测试
│   │   ├── stores/        # Zustand stores 测试
│   │   └── hooks/         # 自定义 Hooks 测试
│   └── scripts/           # 测试脚本

> **测试说明**：本项目采用集中式测试，所有测试文件集中在 `test/` 目录下，按模块组织而非跟随源代码文件位置。
├── .trellis/               # Trellis 工作流
└── AGENTS.md              # 本文件
```

---

## 4. 快速参考

### 4.1 编码前必读

| 场景 | 必读文档 |
|------|----------|
| 后端开发 | [backend/index.md](../docs/design/modules/backend/index.md) |
| 前端开发 | [frontend/index.md](../docs/design/modules/frontend/index.md) |
| 接口变更 | [interfaces.md](../docs/design/interfaces.md) |
| 架构决策 | [architecture.md](../docs/design/architecture.md) |

### 4.2 关键规则

| 主题 | 文档 |
|------|------|
| D&D 5e 规则实现 | [关键业务规则](../docs/需求定稿/04-关键业务规则.md) |
| 法术系统设计 | [spell.md](../docs/design/modules/backend/spell.md) |
| 战斗流程 | [combat.md](../docs/design/modules/backend/combat.md) |

### 4.3 质量标准

详见 [quality-audit.md](../docs/design/quality-audit.md)：

| 指标 | 目标 |
|------|------|
| WebSocket 延迟 | < 50ms（本地） |
| 状态更新推送 | < 100ms |
| 测试覆盖率 | > 70%（核心模块） |

---

## 5. 外部资源

| 资源 | 链接 |
|------|------|
| D&D 5e SRD | https://www.dndbeyond.com/resources/1781-systems-reference-document |
| Phaser 3 文档 | https://photonstorm.github.io/phaser3-docs/ |
| Gin 文档 | https://gin-gonic.com/docs/ |
| OpenAI API | https://platform.openai.com/docs |
| Anthropic API | https://docs.anthropic.com/ |

---

**文档版本**：v1.1
**最后更新**：2026-03-21
