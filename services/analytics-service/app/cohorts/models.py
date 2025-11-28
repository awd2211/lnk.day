"""
Cohort Analysis Models
Provides user cohort tracking, retention analysis, and behavioral segmentation
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class CohortType(str, Enum):
    """Type of cohort grouping"""
    ACQUISITION = "acquisition"  # First visit/click date
    BEHAVIORAL = "behavioral"    # Based on specific action
    ATTRIBUTE = "attribute"      # Based on user attribute
    CAMPAIGN = "campaign"        # Based on campaign/source
    CUSTOM = "custom"           # Custom cohort definition


class CohortGranularity(str, Enum):
    """Time granularity for cohort analysis"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class CohortMetric(str, Enum):
    """Metrics for cohort analysis"""
    RETENTION = "retention"
    CLICKS = "clicks"
    UNIQUE_VISITORS = "unique_visitors"
    CONVERSIONS = "conversions"
    REVENUE = "revenue"
    QR_SCANS = "qr_scans"
    PAGE_VIEWS = "page_views"


class CohortCondition(BaseModel):
    """Condition for defining cohort membership"""
    field: str  # e.g., "country", "device", "source", "campaign_id"
    operator: str  # "equals", "contains", "in", "not_equals", "between"
    value: Any


class CohortPeriod(BaseModel):
    """Data for a single cohort period"""
    period: int  # Period number (0 = cohort week/month, 1 = week/month after, etc.)
    period_label: str  # Human-readable label (e.g., "Week 0", "Month 1")

    # User counts
    users: int  # Users active in this period
    retained_users: int  # Users from original cohort still active
    new_users: int  # New users in this period (for comparison)

    # Rates
    retention_rate: float  # Percentage retained from cohort start
    churn_rate: float  # Percentage lost

    # Activity metrics
    total_clicks: int = 0
    total_conversions: int = 0
    avg_clicks_per_user: float = 0

    # Revenue (if applicable)
    total_revenue: Optional[float] = None
    avg_revenue_per_user: Optional[float] = None


class CohortRow(BaseModel):
    """A single cohort row (users acquired in a specific period)"""
    cohort_id: str  # Identifier for this cohort
    cohort_start: datetime  # Start of cohort period
    cohort_label: str  # Human-readable (e.g., "Jan 2024", "Week 1")

    # Initial cohort size
    initial_size: int

    # Retention data for each subsequent period
    periods: List[CohortPeriod]

    # Breakdown by dimension
    by_country: Optional[Dict[str, int]] = None
    by_device: Optional[Dict[str, int]] = None
    by_source: Optional[Dict[str, int]] = None


class Cohort(BaseModel):
    """Cohort definition"""
    id: str
    team_id: str
    name: str
    description: Optional[str] = None

    # Cohort type and definition
    type: CohortType = CohortType.ACQUISITION
    granularity: CohortGranularity = CohortGranularity.WEEKLY

    # For behavioral/custom cohorts - the action that defines cohort entry
    entry_event: Optional[str] = None  # e.g., "first_click", "first_conversion"
    entry_conditions: List[CohortCondition] = []

    # Return event - what counts as "returning"
    return_event: str = "click"  # What action counts as returning
    return_conditions: List[CohortCondition] = []

    # Filters
    filters: Optional[Dict[str, Any]] = None

    # Settings
    periods_to_track: int = 12  # Number of periods to track after cohort formation
    include_incomplete_periods: bool = False  # Include current incomplete period

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    is_active: bool = True


class CohortCreate(BaseModel):
    """Create cohort request"""
    name: str
    description: Optional[str] = None
    type: CohortType = CohortType.ACQUISITION
    granularity: CohortGranularity = CohortGranularity.WEEKLY
    entry_event: Optional[str] = None
    entry_conditions: List[CohortCondition] = []
    return_event: str = "click"
    return_conditions: List[CohortCondition] = []
    filters: Optional[Dict[str, Any]] = None
    periods_to_track: int = 12


class CohortUpdate(BaseModel):
    """Update cohort request"""
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[CohortType] = None
    granularity: Optional[CohortGranularity] = None
    entry_event: Optional[str] = None
    entry_conditions: Optional[List[CohortCondition]] = None
    return_event: Optional[str] = None
    return_conditions: Optional[List[CohortCondition]] = None
    filters: Optional[Dict[str, Any]] = None
    periods_to_track: Optional[int] = None
    is_active: Optional[bool] = None


class RetentionData(BaseModel):
    """Retention matrix data"""
    # Matrix where rows are cohorts, columns are periods
    # Value at [i][j] is retention rate for cohort i at period j
    matrix: List[List[float]]

    # Row labels (cohort periods)
    row_labels: List[str]

    # Column labels (retention periods)
    column_labels: List[str]

    # Average retention for each period (across all cohorts)
    period_averages: List[float]

    # Best/worst performing cohorts
    best_cohort: Optional[str] = None
    worst_cohort: Optional[str] = None


class CohortAnalysis(BaseModel):
    """Complete cohort analysis result"""
    cohort_id: str
    cohort_name: str

    # Analysis parameters
    start_date: datetime
    end_date: datetime
    granularity: CohortGranularity
    metric: CohortMetric = CohortMetric.RETENTION

    # Cohort data
    cohorts: List[CohortRow]

    # Retention matrix (for easy visualization)
    retention_matrix: RetentionData

    # Summary statistics
    total_users: int
    average_retention_period1: float  # Average retention at period 1
    average_retention_period4: float  # Average retention at period 4
    average_retention_period12: float  # Average retention at period 12

    # Trends
    retention_trend: str  # "improving", "declining", "stable"
    trend_percentage: float  # % change in retention over time

    # Breakdown
    by_country: Optional[List[Dict[str, Any]]] = None
    by_device: Optional[List[Dict[str, Any]]] = None
    by_source: Optional[List[Dict[str, Any]]] = None


class CohortComparison(BaseModel):
    """Compare cohort performance across segments or time periods"""
    base_cohort: CohortAnalysis
    comparison_cohort: CohortAnalysis

    # Differences
    retention_difference: List[float]  # Difference at each period
    average_retention_difference: float

    # Statistical significance
    is_significant: bool = False
    confidence_level: Optional[float] = None

    # Insights
    insights: List[str] = []


class CohortSegment(BaseModel):
    """Segment within a cohort for detailed analysis"""
    segment_name: str
    segment_value: str

    user_count: int
    percentage_of_cohort: float

    retention_rates: List[float]  # Retention at each period
    avg_retention: float

    # Comparison to overall cohort
    retention_vs_average: float  # +/- percentage points


class CohortInsight(BaseModel):
    """Automated insight about cohort behavior"""
    insight_type: str  # "high_retention", "churn_spike", "seasonal_pattern", etc.
    title: str
    description: str
    severity: str  # "info", "warning", "critical"

    # Related data
    affected_cohorts: List[str] = []
    affected_periods: List[int] = []

    # Recommendations
    recommendations: List[str] = []


class CohortExportRequest(BaseModel):
    """Request to export cohort data"""
    cohort_id: str
    format: str = "csv"  # "csv", "xlsx", "json"
    include_raw_data: bool = False
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None


class PresetCohort(BaseModel):
    """Preset cohort template"""
    id: str
    name: str
    description: str
    type: CohortType
    granularity: CohortGranularity
    entry_event: Optional[str]
    return_event: str
