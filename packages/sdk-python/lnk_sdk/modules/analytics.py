"""Analytics module for lnk-sdk."""

from typing import Any, Dict, List, Optional
from ..http import HttpClient
from ..types import AnalyticsSummary, TimeSeriesData, ClickEvent, PaginationMeta


class AnalyticsModule:
    """Module for analytics operations."""

    def __init__(self, http: HttpClient):
        self._http = http

    def get_summary(
        self,
        start_date: str,
        end_date: str,
        link_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
    ) -> AnalyticsSummary:
        """Get analytics summary."""
        data = self._http.get(
            "/analytics/summary",
            {
                "startDate": start_date,
                "endDate": end_date,
                "linkId": link_id,
                "campaignId": campaign_id,
            },
        )
        return AnalyticsSummary(**data)

    def get_timeseries(
        self,
        start_date: str,
        end_date: str,
        granularity: str = "day",
        link_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
    ) -> List[TimeSeriesData]:
        """Get time series analytics data."""
        data = self._http.get(
            "/analytics/timeseries",
            {
                "startDate": start_date,
                "endDate": end_date,
                "granularity": granularity,
                "linkId": link_id,
                "campaignId": campaign_id,
            },
        )
        return [TimeSeriesData(**item) for item in data]

    def get_clicks(
        self,
        start_date: str,
        end_date: str,
        link_id: Optional[str] = None,
        page: int = 1,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Get click events."""
        data = self._http.get(
            "/analytics/clicks",
            {
                "startDate": start_date,
                "endDate": end_date,
                "linkId": link_id,
                "page": page,
                "limit": limit,
            },
        )
        return {
            "data": [ClickEvent(**item) for item in data["data"]],
            "meta": PaginationMeta(**data["meta"]),
        }

    def get_realtime(self, link_id: Optional[str] = None) -> Dict[str, Any]:
        """Get real-time analytics."""
        return self._http.get("/analytics/realtime", {"linkId": link_id})

    def get_geo_data(
        self,
        start_date: str,
        end_date: str,
        link_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get geographic analytics data."""
        return self._http.get(
            "/analytics/geo",
            {"startDate": start_date, "endDate": end_date, "linkId": link_id},
        )

    def get_device_data(
        self,
        start_date: str,
        end_date: str,
        link_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get device analytics data."""
        return self._http.get(
            "/analytics/devices",
            {"startDate": start_date, "endDate": end_date, "linkId": link_id},
        )

    def get_referrer_data(
        self,
        start_date: str,
        end_date: str,
        link_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get referrer analytics data."""
        return self._http.get(
            "/analytics/referrers",
            {"startDate": start_date, "endDate": end_date, "linkId": link_id},
        )

    def get_top_links(
        self,
        start_date: str,
        end_date: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Get top performing links."""
        return self._http.get(
            "/analytics/top-links",
            {"startDate": start_date, "endDate": end_date, "limit": limit},
        )

    def get_utm_breakdown(
        self,
        start_date: str,
        end_date: str,
        group_by: str = "source",
    ) -> List[Dict[str, Any]]:
        """Get UTM parameter breakdown."""
        return self._http.get(
            "/analytics/utm",
            {"startDate": start_date, "endDate": end_date, "groupBy": group_by},
        )

    def export(
        self,
        start_date: str,
        end_date: str,
        format: str = "csv",
        link_id: Optional[str] = None,
    ) -> bytes:
        """Export analytics data."""
        return self._http.get(
            "/analytics/export",
            {
                "startDate": start_date,
                "endDate": end_date,
                "format": format,
                "linkId": link_id,
            },
        )

    def create_report(
        self,
        name: str,
        start_date: str,
        end_date: str,
        format: str = "csv",
        schedule: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create an analytics report."""
        return self._http.post(
            "/analytics/reports",
            {
                "name": name,
                "query": {"startDate": start_date, "endDate": end_date},
                "format": format,
                "schedule": schedule,
            },
        )

    def get_report(self, report_id: str) -> Dict[str, Any]:
        """Get a report by ID."""
        return self._http.get(f"/analytics/reports/{report_id}")

    def get_scheduled_reports(self) -> List[Dict[str, Any]]:
        """Get all scheduled reports."""
        return self._http.get("/analytics/reports/scheduled")

    def delete_scheduled_report(self, report_id: str) -> None:
        """Delete a scheduled report."""
        self._http.delete(f"/analytics/reports/scheduled/{report_id}")

    def track_conversion(
        self,
        link_id: str,
        conversion_type: str,
        value: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Track a conversion event."""
        self._http.post(
            "/analytics/conversions",
            {
                "linkId": link_id,
                "type": conversion_type,
                "value": value,
                "metadata": metadata,
            },
        )

    # Async methods
    async def aget_summary(
        self,
        start_date: str,
        end_date: str,
        link_id: Optional[str] = None,
    ) -> AnalyticsSummary:
        data = await self._http.aget(
            "/analytics/summary",
            {"startDate": start_date, "endDate": end_date, "linkId": link_id},
        )
        return AnalyticsSummary(**data)
