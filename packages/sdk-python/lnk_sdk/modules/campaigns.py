"""Campaigns module for lnk-sdk."""

from typing import Any, Dict, List, Optional
from ..http import HttpClient
from ..types import (
    Campaign,
    CreateCampaignParams,
    UpdateCampaignParams,
    PaginationParams,
    PaginatedResponse,
    PaginationMeta,
    Link,
)


class CampaignsModule:
    """Module for managing campaigns."""

    def __init__(self, http: HttpClient):
        self._http = http

    def create(self, params: CreateCampaignParams) -> Campaign:
        """Create a new campaign."""
        data = self._http.post("/campaigns", params.model_dump(exclude_none=True))
        return Campaign(**data)

    def get(self, campaign_id: str) -> Campaign:
        """Get a campaign by ID."""
        data = self._http.get(f"/campaigns/{campaign_id}")
        return Campaign(**data)

    def update(self, campaign_id: str, params: UpdateCampaignParams) -> Campaign:
        """Update a campaign."""
        data = self._http.patch(
            f"/campaigns/{campaign_id}", params.model_dump(exclude_none=True)
        )
        return Campaign(**data)

    def delete(self, campaign_id: str) -> None:
        """Delete a campaign."""
        self._http.delete(f"/campaigns/{campaign_id}")

    def list(
        self,
        filter: Optional[Dict[str, Any]] = None,
        pagination: Optional[PaginationParams] = None,
    ) -> PaginatedResponse[Campaign]:
        """List campaigns."""
        params: Dict[str, Any] = {}
        if filter:
            params.update(filter)
        if pagination:
            params.update(pagination.model_dump(exclude_none=True))

        data = self._http.get("/campaigns", params)
        return PaginatedResponse[Campaign](
            data=[Campaign(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def activate(self, campaign_id: str) -> Campaign:
        """Activate a campaign."""
        data = self._http.post(f"/campaigns/{campaign_id}/activate")
        return Campaign(**data)

    def pause(self, campaign_id: str) -> Campaign:
        """Pause a campaign."""
        data = self._http.post(f"/campaigns/{campaign_id}/pause")
        return Campaign(**data)

    def complete(self, campaign_id: str) -> Campaign:
        """Mark campaign as completed."""
        data = self._http.post(f"/campaigns/{campaign_id}/complete")
        return Campaign(**data)

    def archive(self, campaign_id: str) -> Campaign:
        """Archive a campaign."""
        data = self._http.post(f"/campaigns/{campaign_id}/archive")
        return Campaign(**data)

    def duplicate(self, campaign_id: str, name: Optional[str] = None) -> Campaign:
        """Duplicate a campaign."""
        data = self._http.post(f"/campaigns/{campaign_id}/duplicate", {"name": name})
        return Campaign(**data)

    def get_links(
        self, campaign_id: str, pagination: Optional[PaginationParams] = None
    ) -> PaginatedResponse[Link]:
        """Get links in a campaign."""
        params = pagination.model_dump(exclude_none=True) if pagination else {}
        data = self._http.get(f"/campaigns/{campaign_id}/links", params)
        return PaginatedResponse[Link](
            data=[Link(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def add_links(self, campaign_id: str, link_ids: List[str]) -> None:
        """Add links to a campaign."""
        self._http.post(f"/campaigns/{campaign_id}/links", {"linkIds": link_ids})

    def remove_links(self, campaign_id: str, link_ids: List[str]) -> None:
        """Remove links from a campaign."""
        self._http.delete(f"/campaigns/{campaign_id}/links")

    def get_analytics(
        self,
        campaign_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get campaign analytics."""
        return self._http.get(
            f"/campaigns/{campaign_id}/analytics",
            {"startDate": start_date, "endDate": end_date},
        )

    def get_goals(self, campaign_id: str) -> List[Dict[str, Any]]:
        """Get campaign goals."""
        return self._http.get(f"/campaigns/{campaign_id}/goals")

    def create_goal(
        self, campaign_id: str, name: str, goal_type: str, target: int
    ) -> Dict[str, Any]:
        """Create a campaign goal."""
        return self._http.post(
            f"/campaigns/{campaign_id}/goals",
            {"name": name, "type": goal_type, "target": target},
        )

    def update_goal(
        self, campaign_id: str, goal_id: str, updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a campaign goal."""
        return self._http.patch(f"/campaigns/{campaign_id}/goals/{goal_id}", updates)

    def delete_goal(self, campaign_id: str, goal_id: str) -> None:
        """Delete a campaign goal."""
        self._http.delete(f"/campaigns/{campaign_id}/goals/{goal_id}")

    # Async methods
    async def acreate(self, params: CreateCampaignParams) -> Campaign:
        data = await self._http.apost("/campaigns", params.model_dump(exclude_none=True))
        return Campaign(**data)

    async def aget(self, campaign_id: str) -> Campaign:
        data = await self._http.aget(f"/campaigns/{campaign_id}")
        return Campaign(**data)
