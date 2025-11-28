"""
Comprehensive task scheduler for analytics service.
Handles scheduled jobs like data aggregation, cleanup, security scans, and report generation.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Callable, Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import json
import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class TaskFrequency(Enum):
    MINUTELY = "minutely"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass
class ScheduledTask:
    """Represents a scheduled task"""
    name: str
    func: Callable
    frequency: TaskFrequency
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    run_at_hour: int = 0  # For daily/weekly/monthly tasks
    run_at_minute: int = 0
    run_on_day: int = 0  # Day of week (0=Monday) or day of month
    description: str = ""
    timeout_seconds: int = 3600  # 1 hour default
    retry_count: int = 3
    retry_delay_seconds: int = 60


@dataclass
class TaskExecutionResult:
    """Result of a task execution"""
    task_name: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    success: bool = False
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    duration_seconds: float = 0


class TaskScheduler:
    """
    Task scheduler that manages and executes scheduled tasks.
    Stores state in Redis for persistence across restarts.
    """

    def __init__(self):
        self.tasks: Dict[str, ScheduledTask] = {}
        self.running = False
        self.check_interval = 30  # Check every 30 seconds
        self.redis_client: Optional[redis.Redis] = None
        self.current_tasks: Dict[str, asyncio.Task] = {}
        self.execution_history: List[TaskExecutionResult] = []

    async def initialize(self):
        """Initialize Redis connection and load state"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL)
            await self._load_state()
            logger.info("Task scheduler initialized")
        except Exception as e:
            logger.error(f"Failed to initialize task scheduler: {e}")

    async def _load_state(self):
        """Load scheduler state from Redis"""
        if not self.redis_client:
            return

        try:
            state = await self.redis_client.get("scheduler:state")
            if state:
                data = json.loads(state)
                for task_name, task_data in data.items():
                    if task_name in self.tasks:
                        self.tasks[task_name].last_run = (
                            datetime.fromisoformat(task_data["last_run"])
                            if task_data.get("last_run")
                            else None
                        )
                        self.tasks[task_name].next_run = (
                            datetime.fromisoformat(task_data["next_run"])
                            if task_data.get("next_run")
                            else None
                        )
        except Exception as e:
            logger.error(f"Failed to load scheduler state: {e}")

    async def _save_state(self):
        """Save scheduler state to Redis"""
        if not self.redis_client:
            return

        try:
            state = {}
            for name, task in self.tasks.items():
                state[name] = {
                    "last_run": task.last_run.isoformat() if task.last_run else None,
                    "next_run": task.next_run.isoformat() if task.next_run else None,
                }
            await self.redis_client.set("scheduler:state", json.dumps(state))
        except Exception as e:
            logger.error(f"Failed to save scheduler state: {e}")

    def register_task(
        self,
        name: str,
        func: Callable,
        frequency: TaskFrequency,
        run_at_hour: int = 0,
        run_at_minute: int = 0,
        run_on_day: int = 0,
        description: str = "",
        enabled: bool = True,
        timeout_seconds: int = 3600,
    ):
        """Register a new scheduled task"""
        task = ScheduledTask(
            name=name,
            func=func,
            frequency=frequency,
            run_at_hour=run_at_hour,
            run_at_minute=run_at_minute,
            run_on_day=run_on_day,
            description=description,
            enabled=enabled,
            timeout_seconds=timeout_seconds,
        )
        task.next_run = self._calculate_next_run(task)
        self.tasks[name] = task
        logger.info(f"Registered task: {name} ({frequency.value})")

    def _calculate_next_run(self, task: ScheduledTask) -> datetime:
        """Calculate the next run time for a task"""
        now = datetime.utcnow()

        if task.frequency == TaskFrequency.MINUTELY:
            return now + timedelta(minutes=1)

        elif task.frequency == TaskFrequency.HOURLY:
            next_run = now.replace(minute=task.run_at_minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(hours=1)
            return next_run

        elif task.frequency == TaskFrequency.DAILY:
            next_run = now.replace(
                hour=task.run_at_hour,
                minute=task.run_at_minute,
                second=0,
                microsecond=0,
            )
            if next_run <= now:
                next_run += timedelta(days=1)
            return next_run

        elif task.frequency == TaskFrequency.WEEKLY:
            # run_on_day: 0=Monday, 6=Sunday
            days_ahead = task.run_on_day - now.weekday()
            if days_ahead < 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(
                hour=task.run_at_hour,
                minute=task.run_at_minute,
                second=0,
                microsecond=0,
            )
            if next_run <= now:
                next_run += timedelta(weeks=1)
            return next_run

        elif task.frequency == TaskFrequency.MONTHLY:
            # run_on_day: day of month (1-28)
            next_run = now.replace(
                day=min(task.run_on_day, 28),
                hour=task.run_at_hour,
                minute=task.run_at_minute,
                second=0,
                microsecond=0,
            )
            if next_run <= now:
                # Move to next month
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)
            return next_run

        return now + timedelta(hours=1)

    async def start(self):
        """Start the scheduler"""
        if not settings.SCHEDULER_ENABLED:
            logger.info("Scheduler is disabled")
            return

        await self.initialize()
        self.running = True
        logger.info(f"Task scheduler started with {len(self.tasks)} tasks")

        while self.running:
            try:
                await self._check_and_run_tasks()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")

            await asyncio.sleep(self.check_interval)

    async def stop(self):
        """Stop the scheduler"""
        self.running = False

        # Cancel any running tasks
        for task_name, task in self.current_tasks.items():
            if not task.done():
                task.cancel()
                logger.info(f"Cancelled running task: {task_name}")

        await self._save_state()

        if self.redis_client:
            await self.redis_client.close()

        logger.info("Task scheduler stopped")

    async def _check_and_run_tasks(self):
        """Check for due tasks and execute them"""
        now = datetime.utcnow()

        for name, task in self.tasks.items():
            if not task.enabled:
                continue

            if task.next_run and task.next_run <= now:
                # Don't start if already running
                if name in self.current_tasks and not self.current_tasks[name].done():
                    logger.warning(f"Task {name} is still running, skipping")
                    continue

                # Start task execution
                self.current_tasks[name] = asyncio.create_task(
                    self._execute_task(task)
                )

    async def _execute_task(self, task: ScheduledTask):
        """Execute a single task with error handling and retry logic"""
        result = TaskExecutionResult(
            task_name=task.name,
            started_at=datetime.utcnow(),
        )

        logger.info(f"Starting task: {task.name}")

        for attempt in range(task.retry_count):
            try:
                # Execute with timeout
                task_result = await asyncio.wait_for(
                    task.func(),
                    timeout=task.timeout_seconds,
                )

                result.success = True
                result.result = task_result
                result.completed_at = datetime.utcnow()
                result.duration_seconds = (
                    result.completed_at - result.started_at
                ).total_seconds()

                logger.info(
                    f"Task {task.name} completed successfully in {result.duration_seconds:.2f}s"
                )
                break

            except asyncio.TimeoutError:
                result.error = f"Task timed out after {task.timeout_seconds}s"
                logger.error(f"Task {task.name} timed out")

            except Exception as e:
                result.error = str(e)
                logger.error(f"Task {task.name} failed (attempt {attempt + 1}): {e}")

                if attempt < task.retry_count - 1:
                    await asyncio.sleep(task.retry_delay_seconds)

        # Update task state
        task.last_run = result.started_at
        task.next_run = self._calculate_next_run(task)

        # Store execution result
        self.execution_history.append(result)
        if len(self.execution_history) > 1000:
            self.execution_history = self.execution_history[-500:]

        # Save state
        await self._save_state()

        # Store result in Redis for monitoring
        await self._store_execution_result(result)

    async def _store_execution_result(self, result: TaskExecutionResult):
        """Store execution result in Redis"""
        if not self.redis_client:
            return

        try:
            key = f"scheduler:history:{result.task_name}"
            data = {
                "task_name": result.task_name,
                "started_at": result.started_at.isoformat(),
                "completed_at": result.completed_at.isoformat() if result.completed_at else None,
                "success": result.success,
                "error": result.error,
                "duration_seconds": result.duration_seconds,
            }
            await self.redis_client.lpush(key, json.dumps(data))
            await self.redis_client.ltrim(key, 0, 99)  # Keep last 100 executions
        except Exception as e:
            logger.error(f"Failed to store execution result: {e}")

    async def run_task_now(self, task_name: str) -> TaskExecutionResult:
        """Manually trigger a task execution"""
        if task_name not in self.tasks:
            raise ValueError(f"Task {task_name} not found")

        task = self.tasks[task_name]
        await self._execute_task(task)

        return self.execution_history[-1] if self.execution_history else None

    def get_task_status(self, task_name: str) -> Dict[str, Any]:
        """Get status of a specific task"""
        if task_name not in self.tasks:
            return {"error": "Task not found"}

        task = self.tasks[task_name]
        is_running = (
            task_name in self.current_tasks
            and not self.current_tasks[task_name].done()
        )

        return {
            "name": task.name,
            "description": task.description,
            "frequency": task.frequency.value,
            "enabled": task.enabled,
            "is_running": is_running,
            "last_run": task.last_run.isoformat() if task.last_run else None,
            "next_run": task.next_run.isoformat() if task.next_run else None,
        }

    def get_all_tasks_status(self) -> List[Dict[str, Any]]:
        """Get status of all tasks"""
        return [self.get_task_status(name) for name in self.tasks]

    async def get_task_history(self, task_name: str, limit: int = 10) -> List[Dict]:
        """Get execution history for a task"""
        if not self.redis_client:
            return []

        try:
            key = f"scheduler:history:{task_name}"
            history = await self.redis_client.lrange(key, 0, limit - 1)
            return [json.loads(h) for h in history]
        except Exception as e:
            logger.error(f"Failed to get task history: {e}")
            return []

    def enable_task(self, task_name: str):
        """Enable a task"""
        if task_name in self.tasks:
            self.tasks[task_name].enabled = True
            logger.info(f"Task {task_name} enabled")

    def disable_task(self, task_name: str):
        """Disable a task"""
        if task_name in self.tasks:
            self.tasks[task_name].enabled = False
            logger.info(f"Task {task_name} disabled")


# Create singleton instance
task_scheduler = TaskScheduler()


def register_all_tasks():
    """Register all scheduled tasks"""
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
    )

    # Cleanup Tasks
    task_scheduler.register_task(
        name="cleanup_expired_links",
        func=cleanup_expired_links,
        frequency=TaskFrequency.DAILY,
        run_at_hour=1,
        run_at_minute=0,
        description="Clean up expired links and send notifications",
    )

    task_scheduler.register_task(
        name="cleanup_old_analytics",
        func=lambda: cleanup_old_analytics_data(settings.DATA_RETENTION_DAYS),
        frequency=TaskFrequency.DAILY,
        run_at_hour=2,
        run_at_minute=0,
        description=f"Clean up analytics data older than {settings.DATA_RETENTION_DAYS} days",
    )

    task_scheduler.register_task(
        name="cleanup_temp_files",
        func=cleanup_temp_files,
        frequency=TaskFrequency.HOURLY,
        run_at_minute=30,
        description="Clean up temporary files from reports and exports",
    )

    task_scheduler.register_task(
        name="cleanup_orphaned_data",
        func=cleanup_orphaned_data,
        frequency=TaskFrequency.WEEKLY,
        run_on_day=6,  # Sunday
        run_at_hour=3,
        description="Clean up orphaned analytics data for deleted links",
    )

    # Aggregation Tasks
    task_scheduler.register_task(
        name="aggregate_daily_stats",
        func=aggregate_daily_stats,
        frequency=TaskFrequency.DAILY,
        run_at_hour=0,
        run_at_minute=15,
        description="Aggregate daily statistics for dashboards",
    )

    task_scheduler.register_task(
        name="aggregate_weekly_stats",
        func=aggregate_weekly_stats,
        frequency=TaskFrequency.WEEKLY,
        run_on_day=0,  # Monday
        run_at_hour=0,
        run_at_minute=30,
        description="Roll up daily stats to weekly",
    )

    task_scheduler.register_task(
        name="aggregate_monthly_stats",
        func=aggregate_monthly_stats,
        frequency=TaskFrequency.MONTHLY,
        run_on_day=1,
        run_at_hour=1,
        description="Roll up stats to monthly",
    )

    task_scheduler.register_task(
        name="compute_trending_links",
        func=compute_trending_links,
        frequency=TaskFrequency.HOURLY,
        run_at_minute=5,
        description="Compute trending links based on recent activity",
    )

    task_scheduler.register_task(
        name="compute_link_insights",
        func=compute_link_insights,
        frequency=TaskFrequency.DAILY,
        run_at_hour=4,
        description="Generate AI-powered insights for links",
    )

    task_scheduler.register_task(
        name="update_leaderboards",
        func=update_leaderboards,
        frequency=TaskFrequency.HOURLY,
        run_at_minute=0,
        description="Update click leaderboards",
    )

    # Security Tasks
    task_scheduler.register_task(
        name="batch_security_scan",
        func=batch_security_scan,
        frequency=TaskFrequency.DAILY,
        run_at_hour=5,
        description="Batch scan links for security threats",
    )

    task_scheduler.register_task(
        name="scan_new_links",
        func=scan_new_links,
        frequency=TaskFrequency.HOURLY,
        run_at_minute=10,
        description="Scan recently created links for security",
    )

    task_scheduler.register_task(
        name="rescan_suspicious_links",
        func=rescan_suspicious_links,
        frequency=TaskFrequency.DAILY,
        run_at_hour=6,
        description="Re-scan previously flagged suspicious links",
    )

    task_scheduler.register_task(
        name="update_threat_database",
        func=update_threat_database,
        frequency=TaskFrequency.DAILY,
        run_at_hour=0,
        run_at_minute=0,
        description="Update local threat intelligence database",
    )

    logger.info(f"Registered {len(task_scheduler.tasks)} scheduled tasks")
