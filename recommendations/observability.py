from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict

from fastapi import FastAPI
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

RECOMMENDATION_COUNTER = Counter(
    "recommendations_evaluated_total",
    "Количество выполненных расчётов рекомендаций по исходу",
    ["outcome"],
)
RECOMMENDATION_DURATION = Histogram(
    "recommendations_evaluation_duration_seconds",
    "Время выполнения движка рекомендаций в секундах",
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)

logger = logging.getLogger(__name__)


def setup_observability(app: FastAPI) -> None:
    """Configure Prometheus metrics and optional OpenTelemetry tracing."""
    if _is_enabled("ENABLE_PROMETHEUS_METRICS", default=True):
        _configure_prometheus(app)

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        _configure_tracing(app, otlp_endpoint)


def emit_json_log(logger_obj: logging.Logger, event: str, **fields: Any) -> None:
    """Log payloads as JSON lines so they are parseable by Loki/ELK."""
    payload = {"event": event, **fields}
    logger_obj.info("%s", json.dumps(payload, ensure_ascii=False, default=str))


def observe_recommendation_evaluation(outcome: str, duration_seconds: float) -> None:
    """Publish domain metrics for recommendation calculations."""
    duration = max(duration_seconds, 0.0)
    RECOMMENDATION_COUNTER.labels(outcome=outcome).inc()
    RECOMMENDATION_DURATION.observe(duration)


def _configure_prometheus(app: FastAPI) -> None:
    metrics_path = os.getenv("PROMETHEUS_METRICS_PATH", "/metrics")
    instrumentator = Instrumentator(
        should_instrument_requests_inprogress=True,
        excluded_handlers={metrics_path},
    )
    instrumentator.instrument(app).expose(
        app,
        endpoint=metrics_path,
        include_in_schema=False,
        tags=["Observability"],
    )
    emit_json_log(
        logger,
        "prometheus.enabled",
        path=metrics_path,
    )


def _configure_tracing(app: FastAPI, endpoint: str) -> None:
    headers = _parse_headers(os.getenv("OTEL_EXPORTER_OTLP_HEADERS"))
    insecure = _is_enabled("OTEL_EXPORTER_OTLP_INSECURE", default=False)
    service_name = os.getenv("OTEL_SERVICE_NAME", "recommendations-service")

    resource = Resource(attributes={SERVICE_NAME: service_name})
    tracer_provider = TracerProvider(resource=resource)
    span_exporter = OTLPSpanExporter(
        endpoint=endpoint,
        headers=headers or None,
        insecure=insecure,
    )
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)
    FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)
    emit_json_log(
        logger,
        "otel.enabled",
        endpoint=endpoint,
        insecure=insecure,
        headers=bool(headers),
    )


def _parse_headers(raw_headers: str | None) -> Dict[str, str]:
    if not raw_headers:
        return {}

    headers: Dict[str, str] = {}
    for part in raw_headers.split(","):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        headers[key.strip()] = value.strip()
    return headers


def _is_enabled(env_key: str, *, default: bool) -> bool:
    raw = os.getenv(env_key)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


__all__ = [
    "setup_observability",
    "emit_json_log",
    "observe_recommendation_evaluation",
]
