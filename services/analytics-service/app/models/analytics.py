from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ClickEvent(BaseModel):
    id: str
    link_id: str
    short_code: str
    timestamp: datetime
    ip: str
    user_agent: str
    referer: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    device: str
    browser: str
    os: str


class AnalyticsQuery(BaseModel):
    link_id: Optional[str] = None
    team_id: Optional[str] = None
    start_date: datetime
    end_date: datetime
    granularity: str = "day"  # hour, day, week, month


class ClickStats(BaseModel):
    total_clicks: int
    unique_clicks: int
    period: str


class TimeSeriesData(BaseModel):
    timestamp: datetime
    clicks: int


class GeoStats(BaseModel):
    country: str
    clicks: int
    percentage: float


class DeviceStats(BaseModel):
    device: str
    clicks: int
    percentage: float


class BrowserStats(BaseModel):
    browser: str
    clicks: int
    percentage: float


class AnalyticsResponse(BaseModel):
    total_clicks: int
    unique_clicks: int
    time_series: List[TimeSeriesData]
    geo_distribution: List[GeoStats]
    device_distribution: List[DeviceStats]
    browser_distribution: List[BrowserStats]
    top_referers: List[dict]
