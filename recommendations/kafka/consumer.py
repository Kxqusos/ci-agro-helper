from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from typing import Any

from aiokafka import AIOKafkaConsumer, TopicPartition
from aiokafka.errors import KafkaError
from pydantic import ValidationError

from ..service import RecommendationService, RecommendationServiceError
from .producer import RecommendationResultProducer
from .schemas import RecommendationRequestMessage, RecommendationResultMessage

logger = logging.getLogger(__name__)


class RecommendationRequestConsumer:
    def __init__(
        self,
        *,
        topic: str,
        bootstrap_servers: str,
        group_id: str,
        client_id: str,
        poll_timeout_ms: int,
        retry_backoff: float,
        service: RecommendationService,
        producer: RecommendationResultProducer,
        default_result_topic: str,
        security_params: dict[str, Any] | None = None,
    ) -> None:
        self._topic = topic
        self._group_id = group_id
        self._client_id = client_id
        self._poll_timeout_ms = poll_timeout_ms
        self._retry_backoff = max(retry_backoff, 0.1)
        self._service = service
        self._producer = producer
        self._default_result_topic = default_result_topic
        self._consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            client_id=client_id,
            enable_auto_commit=False,
            auto_offset_reset="latest",
            **(security_params or {}),
        )
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        await self._consumer.start()
        self._task = asyncio.create_task(self._poll_loop())
        logger.info(
            "Kafka consumer started (topic=%s, group_id=%s)",
            self._topic,
            self._group_id,
        )

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._consumer.stop()
        logger.info("Kafka consumer stopped")

    async def _poll_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                batch = await self._consumer.getmany(timeout_ms=self._poll_timeout_ms)
            except KafkaError as exc:  # pragma: no cover - network error path
                logger.error("Kafka poll error: %s", exc)
                await asyncio.sleep(self._retry_backoff)
                continue

            if not batch:
                continue

            for tp, messages in batch.items():
                for record in messages:
                    processed = await self._handle_record(record)
                    if processed:
                        await self._commit(tp, record.offset)
                    else:
                        await asyncio.sleep(self._retry_backoff)
                        break

    async def _commit(self, tp: TopicPartition, offset: int) -> None:
        await self._consumer.commit({tp: offset + 1})

    async def _handle_record(self, record) -> bool:  # type: ignore[no-untyped-def]
        try:
            payload = json.loads(record.value.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            logger.error("Skipping invalid Kafka message (topic=%s, offset=%s)", record.topic, record.offset)
            return True

        try:
            message = RecommendationRequestMessage.model_validate(payload)
        except ValidationError as exc:
            logger.error("Kafka message failed validation: %s", exc)
            return True

        logger.info("Processing recommendation event %s", message.event_id)
        start = time.perf_counter()

        try:
            response = await self._service.build_response(
                message.payload,
                auth_header=message.auth_header,
            )
        except RecommendationServiceError as exc:
            duration = (time.perf_counter() - start) * 1000
            result = RecommendationResultMessage(
                event_id=message.event_id,
                trace_id=message.trace_id,
                status="error",
                field_id=message.payload.field_id,
                target_season=message.payload.target_season,
                target_year=message.payload.target_year,
                request_id=str(message.event_id),
                duration_ms=duration,
                error=str(exc),
                error_code=exc.__class__.__name__,
                source=message.source,
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            duration = (time.perf_counter() - start) * 1000
            logger.exception("Unexpected error while processing event %s", message.event_id)
            result = RecommendationResultMessage(
                event_id=message.event_id,
                trace_id=message.trace_id,
                status="error",
                field_id=message.payload.field_id,
                target_season=message.payload.target_season,
                target_year=message.payload.target_year,
                request_id=str(message.event_id),
                duration_ms=duration,
                error="Unexpected error while processing recommendation event.",
                error_code="UnexpectedError",
                source=message.source,
            )
        else:
            duration = (time.perf_counter() - start) * 1000
            result = RecommendationResultMessage(
                event_id=message.event_id,
                trace_id=message.trace_id,
                status="success",
                field_id=response.field_id,
                target_season=response.target_season,
                target_year=response.target_year,
                request_id=response.request_id,
                duration_ms=duration,
                response=response,
                source=message.source,
            )

        target_topic = message.reply_topic or self._default_result_topic
        try:
            await self._producer.publish_result(
                result,
                key=message.payload.field_id,
                topic=target_topic,
            )
            return True
        except KafkaError as exc:  # pragma: no cover - broker errors
            logger.error(
                "Failed to push recommendation result to Kafka (event_id=%s): %s",
                message.event_id,
                exc,
            )
            return False
