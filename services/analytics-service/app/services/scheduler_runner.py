import asyncio
import logging
import uuid
from datetime import datetime

from app.services.schedule_service import schedule_service
from app.api.reports import ReportRequest, ReportFormat, ReportType, generate_report_task

logger = logging.getLogger(__name__)


class SchedulerRunner:
    """后台调度执行器"""

    def __init__(self):
        self.running = False
        self.check_interval = 60  # Check every minute

    async def start(self):
        """启动调度器"""
        self.running = True
        logger.info("Scheduler runner started")

        while self.running:
            try:
                await self._check_and_run_schedules()
            except Exception as e:
                logger.error(f"Error in scheduler runner: {e}")

            await asyncio.sleep(self.check_interval)

    async def stop(self):
        """停止调度器"""
        self.running = False
        logger.info("Scheduler runner stopped")

    async def _check_and_run_schedules(self):
        """检查并执行到期的定时报告"""
        due_schedules = schedule_service.get_due_schedules()

        for schedule in due_schedules:
            try:
                logger.info(f"Running scheduled report: {schedule.id} ({schedule.name})")
                await self._execute_schedule(schedule)
            except Exception as e:
                logger.error(f"Failed to execute schedule {schedule.id}: {e}")
                schedule_service.mark_schedule_executed(
                    schedule.id,
                    success=False,
                    error=str(e)
                )

    async def _execute_schedule(self, schedule):
        """执行单个定时报告"""
        # Map schedule config to report request
        format_map = {
            "pdf": ReportFormat.PDF,
            "csv": ReportFormat.CSV,
            "json": ReportFormat.JSON,
        }
        frequency_map = {
            "daily": ReportType.DAILY,
            "weekly": ReportType.WEEKLY,
            "monthly": ReportType.MONTHLY,
        }

        request = ReportRequest(
            team_id=schedule.team_id,
            report_type=frequency_map.get(schedule.frequency, ReportType.WEEKLY),
            format=format_map.get(schedule.format, ReportFormat.PDF),
            include_traffic=schedule.include_traffic,
            include_geographic=schedule.include_geographic,
            include_devices=schedule.include_devices,
            include_referrers=schedule.include_referrers,
        )

        report_id = str(uuid.uuid4())

        try:
            await generate_report_task(report_id, request)

            # TODO: Send email notifications to schedule.email_recipients
            # This would integrate with notification-service

            schedule_service.mark_schedule_executed(
                schedule.id,
                success=True,
                report_id=report_id
            )
            logger.info(f"Schedule {schedule.id} executed successfully, report: {report_id}")

        except Exception as e:
            schedule_service.mark_schedule_executed(
                schedule.id,
                success=False,
                error=str(e)
            )
            raise


# Singleton instance
scheduler_runner = SchedulerRunner()
