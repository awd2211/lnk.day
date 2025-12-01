from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid
import os
import json

from fastapi import APIRouter, Query, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import redis
import io

from ..services.pdf_generator import pdf_generator

router = APIRouter()

# Redis for report status
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True,
)


class ReportType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class ReportRequest(BaseModel):
    team_id: str
    report_type: ReportType = ReportType.WEEKLY
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    format: ReportFormat = ReportFormat.JSON
    link_ids: Optional[List[str]] = None
    include_traffic: bool = True
    include_geographic: bool = True
    include_devices: bool = True
    include_referrers: bool = True


class ReportResponse(BaseModel):
    report_id: str
    status: str
    progress: int = 0
    download_url: Optional[str] = None
    created_at: datetime


class ReportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


def get_date_range(report_type: ReportType, start_date: Optional[datetime], end_date: Optional[datetime]):
    """Calculate date range based on report type"""
    now = datetime.now()

    if start_date and end_date:
        return start_date, end_date

    if report_type == ReportType.DAILY:
        start = now - timedelta(days=1)
    elif report_type == ReportType.WEEKLY:
        start = now - timedelta(days=7)
    elif report_type == ReportType.MONTHLY:
        start = now - timedelta(days=30)
    else:
        start = now - timedelta(days=7)

    return start, now


def generate_mock_report_data(
    team_id: str,
    start_date: datetime,
    end_date: datetime,
    include_traffic: bool = True,
    include_geographic: bool = True,
    include_devices: bool = True,
    include_referrers: bool = True,
) -> Dict[str, Any]:
    """Generate report data (mock data for now, should query ClickHouse)"""
    import random

    data = {
        "team_id": team_id,
        "period": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
        },
        "overview": {
            "total_clicks": random.randint(1000, 50000),
            "unique_visitors": random.randint(500, 25000),
            "total_links": random.randint(50, 500),
            "active_links": random.randint(30, 400),
        },
    }

    if include_traffic:
        # Generate daily traffic data
        days = (end_date - start_date).days
        traffic = []
        for i in range(days + 1):
            date = start_date + timedelta(days=i)
            traffic.append({
                "date": date.strftime("%Y-%m-%d"),
                "clicks": random.randint(100, 2000),
                "unique": random.randint(50, 1000),
            })
        data["traffic"] = traffic

    if include_geographic:
        countries = ["United States", "China", "Japan", "Germany", "United Kingdom",
                    "France", "India", "Brazil", "Canada", "Australia"]
        data["geographic"] = [
            {"country": c, "clicks": random.randint(100, 5000)}
            for c in countries
        ]
        data["geographic"].sort(key=lambda x: x["clicks"], reverse=True)

    if include_devices:
        data["devices"] = {
            "devices": [
                {"device": "Desktop", "clicks": random.randint(5000, 20000)},
                {"device": "Mobile", "clicks": random.randint(3000, 15000)},
                {"device": "Tablet", "clicks": random.randint(500, 3000)},
            ],
            "browsers": [
                {"browser": "Chrome", "clicks": random.randint(5000, 15000)},
                {"browser": "Safari", "clicks": random.randint(2000, 8000)},
                {"browser": "Firefox", "clicks": random.randint(1000, 4000)},
                {"browser": "Edge", "clicks": random.randint(500, 2000)},
                {"browser": "Other", "clicks": random.randint(200, 1000)},
            ],
            "os": [
                {"os": "Windows", "clicks": random.randint(4000, 12000)},
                {"os": "macOS", "clicks": random.randint(2000, 8000)},
                {"os": "iOS", "clicks": random.randint(2000, 6000)},
                {"os": "Android", "clicks": random.randint(1500, 5000)},
                {"os": "Linux", "clicks": random.randint(200, 1000)},
            ],
        }

    if include_referrers:
        referrers = ["Direct", "google.com", "facebook.com", "twitter.com",
                    "linkedin.com", "instagram.com", "youtube.com", "reddit.com"]
        data["referrers"] = [
            {"referrer": r, "clicks": random.randint(200, 5000)}
            for r in referrers
        ]
        data["referrers"].sort(key=lambda x: x["clicks"], reverse=True)

    # Top links
    data["top_links"] = [
        {
            "short_url": f"lnk.day/abc{i}",
            "original_url": f"https://example.com/page/{i}?utm_source=campaign",
            "clicks": random.randint(100, 5000),
        }
        for i in range(10)
    ]
    data["top_links"].sort(key=lambda x: x["clicks"], reverse=True)

    return data


async def generate_report_task(report_id: str, request: ReportRequest):
    """Background task to generate report"""
    try:
        # Update status to processing
        redis_client.hset(f"report:{report_id}", mapping={
            "status": ReportStatus.PROCESSING,
            "progress": 10,
        })

        # Get date range
        start_date, end_date = get_date_range(
            request.report_type,
            request.start_date,
            request.end_date
        )

        # Generate report data
        redis_client.hset(f"report:{report_id}", "progress", 30)

        report_data = generate_mock_report_data(
            request.team_id,
            start_date,
            end_date,
            request.include_traffic,
            request.include_geographic,
            request.include_devices,
            request.include_referrers,
        )

        redis_client.hset(f"report:{report_id}", "progress", 70)

        # Generate output based on format
        if request.format == ReportFormat.PDF:
            pdf_bytes = pdf_generator.generate_report(report_data)
            # Store PDF in Redis (for small files) or file system
            redis_client.setex(f"report_file:{report_id}", 3600, pdf_bytes)
            content_type = "application/pdf"
            filename = f"report_{report_id}.pdf"
        elif request.format == ReportFormat.CSV:
            csv_content = generate_csv_report(report_data)
            redis_client.setex(f"report_file:{report_id}", 3600, csv_content)
            content_type = "text/csv"
            filename = f"report_{report_id}.csv"
        else:
            json_content = json.dumps(report_data, indent=2, default=str)
            redis_client.setex(f"report_file:{report_id}", 3600, json_content)
            content_type = "application/json"
            filename = f"report_{report_id}.json"

        # Update status to completed
        redis_client.hset(f"report:{report_id}", mapping={
            "status": ReportStatus.COMPLETED,
            "progress": 100,
            "content_type": content_type,
            "filename": filename,
            "download_url": f"/api/reports/{report_id}/download",
        })

    except Exception as e:
        redis_client.hset(f"report:{report_id}", mapping={
            "status": ReportStatus.FAILED,
            "error": str(e),
        })


def generate_csv_report(report_data: Dict[str, Any]) -> str:
    """Generate CSV format report"""
    lines = []

    # Overview section
    lines.append("=== Overview ===")
    lines.append("Metric,Value")
    overview = report_data.get("overview", {})
    for key, value in overview.items():
        lines.append(f"{key},{value}")
    lines.append("")

    # Traffic section
    if "traffic" in report_data:
        lines.append("=== Traffic ===")
        lines.append("Date,Clicks,Unique Visitors")
        for item in report_data["traffic"]:
            lines.append(f"{item['date']},{item['clicks']},{item.get('unique', 0)}")
        lines.append("")

    # Geographic section
    if "geographic" in report_data:
        lines.append("=== Geographic Distribution ===")
        lines.append("Country,Clicks")
        for item in report_data["geographic"]:
            lines.append(f"{item['country']},{item['clicks']}")
        lines.append("")

    # Top links section
    if "top_links" in report_data:
        lines.append("=== Top Links ===")
        lines.append("Short URL,Original URL,Clicks")
        for item in report_data["top_links"]:
            lines.append(f"{item['short_url']},{item['original_url']},{item['clicks']}")

    return "\n".join(lines)


@router.get("")
async def list_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
):
    """获取报告列表"""
    # Scan Redis for all report keys
    cursor = 0
    report_keys = []
    while True:
        cursor, keys = redis_client.scan(cursor, match="report:*", count=100)
        report_keys.extend(keys)
        if cursor == 0:
            break

    # Filter out file keys
    report_keys = [k for k in report_keys if not k.startswith("report_file:")]

    # Get report data
    reports = []
    for key in report_keys:
        report_id = key.replace("report:", "")
        data = redis_client.hgetall(key)
        if data:
            report_type = data.get("type", "custom")
            if type and report_type != type:
                continue
            reports.append({
                "id": report_id,
                "type": report_type,
                "name": data.get("name", f"Report {report_id[:8]}"),
                "status": data.get("status", "unknown"),
                "config": {
                    "format": data.get("format", "json"),
                    "dateRange": {
                        "start": data.get("start_date"),
                        "end": data.get("end_date"),
                    }
                },
                "fileUrl": data.get("download_url"),
                "createdAt": data.get("created_at"),
            })

    # Sort by created_at descending
    reports.sort(key=lambda x: x.get("createdAt") or "", reverse=True)

    # Paginate
    total = len(reports)
    start = (page - 1) * limit
    end = start + limit
    items = reports[start:end]

    return {"items": items, "total": total}


@router.delete("/{report_id}")
async def delete_report(report_id: str):
    """删除报告"""
    report_key = f"report:{report_id}"
    file_key = f"report_file:{report_id}"

    if not redis_client.exists(report_key):
        raise HTTPException(status_code=404, detail="Report not found")

    redis_client.delete(report_key)
    redis_client.delete(file_key)

    return {"message": "Report deleted"}


@router.post("/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest, background_tasks: BackgroundTasks):
    """生成分析报告"""
    report_id = str(uuid.uuid4())
    created_at = datetime.now()

    # Store initial report status
    redis_client.hset(f"report:{report_id}", mapping={
        "status": ReportStatus.PENDING,
        "progress": 0,
        "team_id": request.team_id,
        "format": request.format,
        "created_at": created_at.isoformat(),
    })
    redis_client.expire(f"report:{report_id}", 86400)  # 24 hours

    # Add background task
    background_tasks.add_task(generate_report_task, report_id, request)

    return ReportResponse(
        report_id=report_id,
        status=ReportStatus.PENDING,
        progress=0,
        download_url=None,
        created_at=created_at,
    )


@router.get("/{report_id}")
async def get_report_status(report_id: str):
    """获取报告状态"""
    report_data = redis_client.hgetall(f"report:{report_id}")

    if not report_data:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "report_id": report_id,
        "status": report_data.get("status", "unknown"),
        "progress": int(report_data.get("progress", 0)),
        "download_url": report_data.get("download_url"),
        "error": report_data.get("error"),
        "created_at": report_data.get("created_at"),
    }


@router.get("/{report_id}/download")
async def download_report(report_id: str):
    """下载报告"""
    report_data = redis_client.hgetall(f"report:{report_id}")

    if not report_data:
        raise HTTPException(status_code=404, detail="Report not found")

    if report_data.get("status") != ReportStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Report not ready for download")

    # Get file content
    file_content = redis_client.get(f"report_file:{report_id}")

    if not file_content:
        raise HTTPException(status_code=404, detail="Report file not found or expired")

    content_type = report_data.get("content_type", "application/octet-stream")
    filename = report_data.get("filename", f"report_{report_id}")

    # Handle binary vs text content
    if isinstance(file_content, str):
        content = file_content.encode('utf-8')
    else:
        content = file_content

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/{report_id}/preview")
async def preview_report(report_id: str):
    """预览报告数据（JSON格式）"""
    report_data = redis_client.hgetall(f"report:{report_id}")

    if not report_data:
        raise HTTPException(status_code=404, detail="Report not found")

    if report_data.get("status") != ReportStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Report not ready")

    # For JSON reports, return the data directly
    if report_data.get("content_type") == "application/json":
        file_content = redis_client.get(f"report_file:{report_id}")
        if file_content:
            return json.loads(file_content)

    return {"message": "Preview not available for this format"}
