from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache

import httpx
from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


class AuthServiceError(RuntimeError):
    """Base error for communication issues with auth_service."""


class AuthServiceUnavailable(AuthServiceError):
    """Raised when auth_service cannot be reached or responds with 5xx."""


class AuthServiceUnauthorized(AuthServiceError):
    """Raised when auth_service rejects the provided token."""


@dataclass(slots=True)
class AuthContext:
    user_id: int
    name: str | None
    email: str | None
    is_verified: bool
    bearer_token: str
    request_id: str | None = None


class AuthServiceClient:
    """Minimal async HTTP client for delegating token validation to auth_service."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout: float = 2.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._transport = transport

    async def verify_token(self, token: str) -> AuthContext:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        url = f"{self._base_url}/me"
        try:
            async with httpx.AsyncClient(timeout=self._timeout, transport=self._transport) as client:
                response = await client.get(url, headers=headers)
        except httpx.HTTPError as exc:  # pragma: no cover - network safety net
            logger.warning("Auth service is unavailable: %s", exc)
            raise AuthServiceUnavailable("Сервис авторизации временно недоступен") from exc

        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise AuthServiceUnauthorized("auth_service rejected provided token")
        if response.status_code >= 500:
            raise AuthServiceUnavailable(
                f"auth_service returned {response.status_code}"
            )
        if response.status_code >= 400:
            raise AuthServiceError(
                f"auth_service responded with {response.status_code}: {response.text[:200]}"
            )

        payload = response.json()
        user_id = payload.get("id")
        if user_id is None:
            raise AuthServiceError("auth_service response missing 'id'")

        return AuthContext(
            user_id=int(user_id),
            name=payload.get("name"),
            email=payload.get("email"),
            is_verified=bool(payload.get("is_verified", False)),
            bearer_token=f"Bearer {token}",
        )


def _resolve_base_url() -> str:
    return (os.getenv("AUTH_SERVICE_BASE_URL") or "http://auth:8000").rstrip("/")


@lru_cache(maxsize=1)
def get_auth_client() -> AuthServiceClient:
    timeout_raw = os.getenv("AUTH_SERVICE_TIMEOUT", "2.0")
    try:
        timeout = float(timeout_raw)
    except ValueError:
        timeout = 2.0
    return AuthServiceClient(base_url=_resolve_base_url(), timeout=timeout)


def extract_bearer_token(auth_header: str | None) -> str:
    if not auth_header:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Заголовок Authorization обязателен.",
        )
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Используйте формат Authorization: Bearer <token>.",
        )
    return token.strip()


async def get_authenticated_user(request: Request) -> AuthContext:
    cached: AuthContext | None = getattr(request.state, "auth_context", None)
    if cached is not None:
        return cached

    token = extract_bearer_token(request.headers.get("Authorization"))
    client = get_auth_client()
    try:
        context = await client.verify_token(token)
    except AuthServiceUnauthorized as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истёкший токен.",
        ) from exc
    except AuthServiceUnavailable as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервис авторизации временно недоступен. Повторите запрос позже.",
        ) from exc

    context.request_id = getattr(request.state, "request_id", None)
    request.state.auth_context = context
    return context


__all__ = [
    "AuthContext",
    "AuthServiceClient",
    "AuthServiceError",
    "AuthServiceUnavailable",
    "AuthServiceUnauthorized",
    "get_auth_client",
    "extract_bearer_token",
    "get_authenticated_user",
]
