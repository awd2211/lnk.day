from datetime import datetime, time
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field


class ScheduleFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class DayOfWeek(int, Enum):
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


class ReportScheduleCreate(BaseModel):
    """创建定时报告请求"""
    name: str = Field(..., min_length=1, max_length=100)
    team_id: str
    frequency: ScheduleFrequency
    time_of_day: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")  # HH:MM format
    day_of_week: Optional[DayOfWeek] = None  # For weekly reports
    day_of_month: Optional[int] = Field(default=None, ge=1, le=28)  # For monthly reports
    timezone: str = Field(default="UTC")

    # Report configuration
    include_traffic: bool = True
    include_geographic: bool = True
    include_devices: bool = True
    include_referrers: bool = True
    format: str = Field(default="pdf")  # pdf, csv, json

    # Notification
    email_recipients: List[str] = Field(default_factory=list)
    enabled: bool = True


class ReportScheduleUpdate(BaseModel):
    """更新定时报告请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    frequency: Optional[ScheduleFrequency] = None
    time_of_day: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    day_of_week: Optional[DayOfWeek] = None
    day_of_month: Optional[int] = Field(default=None, ge=1, le=28)
    timezone: Optional[str] = None
    include_traffic: Optional[bool] = None
    include_geographic: Optional[bool] = None
    include_devices: Optional[bool] = None
    include_referrers: Optional[bool] = None
    format: Optional[str] = None
    email_recipients: Optional[List[str]] = None
    enabled: Optional[bool] = None


class ReportSchedule(BaseModel):
    """定时报告响应"""
    id: str
    name: str
    team_id: str
    frequency: ScheduleFrequency
    time_of_day: str
    day_of_week: Optional[DayOfWeek] = None
    day_of_month: Optional[int] = None
    timezone: str
    include_traffic: bool
    include_geographic: bool
    include_devices: bool
    include_referrers: bool
    format: str
    email_recipients: List[str]
    enabled: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ScheduleExecutionLog(BaseModel):
    """定时报告执行日志"""
    id: str
    schedule_id: str
    executed_at: datetime
    status: str  # success, failed
    report_id: Optional[str] = None
    error_message: Optional[str] = None
    emails_sent: int = 0
