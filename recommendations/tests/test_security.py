from __future__ import annotations

import httpx
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from recommendations.security import (
    AuthContext,
    AuthServiceClient,
    AuthServiceUnauthorized,
    AuthServiceUnavailable,
    extract_bearer_token,
    get_authenticated_user,
)


@pytest.mark.asyncio
async def test_auth_service_client_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer demo-token"
        payload = {"id": 7, "name": "Demo", "email": "demo@example.com", "is_verified": True}
        return httpx.Response(200, json=payload)

    client = AuthServiceClient(
        base_url="http://auth.local",
        transport=httpx.MockTransport(handler),
    )

    context = await client.verify_token("demo-token")

    assert context.user_id == 7
    assert context.bearer_token == "Bearer demo-token"
    assert context.email == "demo@example.com"


@pytest.mark.asyncio
async def test_auth_service_client_handles_unauthorized():
    client = AuthServiceClient(
        base_url="http://auth.local",
        transport=httpx.MockTransport(lambda _: httpx.Response(401)),
    )

    with pytest.raises(AuthServiceUnauthorized):
        await client.verify_token("bad")


@pytest.mark.asyncio
async def test_auth_service_client_handles_unavailable():
    client = AuthServiceClient(
        base_url="http://auth.local",
        transport=httpx.MockTransport(lambda _: httpx.Response(503)),
    )

    with pytest.raises(AuthServiceUnavailable):
        await client.verify_token("any")


def test_extract_bearer_token_validates_header():
    with pytest.raises(HTTPException):
        extract_bearer_token(None)
    with pytest.raises(HTTPException):
        extract_bearer_token("Token abc")
    assert extract_bearer_token("Bearer abc123") == "abc123"


@pytest.mark.asyncio
async def test_get_authenticated_user_caches_context(monkeypatch: pytest.MonkeyPatch):
    class DummyClient:
        def __init__(self) -> None:
            self.calls = 0

        async def verify_token(self, token: str) -> AuthContext:
            self.calls += 1
            return AuthContext(
                user_id=1,
                name="Demo",
                email="demo@example.com",
                is_verified=True,
                bearer_token=f"Bearer {token}",
            )

    dummy = DummyClient()
    monkeypatch.setattr("recommendations.security.auth.get_auth_client", lambda: dummy)

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/recommendations/query",
        "headers": [(b"authorization", b"Bearer cached")],
    }
    request = Request(scope)
    request.state.request_id = "req-123"

    ctx1 = await get_authenticated_user(request)
    ctx2 = await get_authenticated_user(request)

    assert dummy.calls == 1
    assert ctx1 is ctx2
    assert ctx1.request_id == "req-123"


@pytest.mark.asyncio
async def test_get_authenticated_user_maps_errors(monkeypatch: pytest.MonkeyPatch):
    class UnauthorizedClient:
        async def verify_token(self, token: str) -> AuthContext:  # pragma: no cover - stub
            raise AuthServiceUnauthorized("nope")

    monkeypatch.setattr("recommendations.security.auth.get_auth_client", lambda: UnauthorizedClient())
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/recommendations/query",
            "headers": [(b"authorization", b"Bearer nope")],
        }
    )

    with pytest.raises(HTTPException) as exc:
        await get_authenticated_user(request)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_authenticated_user_handles_unavailable(monkeypatch: pytest.MonkeyPatch):
    class DownClient:
        async def verify_token(self, token: str) -> AuthContext:  # pragma: no cover - stub
            raise AuthServiceUnavailable("down")

    monkeypatch.setattr("recommendations.security.auth.get_auth_client", lambda: DownClient())
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/recommendations/query",
            "headers": [(b"authorization", b"Bearer nope")],
        }
    )

    with pytest.raises(HTTPException) as exc:
        await get_authenticated_user(request)
    assert exc.value.status_code == 503
