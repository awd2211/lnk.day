"""
lnk-sdk - Official Python SDK for lnk.day link management platform.

Usage:
    from lnk_sdk import LnkClient

    client = LnkClient(api_key="your-api-key")
    link = client.links.create(original_url="https://example.com")
    print(link.short_url)
"""

from .client import LnkClient
from .types import (
    Link,
    CreateLinkParams,
    UpdateLinkParams,
    Campaign,
    CreateCampaignParams,
    QRCode,
    CreateQRCodeParams,
    Team,
    TeamMember,
    Webhook,
    AnalyticsSummary,
    PaginatedResponse,
    ApiError,
)

__version__ = "1.0.0"
__all__ = [
    "LnkClient",
    "Link",
    "CreateLinkParams",
    "UpdateLinkParams",
    "Campaign",
    "CreateCampaignParams",
    "QRCode",
    "CreateQRCodeParams",
    "Team",
    "TeamMember",
    "Webhook",
    "AnalyticsSummary",
    "PaginatedResponse",
    "ApiError",
]
