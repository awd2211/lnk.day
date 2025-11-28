"""
Funnel Analysis Models
Provides conversion funnel tracking and analysis
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class FunnelStepType(str, Enum):
    """Type of funnel step"""
    LINK_CLICK = "link_click"
    QR_SCAN = "qr_scan"
    PAGE_VIEW = "page_view"
    BUTTON_CLICK = "button_click"
    FORM_SUBMIT = "form_submit"
    CONVERSION = "conversion"
    CUSTOM = "custom"


class FunnelStepCondition(BaseModel):
    """Condition for matching a funnel step"""
    field: str  # e.g., "link_id", "page_slug", "event_name"
    operator: str  # "equals", "contains", "starts_with", "regex", "in"
    value: Any  # Value to compare against


class FunnelStep(BaseModel):
    """A single step in the funnel"""
    id: str
    name: str
    description: Optional[str] = None
    type: FunnelStepType
    conditions: List[FunnelStepCondition] = []
    order: int
    optional: bool = False  # If true, users can skip this step
    timeout_minutes: Optional[int] = None  # Max time between this and next step


class Funnel(BaseModel):
    """Funnel definition"""
    id: str
    team_id: str
    name: str
    description: Optional[str] = None
    steps: List[FunnelStep]

    # Settings
    window_days: int = 30  # Attribution window
    strict_order: bool = True  # Whether steps must be completed in order
    count_unique_users: bool = True  # Count unique users vs total events

    # Filters
    filters: Optional[Dict[str, Any]] = None  # Global filters (e.g., country, device)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    is_active: bool = True


class FunnelCreate(BaseModel):
    """Create funnel request"""
    name: str
    description: Optional[str] = None
    steps: List[FunnelStep]
    window_days: int = 30
    strict_order: bool = True
    count_unique_users: bool = True
    filters: Optional[Dict[str, Any]] = None


class FunnelUpdate(BaseModel):
    """Update funnel request"""
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[FunnelStep]] = None
    window_days: Optional[int] = None
    strict_order: Optional[bool] = None
    count_unique_users: Optional[bool] = None
    filters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class FunnelStepStats(BaseModel):
    """Statistics for a single funnel step"""
    step_id: str
    step_name: str
    order: int

    # Counts
    entered: int  # Users/events that reached this step
    completed: int  # Users/events that completed this step
    dropped: int  # Users/events that dropped at this step

    # Rates
    conversion_rate: float  # Completed / Entered
    drop_rate: float  # Dropped / Entered
    overall_conversion: float  # From step 1 to this step

    # Timing
    avg_time_to_complete: Optional[float] = None  # Seconds
    median_time_to_complete: Optional[float] = None  # Seconds


class FunnelAnalysis(BaseModel):
    """Complete funnel analysis result"""
    funnel_id: str
    funnel_name: str

    # Time range
    start_date: datetime
    end_date: datetime

    # Overall stats
    total_started: int  # Users/events that started the funnel
    total_completed: int  # Users/events that completed all steps
    overall_conversion_rate: float

    # Per-step stats
    steps: List[FunnelStepStats]

    # Breakdown data
    by_country: Optional[List[Dict[str, Any]]] = None
    by_device: Optional[List[Dict[str, Any]]] = None
    by_source: Optional[List[Dict[str, Any]]] = None

    # Trends
    daily_conversions: Optional[List[Dict[str, Any]]] = None

    # Drop-off analysis
    top_drop_off_step: Optional[str] = None
    drop_off_reasons: Optional[List[Dict[str, Any]]] = None


class FunnelUser(BaseModel):
    """User journey through a funnel"""
    user_id: str  # Visitor ID or fingerprint
    funnel_id: str

    # Progress
    current_step: int
    completed_steps: List[str]  # Step IDs

    # Timing
    started_at: datetime
    last_activity_at: datetime
    completed_at: Optional[datetime] = None

    # Context
    first_touch_source: Optional[str] = None
    device_type: Optional[str] = None
    country: Optional[str] = None


class FunnelComparison(BaseModel):
    """Compare multiple funnels or time periods"""
    base: FunnelAnalysis
    comparison: FunnelAnalysis

    # Differences
    conversion_rate_change: float  # Percentage point change
    conversion_rate_change_percent: float  # % change

    step_changes: List[Dict[str, Any]]  # Per-step changes


class FunnelAlert(BaseModel):
    """Alert configuration for funnel metrics"""
    id: str
    funnel_id: str

    # Condition
    metric: str  # "conversion_rate", "drop_rate", "completed_count"
    step_id: Optional[str] = None  # If null, applies to overall funnel
    operator: str  # "above", "below", "change_above", "change_below"
    threshold: float

    # Notification
    notification_channels: List[str]  # "email", "slack", "webhook"
    recipients: List[str]

    # Settings
    check_interval_hours: int = 24
    cooldown_hours: int = 24  # Don't alert again within this period

    is_active: bool = True
    last_triggered_at: Optional[datetime] = None


class FunnelEvent(BaseModel):
    """Event that can be part of a funnel"""
    event_id: str
    team_id: str
    visitor_id: str

    event_type: FunnelStepType
    event_name: Optional[str] = None  # For custom events

    # Context
    link_id: Optional[str] = None
    page_slug: Optional[str] = None
    campaign_id: Optional[str] = None

    # Properties
    properties: Dict[str, Any] = {}

    # Attribution
    source: Optional[str] = None
    medium: Optional[str] = None

    # Device/Location
    device_type: Optional[str] = None
    country: Optional[str] = None

    timestamp: datetime = Field(default_factory=datetime.utcnow)
