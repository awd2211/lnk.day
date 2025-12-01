from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class CamelModel(BaseModel):
    """Base model with camelCase serialization"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


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


class ClickStats(CamelModel):
    total_clicks: int
    unique_clicks: int
    period: str


class TimeSeriesData(CamelModel):
    timestamp: datetime
    clicks: int


class GeoStats(CamelModel):
    country: str
    clicks: int
    percentage: float


class DeviceStats(CamelModel):
    device: str
    clicks: int
    percentage: float


class BrowserStats(CamelModel):
    browser: str
    clicks: int
    percentage: float


class AnalyticsResponse(CamelModel):
    total_clicks: int
    unique_clicks: int
    time_series: List[TimeSeriesData]
    geo_distribution: List[GeoStats]
    device_distribution: List[DeviceStats]
    browser_distribution: List[BrowserStats]
    top_referers: List[dict]
