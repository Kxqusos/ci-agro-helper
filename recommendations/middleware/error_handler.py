from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from recommendations.service import RecommendationServiceError

logger = logging.getLogger("recommendations.errors")


def register_error_handlers(app: FastAPI) -> None:
    """Register a single place to shape and log API errors."""

    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(RecommendationServiceError, _service_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)


async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    error_code = _map_status_to_code(exc.status_code)
    detail = exc.detail if exc.detail else "Неизвестная ошибка."
    _log_error(exc.status_code, error_code, detail, request_id=_request_id(request))
    return _build_error_response(request, exc.status_code, error_code, detail)


async def _validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    detail = "Ошибки валидации входных данных."
    errors = exc.errors()
    _log_error(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "validation.error",
        errors,
        request_id=_request_id(request),
    )
    return _build_error_response(
        request,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "validation.error",
        detail,
        errors=errors,
    )


async def _service_exception_handler(
    request: Request,
    exc: RecommendationServiceError,
) -> JSONResponse:
    detail = str(exc) or "Ошибка сервиса рекомендаций."
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "recommendations.unavailable"
    _log_error(status_code, error_code, detail, request_id=_request_id(request), exc=exc)
    return _build_error_response(request, status_code, error_code, detail)


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:  # pragma: no cover
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "internal.error"
    detail = "Внутренняя ошибка сервиса."
    _log_error(status_code, error_code, detail, request_id=_request_id(request), exc=exc)
    return _build_error_response(request, status_code, error_code, detail)


def _build_error_response(
    request: Request,
    status_code: int,
    error_code: str,
    detail: Any,
    *,
    errors: list[dict[str, Any]] | None = None,
) -> JSONResponse:
    request_id = _request_id(request)
    payload: dict[str, Any] = {
        "request_id": request_id,
        "error": {
            "code": error_code,
            "detail": detail,
        },
    }
    if errors is not None:
        payload["errors"] = errors

    response = JSONResponse(status_code=status_code, content=payload)
    if request_id:
        response.headers["X-Request-ID"] = request_id
    return response


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _log_error(
    status_code: int,
    error_code: str,
    detail: Any,
    *,
    request_id: str | None,
    exc: Exception | None = None,
) -> None:
    level = logging.ERROR if status_code >= 500 else logging.WARNING
    message = "API error code=%s status=%s request_id=%s detail=%s"
    if exc:
        logger.log(level, message, error_code, status_code, request_id, detail, exc_info=exc)
    else:
        logger.log(level, message, error_code, status_code, request_id, detail)


def _map_status_to_code(status_code: int) -> str:
    if status_code == status.HTTP_401_UNAUTHORIZED:
        return "auth.invalid_token"
    if status_code == status.HTTP_403_FORBIDDEN:
        return "auth.forbidden"
    if status_code == status.HTTP_404_NOT_FOUND:
        return "resource.not_found"
    if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return "rate_limit.exceeded"
    if status_code >= 500:
        return "internal.error"
    return "http.error"


__all__ = ["register_error_handlers"]
