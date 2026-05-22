#!/bin/bash

# DEV-Agent 全部服务启动脚本
# 使用方法: ./start-all.sh

set -e

echo "🚀 DEV-Agent 多服务启动"
echo "========================"

# 检查 Node.js 是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo "✅ Node.js 已安装: $(node --version)"

# 定义 Agent 配置
declare -A AGENTS=(
    ["frontend"]="8201:packages/agents/frontend:前端开发 Agent"
    ["backend"]="8202:packages/agents/backend:后端开发 Agent"
    ["testing"]="8203:packages/agents/testing:测试开发 Agent"
    ["devops"]="8204:packages/agents/devops:DevOps Agent"
)

# 启动每个 Agent
for agent in "${!AGENTS[@]}"; do
    IFS=':' read -r port path label <<< "${AGENTS[$agent]}"
    
    echo ""
    echo "📦 启动 $label ($agent)..."
    
    # 进入 Agent 目录
    cd "$path"
    
    # 检查依赖是否已安装
    if [ ! -d "node_modules" ]; then
        echo "   📦 安装依赖..."
        npm install
    fi
    
    # 启动 Agent（后台运行）
    AGENT_PORT=$port npm run dev &
    PID=$!
    
    echo "   ✅ Agent 已启动 (PID: $PID, 端口: $port)"
    
    # 返回项目根目录
    cd - > /dev/null
    
    # 等待 Agent 启动
    sleep 2
done

echo ""
echo "🎉 所有 Agent 已启动！"
echo ""
echo "📋 Agent 状态："
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
echo "   3. 停止所有实例: pkill -f 'tsx watch'"
