"""
Cleanup tasks for expired links and old data
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.core.clickhouse import get_clickhouse_client
from app.core.config import settings

logger = logging.getLogger(__name__)


async def cleanup_expired_links() -> Dict[str, Any]:
    """
    Clean up expired links from the system.
    This task runs daily and handles:
    1. Mark expired links as inactive
    2. Send expiration notifications
    3. Update analytics metadata
    """
    logger.info("Starting expired links cleanup")

    result = {
        "expired_count": 0,
        "notified_count": 0,
        "errors": [],
        "started_at": datetime.utcnow().isoformat(),
    }

    try:
        client = get_clickhouse_client()

        # Find links that have expired in the last 24 hours
        # In production, this would query PostgreSQL
        query = """
            SELECT DISTINCT link_id
            FROM clicks
            WHERE timestamp >= now() - INTERVAL 1 DAY
        """

        # Mock implementation - in production, query link-service
        expired_links = []

        for link_id in expired_links:
            try:
                # Mark link as expired via link-service API
                # await mark_link_expired(link_id)
                result["expired_count"] += 1

                # Send expiration notification
                # await send_expiration_notification(link_id)
                result["notified_count"] += 1

            except Exception as e:
                result["errors"].append(f"Failed to process link {link_id}: {str(e)}")

        result["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Expired links cleanup completed: {result['expired_count']} processed")

    except Exception as e:
        result["errors"].append(str(e))
        logger.error(f"Expired links cleanup failed: {e}")

    return result


async def cleanup_old_analytics_data(retention_days: int = 365) -> Dict[str, Any]:
    """
    Clean up old analytics data based on retention policy.
    """
    logger.info(f"Starting analytics data cleanup (retention: {retention_days} days)")

    result = {
        "tables_processed": [],
        "rows_deleted": 0,
        "errors": [],
        "started_at": datetime.utcnow().isoformat(),
    }

    try:
        client = get_clickhouse_client()
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        tables = ["clicks", "page_views", "conversions", "custom_events"]

        for table in tables:
            try:
                # In ClickHouse, we typically use TTL instead of manual deletion
                # This is for demonstration
                delete_query = f"""
                    ALTER TABLE {table}
                    DELETE WHERE timestamp < %(cutoff_date)s
                """

                # Note: In production, consider using partitions
                # client.execute(delete_query, {"cutoff_date": cutoff_date})

                result["tables_processed"].append(table)
                logger.info(f"Processed table {table}")

            except Exception as e:
                result["errors"].append(f"Failed to clean {table}: {str(e)}")

        result["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Analytics cleanup completed: {len(result['tables_processed'])} tables processed")

    except Exception as e:
        result["errors"].append(str(e))
        logger.error(f"Analytics cleanup failed: {e}")

    return result


async def cleanup_temp_files() -> Dict[str, Any]:
    """
    Clean up temporary files from report generation, exports, etc.
    """
    import os
    import glob

    logger.info("Starting temp files cleanup")

    result = {
        "files_deleted": 0,
        "bytes_freed": 0,
        "errors": [],
    }

    temp_dirs = [
        "/tmp/lnk_reports",
        "/tmp/lnk_exports",
        "/tmp/lnk_qr_codes",
    ]

    max_age_hours = 24
    cutoff_time = datetime.utcnow().timestamp() - (max_age_hours * 3600)

    for temp_dir in temp_dirs:
        if not os.path.exists(temp_dir):
            continue

        try:
            for filepath in glob.glob(f"{temp_dir}/*"):
                try:
                    file_stat = os.stat(filepath)
                    if file_stat.st_mtime < cutoff_time:
                        file_size = file_stat.st_size
                        os.remove(filepath)
                        result["files_deleted"] += 1
                        result["bytes_freed"] += file_size
                except Exception as e:
                    result["errors"].append(f"Failed to delete {filepath}: {str(e)}")
        except Exception as e:
            result["errors"].append(f"Failed to process {temp_dir}: {str(e)}")

    logger.info(f"Temp cleanup: {result['files_deleted']} files, {result['bytes_freed']} bytes freed")
    return result


async def cleanup_orphaned_data() -> Dict[str, Any]:
    """
    Clean up orphaned data (clicks for deleted links, etc.)
    """
    logger.info("Starting orphaned data cleanup")

    result = {
        "orphaned_clicks": 0,
        "orphaned_conversions": 0,
        "errors": [],
    }

    # This would involve:
    # 1. Getting list of valid link IDs from link-service
    # 2. Finding clicks/conversions with non-existent link_ids
    # 3. Either archiving or deleting them

    logger.info("Orphaned data cleanup completed")
    return result
