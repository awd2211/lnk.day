import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import redis
import os

from app.models.schedule import (
    ReportScheduleCreate,
    ReportScheduleUpdate,
    ReportSchedule,
    ScheduleFrequency,
    ScheduleExecutionLog,
)


class ScheduleService:
    """定时报告调度服务"""

    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            decode_responses=True,
        )
        self.schedule_prefix = "schedule:"
        self.schedule_list_key = "schedules:all"
        self.execution_log_prefix = "schedule_log:"

    def _calculate_next_run(self, schedule: Dict[str, Any]) -> datetime:
        """计算下次执行时间"""
        now = datetime.now()
        time_parts = schedule["time_of_day"].split(":")
        target_hour = int(time_parts[0])
        target_minute = int(time_parts[1])

        frequency = schedule["frequency"]

        if frequency == ScheduleFrequency.DAILY:
            next_run = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)

        elif frequency == ScheduleFrequency.WEEKLY:
            day_of_week = schedule.get("day_of_week", 0)
            days_ahead = day_of_week - now.weekday()
            if days_ahead < 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(weeks=1)

        elif frequency == ScheduleFrequency.MONTHLY:
            day_of_month = schedule.get("day_of_month", 1)
            next_run = now.replace(day=day_of_month, hour=target_hour, minute=target_minute, second=0, microsecond=0)
            if next_run <= now:
                # Move to next month
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)

        else:
            next_run = now + timedelta(days=1)

        return next_run

    def create_schedule(self, data: ReportScheduleCreate) -> ReportSchedule:
        """创建定时报告"""
        schedule_id = str(uuid.uuid4())
        now = datetime.now()

        schedule_data = {
            "id": schedule_id,
            "name": data.name,
            "team_id": data.team_id,
            "frequency": data.frequency,
            "time_of_day": data.time_of_day,
            "day_of_week": data.day_of_week,
            "day_of_month": data.day_of_month,
            "timezone": data.timezone,
            "include_traffic": data.include_traffic,
            "include_geographic": data.include_geographic,
            "include_devices": data.include_devices,
            "include_referrers": data.include_referrers,
            "format": data.format,
            "email_recipients": data.email_recipients,
            "enabled": data.enabled,
            "last_run": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        # Calculate next run time
        schedule_data["next_run"] = self._calculate_next_run(schedule_data).isoformat()

        # Store in Redis
        self.redis.hset(f"{self.schedule_prefix}{schedule_id}", mapping={
            k: json.dumps(v) if isinstance(v, (list, dict)) or v is None else str(v)
            for k, v in schedule_data.items()
        })

        # Add to list of all schedules
        self.redis.sadd(self.schedule_list_key, schedule_id)

        return self._dict_to_schedule(schedule_data)

    def get_schedule(self, schedule_id: str) -> Optional[ReportSchedule]:
        """获取单个定时报告"""
        data = self.redis.hgetall(f"{self.schedule_prefix}{schedule_id}")
        if not data:
            return None
        return self._parse_schedule_data(data)

    def get_schedules_by_team(self, team_id: str) -> List[ReportSchedule]:
        """获取团队的所有定时报告"""
        schedule_ids = self.redis.smembers(self.schedule_list_key)
        schedules = []

        for sid in schedule_ids:
            data = self.redis.hgetall(f"{self.schedule_prefix}{sid}")
            if data and data.get("team_id") == team_id:
                schedule = self._parse_schedule_data(data)
                if schedule:
                    schedules.append(schedule)

        return sorted(schedules, key=lambda x: x.created_at, reverse=True)

    def update_schedule(self, schedule_id: str, data: ReportScheduleUpdate) -> Optional[ReportSchedule]:
        """更新定时报告"""
        existing = self.redis.hgetall(f"{self.schedule_prefix}{schedule_id}")
        if not existing:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return self._parse_schedule_data(existing)

        update_data["updated_at"] = datetime.now().isoformat()

        # Recalculate next_run if schedule timing changed
        if any(k in update_data for k in ["frequency", "time_of_day", "day_of_week", "day_of_month"]):
            merged = {**existing, **{k: str(v) for k, v in update_data.items()}}
            update_data["next_run"] = self._calculate_next_run(merged).isoformat()

        # Update Redis
        for k, v in update_data.items():
            if isinstance(v, (list, dict)):
                v = json.dumps(v)
            elif v is None:
                v = "null"
            else:
                v = str(v)
            self.redis.hset(f"{self.schedule_prefix}{schedule_id}", k, v)

        return self.get_schedule(schedule_id)

    def delete_schedule(self, schedule_id: str) -> bool:
        """删除定时报告"""
        if not self.redis.exists(f"{self.schedule_prefix}{schedule_id}"):
            return False

        self.redis.delete(f"{self.schedule_prefix}{schedule_id}")
        self.redis.srem(self.schedule_list_key, schedule_id)
        return True

    def get_due_schedules(self) -> List[ReportSchedule]:
        """获取到期需要执行的定时报告"""
        now = datetime.now()
        schedule_ids = self.redis.smembers(self.schedule_list_key)
        due_schedules = []

        for sid in schedule_ids:
            data = self.redis.hgetall(f"{self.schedule_prefix}{sid}")
            if not data:
                continue

            if data.get("enabled") != "True":
                continue

            next_run_str = data.get("next_run")
            if not next_run_str or next_run_str == "null":
                continue

            try:
                next_run = datetime.fromisoformat(next_run_str)
                if next_run <= now:
                    schedule = self._parse_schedule_data(data)
                    if schedule:
                        due_schedules.append(schedule)
            except (ValueError, TypeError):
                continue

        return due_schedules

    def mark_schedule_executed(
        self,
        schedule_id: str,
        success: bool,
        report_id: Optional[str] = None,
        error: Optional[str] = None,
        emails_sent: int = 0
    ):
        """标记定时报告已执行"""
        now = datetime.now()

        # Update schedule
        existing = self.redis.hgetall(f"{self.schedule_prefix}{schedule_id}")
        if existing:
            self.redis.hset(f"{self.schedule_prefix}{schedule_id}", "last_run", now.isoformat())
            # Calculate new next_run
            new_next_run = self._calculate_next_run(existing)
            self.redis.hset(f"{self.schedule_prefix}{schedule_id}", "next_run", new_next_run.isoformat())

        # Log execution
        log_id = str(uuid.uuid4())
        log_data = {
            "id": log_id,
            "schedule_id": schedule_id,
            "executed_at": now.isoformat(),
            "status": "success" if success else "failed",
            "report_id": report_id or "",
            "error_message": error or "",
            "emails_sent": emails_sent,
        }
        self.redis.hset(f"{self.execution_log_prefix}{log_id}", mapping=log_data)
        self.redis.lpush(f"schedule_logs:{schedule_id}", log_id)
        self.redis.ltrim(f"schedule_logs:{schedule_id}", 0, 99)  # Keep last 100 logs

    def get_execution_logs(self, schedule_id: str, limit: int = 20) -> List[ScheduleExecutionLog]:
        """获取定时报告执行日志"""
        log_ids = self.redis.lrange(f"schedule_logs:{schedule_id}", 0, limit - 1)
        logs = []

        for log_id in log_ids:
            log_data = self.redis.hgetall(f"{self.execution_log_prefix}{log_id}")
            if log_data:
                logs.append(ScheduleExecutionLog(
                    id=log_data["id"],
                    schedule_id=log_data["schedule_id"],
                    executed_at=datetime.fromisoformat(log_data["executed_at"]),
                    status=log_data["status"],
                    report_id=log_data.get("report_id") or None,
                    error_message=log_data.get("error_message") or None,
                    emails_sent=int(log_data.get("emails_sent", 0)),
                ))

        return logs

    def _parse_schedule_data(self, data: Dict[str, str]) -> Optional[ReportSchedule]:
        """解析 Redis 数据为 Schedule 对象"""
        try:
            email_recipients = data.get("email_recipients", "[]")
            if email_recipients and email_recipients != "null":
                email_recipients = json.loads(email_recipients)
            else:
                email_recipients = []

            day_of_week = data.get("day_of_week")
            if day_of_week and day_of_week not in ("None", "null"):
                day_of_week = int(day_of_week)
            else:
                day_of_week = None

            day_of_month = data.get("day_of_month")
            if day_of_month and day_of_month not in ("None", "null"):
                day_of_month = int(day_of_month)
            else:
                day_of_month = None

            last_run = data.get("last_run")
            if last_run and last_run not in ("None", "null"):
                last_run = datetime.fromisoformat(last_run)
            else:
                last_run = None

            next_run = data.get("next_run")
            if next_run and next_run not in ("None", "null"):
                next_run = datetime.fromisoformat(next_run)
            else:
                next_run = None

            return ReportSchedule(
                id=data["id"],
                name=data["name"],
                team_id=data["team_id"],
                frequency=data["frequency"],
                time_of_day=data["time_of_day"],
                day_of_week=day_of_week,
                day_of_month=day_of_month,
                timezone=data.get("timezone", "UTC"),
                include_traffic=data.get("include_traffic") == "True",
                include_geographic=data.get("include_geographic") == "True",
                include_devices=data.get("include_devices") == "True",
                include_referrers=data.get("include_referrers") == "True",
                format=data.get("format", "pdf"),
                email_recipients=email_recipients,
                enabled=data.get("enabled") == "True",
                last_run=last_run,
                next_run=next_run,
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.fromisoformat(data["updated_at"]),
            )
        except (KeyError, ValueError, TypeError) as e:
            print(f"Error parsing schedule data: {e}")
            return None

    def _dict_to_schedule(self, data: Dict[str, Any]) -> ReportSchedule:
        """将字典转换为 Schedule 对象"""
        return ReportSchedule(
            id=data["id"],
            name=data["name"],
            team_id=data["team_id"],
            frequency=data["frequency"],
            time_of_day=data["time_of_day"],
            day_of_week=data.get("day_of_week"),
            day_of_month=data.get("day_of_month"),
            timezone=data.get("timezone", "UTC"),
            include_traffic=data.get("include_traffic", True),
            include_geographic=data.get("include_geographic", True),
            include_devices=data.get("include_devices", True),
            include_referrers=data.get("include_referrers", True),
            format=data.get("format", "pdf"),
            email_recipients=data.get("email_recipients", []),
            enabled=data.get("enabled", True),
            last_run=datetime.fromisoformat(data["last_run"]) if data.get("last_run") else None,
            next_run=datetime.fromisoformat(data["next_run"]) if data.get("next_run") else None,
            created_at=datetime.fromisoformat(data["created_at"]) if isinstance(data["created_at"], str) else data["created_at"],
            updated_at=datetime.fromisoformat(data["updated_at"]) if isinstance(data["updated_at"], str) else data["updated_at"],
        )


# Singleton instance
schedule_service = ScheduleService()
