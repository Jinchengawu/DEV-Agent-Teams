#!/bin/bash

# DEV-Agent-Teams 全部服务启动脚本
# 使用方法: ./start-all.sh

set -e

echo "🚀 DEV-Agent-Teams 多服务启动"
echo "=============================="

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
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

# 定义 Agent 配置
declare -A AGENTS=(
    ["frontend"]="${FRONTEND_AGENT_PORT:-8201}:packages/agents/frontend:前端开发 Agent"
    ["backend"]="${BACKEND_AGENT_PORT:-8202}:packages/agents/backend:后端开发 Agent"
    ["testing"]="${TESTING_AGENT_PORT:-8203}:packages/agents/testing:测试开发 Agent"
    ["devops"]="${DEVOPS_AGENT_PORT:-8204}:packages/agents/devops:DevOps Agent"
)

# 步骤 1: 启动 Hermes 实例
echo ""
echo "📦 步骤 1: 启动 Hermes 实例..."

for agent in "${!AGENTS[@]}"; do
    IFS=':' read -r port path label <<< "${AGENTS[$agent]}"
    
    echo "   启动 Hermes for $label (端口 $port)..."
    
    # 创建 Hermes 配置目录
    HOME_DIR="$HOME/.hermes-dev-$agent"
    mkdir -p "$HOME_DIR"
    
    # 创建配置文件（使用环境变量）
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
      port: $port
      model_name: "hermes-agent"

agent:
  max_turns: 90
  gateway_timeout: 1800

toolsets:
  - hermes-cli
EOF
    
    # 启动 Hermes（后台运行）
    HERMES_HOME="$HOME_DIR" hermes gateway run &
    HERMES_PID=$!
    
    echo "   ✅ Hermes 已启动 (PID: $HERMES_PID, 端口: $port)"
    
    # 等待 Hermes 启动
    sleep 3
done

# 步骤 2: 启动 Agent 服务
echo ""
echo "📦 步骤 2: 启动 Agent 服务..."

for agent in "${!AGENTS[@]}"; do
    IFS=':' read -r port path label <<< "${AGENTS[$agent]}"
    
    echo "   启动 $label..."
    
    # 进入 Agent 目录
    cd "$path"
    
    # 检查依赖是否已安装
    if [ ! -d "node_modules" ]; then
        echo "   📦 安装依赖..."
        npm install
    fi
    
    # 启动 Agent（后台运行）
    AGENT_PORT=$port HERMES_PORT=$port npm run dev &
    AGENT_PID=$!
    
    echo "   ✅ Agent 已启动 (PID: $AGENT_PID, 端口: $port)"
    
    # 返回项目根目录
    cd - > /dev/null
    
    # 等待 Agent 启动
    sleep 2
done

echo ""
echo "🎉 所有服务已启动！"
echo ""
echo "📋 服务状态："

# 检查 Hermes 状态
echo "Hermes 实例:"
for agent in "${!AGENTS[@]}"; do
    IFS=':' read -r port path label <<< "${AGENTS[$agent]}"
    if curl -s "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
        echo "   ✅ $label (端口 $port) - 运行中"
    else
        echo "   ❌ $label (端口 $port) - 未响应"
    fi
done

echo ""
echo "📋 下一步："
echo "   1. 启动 Gateway: ./start-gateway.sh"
echo "   2. 测试路由: ./test-gateway.sh"
echo "   3. 停止所有实例: pkill -f 'hermes gateway run' && pkill -f 'tsx watch'"
