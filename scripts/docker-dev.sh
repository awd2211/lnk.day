#!/bin/bash

# lnk.day Docker 开发环境管理脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "lnk.day Docker 开发环境管理脚本"
    echo ""
    echo "用法: $0 <命令>"
    echo ""
    echo "命令:"
    echo "  up        启动所有服务"
    echo "  down      停止所有服务"
    echo "  restart   重启所有服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志 (可选: logs <service>)"
    echo "  clean     清理所有数据和容器"
    echo "  ps        查看容器状态"
    echo "  shell     进入指定容器 (shell <service>)"
    echo ""
    echo "服务列表: postgres, redis, clickhouse, minio, rabbitmq, meilisearch"
}

# 启动服务
start_services() {
    info "启动 lnk.day 开发环境..."
    docker compose up -d

    info "等待服务就绪..."
    sleep 5

    # 检查服务状态
    check_services

    success "开发环境启动完成!"
    echo ""
    echo "服务访问地址:"
    echo "  PostgreSQL:     localhost:5432"
    echo "  Redis:          localhost:6379"
    echo "  ClickHouse:     localhost:8123 (HTTP) / localhost:9000 (TCP)"
    echo "  MinIO:          localhost:9100 (API) / localhost:9101 (Console)"
    echo "  RabbitMQ:       localhost:5672 (AMQP) / localhost:15672 (Management)"
    echo "  Meilisearch:    localhost:7700"
}

# 停止服务
stop_services() {
    info "停止 lnk.day 开发环境..."
    docker compose down
    success "开发环境已停止"
}

# 重启服务
restart_services() {
    info "重启 lnk.day 开发环境..."
    docker compose restart
    success "开发环境已重启"
}

# 检查服务状态
check_services() {
    echo ""
    info "服务状态:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

# 查看日志
view_logs() {
    if [ -z "$1" ]; then
        docker compose logs -f --tail=100
    else
        docker compose logs -f --tail=100 "$1"
    fi
}

# 清理所有数据
clean_all() {
    warn "此操作将删除所有数据和容器!"
    read -p "确定要继续吗? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "停止并删除容器..."
        docker compose down -v --remove-orphans

        info "删除数据卷..."
        docker volume rm lnkday-postgres-data lnkday-redis-data lnkday-clickhouse-data \
            lnkday-clickhouse-logs lnkday-minio-data lnkday-rabbitmq-data \
            lnkday-meilisearch-data 2>/dev/null || true

        success "清理完成"
    else
        info "操作已取消"
    fi
}

# 进入容器 shell
enter_shell() {
    if [ -z "$1" ]; then
        error "请指定服务名称"
        echo "可用服务: postgres, redis, clickhouse, minio, rabbitmq, meilisearch"
        exit 1
    fi

    case "$1" in
        postgres)
            docker compose exec postgres psql -U lnkday -d lnkday
            ;;
        redis)
            docker compose exec redis redis-cli
            ;;
        clickhouse)
            docker compose exec clickhouse clickhouse-client -u lnkday --password lnkday123
            ;;
        *)
            docker compose exec "$1" sh
            ;;
    esac
}

# 主命令处理
case "$1" in
    up|start)
        start_services
        ;;
    down|stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status|ps)
        check_services
        ;;
    logs)
        view_logs "$2"
        ;;
    clean)
        clean_all
        ;;
    shell|exec)
        enter_shell "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
