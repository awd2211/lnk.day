"""Links module for lnk-sdk."""

from typing import Any, Dict, List, Optional
from ..http import HttpClient
from ..types import (
    Link,
    CreateLinkParams,
    UpdateLinkParams,
    LinkFilter,
    PaginationParams,
    PaginatedResponse,
    PaginationMeta,
)


class LinksModule:
    """Module for managing links."""

    def __init__(self, http: HttpClient):
        self._http = http

    def create(self, params: CreateLinkParams) -> Link:
        """Create a new short link."""
        data = self._http.post("/links", params.model_dump(exclude_none=True))
        return Link(**data)

    def get(self, link_id: str) -> Link:
        """Get a link by ID."""
        data = self._http.get(f"/links/{link_id}")
        return Link(**data)

    def get_by_code(self, short_code: str) -> Link:
        """Get a link by short code."""
        data = self._http.get(f"/links/code/{short_code}")
        return Link(**data)

    def update(self, link_id: str, params: UpdateLinkParams) -> Link:
        """Update a link."""
        data = self._http.patch(f"/links/{link_id}", params.model_dump(exclude_none=True))
        return Link(**data)

    def delete(self, link_id: str) -> None:
        """Delete a link."""
        self._http.delete(f"/links/{link_id}")

    def list(
        self,
        filter: Optional[LinkFilter] = None,
        pagination: Optional[PaginationParams] = None,
    ) -> PaginatedResponse[Link]:
        """List links with optional filters and pagination."""
        params: Dict[str, Any] = {}
        if filter:
            params.update(filter.model_dump(exclude_none=True))
        if pagination:
            params.update(pagination.model_dump(exclude_none=True))

        data = self._http.get("/links", params)
        return PaginatedResponse[Link](
            data=[Link(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def bulk_create(
        self, links: List[CreateLinkParams]
    ) -> Dict[str, Any]:
        """Bulk create links."""
        data = self._http.post(
            "/links/bulk",
            {"links": [l.model_dump(exclude_none=True) for l in links]},
        )
        return {
            "created": [Link(**item) for item in data.get("created", [])],
            "failed": data.get("failed", []),
        }

    def bulk_delete(self, link_ids: List[str]) -> Dict[str, Any]:
        """Bulk delete links."""
        return self._http.post("/links/bulk-delete", {"linkIds": link_ids})

    def bulk_update(
        self, link_ids: List[str], updates: UpdateLinkParams
    ) -> Dict[str, Any]:
        """Bulk update links."""
        return self._http.post(
            "/links/bulk-update",
            {"linkIds": link_ids, "updates": updates.model_dump(exclude_none=True)},
        )

    def archive(self, link_id: str) -> Link:
        """Archive a link."""
        data = self._http.post(f"/links/{link_id}/archive")
        return Link(**data)

    def unarchive(self, link_id: str) -> Link:
        """Unarchive a link."""
        data = self._http.post(f"/links/{link_id}/unarchive")
        return Link(**data)

    def duplicate(self, link_id: str, custom_code: Optional[str] = None) -> Link:
        """Duplicate a link."""
        data = self._http.post(f"/links/{link_id}/duplicate", {"customCode": custom_code})
        return Link(**data)

    def get_stats(self, link_id: str) -> Dict[str, Any]:
        """Get link statistics."""
        return self._http.get(f"/links/{link_id}/stats")

    def validate_url(self, url: str) -> Dict[str, Any]:
        """Validate a URL."""
        return self._http.post("/links/validate-url", {"url": url})

    def check_code_availability(self, code: str) -> Dict[str, Any]:
        """Check if a short code is available."""
        return self._http.get("/links/check-code", {"code": code})

    def add_tags(self, link_id: str, tags: List[str]) -> Link:
        """Add tags to a link."""
        data = self._http.post(f"/links/{link_id}/tags", {"tags": tags})
        return Link(**data)

    def remove_tags(self, link_id: str, tags: List[str]) -> Link:
        """Remove tags from a link."""
        data = self._http.delete(f"/links/{link_id}/tags")
        return Link(**data)

    # Async methods
    async def acreate(self, params: CreateLinkParams) -> Link:
        data = await self._http.apost("/links", params.model_dump(exclude_none=True))
        return Link(**data)

    async def aget(self, link_id: str) -> Link:
        data = await self._http.aget(f"/links/{link_id}")
        return Link(**data)

    async def aupdate(self, link_id: str, params: UpdateLinkParams) -> Link:
        data = await self._http.apatch(
            f"/links/{link_id}", params.model_dump(exclude_none=True)
        )
        return Link(**data)

    async def adelete(self, link_id: str) -> None:
        await self._http.adelete(f"/links/{link_id}")

    async def alist(
        self,
        filter: Optional[LinkFilter] = None,
        pagination: Optional[PaginationParams] = None,
    ) -> PaginatedResponse[Link]:
        params: Dict[str, Any] = {}
        if filter:
            params.update(filter.model_dump(exclude_none=True))
        if pagination:
            params.update(pagination.model_dump(exclude_none=True))

        data = await self._http.aget("/links", params)
        return PaginatedResponse[Link](
            data=[Link(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )
