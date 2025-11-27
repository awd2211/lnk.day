import csv
import io
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse

from app.services.analytics_service import AnalyticsService

router = APIRouter()
analytics_service = AnalyticsService()


@router.get("/link/{link_id}/csv")
async def export_link_csv(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """导出链接分析数据为 CSV"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        data = analytics_service.get_link_analytics(link_id, start_date, end_date)

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Summary section
        writer.writerow(["=== Summary ==="])
        writer.writerow(["Total Clicks", data.total_clicks])
        writer.writerow(["Unique Clicks", data.unique_clicks])
        writer.writerow(["Period", f"{start_date.date()} to {end_date.date()}"])
        writer.writerow([])

        # Time series
        writer.writerow(["=== Daily Clicks ==="])
        writer.writerow(["Date", "Clicks"])
        for item in data.time_series:
            writer.writerow([item["timestamp"], item["clicks"]])
        writer.writerow([])

        # Geo distribution
        writer.writerow(["=== Geographic Distribution ==="])
        writer.writerow(["Country", "Clicks", "Percentage"])
        for item in data.geo_distribution:
            writer.writerow([item["country"], item["clicks"], f"{item['percentage']:.2f}%"])
        writer.writerow([])

        # Device distribution
        writer.writerow(["=== Device Distribution ==="])
        writer.writerow(["Device", "Clicks", "Percentage"])
        for item in data.device_distribution:
            writer.writerow([item["device"], item["clicks"], f"{item['percentage']:.2f}%"])
        writer.writerow([])

        # Browser distribution
        writer.writerow(["=== Browser Distribution ==="])
        writer.writerow(["Browser", "Clicks", "Percentage"])
        for item in data.browser_distribution:
            writer.writerow([item["browser"], item["clicks"], f"{item['percentage']:.2f}%"])
        writer.writerow([])

        # Referrers
        writer.writerow(["=== Top Referrers ==="])
        writer.writerow(["Referrer", "Clicks"])
        for item in data.top_referers:
            writer.writerow([item["referer"], item["clicks"]])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=analytics_{link_id}_{start_date.date()}_{end_date.date()}.csv"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/link/{link_id}/json")
async def export_link_json(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """导出链接分析数据为 JSON"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        data = analytics_service.get_link_analytics(link_id, start_date, end_date)

        export_data = {
            "link_id": link_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "summary": {
                "total_clicks": data.total_clicks,
                "unique_clicks": data.unique_clicks,
            },
            "time_series": data.time_series,
            "geo_distribution": data.geo_distribution,
            "device_distribution": data.device_distribution,
            "browser_distribution": data.browser_distribution,
            "top_referers": data.top_referers,
            "exported_at": datetime.now().isoformat(),
        }

        # Serialize with custom encoder for datetime
        json_content = json.dumps(export_data, default=str, indent=2)

        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=analytics_{link_id}_{start_date.date()}_{end_date.date()}.json"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{team_id}/csv")
async def export_team_csv(
    team_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
):
    """导出团队统计数据为 CSV"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    try:
        data = analytics_service.get_team_summary(team_id, start_date, end_date)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["=== Team Summary ==="])
        writer.writerow(["Team ID", team_id])
        writer.writerow(["Period", f"{start_date.date()} to {end_date.date()}"])
        writer.writerow(["Total Clicks", data["total_clicks"]])
        writer.writerow(["Unique Visitors", data["unique_visitors"]])
        writer.writerow(["Active Links", data["active_links"]])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=team_{team_id}_{start_date.date()}_{end_date.date()}.csv"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/raw/{link_id}")
async def export_raw_clicks(
    link_id: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    limit: int = Query(default=10000, le=100000),
):
    """导出原始点击数据"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=7)
    if not end_date:
        end_date = datetime.now()

    try:
        result = analytics_service.client.execute(
            """
            SELECT
                timestamp, ip, country, city, device, browser, os, referer
            FROM clicks
            WHERE link_id = %(link_id)s
              AND timestamp >= %(start_date)s
              AND timestamp <= %(end_date)s
            ORDER BY timestamp DESC
            LIMIT %(limit)s
            """,
            {"link_id": link_id, "start_date": start_date, "end_date": end_date, "limit": limit}
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "IP", "Country", "City", "Device", "Browser", "OS", "Referrer"])

        for row in result:
            writer.writerow(row)

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=raw_clicks_{link_id}_{start_date.date()}_{end_date.date()}.csv"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
