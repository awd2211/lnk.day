#!/bin/bash
# 重置开发环境 (清除所有数据)

echo "⚠️  警告: 这将删除所有开发数据!"
read -p "确认继续? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  停止并清除容器..."
    docker compose -f docker-compose.dev.yml down -v
    echo "✅ 开发环境已重置"
else
    echo "❌ 操作已取消"
fi
