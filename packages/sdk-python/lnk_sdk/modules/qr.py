"""QR Code module for lnk-sdk."""

from typing import Any, Dict, List, Optional
from ..http import HttpClient
from ..types import (
    QRCode,
    CreateQRCodeParams,
    QRCodeStyle,
    PaginationParams,
    PaginatedResponse,
    PaginationMeta,
)


class QRModule:
    """Module for managing QR codes."""

    def __init__(self, http: HttpClient):
        self._http = http

    def create(self, params: CreateQRCodeParams) -> QRCode:
        """Create a QR code."""
        data = self._http.post("/qr", params.model_dump(exclude_none=True))
        return QRCode(**data)

    def get(self, qr_id: str) -> QRCode:
        """Get a QR code by ID."""
        data = self._http.get(f"/qr/{qr_id}")
        return QRCode(**data)

    def get_by_link(self, link_id: str) -> List[QRCode]:
        """Get QR codes for a link."""
        data = self._http.get(f"/qr/link/{link_id}")
        return [QRCode(**item) for item in data]

    def delete(self, qr_id: str) -> None:
        """Delete a QR code."""
        self._http.delete(f"/qr/{qr_id}")

    def list(
        self,
        filter: Optional[Dict[str, Any]] = None,
        pagination: Optional[PaginationParams] = None,
    ) -> PaginatedResponse[QRCode]:
        """List QR codes."""
        params: Dict[str, Any] = {}
        if filter:
            params.update(filter)
        if pagination:
            params.update(pagination.model_dump(exclude_none=True))

        data = self._http.get("/qr", params)
        return PaginatedResponse[QRCode](
            data=[QRCode(**item) for item in data["data"]],
            meta=PaginationMeta(**data["meta"]),
        )

    def update_style(self, qr_id: str, style: QRCodeStyle) -> QRCode:
        """Update QR code style."""
        data = self._http.patch(f"/qr/{qr_id}/style", style.model_dump(exclude_none=True))
        return QRCode(**data)

    def regenerate(
        self,
        qr_id: str,
        format: Optional[str] = None,
        size: Optional[int] = None,
    ) -> QRCode:
        """Regenerate a QR code."""
        data = self._http.post(
            f"/qr/{qr_id}/regenerate", {"format": format, "size": size}
        )
        return QRCode(**data)

    def download(self, qr_id: str, format: str = "png") -> bytes:
        """Download a QR code."""
        return self._http.get(f"/qr/{qr_id}/download", {"format": format})

    def bulk_create(self, qr_codes: List[CreateQRCodeParams]) -> Dict[str, Any]:
        """Bulk create QR codes."""
        data = self._http.post(
            "/qr/bulk",
            {"qrCodes": [q.model_dump(exclude_none=True) for q in qr_codes]},
        )
        return {
            "created": [QRCode(**item) for item in data.get("created", [])],
            "failed": data.get("failed", []),
        }

    def bulk_download(self, qr_ids: List[str], format: str = "png") -> bytes:
        """Bulk download QR codes as a zip file."""
        return self._http.post("/qr/bulk-download", {"qrIds": qr_ids, "format": format})

    def get_stats(self, qr_id: str) -> Dict[str, Any]:
        """Get QR code statistics."""
        return self._http.get(f"/qr/{qr_id}/stats")

    def preview(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a preview of a QR code."""
        return self._http.post("/qr/preview", params)

    def get_templates(self) -> List[Dict[str, Any]]:
        """Get available QR code templates."""
        return self._http.get("/qr/templates")

    def save_as_template(self, qr_id: str, name: str) -> Dict[str, Any]:
        """Save a QR code as a template."""
        return self._http.post(f"/qr/{qr_id}/save-template", {"name": name})

    # Async methods
    async def acreate(self, params: CreateQRCodeParams) -> QRCode:
        data = await self._http.apost("/qr", params.model_dump(exclude_none=True))
        return QRCode(**data)

    async def aget(self, qr_id: str) -> QRCode:
        data = await self._http.aget(f"/qr/{qr_id}")
        return QRCode(**data)
