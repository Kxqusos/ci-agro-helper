from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

from .schemas import RecommendationResultMessage

logger = logging.getLogger(__name__)


class RecommendationResultProducer:
    def __init__(
        self,
        *,
        bootstrap_servers: str,
        topic: str,
        client_id: str,
        retry_backoff: float,
        max_retries: int,
        security_params: dict[str, Any] | None = None,
    ) -> None:
        self._default_topic = topic
        self._producer = AIOKafkaProducer(
            bootstrap_servers=bootstrap_servers,
            client_id=client_id,
            **(security_params or {}),
        )
        self._retry_backoff = max(retry_backoff, 0.1)
        self._max_retries = max(1, max_retries)
        self._started = False

    async def start(self) -> None:
        if self._started:
            return
        await self._producer.start()
        self._started = True

    async def stop(self) -> None:
        if not self._started:
            return
        await self._producer.stop()
        self._started = False

    async def publish_result(
        self,
        message: RecommendationResultMessage,
        *,
        key: str | None = None,
        topic: str | None = None,
    ) -> None:
        if not self._started:
            raise RuntimeError("Kafka producer is not started")

        payload = json.dumps(message.model_dump(mode="json"), ensure_ascii=False).encode("utf-8")
        key_bytes = key.encode("utf-8") if key else None
        target_topic = topic or self._default_topic

        delay = self._retry_backoff
        for attempt in range(1, self._max_retries + 1):
            try:
                await self._producer.send_and_wait(
                    target_topic,
                    value=payload,
                    key=key_bytes,
                )
                logger.info(
                    "Kafka result sent (event_id=%s, status=%s, topic=%s)",
                    message.event_id,
                    message.status,
                    target_topic,
                )
                return
            except KafkaError as exc:
                logger.warning(
                    "Failed to publish Kafka result (attempt %s/%s): %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                if attempt == self._max_retries:
                    raise
                await asyncio.sleep(delay)
                delay = min(delay * 2, self._retry_backoff * 8)
