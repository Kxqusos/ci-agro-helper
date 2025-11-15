"""Security helpers for the recommendations service."""

from .auth import (
    AuthContext,
    AuthServiceClient,
    AuthServiceError,
    AuthServiceUnauthorized,
    AuthServiceUnavailable,
    extract_bearer_token,
    get_auth_client,
    get_authenticated_user,
)

__all__ = [
    "AuthContext",
    "AuthServiceClient",
    "AuthServiceError",
    "AuthServiceUnauthorized",
    "AuthServiceUnavailable",
    "extract_bearer_token",
    "get_auth_client",
    "get_authenticated_user",
]
