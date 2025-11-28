"""HTTP client for lnk-sdk."""

from typing import Any, Dict, Optional, TypeVar
import httpx
from .types import ApiError

T = TypeVar("T")


class HttpClient:
    """HTTP client with authentication and error handling."""

    def __init__(
        self,
        base_url: str = "https://api.lnk.day",
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.access_token = access_token
        self.refresh_token: Optional[str] = None
        self.timeout = timeout

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=self._get_headers(),
        )
        self._async_client: Optional[httpx.AsyncClient] = None

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "lnk-sdk-python/1.0.0",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        elif self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def set_tokens(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
    ) -> None:
        self.access_token = access_token
        self.refresh_token = refresh_token
        self._client.headers.update({"Authorization": f"Bearer {access_token}"})

    def clear_tokens(self) -> None:
        self.access_token = None
        self.refresh_token = None
        if "Authorization" in self._client.headers:
            del self._client.headers["Authorization"]

    def _handle_response(self, response: httpx.Response) -> Any:
        if response.status_code >= 400:
            try:
                data = response.json()
                raise ApiError(
                    status_code=response.status_code,
                    message=data.get("message", response.text),
                    error=data.get("error"),
                    details=data.get("details"),
                )
            except (ValueError, KeyError):
                raise ApiError(
                    status_code=response.status_code,
                    message=response.text or "Unknown error",
                )

        if response.status_code == 204:
            return None

        try:
            return response.json()
        except ValueError:
            return response.content

    def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        response = self._client.get(url, params=params)
        return self._handle_response(response)

    def post(self, url: str, data: Optional[Dict[str, Any]] = None) -> Any:
        response = self._client.post(url, json=data)
        return self._handle_response(response)

    def put(self, url: str, data: Optional[Dict[str, Any]] = None) -> Any:
        response = self._client.put(url, json=data)
        return self._handle_response(response)

    def patch(self, url: str, data: Optional[Dict[str, Any]] = None) -> Any:
        response = self._client.patch(url, json=data)
        return self._handle_response(response)

    def delete(self, url: str) -> Any:
        response = self._client.delete(url)
        return self._handle_response(response)

    # Async methods
    async def _get_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers=self._get_headers(),
            )
        return self._async_client

    async def aget(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        client = await self._get_async_client()
        response = await client.get(url, params=params)
        return self._handle_response(response)

    async def apost(self, url: str, data: Optional[Dict[str, Any]] = None) -> Any:
        client = await self._get_async_client()
        response = await client.post(url, json=data)
        return self._handle_response(response)

    async def apatch(self, url: str, data: Optional[Dict[str, Any]] = None) -> Any:
        client = await self._get_async_client()
        response = await client.patch(url, json=data)
        return self._handle_response(response)

    async def adelete(self, url: str) -> Any:
        client = await self._get_async_client()
        response = await client.delete(url)
        return self._handle_response(response)

    def close(self) -> None:
        self._client.close()
        if self._async_client:
            # Note: async client should be closed with await
            pass

    async def aclose(self) -> None:
        self._client.close()
        if self._async_client:
            await self._async_client.aclose()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.aclose()
