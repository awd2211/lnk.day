"""Webhooks module for lnk-sdk."""

import hashlib
import hmac
from typing import Any, Dict, List, Optional, Union
from ..http import HttpClient
from ..types import (
    Webhook,
    CreateWebhookParams,
    UpdateWebhookParams,
    PaginationParams,
    PaginatedResponse,
    PaginationMeta,
)


class WebhooksModule:
    """Module for managing webhooks."""

    def __init__(self, http: HttpClient):
        self._http = http

    def create(self, params: CreateWebhookParams) -> Webhook:
        """Create a webhook."""
        data = self._http.post("/webhooks", params.model_dump(exclude_none=True))
        return Webhook(**data)

    def get(self, webhook_id: str) -> Webhook:
        """Get a webhook by ID."""
        data = self._http.get(f"/webhooks/{webhook_id}")
        return Webhook(**data)

    def update(self, webhook_id: str, params: UpdateWebhookParams) -> Webhook:
        """Update a webhook."""
        data = self._http.patch(
            f"/webhooks/{webhook_id}", params.model_dump(exclude_none=True)
        )
        return Webhook(**data)

    def delete(self, webhook_id: str) -> None:
        """Delete a webhook."""
        self._http.delete(f"/webhooks/{webhook_id}")

    def list(
        self, pagination: Optional[PaginationParams] = None
    ) -> PaginatedResponse[Webhook]:
        """List webhooks."""
        params = pagination.model_dump(exclude_none=True) if pagination else {}
        data = self._http.get("/webhooks", params)
        return PaginatedResponse[Webhook](
            data=[Webhook(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def enable(self, webhook_id: str) -> Webhook:
        """Enable a webhook."""
        data = self._http.post(f"/webhooks/{webhook_id}/enable")
        return Webhook(**data)

    def disable(self, webhook_id: str) -> Webhook:
        """Disable a webhook."""
        data = self._http.post(f"/webhooks/{webhook_id}/disable")
        return Webhook(**data)

    def rotate_secret(self, webhook_id: str) -> Dict[str, str]:
        """Rotate webhook secret."""
        return self._http.post(f"/webhooks/{webhook_id}/rotate-secret")

    def test(
        self, webhook_id: str, event: Optional[str] = None
    ) -> Dict[str, Any]:
        """Test a webhook."""
        return self._http.post(f"/webhooks/{webhook_id}/test", {"event": event})

    def get_deliveries(
        self, webhook_id: str, pagination: Optional[PaginationParams] = None
    ) -> Dict[str, Any]:
        """Get webhook deliveries."""
        params = pagination.model_dump(exclude_none=True) if pagination else {}
        return self._http.get(f"/webhooks/{webhook_id}/deliveries", params)

    def get_delivery(self, webhook_id: str, delivery_id: str) -> Dict[str, Any]:
        """Get a specific webhook delivery."""
        return self._http.get(f"/webhooks/{webhook_id}/deliveries/{delivery_id}")

    def retry_delivery(self, webhook_id: str, delivery_id: str) -> Dict[str, Any]:
        """Retry a failed webhook delivery."""
        return self._http.post(
            f"/webhooks/{webhook_id}/deliveries/{delivery_id}/retry"
        )

    def get_available_events(self) -> List[Dict[str, Any]]:
        """Get available webhook events."""
        return self._http.get("/webhooks/events")

    @staticmethod
    def verify_signature(
        payload: Union[str, bytes],
        signature: str,
        secret: str,
    ) -> bool:
        """
        Verify a webhook signature.

        Args:
            payload: The raw request body
            signature: The signature from X-Lnk-Signature header
            secret: The webhook secret

        Returns:
            True if signature is valid, False otherwise
        """
        if isinstance(payload, str):
            payload = payload.encode("utf-8")

        expected_signature = hmac.new(
            secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(f"sha256={expected_signature}", signature)

    # Async methods
    async def acreate(self, params: CreateWebhookParams) -> Webhook:
        data = await self._http.apost("/webhooks", params.model_dump(exclude_none=True))
        return Webhook(**data)

    async def aget(self, webhook_id: str) -> Webhook:
        data = await self._http.aget(f"/webhooks/{webhook_id}")
        return Webhook(**data)
