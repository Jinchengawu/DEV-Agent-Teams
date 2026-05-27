#!/bin/bash

# DEV-Agent-Teams 全部服务启动脚本
# Agent 公开端口: 8201-8205
# Hermes 内部端口: 9201-9205 (Agent 通过 internal port 调用 Hermes)
# 使用方法: ./start-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 DEV-Agent-Teams 多服务启动"
echo "=============================="

# 加载环境变量
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
    echo "✅ 已加载 .env 配置"
fi

# 检查必要的环境变量
if [ -z "$MODEL_PROVIDER" ]; then
    echo "⚠️  MODEL_PROVIDER 未设置，使用默认值"
    MODEL_PROVIDER="your_provider"
fi

if [ -z "$MODEL_NAME" ]; then
    echo "⚠️  MODEL_NAME 未设置，使用默认值"
    MODEL_NAME="your_model_name"
fi

if [ -z "$MODEL_BASE_URL" ]; then
    echo "⚠️  MODEL_BASE_URL 未设置，使用默认值"
    MODEL_BASE_URL="your_api_base_url"
fi

# 检查依赖
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v hermes &> /dev/null; then
    echo "❌ Hermes 未安装"
    exit 1
fi

echo "✅ Node.js 已安装: $(node --version)"
echo "✅ Hermes 已安装"
echo "✅ 模型配置: $MODEL_PROVIDER / $MODEL_NAME"

# Hermes 配置 (兼容 macOS 默认 bash 3.2)
export GATEWAY_ALLOW_ALL_USERS=true
export DEEPSEEK_API_KEY="${API_KEY:-}"

# Agent 公开端口 / Hermes 内部端口 (port+1000)
AGENTS=(
    "frontend:${FRONTEND_AGENT_PORT:-8201}:9201:packages/agents/frontend:前端开发 Agent"
    "backend:${BACKEND_AGENT_PORT:-8202}:9202:packages/agents/backend:后端开发 Agent"
    "testing:${TESTING_AGENT_PORT:-8203}:9203:packages/agents/testing:测试开发 Agent"
    "devops:${DEVOPS_AGENT_PORT:-8204}:9204:packages/agents/devops:DevOps Agent"
    "pm:${PM_AGENT_PORT:-8205}:9205:packages/agents/pm:产品经理 Agent"
)

# 步骤 1: 启动 Hermes 实例 (内部端口)
echo ""
echo "📦 步骤 1: 启动 Hermes 实例..."

for entry in "${AGENTS[@]}"; do
    IFS=':' read -r agent public_port hermes_port path label <<< "$entry"

    echo "   启动 Hermes for $label (内部端口 $hermes_port)..."

    HOME_DIR="$HOME/.hermes-dev-$agent"
    mkdir -p "$HOME_DIR"

    cat > "$HOME_DIR/config.yaml" << EOF
model:
  default: $MODEL_NAME
  provider: $MODEL_PROVIDER
  base_url: $MODEL_BASE_URL

platforms:
  api_server:
    enabled: true
    extra:
      host: "127.0.0.1"
      port: $hermes_port
      model_name: "hermes-agent"

agent:
  max_turns: 90
  gateway_timeout: 1800

toolsets:
  - hermes-cli
EOF

    HERMES_HOME="$HOME_DIR" hermes gateway run &
    HERMES_PID=$!

    echo "   ✅ Hermes 已启动 (PID: $HERMES_PID, 内部: $hermes_port → 公开: $public_port)"

    sleep 3
done

# 步骤 2: 启动 OpenClaw Gateway (编排层)
echo ""
echo "🧠 步骤 2: 启动 OpenClaw Gateway..."

cd "$SCRIPT_DIR/packages/gateway"

if [ ! -d "node_modules" ]; then
    echo "   📦 安装依赖..."
    npm install --cache "$SCRIPT_DIR/.npm-cache"
fi

npx tsx src/openclaw-gateway.ts &
GATEWAY_PID=$!
echo "   ✅ OpenClaw Gateway 已启动 (PID: $GATEWAY_PID, 端口: 8400)"

cd "$SCRIPT_DIR"
sleep 2

# 步骤 3: 启动 Agent 服务 (公开端口，注册到 OpenClaw Gateway)
echo ""
echo "📦 步骤 2: 启动 Agent 服务..."

for entry in "${AGENTS[@]}"; do
    IFS=':' read -r agent public_port hermes_port path label <<< "$entry"

    echo "   启动 $label..."

    cd "$SCRIPT_DIR/$path"

    if [ ! -d "node_modules" ]; then
        echo "   📦 安装依赖..."
        npm install --cache "$SCRIPT_DIR/.npm-cache"
    fi

    MODEL_BASE_URL="$MODEL_BASE_URL" \
    MODEL_NAME="$MODEL_NAME" \
    API_KEY="$API_KEY" \
    AGENT_PORT=$public_port HERMES_PORT=$hermes_port npm run dev &
    AGENT_PID=$!

    echo "   ✅ Agent 已启动 (PID: $AGENT_PID, 端口: $public_port → Hermes: $hermes_port)"

    cd "$SCRIPT_DIR"

    sleep 2
done

# 创建 data 目录
mkdir -p "$HOME/.dev-agent/data"

echo ""
echo "🎉 所有服务已启动！"
echo ""
echo "📋 服务状态："

# 检查 Agent 状态 (公开端口)
echo "OpenClaw Gateway:"
if curl -s "http://127.0.0.1:8400/health" > /dev/null 2>&1; then
    echo "   ✅ OpenClaw Gateway (:8400) — 运行中"
else
    echo "   ⚠️  OpenClaw Gateway (:8400) — 未响应（将使用降级直连）"
fi

echo ""
echo "Agent 实例:"
for entry in "${AGENTS[@]}"; do
    IFS=':' read -r agent public_port hermes_port path label <<< "$entry"
    if curl -s "http://127.0.0.1:$public_port/health" > /dev/null 2>&1; then
        echo "   ✅ $label (Agent:$public_port Hermes:$hermes_port) - 运行中"
    else
        echo "   ❌ $label (Agent:$public_port) - 未响应"
    fi
done

echo ""
echo "📋 下一步："
echo "   1. 启动 Dashboard: cd packages/dashboard && npm run dev"
echo "   2. 停止所有实例: pkill -f 'hermes gateway run' && pkill -f 'tsx watch'"
