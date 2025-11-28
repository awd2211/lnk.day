"""
Scheduled tasks module for analytics service.

This module contains all background tasks that run on schedules:
- Cleanup: Expired links, old data, temp files
- Aggregation: Daily/weekly/monthly stats
- Security: Link scanning, threat detection
- Reports: Scheduled report generation
"""

from app.tasks.cleanup_tasks import (
    cleanup_expired_links,
    cleanup_old_analytics_data,
    cleanup_temp_files,
    cleanup_orphaned_data,
)

from app.tasks.aggregation_tasks import (
    aggregate_daily_stats,
    aggregate_weekly_stats,
    aggregate_monthly_stats,
    compute_trending_links,
    compute_link_insights,
    update_leaderboards,
)

from app.tasks.security_tasks import (
    batch_security_scan,
    scan_new_links,
    rescan_suspicious_links,
    update_threat_database,
    SecurityScanner,
)

from app.tasks.report_tasks import (
    generate_report,
    generate_scheduled_reports,
    send_report_notification,
)

__all__ = [
    # Cleanup
    "cleanup_expired_links",
    "cleanup_old_analytics_data",
    "cleanup_temp_files",
    "cleanup_orphaned_data",
    # Aggregation
    "aggregate_daily_stats",
    "aggregate_weekly_stats",
    "aggregate_monthly_stats",
    "compute_trending_links",
    "compute_link_insights",
    "update_leaderboards",
    # Security
    "batch_security_scan",
    "scan_new_links",
    "rescan_suspicious_links",
    "update_threat_database",
    "SecurityScanner",
    # Reports
    "generate_report",
    "generate_scheduled_reports",
    "send_report_notification",
]
