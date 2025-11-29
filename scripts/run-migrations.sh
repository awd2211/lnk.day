#!/bin/bash
# 数据库迁移管理脚本
# 用法: ./scripts/run-migrations.sh [command] [service]
# 命令: run, revert, show, generate

set -e

COMMAND=${1:-run}
SERVICE=${2:-all}

SERVICES=(
  "user-service"
  "link-service"
  "campaign-service"
  "notification-service"
  "page-service"
  "qr-service"
  "deeplink-service"
  "console-service"
  "domain-service"
  "api-gateway"
)

run_migration() {
  local svc=$1
  echo "🔄 Running migrations for $svc..."
  cd /home/eric/lnk.day/services/$svc
  pnpm migration:$COMMAND 2>&1 || echo "⚠️  Migration $COMMAND failed for $svc"
  cd - > /dev/null
}

if [ "$SERVICE" = "all" ]; then
  echo "📦 Running migrations for all services..."
  for svc in "${SERVICES[@]}"; do
    if [ -f "/home/eric/lnk.day/services/$svc/src/database/data-source.ts" ]; then
      run_migration $svc
    else
      echo "⏭️  Skipping $svc (no data-source.ts)"
    fi
  done
else
  if [[ " ${SERVICES[*]} " =~ " ${SERVICE} " ]]; then
    run_migration $SERVICE
  else
    echo "❌ Unknown service: $SERVICE"
    echo "Available services: ${SERVICES[*]}"
    exit 1
  fi
fi

echo "✅ Migration $COMMAND completed!"
