"""Type definitions for lnk-sdk."""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


# ========== Common Types ==========


class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 20
    sort_by: Optional[str] = None
    sort_order: str = "desc"


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    has_more: bool


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PaginationMeta


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        message: str,
        error: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        self.status_code = status_code
        self.message = message
        self.error = error
        self.details = details
        super().__init__(message)


# ========== Link Types ==========


class Link(BaseModel):
    id: str
    short_code: str
    short_url: str
    original_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []
    team_id: str
    user_id: str
    campaign_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    is_active: bool = True
    click_count: int = 0
    unique_click_count: int = 0
    last_clicked_at: Optional[datetime] = None
    metadata: Optional[dict] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CreateLinkParams(BaseModel):
    original_url: str
    custom_code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    campaign_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    metadata: Optional[dict] = None


class UpdateLinkParams(BaseModel):
    original_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    campaign_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    metadata: Optional[dict] = None


class LinkFilter(BaseModel):
    search: Optional[str] = None
    tags: Optional[List[str]] = None
    campaign_id: Optional[str] = None
    is_active: Optional[bool] = None
    has_password: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None


# ========== Campaign Types ==========


class Campaign(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    team_id: str
    user_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    status: str = "draft"
    link_count: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    tags: List[str] = []
    metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime


class CreateCampaignParams(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class UpdateCampaignParams(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


# ========== QR Code Types ==========


class QRCode(BaseModel):
    id: str
    link_id: str
    short_url: str
    format: str = "png"
    size: int = 300
    foreground_color: str = "#000000"
    background_color: str = "#FFFFFF"
    logo_url: Optional[str] = None
    error_correction: str = "M"
    scan_count: int = 0
    download_url: str
    created_at: datetime
    updated_at: datetime


class CreateQRCodeParams(BaseModel):
    link_id: str
    format: str = "png"
    size: int = 300
    foreground_color: str = "#000000"
    background_color: str = "#FFFFFF"
    logo_url: Optional[str] = None
    error_correction: str = "M"


class QRCodeStyle(BaseModel):
    foreground_color: Optional[str] = None
    background_color: Optional[str] = None
    logo_url: Optional[str] = None
    corner_radius: Optional[int] = None
    dot_style: Optional[str] = None


# ========== Team Types ==========


class Team(BaseModel):
    id: str
    name: str
    slug: str
    owner_id: str
    plan: str = "free"
    member_count: int = 0
    link_limit: int = 0
    link_usage: int = 0
    created_at: datetime
    updated_at: datetime


class TeamMember(BaseModel):
    id: str
    user_id: str
    team_id: str
    role: str
    email: str
    name: Optional[str] = None
    joined_at: datetime


class InviteParams(BaseModel):
    email: str
    role: str = "member"


# ========== Webhook Types ==========


class Webhook(BaseModel):
    id: str
    team_id: str
    url: str
    events: List[str]
    secret: str
    is_active: bool = True
    last_triggered_at: Optional[datetime] = None
    failure_count: int = 0
    created_at: datetime
    updated_at: datetime


class CreateWebhookParams(BaseModel):
    url: str
    events: List[str]
    secret: Optional[str] = None


class UpdateWebhookParams(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ========== Analytics Types ==========


class AnalyticsSummary(BaseModel):
    total_clicks: int
    unique_visitors: int
    total_conversions: int
    conversion_rate: float
    top_countries: List[dict]
    top_devices: List[dict]
    top_referrers: List[dict]


class TimeSeriesData(BaseModel):
    date: str
    clicks: int
    unique_visitors: int
    conversions: Optional[int] = None


class ClickEvent(BaseModel):
    id: str
    link_id: str
    timestamp: datetime
    country: Optional[str] = None
    city: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    is_unique: bool
    is_conversion: bool
