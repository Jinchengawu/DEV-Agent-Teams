#!/bin/bash

# DEV-Agent Gateway 启动脚本
# 使用方法: ./start-gateway.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CODEX_NODE_BIN="${CODEX_NODE_BIN:-$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin}"

if [ -x "$CODEX_NODE_BIN/node" ]; then
    export PATH="$CODEX_NODE_BIN:$PATH"
fi

echo "🚀 DEV-Agent Gateway 启动"
echo "=========================="

# 检查 Node.js 是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo "✅ Node.js 已安装: $(node --version)"
echo "   Node 路径: $(command -v node)"

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    exit 1
fi

echo "✅ pnpm 已安装: $(pnpm --version)"

# 进入 gateway 目录
cd "$ROOT/packages/gateway"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 安装依赖..."
    pnpm install
fi

if ! (cd "$ROOT/packages/core" && node -e "require(process.argv[1])" "better-sqlite3") >/dev/null 2>&1; then
    echo "❌ better-sqlite3 与当前 Node runtime 不兼容"
    echo "   当前 Node: $(node --version) ($(command -v node))"
    echo "   建议: 使用 CODEX_NODE_BIN 指向 bundled Node，或在当前 Node 下重新 pnpm install"
    exit 1
fi

# 检查配置文件
CONFIG_DIR="$HOME/.dev-agent"
CONFIG_FILE="$CONFIG_DIR/config.yaml"

if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    echo "📝 创建配置文件..."
    mkdir -p "$CONFIG_DIR/logs"
    
    if [ -f "$ROOT/config/gateway-config.yaml" ]; then
        cp "$ROOT/config/gateway-config.yaml" "$CONFIG_FILE"
    fi
    echo "   ✅ 配置文件已创建: $CONFIG_FILE"
fi

# 启动 Gateway
echo ""
echo "🚀 启动 Gateway..."
echo "   按 Ctrl+C 停止"
echo ""

pnpm dev
