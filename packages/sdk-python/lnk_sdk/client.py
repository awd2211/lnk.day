"""Main client for lnk-sdk."""

from typing import Optional
from .http import HttpClient
from .modules import (
    LinksModule,
    CampaignsModule,
    QRModule,
    AnalyticsModule,
    WebhooksModule,
    TeamsModule,
)


class LnkClient:
    """
    Official Python client for lnk.day API.

    Usage:
        # Using API key (recommended for server-side)
        client = LnkClient(api_key="your-api-key")

        # Using access token (for client-side)
        client = LnkClient(access_token="your-access-token")

        # Create a short link
        link = client.links.create(CreateLinkParams(
            original_url="https://example.com/very-long-url",
            custom_code="my-link",
        ))
        print(link.short_url)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        base_url: str = "https://api.lnk.day",
        timeout: float = 30.0,
    ):
        """
        Initialize the LnkClient.

        Args:
            api_key: API key for authentication (recommended for server-side)
            access_token: Access token for authentication (for client-side)
            base_url: Base URL for the API
            timeout: Request timeout in seconds
        """
        self._http = HttpClient(
            base_url=base_url,
            api_key=api_key,
            access_token=access_token,
            timeout=timeout,
        )

        # Initialize modules
        self.links = LinksModule(self._http)
        self.campaigns = CampaignsModule(self._http)
        self.qr = QRModule(self._http)
        self.analytics = AnalyticsModule(self._http)
        self.webhooks = WebhooksModule(self._http)
        self.teams = TeamsModule(self._http)

    def set_access_token(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
    ) -> None:
        """Set the access token for authentication."""
        self._http.set_tokens(access_token, refresh_token)

    def clear_auth(self) -> None:
        """Clear authentication tokens."""
        self._http.clear_tokens()

    @classmethod
    def from_api_key(
        cls,
        api_key: str,
        base_url: str = "https://api.lnk.day",
        timeout: float = 30.0,
    ) -> "LnkClient":
        """Create a client using an API key."""
        return cls(api_key=api_key, base_url=base_url, timeout=timeout)

    @classmethod
    def from_access_token(
        cls,
        access_token: str,
        base_url: str = "https://api.lnk.day",
        timeout: float = 30.0,
    ) -> "LnkClient":
        """Create a client using an access token."""
        return cls(access_token=access_token, base_url=base_url, timeout=timeout)

    def close(self) -> None:
        """Close the HTTP client."""
        self._http.close()

    async def aclose(self) -> None:
        """Close the HTTP client asynchronously."""
        await self._http.aclose()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.aclose()
