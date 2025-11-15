from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from ..service import RecommendationService, get_recommendation_service
from .consumer import RecommendationRequestConsumer
from .producer import RecommendationResultProducer

logger = logging.getLogger(__name__)


def _to_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _to_float(value: str | None, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


@dataclass(slots=True)
class KafkaConfig:
    enabled: bool
    bootstrap_servers: str
    request_topic: str
    result_topic: str
    client_id: str
    group_id: str
    poll_timeout_ms: int
    retry_backoff_seconds: float
    max_retry_attempts: int
    security_protocol: str | None = None
    sasl_mechanism: str | None = None
    sasl_username: str | None = None
    sasl_password: str | None = None

    @classmethod
    def from_env(cls) -> "KafkaConfig":
        enabled_raw = os.getenv("KAFKA_ENABLED", "false").strip().lower()
        enabled = enabled_raw in {"1", "true", "yes", "on"}
        bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "").strip()
        enabled = enabled and bool(bootstrap)

        return cls(
            enabled=enabled,
            bootstrap_servers=bootstrap,
            request_topic=os.getenv("KAFKA_REQUEST_TOPIC", "recommendations.request"),
            result_topic=os.getenv("KAFKA_RESULT_TOPIC", "recommendations.result"),
            client_id=os.getenv("KAFKA_CLIENT_ID", "recommendations-service"),
            group_id=os.getenv("KAFKA_GROUP_ID", "recommendations-service"),
            poll_timeout_ms=_to_int(os.getenv("KAFKA_POLL_TIMEOUT_MS"), 1000),
            retry_backoff_seconds=_to_float(
                os.getenv("KAFKA_RETRY_BACKOFF_SECONDS"),
                1.0,
            ),
            max_retry_attempts=_to_int(
                os.getenv("KAFKA_MAX_RETRY_ATTEMPTS"),
                3,
            ),
            security_protocol=os.getenv("KAFKA_SECURITY_PROTOCOL"),
            sasl_mechanism=os.getenv("KAFKA_SASL_MECHANISM"),
            sasl_username=os.getenv("KAFKA_SASL_USERNAME"),
            sasl_password=os.getenv("KAFKA_SASL_PASSWORD"),
        )

    def auth_kwargs(self) -> dict[str, str]:
        kwargs: dict[str, str] = {}
        if self.security_protocol:
            kwargs["security_protocol"] = self.security_protocol
        if self.sasl_mechanism:
            kwargs["sasl_mechanism"] = self.sasl_mechanism
        if self.sasl_username:
            kwargs["sasl_plain_username"] = self.sasl_username
        if self.sasl_password:
            kwargs["sasl_plain_password"] = self.sasl_password
        return kwargs


class KafkaRuntime:
    def __init__(self, *, config: KafkaConfig, service: RecommendationService) -> None:
        self._config = config
        self._service = service
        self._producer = RecommendationResultProducer(
            bootstrap_servers=config.bootstrap_servers,
            topic=config.result_topic,
            client_id=f"{config.client_id}-producer",
            retry_backoff=config.retry_backoff_seconds,
            max_retries=config.max_retry_attempts,
            security_params=config.auth_kwargs(),
        )
        self._consumer = RecommendationRequestConsumer(
            topic=config.request_topic,
            bootstrap_servers=config.bootstrap_servers,
            client_id=f"{config.client_id}-consumer",
            group_id=config.group_id,
            poll_timeout_ms=config.poll_timeout_ms,
            retry_backoff=config.retry_backoff_seconds,
            service=service,
            producer=self._producer,
            default_result_topic=config.result_topic,
            security_params=config.auth_kwargs(),
        )

    async def start(self) -> None:
        await self._producer.start()
        await self._consumer.start()
        logger.info(
            "Kafka runtime started (request_topic=%s, result_topic=%s)",
            self._config.request_topic,
            self._config.result_topic,
        )

    async def stop(self) -> None:
        await self._consumer.stop()
        await self._producer.stop()
        logger.info("Kafka runtime stopped")


def build_kafka_runtime() -> KafkaRuntime | None:
    config = KafkaConfig.from_env()
    if not config.enabled:
        logger.info("Kafka runtime disabled (set KAFKA_ENABLED=true to enable)")
        return None
    service = get_recommendation_service()
    return KafkaRuntime(config=config, service=service)


__all__ = [
    "KafkaConfig",
    "KafkaRuntime",
    "build_kafka_runtime",
]
