"""Teams module for lnk-sdk."""

from typing import Any, Dict, List, Optional
from ..http import HttpClient
from ..types import (
    Team,
    TeamMember,
    InviteParams,
    PaginationParams,
    PaginatedResponse,
    PaginationMeta,
)


class TeamsModule:
    """Module for managing teams."""

    def __init__(self, http: HttpClient):
        self._http = http

    def create(self, name: str, slug: Optional[str] = None) -> Team:
        """Create a new team."""
        data = self._http.post("/teams", {"name": name, "slug": slug})
        return Team(**data)

    def get(self, team_id: str) -> Team:
        """Get a team by ID."""
        data = self._http.get(f"/teams/{team_id}")
        return Team(**data)

    def update(
        self, team_id: str, name: Optional[str] = None, slug: Optional[str] = None
    ) -> Team:
        """Update a team."""
        data = self._http.patch(f"/teams/{team_id}", {"name": name, "slug": slug})
        return Team(**data)

    def delete(self, team_id: str) -> None:
        """Delete a team."""
        self._http.delete(f"/teams/{team_id}")

    def list(
        self, pagination: Optional[PaginationParams] = None
    ) -> PaginatedResponse[Team]:
        """List teams."""
        params = pagination.model_dump(exclude_none=True) if pagination else {}
        data = self._http.get("/teams", params)
        return PaginatedResponse[Team](
            data=[Team(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def get_members(
        self, team_id: str, pagination: Optional[PaginationParams] = None
    ) -> PaginatedResponse[TeamMember]:
        """Get team members."""
        params = pagination.model_dump(exclude_none=True) if pagination else {}
        data = self._http.get(f"/teams/{team_id}/members", params)
        return PaginatedResponse[TeamMember](
            data=[TeamMember(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def get_member(self, team_id: str, member_id: str) -> TeamMember:
        """Get a team member."""
        data = self._http.get(f"/teams/{team_id}/members/{member_id}")
        return TeamMember(**data)

    def update_member_role(
        self, team_id: str, member_id: str, role: str
    ) -> TeamMember:
        """Update a team member's role."""
        data = self._http.patch(
            f"/teams/{team_id}/members/{member_id}", {"role": role}
        )
        return TeamMember(**data)

    def remove_member(self, team_id: str, member_id: str) -> None:
        """Remove a team member."""
        self._http.delete(f"/teams/{team_id}/members/{member_id}")

    def invite(self, team_id: str, params: InviteParams) -> Dict[str, Any]:
        """Invite a member to the team."""
        return self._http.post(
            f"/teams/{team_id}/invitations", params.model_dump(exclude_none=True)
        )

    def bulk_invite(
        self, team_id: str, invites: List[InviteParams]
    ) -> Dict[str, Any]:
        """Bulk invite members."""
        return self._http.post(
            f"/teams/{team_id}/invitations/bulk",
            {"invites": [i.model_dump(exclude_none=True) for i in invites]},
        )

    def get_invitations(
        self, team_id: str, pagination: Optional[PaginationParams] = None
    ) -> Dict[str, Any]:
        """Get team invitations."""
        params = pagination.model_dump(exclude_none=True) if pagination else {}
        return self._http.get(f"/teams/{team_id}/invitations", params)

    def cancel_invitation(self, team_id: str, invitation_id: str) -> None:
        """Cancel an invitation."""
        self._http.delete(f"/teams/{team_id}/invitations/{invitation_id}")

    def resend_invitation(self, team_id: str, invitation_id: str) -> Dict[str, Any]:
        """Resend an invitation."""
        return self._http.post(
            f"/teams/{team_id}/invitations/{invitation_id}/resend"
        )

    def accept_invitation(self, token: str) -> Dict[str, Any]:
        """Accept an invitation."""
        return self._http.post("/teams/invitations/accept", {"token": token})

    def get_settings(self, team_id: str) -> Dict[str, Any]:
        """Get team settings."""
        return self._http.get(f"/teams/{team_id}/settings")

    def update_settings(
        self, team_id: str, settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update team settings."""
        return self._http.patch(f"/teams/{team_id}/settings", settings)

    def get_usage(self, team_id: str) -> Dict[str, Any]:
        """Get team usage statistics."""
        return self._http.get(f"/teams/{team_id}/usage")

    def transfer_ownership(self, team_id: str, new_owner_id: str) -> Team:
        """Transfer team ownership."""
        data = self._http.post(
            f"/teams/{team_id}/transfer-ownership", {"newOwnerId": new_owner_id}
        )
        return Team(**data)

    def leave(self, team_id: str) -> None:
        """Leave a team."""
        self._http.post(f"/teams/{team_id}/leave")

    def get_api_keys(self, team_id: str) -> List[Dict[str, Any]]:
        """Get team API keys."""
        return self._http.get(f"/teams/{team_id}/api-keys")

    def create_api_key(
        self, team_id: str, name: str, expires_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an API key."""
        return self._http.post(
            f"/teams/{team_id}/api-keys", {"name": name, "expiresAt": expires_at}
        )

    def delete_api_key(self, team_id: str, key_id: str) -> None:
        """Delete an API key."""
        self._http.delete(f"/teams/{team_id}/api-keys/{key_id}")

    # Async methods
    async def acreate(self, name: str, slug: Optional[str] = None) -> Team:
        data = await self._http.apost("/teams", {"name": name, "slug": slug})
        return Team(**data)

    async def aget(self, team_id: str) -> Team:
        data = await self._http.aget(f"/teams/{team_id}")
        return Team(**data)
