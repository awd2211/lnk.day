#!/bin/bash
# 停止开发环境

echo "🛑 停止 lnk.day 开发环境..."
docker compose -f docker-compose.dev.yml down
echo "✅ 已停止所有服务"
