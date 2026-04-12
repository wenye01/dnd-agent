# ============================================================
# D&D Game - 一键启动脚本 (PowerShell)
# ============================================================
# 用法:
#   powershell -ExecutionPolicy Bypass -File quickstart\start.ps1
#   powershell -ExecutionPolicy Bypass -File quickstart\start.ps1 -Mode dev
#   powershell -ExecutionPolicy Bypass -File quickstart\start.ps1 -Mode prod
# ============================================================

param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

# ---- 辅助函数 ----
function Write-Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Info "运行模式: $Mode"

# ---- 确定项目根目录 ----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot
Write-Info "项目根目录: $ProjectRoot"

# ---- 记录后台进程，退出时清理 ----
$processes = @()

function Cleanup {
    Write-Host ""
    Write-Info "正在停止所有服务..."
    foreach ($proc in $processes) {
        if (!$proc.HasExited) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            } catch {
                # 忽略已退出的进程
            }
        }
    }
    Write-Ok "已停止所有服务"
}

# 注册退出事件
try {
    Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } -ErrorAction SilentlyContinue | Out-Null
} catch {}

# ============================================================
# 1. 环境检查
# ============================================================

Write-Info "正在检查环境依赖..."

# ---- Go >= 1.21 ----
$goExe = Get-Command go -ErrorAction SilentlyContinue
if (!$goExe) {
    Write-Err "未找到 Go。请安装 Go 1.21+: https://go.dev/dl/"
    exit 1
}

$goVersionOutput = go version
$goVersionMatch = [regex]::Match($goVersionOutput, 'go(\d+)\.(\d+)')
$goMajor = [int]$goVersionMatch.Groups[1].Value
$goMinor = [int]$goVersionMatch.Groups[2].Value

if ($goMajor -lt 1 -or ($goMajor -eq 1 -and $goMinor -lt 21)) {
    Write-Err "Go 版本过低 (当前 go$goMajor.$goMinor)，需要 Go 1.21+"
    exit 1
}
Write-Ok "Go $goMajor.$goMinor"

# ---- Node.js >= 18 ----
$nodeExe = Get-Command node -ErrorAction SilentlyContinue
if (!$nodeExe) {
    Write-Err "未找到 Node.js。请安装 Node.js 18+: https://nodejs.org/"
    exit 1
}

$nodeVersionOutput = node -v
$nodeMajor = [int]($nodeVersionOutput -replace '^v(\d+)\..*', '$1')
if ($nodeMajor -lt 18) {
    Write-Err "Node.js 版本过低 (当前 $nodeVersionOutput)，需要 v18+"
    exit 1
}
Write-Ok "Node.js $nodeVersionOutput"

# ---- pnpm (自动安装) ----
$pnpmExe = Get-Command pnpm -ErrorAction SilentlyContinue
if (!$pnpmExe) {
    Write-Warn "未找到 pnpm，正在通过 npm 安装..."
    npm install -g pnpm
    $pnpmExe = Get-Command pnpm -ErrorAction SilentlyContinue
    if (!$pnpmExe) {
        Write-Err "pnpm 安装失败，请手动安装: npm install -g pnpm"
        exit 1
    }
}
$pnpmVersion = pnpm -v
Write-Ok "pnpm $pnpmVersion"

# ============================================================
# 2. 配置文件 (.env)
# ============================================================

Write-Info "正在检查配置文件..."

# 后端 .env
$serverEnv = Join-Path $ProjectRoot "apps\server\.env"
$serverEnvExample = Join-Path $ProjectRoot "quickstart\.env.server.example"

if (!(Test-Path $serverEnv)) {
    if (Test-Path $serverEnvExample) {
        Copy-Item $serverEnvExample $serverEnv
        Write-Warn "已从模板创建 apps\server\.env"
        Write-Warn "请编辑 apps\server\.env 填入你的 API Key 后重新运行"
        Write-Err "MINIMAX_API_KEY 未配置，服务无法正常工作"
        exit 1
    } else {
        Write-Err "未找到 quickstart\.env.server.example 模板文件"
        exit 1
    }
} else {
    Write-Ok "apps\server\.env 已存在"
}

# 前端 .env
$webEnv = Join-Path $ProjectRoot "apps\web\.env"
$webEnvExample = Join-Path $ProjectRoot "quickstart\.env.web.example"

if (!(Test-Path $webEnv)) {
    if (Test-Path $webEnvExample) {
        Copy-Item $webEnvExample $webEnv
        Write-Ok "已从模板创建 apps\web\.env"
    } else {
        Write-Warn "未找到 quickstart\.env.web.example，跳过前端 .env"
    }
} else {
    Write-Ok "apps\web\.env 已存在"
}

# ============================================================
# 3. 依赖安装
# ============================================================

Write-Info "正在安装后端依赖..."
Set-Location (Join-Path $ProjectRoot "apps\server")
go mod download
Write-Ok "后端依赖就绪"

Write-Info "正在安装前端依赖..."
Set-Location (Join-Path $ProjectRoot "apps\web")
pnpm install
Write-Ok "前端依赖就绪"

# ============================================================
# 4. 构建 (仅 prod 模式)
# ============================================================

if ($Mode -eq "prod") {
    Write-Info "正在构建后端..."
    $binDir = Join-Path $ProjectRoot "bin"
    if (!(Test-Path $binDir)) {
        New-Item -ItemType Directory -Path $binDir | Out-Null
    }
    Set-Location (Join-Path $ProjectRoot "apps\server")
    go build -o (Join-Path $ProjectRoot "bin\server.exe") ./cmd/server
    Write-Ok "后端构建完成: bin\server.exe"

    Write-Info "正在构建前端..."
    Set-Location (Join-Path $ProjectRoot "apps\web")
    pnpm build
    Write-Ok "前端构建完成: apps\web\dist\"
}

# ============================================================
# 5. 启动服务
# ============================================================

Set-Location $ProjectRoot
Write-Host ""
Write-Info "========================================="
Write-Info "  启动 D&D Game 服务 (模式: $Mode)"
Write-Info "========================================="
Write-Host ""

if ($Mode -eq "dev") {
    # ---- Dev 模式: go run + pnpm dev ----
    Write-Info "启动后端 (go run)..."
    $serverProc = Start-Process -FilePath "go" `
        -ArgumentList "run", "./cmd/server" `
        -WorkingDirectory (Join-Path $ProjectRoot "apps\server") `
        -PassThru -NoNewWindow
    $processes += $serverProc

    Write-Info "启动前端 (pnpm dev)..."
    $webProc = Start-Process -FilePath "pnpm" `
        -ArgumentList "run", "dev" `
        -WorkingDirectory (Join-Path $ProjectRoot "apps\web") `
        -PassThru -NoNewWindow
    $processes += $webProc

    Write-Info "后端地址: http://localhost:8080"
    Write-Info "前端地址: http://localhost:5173"
} else {
    # ---- Prod 模式: 运行编译后的二进制 + pnpm preview ----
    Write-Info "启动后端 (bin\server.exe)..."
    $serverProc = Start-Process -FilePath (Join-Path $ProjectRoot "bin\server.exe") `
        -WorkingDirectory (Join-Path $ProjectRoot "apps\server") `
        -PassThru -NoNewWindow
    $processes += $serverProc

    Write-Info "启动前端预览 (pnpm preview)..."
    $webProc = Start-Process -FilePath "pnpm" `
        -ArgumentList "run", "preview" `
        -WorkingDirectory (Join-Path $ProjectRoot "apps\web") `
        -PassThru -NoNewWindow
    $processes += $webProc

    Write-Info "后端地址: http://localhost:8080"
    Write-Info "前端地址: http://localhost:4173 (preview)"
}

Write-Host ""
Write-Info "按 Ctrl+C 停止所有服务"

# ---- 等待用户中断 ----
try {
    # 等待任一进程退出
    $processes | Wait-Process
} catch {
    # 用户按 Ctrl+C
} finally {
    Cleanup
}
