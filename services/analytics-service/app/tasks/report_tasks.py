"""
Report generation tasks for scheduled reports
"""

from datetime import datetime, timedelta
import logging
import json
import os
import uuid
from typing import Dict, Any, List, Optional
import aiohttp

from app.core.config import settings
from app.core.clickhouse import get_clickhouse_client

logger = logging.getLogger(__name__)

REPORTS_DIR = "/tmp/lnk_reports"


async def generate_report(
    team_id: str,
    report_type: str,
    start_date: datetime,
    end_date: datetime,
    format: str = "json",
    options: Optional[Dict[str, bool]] = None,
) -> Dict[str, Any]:
    """
    Generate analytics report for a team.

    Args:
        team_id: Team ID
        report_type: Type of report (daily, weekly, monthly, custom)
        start_date: Report start date
        end_date: Report end date
        format: Output format (json, csv, pdf)
        options: Report options (include_traffic, include_geo, etc.)
    """
    logger.info(f"Generating {report_type} report for team {team_id}")

    report_id = str(uuid.uuid4())
    options = options or {
        "include_traffic": True,
        "include_geographic": True,
        "include_devices": True,
        "include_referrers": True,
    }

    result = {
        "report_id": report_id,
        "team_id": team_id,
        "report_type": report_type,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "format": format,
        "generated_at": datetime.utcnow().isoformat(),
        "sections": [],
    }

    try:
        client = get_clickhouse_client()

        # Generate traffic section
        if options.get("include_traffic"):
            traffic_data = await _generate_traffic_section(client, team_id, start_date, end_date)
            result["sections"].append({"name": "traffic", "data": traffic_data})

        # Generate geographic section
        if options.get("include_geographic"):
            geo_data = await _generate_geo_section(client, team_id, start_date, end_date)
            result["sections"].append({"name": "geographic", "data": geo_data})

        # Generate device section
        if options.get("include_devices"):
            device_data = await _generate_device_section(client, team_id, start_date, end_date)
            result["sections"].append({"name": "devices", "data": device_data})

        # Generate referrer section
        if options.get("include_referrers"):
            referrer_data = await _generate_referrer_section(client, team_id, start_date, end_date)
            result["sections"].append({"name": "referrers", "data": referrer_data})

        # Save report to file
        report_file = await _save_report(report_id, result, format)
        result["file_path"] = report_file

        logger.info(f"Report generation completed: {report_id}")

    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        result["error"] = str(e)

    return result


async def _generate_traffic_section(
    client,
    team_id: str,
    start_date: datetime,
    end_date: datetime,
) -> Dict[str, Any]:
    """Generate traffic statistics section"""
    try:
        query = """
            SELECT
                toDate(timestamp) as date,
                count() as total_clicks,
                uniq(visitor_id) as unique_visitors,
                countIf(is_unique = 1) as unique_clicks
            FROM clicks
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp < %(end_date)s
            GROUP BY date
            ORDER BY date
        """

        rows = client.execute(query, {
            "team_id": team_id,
            "start_date": start_date,
            "end_date": end_date,
        })

        daily_data = [
            {
                "date": row[0].isoformat(),
                "total_clicks": row[1],
                "unique_visitors": row[2],
                "unique_clicks": row[3],
            }
            for row in rows
        ]

        # Calculate totals
        totals = {
            "total_clicks": sum(d["total_clicks"] for d in daily_data),
            "unique_visitors": sum(d["unique_visitors"] for d in daily_data),
            "unique_clicks": sum(d["unique_clicks"] for d in daily_data),
        }

        return {
            "daily": daily_data,
            "totals": totals,
        }

    except Exception as e:
        logger.error(f"Failed to generate traffic section: {e}")
        return {"error": str(e)}


async def _generate_geo_section(
    client,
    team_id: str,
    start_date: datetime,
    end_date: datetime,
) -> Dict[str, Any]:
    """Generate geographic statistics section"""
    try:
        query = """
            SELECT
                country,
                count() as clicks,
                uniq(visitor_id) as unique_visitors
            FROM clicks
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp < %(end_date)s
            GROUP BY country
            ORDER BY clicks DESC
            LIMIT 20
        """

        rows = client.execute(query, {
            "team_id": team_id,
            "start_date": start_date,
            "end_date": end_date,
        })

        countries = [
            {
                "country": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
            }
            for row in rows
        ]

        return {"countries": countries}

    except Exception as e:
        logger.error(f"Failed to generate geo section: {e}")
        return {"error": str(e)}


async def _generate_device_section(
    client,
    team_id: str,
    start_date: datetime,
    end_date: datetime,
) -> Dict[str, Any]:
    """Generate device statistics section"""
    try:
        device_query = """
            SELECT
                device,
                count() as clicks,
                uniq(visitor_id) as unique_visitors
            FROM clicks
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp < %(end_date)s
            GROUP BY device
            ORDER BY clicks DESC
        """

        browser_query = """
            SELECT
                browser,
                count() as clicks
            FROM clicks
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp < %(end_date)s
            GROUP BY browser
            ORDER BY clicks DESC
            LIMIT 10
        """

        os_query = """
            SELECT
                os,
                count() as clicks
            FROM clicks
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp < %(end_date)s
            GROUP BY os
            ORDER BY clicks DESC
            LIMIT 10
        """

        params = {
            "team_id": team_id,
            "start_date": start_date,
            "end_date": end_date,
        }

        devices = client.execute(device_query, params)
        browsers = client.execute(browser_query, params)
        operating_systems = client.execute(os_query, params)

        return {
            "devices": [{"device": r[0], "clicks": r[1], "unique_visitors": r[2]} for r in devices],
            "browsers": [{"browser": r[0], "clicks": r[1]} for r in browsers],
            "operating_systems": [{"os": r[0], "clicks": r[1]} for r in operating_systems],
        }

    except Exception as e:
        logger.error(f"Failed to generate device section: {e}")
        return {"error": str(e)}


async def _generate_referrer_section(
    client,
    team_id: str,
    start_date: datetime,
    end_date: datetime,
) -> Dict[str, Any]:
    """Generate referrer statistics section"""
    try:
        query = """
            SELECT
                referer_domain,
                count() as clicks,
                uniq(visitor_id) as unique_visitors
            FROM clicks
            WHERE team_id = %(team_id)s
              AND timestamp >= %(start_date)s
              AND timestamp < %(end_date)s
              AND referer_domain != ''
            GROUP BY referer_domain
            ORDER BY clicks DESC
            LIMIT 20
        """

        rows = client.execute(query, {
            "team_id": team_id,
            "start_date": start_date,
            "end_date": end_date,
        })

        referrers = [
            {
                "domain": row[0],
                "clicks": row[1],
                "unique_visitors": row[2],
            }
            for row in rows
        ]

        return {"referrers": referrers}

    except Exception as e:
        logger.error(f"Failed to generate referrer section: {e}")
        return {"error": str(e)}


async def _save_report(report_id: str, data: Dict, format: str) -> str:
    """Save report to file"""
    os.makedirs(REPORTS_DIR, exist_ok=True)

    if format == "json":
        file_path = os.path.join(REPORTS_DIR, f"{report_id}.json")
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
    elif format == "csv":
        # For CSV, we'd flatten the data structure
        file_path = os.path.join(REPORTS_DIR, f"{report_id}.csv")
        # Simplified CSV generation
        with open(file_path, "w") as f:
            f.write("Report data in CSV format\n")
            f.write(json.dumps(data))
    else:
        # Default to JSON
        file_path = os.path.join(REPORTS_DIR, f"{report_id}.json")
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

    return file_path


async def generate_scheduled_reports() -> Dict[str, Any]:
    """
    Generate all due scheduled reports.
    Runs hourly to check for reports that need to be generated.
    """
    logger.info("Checking for scheduled reports")

    result = {
        "reports_generated": 0,
        "reports_failed": 0,
        "errors": [],
    }

    # In production, this would:
    # 1. Query database for scheduled reports due now
    # 2. Generate each report
    # 3. Send email/webhook notifications

    logger.info("Scheduled reports check completed")
    return result


async def send_report_notification(
    report_id: str,
    team_id: str,
    recipients: List[str],
    report_file: str,
) -> bool:
    """Send report notification to recipients"""
    try:
        # In production, call notification-service
        notification_url = f"{settings.NOTIFICATION_SERVICE_URL}/api/email/send"

        payload = {
            "template": "scheduled_report",
            "recipients": recipients,
            "data": {
                "report_id": report_id,
                "team_id": team_id,
                "download_url": f"/api/reports/{report_id}/download",
            },
            "attachments": [report_file] if os.path.exists(report_file) else [],
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(notification_url, json=payload, timeout=30) as response:
                if response.status == 200:
                    logger.info(f"Report notification sent for {report_id}")
                    return True
                else:
                    logger.error(f"Failed to send report notification: {response.status}")
                    return False

    except Exception as e:
        logger.error(f"Error sending report notification: {e}")
        return False
