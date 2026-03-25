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

## 后续特性

法术、物品、地图、剧本系统、世界地图、存档管理

## 运行

```bash
# 后端
cd apps/server && go run cmd/server/main.go

# 前端
cd apps/web && npm install && npm run dev
```
