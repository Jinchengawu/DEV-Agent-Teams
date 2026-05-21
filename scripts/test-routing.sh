#!/bin/bash

# DEV-Agent 路由测试脚本
# 使用方法: ./test-routing.sh

set -e

echo "🧪 DEV-Agent 路由测试"
echo "===================="

# 测试用例
declare -A TEST_CASES=(
    ["帮我创建 React 登录组件"]="dev-frontend"
    ["设计用户表数据库结构"]="dev-backend"
    ["编写单元测试用例"]="dev-testing"
    ["配置 Docker 部署"]="dev-devops"
    ["查看项目文件"]="kernel"
)

# 路由规则关键词
FRONTEND_KEYWORDS=("react" "vue" "组件" "ui" "css" "样式" "前端" "界面")
BACKEND_KEYWORDS=("api" "数据库" "接口" "服务器" "后端" "python" "node")
TESTING_KEYWORDS=("测试" "单元测试" "e2e" "覆盖率" "jest" "pytest")
DEVOPS_KEYWORDS=("docker" "k8s" "部署" "ci/cd" "运维" "容器")
KERNEL_KEYWORDS=("文件" "目录" "查看" "搜索" "复制" "移动")

# 分析函数
analyze_task() {
    local task="$1"
    local task_lower=$(echo "$task" | tr '[:upper:]' '[:lower:]')
    
    # 检查前端关键词
    for keyword in "${FRONTEND_KEYWORDS[@]}"; do
        if [[ "$task_lower" == *"$keyword"* ]]; then
            echo "dev-frontend"
            return
        fi
    done
    
    # 检查后端关键词
    for keyword in "${BACKEND_KEYWORDS[@]}"; do
        if [[ "$task_lower" == *"$keyword"* ]]; then
            echo "dev-backend"
            return
        fi
    done
    
    # 检查测试关键词
    for keyword in "${TESTING_KEYWORDS[@]}"; do
        if [[ "$task_lower" == *"$keyword"* ]]; then
            echo "dev-testing"
            return
        fi
    done
    
    # 检查 DevOps 关键词
    for keyword in "${DEVOPS_KEYWORDS[@]}"; do
        if [[ "$task_lower" == *"$keyword"* ]]; then
            echo "dev-devops"
            return
        fi
    done
    
    # 检查内核关键词
    for keyword in "${KERNEL_KEYWORDS[@]}"; do
        if [[ "$task_lower" == *"$keyword"* ]]; then
            echo "kernel"
            return
        fi
    done
    
    echo "unknown"
}

# 运行测试
echo ""
echo "📝 测试用例："
echo ""

passed=0
failed=0

for task in "${!TEST_CASES[@]}"; do
    expected="${TEST_CASES[$task]}"
    actual=$(analyze_task "$task")
    
    echo "任务: \"$task\""
    echo "  期望: $expected"
    echo "  实际: $actual"
    
    if [ "$expected" == "$actual" ]; then
        echo "  ✅ 通过"
        ((passed++))
    else
        echo "  ❌ 失败"
        ((failed++))
    fi
    echo ""
done

echo "📊 测试总结"
echo "  通过: $passed"
echo "  失败: $failed"

if [ $failed -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！"
else
    echo ""
    echo "❌ 部分测试失败"
    exit 1
fi
