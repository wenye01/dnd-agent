#!/usr/bin/env bash
# ============================================================
# D&D Game - 一键启动脚本 (Bash)
# ============================================================
# 用法:
#   bash quickstart/start.sh          # 开发模式 (默认)
#   bash quickstart/start.sh --dev    # 开发模式
#   bash quickstart/start.sh --prod   # 生产模式 (构建后启动)
# ============================================================

set -euo pipefail

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- 解析参数 ----
MODE="dev"
for arg in "$@"; do
  case "$arg" in
    --dev)  MODE="dev" ;;
    --prod) MODE="prod" ;;
    *)
      echo "用法: bash quickstart/start.sh [--dev|--prod]"
      echo "  --dev   开发模式 (默认): 分别启动前后端 dev server"
      echo "  --prod  生产模式: 构建前端，启动编译后的后端"
      exit 1
      ;;
  esac
done

info "运行模式: $MODE"

# ---- 确定项目根目录 ----
# 脚本所在目录的上一级即为项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"
info "项目根目录: $PROJECT_ROOT"

# ---- 记录后台进程 PID，退出时清理 ----
PIDS=()
cleanup() {
  echo ""
  info "正在停止所有服务..."
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  ok "已停止所有服务"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================================
# 1. 环境检查
# ============================================================

info "正在检查环境依赖..."

# ---- Go >= 1.21 ----
if ! command -v go &>/dev/null; then
  error "未找到 Go。请安装 Go 1.21+ : https://go.dev/dl/"
  exit 1
fi

GO_VERSION="$(go version | sed -n 's/.*go\([0-9]*\.[0-9]*\).*/\1/p')"
GO_MAJOR="$(echo "$GO_VERSION" | cut -d. -f1)"
GO_MINOR="$(echo "$GO_VERSION" | cut -d. -f2)"

if [[ "$GO_MAJOR" -lt 1 ]] || { [[ "$GO_MAJOR" -eq 1 ]] && [[ "$GO_MINOR" -lt 21 ]]; }; then
  error "Go 版本过低 (当前 go$GO_VERSION)，需要 Go 1.21+"
  exit 1
fi
ok "Go $GO_VERSION"

# ---- Node.js >= 18 ----
if ! command -v node &>/dev/null; then
  error "未找到 Node.js。请安装 Node.js 18+ : https://nodejs.org/"
  exit 1
fi

NODE_VERSION="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [[ "$NODE_VERSION" -lt 18 ]]; then
  error "Node.js 版本过低 (当前 v$(node -v))，需要 18+"
  exit 1
fi
ok "Node.js $(node -v)"

# ---- pnpm (自动安装) ----
if ! command -v pnpm &>/dev/null; then
  warn "未找到 pnpm，正在通过 npm 安装..."
  npm install -g pnpm
  if ! command -v pnpm &>/dev/null; then
    error "pnpm 安装失败，请手动安装: npm install -g pnpm"
    exit 1
  fi
fi
ok "pnpm $(pnpm -v)"

# ============================================================
# 2. 配置文件 (.env)
# ============================================================

info "正在检查配置文件..."

# 后端 .env
if [[ ! -f "apps/server/.env" ]]; then
  if [[ -f "quickstart/.env.server.example" ]]; then
    cp quickstart/.env.server.example apps/server/.env
    warn "已从模板创建 apps/server/.env"
    warn "请编辑 apps/server/.env 填入你的 API Key 后重新运行"
    error "MINIMAX_API_KEY 未配置，服务无法正常工作"
    exit 1
  else
    error "未找到 quickstart/.env.server.example 模板文件"
    exit 1
  fi
else
  ok "apps/server/.env 已存在"
fi

# 前端 .env
if [[ ! -f "apps/web/.env" ]]; then
  if [[ -f "quickstart/.env.web.example" ]]; then
    cp quickstart/.env.web.example apps/web/.env
    ok "已从模板创建 apps/web/.env"
  else
    warn "未找到 quickstart/.env.web.example，跳过前端 .env"
  fi
else
  ok "apps/web/.env 已存在"
fi

# ============================================================
# 3. 依赖安装
# ============================================================

info "正在安装后端依赖..."
(cd apps/server && go mod download)
ok "后端依赖就绪"

info "正在安装前端依赖..."
(cd apps/web && pnpm install)
ok "前端依赖就绪"

# ============================================================
# 4. 构建 (仅 prod 模式)
# ============================================================

if [[ "$MODE" == "prod" ]]; then
  info "正在构建后端..."
  mkdir -p bin
  (cd apps/server && go build -o ../../bin/server ./cmd/server)
  ok "后端构建完成: bin/server"

  info "正在构建前端..."
  (cd apps/web && pnpm build)
  ok "前端构建完成: apps/web/dist/"
fi

# ============================================================
# 5. 启动服务
# ============================================================

echo ""
info "========================================="
info "  启动 D&D Game 服务 (模式: $MODE)"
info "========================================="
echo ""

if [[ "$MODE" == "dev" ]]; then
  # ---- Dev 模式: go run + pnpm dev ----
  info "启动后端 (go run)..."
  (cd apps/server && go run ./cmd/server) &
  PIDS+=($!)

  info "启动前端 (pnpm dev)..."
  (cd apps/web && pnpm dev) &
  PIDS+=($!)

  info "后端地址: http://localhost:8080"
  info "前端地址: http://localhost:5173"
  echo ""
  info "按 Ctrl+C 停止所有服务"

else
  # ---- Prod 模式: 运行编译后的二进制 + pnpm preview ----
  info "启动后端 (bin/server)..."
  (cd apps/server && ../../bin/server) &
  PIDS+=($!)

  info "启动前端预览 (pnpm preview)..."
  (cd apps/web && pnpm preview) &
  PIDS+=($!)

  info "后端地址: http://localhost:8080"
  info "前端地址: http://localhost:4173 (preview)"
  echo ""
  info "按 Ctrl+C 停止所有服务"
fi

# 等待所有后台进程
wait
