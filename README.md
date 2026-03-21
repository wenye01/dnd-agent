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

## 开发进度

基于 [开发计划文档](docs/design/dev-plans/)

### 已完成

- [x] 系统架构设计
- [x] 接口协议定义（WebSocket、REST API、MCP）
- [x] 后端模块详细设计
- [x] 前端模块详细设计
- [x] 集中式测试框架

### v0.4（进行中）

法术 + 物品 + 地图系统

- B204 法术系统完善
- B205 物品系统实现
- B206 地图系统实现
- B207 剧本加载（基础）

### v0.5（计划中）

剧本 + 世界地图 + 存档

- B301 剧本系统完善
- B302 世界地图系统
- B303 存档系统完善
- B304 专长系统
- B305 背景特性系统
- B306 上下文压缩

### v1.0（计划中）

完整发布版本

- B401 死亡豁免完善
- B402 复活系统
- B403 错误恢复系统
- B404 管理接口
- B405 性能优化

详细任务列表见 [开发计划文档](docs/design/dev-plans/)

## 文档

- [AGENTS.md](AGENTS.md) - 开发指南索引
- [docs/design/](docs/design/) - 详细设计文档
- [docs/需求定稿/](docs/需求定稿/) - 需求文档

## 运行

```bash
# 后端
cd apps/server && go run cmd/server/main.go

# 前端
cd apps/web && npm install && npm run dev
```
