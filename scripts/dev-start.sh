#!/bin/bash
# 启动开发环境

set -e

echo "🚀 启动 lnk.day 开发环境..."

# 1. 启动基础设施
echo "📦 启动基础设施服务..."
docker compose -f docker-compose.dev.yml up -d

# 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 5

# 2. 安装依赖 (如果需要)
if [ ! -d "node_modules" ]; then
    echo "📥 安装 pnpm 依赖..."
    pnpm install
fi

# 3. 启动服务提示
echo ""
echo "✅ 基础设施已启动!"
echo ""
echo "服务端口:"
echo "  - PostgreSQL: 60030"
echo "  - Redis: 60031"
echo "  - ClickHouse: 60032 (HTTP), 60034 (Native)"
echo "  - Kafka: 60033"
echo "  - MinIO: 60006 (API), 60016 (Console)"
echo ""
echo "启动应用服务:"
echo "  pnpm dev           # 启动所有服务"
echo "  pnpm dev --filter @lnk/user-service  # 启动单个服务"
echo ""
