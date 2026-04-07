# D&D Agent

基于 LLM 的 D&D 5e 单人游戏，AI 充当地下城主（DM），玩家通过 Web 界面进行游戏。

## 核心功能

- **AI DM**：LLM 驱动的叙事和游戏管理
- **完整 D&D 5e 规则**：角色创建、战斗、法术、物品、技能
- **战术战斗**：Phaser 渲染的网格战斗场景
- **剧本系统**：支持预设冒险剧本

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + Phaser + TypeScript + Zustand |
| 后端 | Go + Gin + Gorilla WebSocket |
| AI | OpenAI / Anthropic API |

## 项目结构

```
dnd-agent/
├── apps/
│   ├── server/          # Go 后端
│   │   ├── cmd/         # 入口点
│   │   ├── internal/    # 内部模块
│   │   └── pkg/         # 公共包
│   └── web/             # React 前端
│       ├── src/
│       │   ├── components/  # UI 组件
│       │   ├── game/        # Phaser 场景
│       │   └── stores/      # Zustand 状态
├── docs/                # 设计文档
│   └── design/
│       └── dev-plans/   # 开发计划
└── turbo.json           # Turborepo 配置
```

## 开发进度

```
v0.1 ──▶ v0.2 ──▶ v0.3 ──▶ v0.4 ──▶ v0.5 ──▶ v1.0
✅ 基础   ✅ 角色+UI  🔄 战斗     计划中    计划中    计划中
```

| 版本 | 状态 | 功能 |
|------|:----:|------|
| v0.1 | ✅ | 基础设施（WebSocket、LLM 集成、持久化） |
| v0.2 | ✅ | 角色创建 + 基础 UI |
| v0.3 | 🔄 | 战斗系统（先攻、回合、伤害、状态效果、休息恢复） |
| v0.4 | 计划 | 法术 + 物品 + 地图 |
| v0.5 | 计划 | 剧本 + 世界地图 + 存档 |
| v1.0 | 计划 | 完整版本（死亡复活、错误恢复、UI 打磨） |

## 运行

```bash
# 安装依赖
pnpm install

# 后端
cd apps/server && go run cmd/server/main.go

# 前端
cd apps/web && pnpm dev

# 或使用 Turborepo
turbo dev
```

## 许可证

MIT
