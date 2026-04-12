# Quickstart - 一键部署脚本

D&D Game 跨平台一键部署脚本，支持 Windows (PowerShell) 和 Linux/macOS/WSL/Git Bash (Bash)。

## 前置要求

| 依赖 | 最低版本 | 安装地址 |
|------|----------|----------|
| Go | 1.21+ | https://go.dev/dl/ |
| Node.js | 18+ | https://nodejs.org/ |
| pnpm | 任意 (未安装时自动安装) | https://pnpm.io/ |

## 快速开始

### 1. 配置环境变量

首次运行前，需先配置 LLM API Key。

```bash
# 从模板复制配置文件 (在项目根目录执行)
cp quickstart/.env.server.example apps/server/.env
cp quickstart/.env.web.example apps/web/.env
```

编辑 `apps/server/.env`，填入你的 LLM API Key：

```env
# 默认使用 MiniMax
MINIMAX_API_KEY=your-actual-api-key

# 或切换到 OpenAI (取消注释并填入 Key)
# DND_LLM_PROVIDER=openai
# DND_LLM_OPENAI_API_KEY=your-openai-key
```

### 2. 启动服务

**Linux / macOS / WSL / Git Bash:**

```bash
# 开发模式 (默认)
bash quickstart/start.sh

# 生产模式 (构建后启动)
bash quickstart/start.sh --prod
```

**Windows PowerShell:**

```powershell
# 开发模式 (默认)
powershell -ExecutionPolicy Bypass -File quickstart\start.ps1

# 生产模式 (构建后启动)
powershell -ExecutionPolicy Bypass -File quickstart\start.ps1 -Mode prod
```

### 3. 访问服务

| 模式 | 后端 | 前端 |
|------|------|------|
| dev | http://localhost:8080 | http://localhost:5173 |
| prod | http://localhost:8080 | http://localhost:4173 |

### 4. 停止服务

按 `Ctrl+C` 即可停止所有服务。脚本会自动清理后台进程。

## 脚本功能

脚本会自动完成以下步骤：

1. **环境检查** - 验证 Go、Node.js、pnpm 是否安装且版本符合要求
2. **依赖安装** - 自动下载 Go modules 和 npm 包
3. **配置生成** - 首次运行时从 `.env.example` 模板创建 `.env` 文件
4. **构建** (`--prod` 模式) - 编译 Go 后端，构建前端静态文件
5. **启动服务** - 后端和前端同时启动

## 运行模式

### dev 模式 (默认)

- 后端: `go run ./cmd/server` (热重载)
- 前端: `pnpm dev` (Vite dev server，支持 HMR)

### prod 模式

- 后端: 编译为 `bin/server` (或 `bin\server.exe`) 后运行
- 前端: `pnpm build` 后通过 `pnpm preview` 提供服务

## LLM 配置

支持以下 LLM 提供商（在 `apps/server/.env` 中配置）：

| 提供商 | DND_LLM_PROVIDER 值 | 需要的环境变量 |
|--------|----------------------|----------------|
| MiniMax (默认) | `minimax` | `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL` |
| OpenAI | `openai` | `DND_LLM_PROVIDER=openai`, `DND_LLM_OPENAI_API_KEY`, `DND_LLM_OPENAI_BASE_URL`, `DND_LLM_OPENAI_MODEL` |
| GLM | `glm` | `DND_LLM_PROVIDER=glm`, `DND_LLM_OPENAI_API_KEY`, `DND_LLM_OPENAI_BASE_URL`, `DND_LLM_OPENAI_MODEL` |

切换提供商只需修改 `.env` 中的 `DND_LLM_PROVIDER` 和对应的 API Key。

## 故障排除

| 问题 | 解决方法 |
|------|----------|
| "未找到 Go" | 安装 Go 1.21+ 并确保在 PATH 中 |
| "未找到 Node.js" | 安装 Node.js 18+ 并确保在 PATH 中 |
| API Key 未配置 | 编辑 `apps/server/.env` 填入有效 Key |
| 端口被占用 | 检查 8080/5173 端口，或修改 `.env` 配置 |
| PowerShell 执行策略 | 使用 `-ExecutionPolicy Bypass` 参数运行 |
