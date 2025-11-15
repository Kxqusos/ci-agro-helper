from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, status

from recommendations.kafka import KafkaRuntime, build_kafka_runtime
from recommendations.middleware.error_handler import register_error_handlers
from recommendations.observability import emit_json_log, setup_observability
from recommendations.routers import router
from recommendations.security import get_authenticated_user

logger = logging.getLogger("recommendations.api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
audit_logger = logging.getLogger("recommendations.audit")

PROTECTED_PREFIXES = ("/recommendations",)
AUTH_WHITELIST = {"/recommendations/rules", "/healthz"}

app = FastAPI(
    title="Recommendations Service",
    version="0.1.0",
    description="API для расчёта агрономических рекомендаций по севообороту.",
)
app.include_router(router)
register_error_handlers(app)
setup_observability(app)
kafka_runtime: KafkaRuntime | None = None


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers.setdefault("X-Request-ID", request_id)
        return response
    except HTTPException as exc:
        status_code = exc.status_code
        raise
    except Exception:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        raise
    finally:
        duration = (time.perf_counter() - start) * 1000
        auth_context = getattr(request.state, "auth_context", None)
        user_id = getattr(auth_context, "user_id", None)
        payload = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": status_code,
            "user_id": user_id,
            "duration_ms": duration,
        }
        emit_json_log(audit_logger, "request.audit", **payload)
        emit_json_log(logger, "request.completed", **payload)


@app.middleware("http")
async def enforce_authorization(request: Request, call_next):
    path = request.url.path
    if any(path.startswith(prefix) for prefix in PROTECTED_PREFIXES) and path not in AUTH_WHITELIST:
        await get_authenticated_user(request)
    return await call_next(request)


@app.get("/healthz", tags=["Health"])
async def healthz():
    return {"status": "ok"}


@app.on_event("startup")
async def start_kafka_runtime() -> None:
    global kafka_runtime
    kafka_runtime = build_kafka_runtime()
    if kafka_runtime:
        await kafka_runtime.start()


@app.on_event("shutdown")
async def stop_kafka_runtime() -> None:
    if kafka_runtime:
        await kafka_runtime.stop()
