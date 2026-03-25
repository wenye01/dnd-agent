# Phase 3: 可选增强 - LLM 与游戏引擎

> **版本**: v0.2
> **阶段**: Phase 3
> **预计时间**: 第8天
> **优先级**: P1 (可选但重要)
> **依赖**: Phase 1, Phase 2

---

## 阶段目标

完成可选但重要的增强功能：
1. Anthropic Claude LLM 支持
2. Phaser 游戏引擎集成（**v0.3 开始前必须完成**）

---

## 任务清单

### B011 - LLM 适配层（Anthropic）

| 属性 | 描述 |
|------|------|
| **任务ID** | B011 |
| **任务名称** | LLM 适配层 - Anthropic 实现 |
| **所属模块** | client/llm |
| **优先级** | P1 |
| **依赖** | v0.1 B005 |

**功能描述**：
- 实现 Anthropic Claude 适配器
- 复用 v0.1 B005 定义的 LLM Provider 接口
- 支持流式响应（Messages API SSE）
- 支持工具调用（Tool Use API）

**验收标准**：
1. 可以成功调用 Anthropic Claude API
2. 流式响应可以逐字输出
3. 工具调用格式正确转换
4. 可通过配置文件切换 LLM Provider

**详细指南**: 参考 `v0.2.md` 任务 B011

---

### F009 - Phaser 游戏引擎集成

| 属性 | 描述 |
|------|------|
| **任务ID** | F009 |
| **任务名称** | Phaser 游戏引擎集成 |
| **所属模块** | game/ |
| **优先级** | P1 (**v0.3 前必须完成**) |
| **依赖** | v0.1 F001, F004 |

**功能描述**：
- 集成 Phaser 3 游戏引擎
- 实现 GameManager（管理 Phaser 实例生命周期）
- 实现 React-Phaser 桥接（Canvas 嵌入 React 布局）
- 实现场景注册和切换机制
- 实现基础占位场景（EmptyScene）

**为什么必须在 v0.3 前完成**：
v0.3 的战斗场景（F201）、场景地图（F206）均依赖此基础架构。

**验收标准**：
1. Phaser 游戏实例可以正确初始化和销毁
2. Canvas 可以无缝嵌入 React 主界面的中间区域
3. 场景注册和切换不报错
4. Zustand store 可以触发 Phaser 场景更新

**详细指南**: 参考 `v0.2.md` 任务 F009

---

## 依赖关系

```
Phase 1, 2 完成后
    │
    ├──▶ B011 (Anthropic LLM)
    │         │
    │         └── 依赖 v0.1 B005 (LLM Provider 接口)
    │
    └──▶ F009 (Phaser 引擎)
              │
              └── 依赖 v0.1 F001, F004
```

---

## 完成标准

- [ ] Anthropic Claude API 可正常调用
- [ ] 可通过配置切换 LLM Provider
- [ ] Phaser 引擎可正确初始化
- [ ] Canvas 可嵌入 React 布局
- [ ] 场景注册和切换正常

---

## 重要提醒

> **F009 (Phaser 集成) 必须在 v0.3 开始前完成**
>
> v0.3 将实现战斗系统，所有战斗相关的可视化都依赖 Phaser 引擎。
> 如果此任务未完成，v0.3 的开发将被阻塞。
