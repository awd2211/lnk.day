import logging
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.exporters import BigQueryExporter, SnowflakeExporter, S3Exporter, ExportFormat

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize exporters
bigquery_exporter = BigQueryExporter()
snowflake_exporter = SnowflakeExporter()
s3_exporter = S3Exporter()


class ExportDestination(str, Enum):
    BIGQUERY = "bigquery"
    SNOWFLAKE = "snowflake"
    S3 = "s3"


class ExportRequest(BaseModel):
    destination: ExportDestination
    table_name: str = Field(..., description="Target table name")
    query: Optional[str] = Field(None, description="ClickHouse query to export")
    format: ExportFormat = ExportFormat.JSON
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    filters: Optional[dict] = None


class ExportResponse(BaseModel):
    success: bool
    destination: str
    records_exported: int
    bytes_written: int
    duration_seconds: float
    error: Optional[str] = None


class ScheduledExportRequest(BaseModel):
    destination: ExportDestination
    table_name: str
    query: str
    format: ExportFormat = ExportFormat.JSON
    schedule: str = Field(
        default="0 0 * * *",
        description="Cron expression for schedule"
    )


# In-memory job storage (use Redis/DB in production)
export_jobs = {}


@router.post("/export", response_model=ExportResponse)
async def create_export(request: ExportRequest, background_tasks: BackgroundTasks):
    """Create an export job to BigQuery, Snowflake, or S3"""
    try:
        # Build query if not provided
        query = request.query
        if not query:
            query = _build_default_query(
                request.table_name,
                request.date_from,
                request.date_to,
                request.filters,
            )

        # Select exporter
        if request.destination == ExportDestination.BIGQUERY:
            exporter = bigquery_exporter
        elif request.destination == ExportDestination.SNOWFLAKE:
            exporter = snowflake_exporter
        else:
            exporter = s3_exporter

        # Execute export
        result = await exporter.export_query(
            query=query,
            table_name=request.table_name,
            format=request.format,
        )

        return ExportResponse(
            success=result.success,
            destination=result.destination,
            records_exported=result.records_exported,
            bytes_written=result.bytes_written,
            duration_seconds=result.duration_seconds,
            error=result.error,
        )

    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/clicks")
async def export_clicks(
    destination: ExportDestination,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    team_id: Optional[str] = None,
    format: ExportFormat = ExportFormat.JSON,
):
    """Export click data to specified destination"""
    # Build query
    conditions = []
    if date_from:
        conditions.append(f"timestamp >= '{date_from.isoformat()}'")
    if date_to:
        conditions.append(f"timestamp <= '{date_to.isoformat()}'")
    if team_id:
        conditions.append(f"team_id = '{team_id}'")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    query = f"""
        SELECT
            id,
            link_id,
            short_code,
            timestamp,
            ip,
            user_agent,
            referer,
            country,
            region,
            city,
            device,
            browser,
            os
        FROM clicks
        WHERE {where_clause}
        ORDER BY timestamp DESC
        LIMIT 100000
    """

    request = ExportRequest(
        destination=destination,
        table_name="clicks_export",
        query=query,
        format=format,
    )

    return await create_export(request, BackgroundTasks())


@router.post("/export/analytics")
async def export_analytics(
    destination: ExportDestination,
    metrics: List[str] = ["clicks", "unique_visitors", "countries"],
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    granularity: str = "day",  # day, hour, week, month
    format: ExportFormat = ExportFormat.JSON,
):
    """Export aggregated analytics data"""
    date_from = date_from or datetime.utcnow() - timedelta(days=30)
    date_to = date_to or datetime.utcnow()

    granularity_format = {
        "hour": "toStartOfHour(timestamp)",
        "day": "toDate(timestamp)",
        "week": "toStartOfWeek(timestamp)",
        "month": "toStartOfMonth(timestamp)",
    }.get(granularity, "toDate(timestamp)")

    query = f"""
        SELECT
            {granularity_format} as period,
            count() as clicks,
            uniqExact(ip) as unique_visitors,
            countDistinct(country) as countries,
            countDistinct(link_id) as links_accessed
        FROM clicks
        WHERE timestamp >= '{date_from.isoformat()}'
          AND timestamp <= '{date_to.isoformat()}'
        GROUP BY period
        ORDER BY period
    """

    request = ExportRequest(
        destination=destination,
        table_name="analytics_export",
        query=query,
        format=format,
    )

    return await create_export(request, BackgroundTasks())


@router.get("/export/s3/list")
async def list_s3_exports(table_name: str = "clicks_export", limit: int = 100):
    """List existing S3 exports"""
    exports = await s3_exporter.list_exports(table_name, limit)
    return {"exports": exports, "count": len(exports)}


@router.get("/export/s3/download-url")
async def get_download_url(key: str, expires_in: int = 3600):
    """Get a presigned URL to download an export"""
    url = await s3_exporter.get_presigned_url(key, expires_in)
    if not url:
        raise HTTPException(status_code=404, detail="Export not found or URL generation failed")
    return {"url": url, "expires_in": expires_in}


@router.delete("/export/s3/{key:path}")
async def delete_s3_export(key: str):
    """Delete an S3 export"""
    success = await s3_exporter.delete_export(key)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete export")
    return {"success": True, "deleted": key}


@router.get("/export/health")
async def check_export_health():
    """Check health of all export destinations"""
    return {
        "bigquery": await bigquery_exporter.health_check(),
        "snowflake": await snowflake_exporter.health_check(),
        "s3": await s3_exporter.health_check(),
    }


def _build_default_query(
    table_name: str,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
    filters: Optional[dict],
) -> str:
    """Build a default query based on table name and filters"""
    conditions = []

    if date_from:
        conditions.append(f"timestamp >= '{date_from.isoformat()}'")
    if date_to:
        conditions.append(f"timestamp <= '{date_to.isoformat()}'")

    if filters:
        for key, value in filters.items():
            if isinstance(value, str):
                conditions.append(f"{key} = '{value}'")
            elif isinstance(value, list):
                values = ", ".join(f"'{v}'" for v in value)
                conditions.append(f"{key} IN ({values})")
            else:
                conditions.append(f"{key} = {value}")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    return f"SELECT * FROM {table_name} WHERE {where_clause} LIMIT 100000"
