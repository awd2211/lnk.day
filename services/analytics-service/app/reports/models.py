from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID


class ReportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "xlsx"


class ReportSchedule(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ReportMetric(str, Enum):
    CLICKS = "clicks"
    UNIQUE_VISITORS = "unique_visitors"
    CONVERSIONS = "conversions"
    CONVERSION_RATE = "conversion_rate"
    REVENUE = "revenue"
    CTR = "ctr"
    BOUNCE_RATE = "bounce_rate"
    AVG_TIME_ON_PAGE = "avg_time_on_page"


class ReportDimension(str, Enum):
    DATE = "date"
    HOUR = "hour"
    DAY_OF_WEEK = "day_of_week"
    COUNTRY = "country"
    CITY = "city"
    DEVICE = "device"
    OS = "os"
    BROWSER = "browser"
    REFERRER = "referrer"
    UTM_SOURCE = "utm_source"
    UTM_MEDIUM = "utm_medium"
    UTM_CAMPAIGN = "utm_campaign"
    LINK = "link"
    CAMPAIGN = "campaign"
    TAG = "tag"


class DateRange(str, Enum):
    TODAY = "today"
    YESTERDAY = "yesterday"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    LAST_90_DAYS = "last_90_days"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    THIS_YEAR = "this_year"
    CUSTOM = "custom"


class ReportFilter(BaseModel):
    field: str
    operator: str  # eq, ne, gt, lt, gte, lte, in, not_in, contains, starts_with
    value: Any


class ReportConfig(BaseModel):
    name: str
    description: Optional[str] = None

    # Data configuration
    date_range: DateRange = DateRange.LAST_30_DAYS
    custom_start_date: Optional[datetime] = None
    custom_end_date: Optional[datetime] = None
    timezone: str = "UTC"

    # Metrics and dimensions
    metrics: List[ReportMetric] = [ReportMetric.CLICKS, ReportMetric.UNIQUE_VISITORS]
    dimensions: List[ReportDimension] = [ReportDimension.DATE]

    # Filters
    filters: List[ReportFilter] = []

    # Limits and sorting
    limit: int = 1000
    sort_by: Optional[str] = None
    sort_order: str = "desc"

    # Output
    format: ReportFormat = ReportFormat.JSON
    include_totals: bool = True
    include_comparison: bool = False  # Compare with previous period


class ScheduledReportConfig(ReportConfig):
    schedule: ReportSchedule = ReportSchedule.WEEKLY
    schedule_day: Optional[int] = None  # Day of week (0-6) or day of month (1-31)
    schedule_time: str = "09:00"
    cron_expression: Optional[str] = None  # For custom schedules

    # Delivery
    recipients: List[str] = []  # Email addresses
    webhook_url: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_prefix: Optional[str] = None

    # Status
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None


class ReportCreateRequest(BaseModel):
    config: ReportConfig
    team_id: str
    user_id: str


class ScheduledReportCreateRequest(BaseModel):
    config: ScheduledReportConfig
    team_id: str
    user_id: str


class ReportResult(BaseModel):
    report_id: str
    name: str
    generated_at: datetime
    date_range: Dict[str, str]
    metrics: List[str]
    dimensions: List[str]
    data: List[Dict[str, Any]]
    totals: Optional[Dict[str, Any]] = None
    comparison: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}


class ReportJob(BaseModel):
    id: str
    team_id: str
    user_id: str
    config: ReportConfig
    status: str  # pending, processing, completed, failed
    progress: int = 0
    result_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
