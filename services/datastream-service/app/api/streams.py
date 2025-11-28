"""Data Streams API router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks

from app.models.data_stream import (
    DataStream,
    DataStreamCreate,
    DataStreamUpdate,
    StreamStats,
    BackfillRequest,
    BackfillJob,
    TestConnectionResult,
)
from app.services.stream_service import stream_service

router = APIRouter(prefix="/data-streams", tags=["data-streams"])


# ========== Stream CRUD ==========


@router.post("", response_model=DataStream)
async def create_stream(
    request: DataStreamCreate,
    x_team_id: str = Header(...),
):
    """
    创建数据流

    创建一个新的数据流配置，支持多种目标平台：
    - BigQuery: Google 数据仓库
    - S3: Amazon S3 或 MinIO
    - Kafka: Apache Kafka
    - HTTP: Webhook 端点
    """
    # Override team_id from header
    request.team_id = x_team_id

    try:
        stream = await stream_service.create_stream(request)
        return stream
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[DataStream])
async def list_streams(x_team_id: str = Header(...)):
    """
    列出所有数据流

    获取当前团队的所有数据流配置。
    """
    streams = await stream_service.list_streams(x_team_id)
    return streams


@router.get("/{stream_id}", response_model=DataStream)
async def get_stream(stream_id: str, x_team_id: str = Header(...)):
    """
    获取数据流详情

    获取指定数据流的完整配置信息。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return stream


@router.put("/{stream_id}", response_model=DataStream)
async def update_stream(
    stream_id: str,
    request: DataStreamUpdate,
    x_team_id: str = Header(...),
):
    """
    更新数据流

    更新数据流配置。如果数据流正在运行，将自动重启以应用新配置。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    updated = await stream_service.update_stream(stream_id, request)
    return updated


@router.delete("/{stream_id}")
async def delete_stream(stream_id: str, x_team_id: str = Header(...)):
    """
    删除数据流

    删除数据流配置并停止所有相关的数据传输。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    success = await stream_service.delete_stream(stream_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete stream")

    return {"message": "Stream deleted successfully"}


# ========== Stream Operations ==========


@router.post("/{stream_id}/pause")
async def pause_stream(stream_id: str, x_team_id: str = Header(...)):
    """
    暂停数据流

    暂停数据流的数据传输。暂停期间的事件将被缓存。
    """
    from app.models.data_stream import StreamStatus

    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    update = DataStreamUpdate(status=StreamStatus.PAUSED)
    await stream_service.update_stream(stream_id, update)

    return {"message": "Stream paused"}


@router.post("/{stream_id}/resume")
async def resume_stream(stream_id: str, x_team_id: str = Header(...)):
    """
    恢复数据流

    恢复暂停的数据流，继续传输数据。
    """
    from app.models.data_stream import StreamStatus

    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    update = DataStreamUpdate(status=StreamStatus.ACTIVE)
    await stream_service.update_stream(stream_id, update)

    return {"message": "Stream resumed"}


@router.post("/{stream_id}/test", response_model=TestConnectionResult)
async def test_connection(stream_id: str, x_team_id: str = Header(...)):
    """
    测试数据流连接

    测试数据流目标的连接是否正常。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await stream_service.test_connection(stream_id)
    return result


# ========== Statistics ==========


@router.get("/{stream_id}/stats", response_model=StreamStats)
async def get_stream_stats(stream_id: str, x_team_id: str = Header(...)):
    """
    获取传输统计

    获取数据流的传输统计信息，包括发送事件数、失败数等。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    stats = await stream_service.get_stats(stream_id)
    if not stats:
        # Return empty stats
        from datetime import datetime
        stats = StreamStats(
            stream_id=stream_id,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow(),
        )

    return stats


# ========== Backfill ==========


@router.post("/{stream_id}/backfill", response_model=BackfillJob)
async def create_backfill(
    stream_id: str,
    request: BackfillRequest,
    x_team_id: str = Header(...),
):
    """
    历史数据回填

    将指定时间范围内的历史数据导出到目标平台。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        job = await stream_service.create_backfill(stream_id, request)
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{stream_id}/backfill/{job_id}", response_model=BackfillJob)
async def get_backfill_status(
    stream_id: str,
    job_id: str,
    x_team_id: str = Header(...),
):
    """
    获取回填任务状态

    获取历史数据回填任务的进度和状态。
    """
    stream = await stream_service.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.team_id != x_team_id:
        raise HTTPException(status_code=403, detail="Access denied")

    job = await stream_service.get_backfill_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Backfill job not found")

    return job


# ========== Configuration Validation ==========


@router.post("/validate")
async def validate_configuration(request: DataStreamCreate):
    """
    验证配置

    验证数据流配置是否有效，不实际创建数据流。
    """
    from app.models.data_stream import DestinationType

    errors = []

    # Validate destination configuration
    dest_type = request.destination.type

    if dest_type == DestinationType.BIGQUERY:
        if not request.destination.bigquery:
            errors.append("BigQuery configuration is required")
        else:
            config = request.destination.bigquery
            if not config.project_id:
                errors.append("BigQuery project_id is required")
            if not config.dataset_id:
                errors.append("BigQuery dataset_id is required")
            if not config.table_id:
                errors.append("BigQuery table_id is required")

    elif dest_type == DestinationType.S3:
        if not request.destination.s3:
            errors.append("S3 configuration is required")
        else:
            config = request.destination.s3
            if not config.bucket:
                errors.append("S3 bucket is required")

    elif dest_type == DestinationType.KAFKA:
        if not request.destination.kafka:
            errors.append("Kafka configuration is required")
        else:
            config = request.destination.kafka
            if not config.bootstrap_servers:
                errors.append("Kafka bootstrap_servers is required")
            if not config.topic:
                errors.append("Kafka topic is required")

    elif dest_type == DestinationType.HTTP:
        if not request.destination.http:
            errors.append("HTTP configuration is required")
        else:
            config = request.destination.http
            if not config.url:
                errors.append("HTTP url is required")

    if errors:
        return {"valid": False, "errors": errors}

    return {"valid": True, "errors": []}


# ========== Supported Destinations ==========


@router.get("/metadata/destinations")
async def get_supported_destinations():
    """
    获取支持的目标平台

    列出所有支持的数据导出目标平台及其配置要求。
    """
    return {
        "destinations": [
            {
                "type": "bigquery",
                "name": "Google BigQuery",
                "description": "Google Cloud 数据仓库",
                "required_fields": ["project_id", "dataset_id", "table_id"],
                "optional_fields": ["credentials_json", "credentials_path"],
            },
            {
                "type": "s3",
                "name": "Amazon S3",
                "description": "Amazon S3 或 S3 兼容存储（如 MinIO）",
                "required_fields": ["bucket"],
                "optional_fields": [
                    "prefix",
                    "region",
                    "access_key_id",
                    "secret_access_key",
                    "endpoint_url",
                    "file_format",
                    "compression",
                ],
            },
            {
                "type": "kafka",
                "name": "Apache Kafka",
                "description": "Apache Kafka 消息队列",
                "required_fields": ["bootstrap_servers", "topic"],
                "optional_fields": [
                    "security_protocol",
                    "sasl_mechanism",
                    "sasl_username",
                    "sasl_password",
                ],
            },
            {
                "type": "http",
                "name": "HTTP Webhook",
                "description": "HTTP/HTTPS Webhook 端点",
                "required_fields": ["url"],
                "optional_fields": [
                    "method",
                    "headers",
                    "auth_type",
                    "auth_value",
                    "timeout_seconds",
                    "retry_count",
                ],
            },
            {
                "type": "snowflake",
                "name": "Snowflake",
                "description": "Snowflake 数据仓库",
                "required_fields": [
                    "account",
                    "warehouse",
                    "database",
                    "schema_name",
                    "table_name",
                    "username",
                ],
                "optional_fields": ["password", "private_key"],
                "status": "coming_soon",
            },
            {
                "type": "redshift",
                "name": "Amazon Redshift",
                "description": "Amazon Redshift 数据仓库",
                "required_fields": [
                    "host",
                    "database",
                    "table_name",
                    "username",
                    "password",
                ],
                "optional_fields": ["port", "schema_name", "iam_role"],
                "status": "coming_soon",
            },
        ]
    }
