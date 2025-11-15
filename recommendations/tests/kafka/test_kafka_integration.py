"""Integration tests for Kafka producer and consumer with mocks."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch
from uuid import uuid4

import pytest

from recommendations import schemas
from recommendations.kafka.consumer import RecommendationRequestConsumer
from recommendations.kafka.producer import RecommendationResultProducer
from recommendations.kafka.schemas import (
    RecommendationRequestMessage,
    RecommendationResultMessage,
)
from recommendations.rule_engine import service as engine_service
from recommendations.service import RecommendationService


FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "rule_engine"


@pytest.fixture
def mock_rule_engine(tmp_path: Path) -> engine_service.RuleEngine:
    """Create a mock rule engine with test data."""
    dataset = FIXTURES / "dataset.json"
    rules = FIXTURES / "rules"
    dataset_copy = tmp_path / "dataset.json"
    dataset_copy.write_text(dataset.read_text(encoding="utf-8"), encoding="utf-8")
    rules_copy = tmp_path / "rules"
    rules_copy.mkdir()
    for file in rules.glob("*.expr"):
        (rules_copy / file.name).write_text(file.read_text(encoding="utf-8"), encoding="utf-8")
    repository = engine_service.RulesRepository(dataset_path=dataset_copy, expr_dir=rules_copy, ttl_seconds=1)
    return engine_service.RuleEngine(repository)


@pytest.mark.asyncio
async def test_kafka_producer_start_stop():
    """Test Kafka producer lifecycle."""
    with patch("recommendations.kafka.producer.AIOKafkaProducer") as mock_producer_class:
        mock_producer = AsyncMock()
        mock_producer_class.return_value = mock_producer

        producer = RecommendationResultProducer(
            bootstrap_servers="localhost:9092",
            topic="test-topic",
            client_id="test-client",
            retry_backoff=0.1,
            max_retries=3,
        )

        # Test start
        await producer.start()
        mock_producer.start.assert_called_once()

        # Test stop
        await producer.stop()
        mock_producer.stop.assert_called_once()


@pytest.mark.asyncio
async def test_kafka_producer_publish_success():
    """Test successful message publishing."""
    with patch("recommendations.kafka.producer.AIOKafkaProducer") as mock_producer_class:
        mock_producer = AsyncMock()
        mock_producer_class.return_value = mock_producer

        producer = RecommendationResultProducer(
            bootstrap_servers="localhost:9092",
            topic="test-topic",
            client_id="test-client",
            retry_backoff=0.1,
            max_retries=3,
        )

        await producer.start()

        message = RecommendationResultMessage(
            event_id=uuid4(),
            trace_id=str(uuid4()),
            status="success",
            field_id="test-field",
            target_season="spring",
            target_year=2025,
            request_id="req-1",
            duration_ms=150.5,
            source="test",
        )

        await producer.publish_result(message, key="test-field")

        # Verify send was called
        mock_producer.send_and_wait.assert_called_once()
        call_args = mock_producer.send_and_wait.call_args
        assert call_args[0][0] == "test-topic"
        assert call_args[1]["key"] == b"test-field"


@pytest.mark.asyncio
async def test_kafka_producer_publish_not_started():
    """Test publishing when producer is not started."""
    with patch("recommendations.kafka.producer.AIOKafkaProducer"):
        producer = RecommendationResultProducer(
            bootstrap_servers="localhost:9092",
            topic="test-topic",
            client_id="test-client",
            retry_backoff=0.1,
            max_retries=3,
        )

        message = RecommendationResultMessage(
            event_id=uuid4(),
            trace_id=str(uuid4()),
            status="success",
            field_id="test-field",
            target_season="spring",
            target_year=2025,
            request_id="req-1",
            duration_ms=150.5,
            source="test",
        )

        with pytest.raises(RuntimeError, match="not started"):
            await producer.publish_result(message)


@pytest.mark.asyncio
async def test_kafka_consumer_start_stop():
    """Test Kafka consumer lifecycle."""
    with patch("recommendations.kafka.consumer.AIOKafkaConsumer") as mock_consumer_class:
        mock_consumer = AsyncMock()
        mock_consumer_class.return_value = mock_consumer

        mock_service = Mock(spec=RecommendationService)
        mock_producer = Mock(spec=RecommendationResultProducer)

        consumer = RecommendationRequestConsumer(
            topic="test-topic",
            bootstrap_servers="localhost:9092",
            group_id="test-group",
            client_id="test-client",
            poll_timeout_ms=1000,
            retry_backoff=0.1,
            service=mock_service,
            producer=mock_producer,
            default_result_topic="test-result-topic",
        )

        # Test start
        await consumer.start()
        mock_consumer.start.assert_called_once()

        # Test stop
        await consumer.stop()
        mock_consumer.stop.assert_called_once()


@pytest.mark.asyncio
async def test_kafka_consumer_handle_valid_message(tmp_path: Path, mock_rule_engine):
    """Test consumer handling a valid message."""
    with patch("recommendations.kafka.consumer.AIOKafkaConsumer") as mock_consumer_class:
        mock_consumer = AsyncMock()
        mock_consumer_class.return_value = mock_consumer

        # Setup mock producer
        mock_producer = AsyncMock(spec=RecommendationResultProducer)
        mock_producer.publish_result = AsyncMock()

        # Setup recommendation service
        service = RecommendationService(rule_engine=mock_rule_engine, field_selector_client=None)

        consumer = RecommendationRequestConsumer(
            topic="test-topic",
            bootstrap_servers="localhost:9092",
            group_id="test-group",
            client_id="test-client",
            poll_timeout_ms=1000,
            retry_backoff=0.1,
            service=service,
            producer=mock_producer,
            default_result_topic="test-result-topic",
        )

        # Create a valid Kafka record
        request_message = RecommendationRequestMessage(
            event_id=uuid4(),
            trace_id=str(uuid4()),
            payload=schemas.RecommendationQueryPayload(
                field_id="test-field",
                target_season="spring",
                target_year=2025,
                history=[
                    schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
                ],
                limit=5,
            ),
            source="test",
        )

        mock_record = Mock()
        mock_record.value = json.dumps(request_message.model_dump(mode="json")).encode("utf-8")
        mock_record.topic = "test-topic"
        mock_record.offset = 0

        # Handle the record
        result = await consumer._handle_record(mock_record)

        assert result is True
        # Verify producer was called
        mock_producer.publish_result.assert_called_once()


@pytest.mark.asyncio
async def test_kafka_consumer_handle_invalid_json():
    """Test consumer handling invalid JSON."""
    with patch("recommendations.kafka.consumer.AIOKafkaConsumer") as mock_consumer_class:
        mock_consumer = AsyncMock()
        mock_consumer_class.return_value = mock_consumer

        mock_service = Mock(spec=RecommendationService)
        mock_producer = AsyncMock(spec=RecommendationResultProducer)

        consumer = RecommendationRequestConsumer(
            topic="test-topic",
            bootstrap_servers="localhost:9092",
            group_id="test-group",
            client_id="test-client",
            poll_timeout_ms=1000,
            retry_backoff=0.1,
            service=mock_service,
            producer=mock_producer,
            default_result_topic="test-result-topic",
        )

        # Create invalid record
        mock_record = Mock()
        mock_record.value = b"invalid json {"
        mock_record.topic = "test-topic"
        mock_record.offset = 0

        # Handle the record
        result = await consumer._handle_record(mock_record)

        # Should return True (skip invalid message)
        assert result is True
        # Producer should not be called
        mock_producer.publish_result.assert_not_called()


@pytest.mark.asyncio
async def test_kafka_consumer_handle_validation_error():
    """Test consumer handling validation error."""
    with patch("recommendations.kafka.consumer.AIOKafkaConsumer") as mock_consumer_class:
        mock_consumer = AsyncMock()
        mock_consumer_class.return_value = mock_consumer

        mock_service = Mock(spec=RecommendationService)
        mock_producer = AsyncMock(spec=RecommendationResultProducer)

        consumer = RecommendationRequestConsumer(
            topic="test-topic",
            bootstrap_servers="localhost:9092",
            group_id="test-group",
            client_id="test-client",
            poll_timeout_ms=1000,
            retry_backoff=0.1,
            service=mock_service,
            producer=mock_producer,
            default_result_topic="test-result-topic",
        )

        # Create record with invalid message structure
        invalid_message = {"event_id": "not-a-uuid"}
        mock_record = Mock()
        mock_record.value = json.dumps(invalid_message).encode("utf-8")
        mock_record.topic = "test-topic"
        mock_record.offset = 0

        # Handle the record
        result = await consumer._handle_record(mock_record)

        # Should return True (skip invalid message)
        assert result is True
        # Producer should not be called
        mock_producer.publish_result.assert_not_called()


@pytest.mark.asyncio
async def test_kafka_producer_retry_on_failure():
    """Test producer retry logic on failure."""
    from aiokafka.errors import KafkaError

    with patch("recommendations.kafka.producer.AIOKafkaProducer") as mock_producer_class:
        mock_producer = AsyncMock()
        mock_producer_class.return_value = mock_producer

        # First call fails, second succeeds
        mock_producer.send_and_wait.side_effect = [
            KafkaError("Connection failed"),
            AsyncMock(),
        ]

        producer = RecommendationResultProducer(
            bootstrap_servers="localhost:9092",
            topic="test-topic",
            client_id="test-client",
            retry_backoff=0.01,  # Small backoff for testing
            max_retries=3,
        )

        await producer.start()

        message = RecommendationResultMessage(
            event_id=uuid4(),
            trace_id=str(uuid4()),
            status="success",
            field_id="test-field",
            target_season="spring",
            target_year=2025,
            request_id="req-1",
            duration_ms=150.5,
            source="test",
        )

        # Should succeed on retry
        await producer.publish_result(message)

        # Verify send was called twice (1 failure + 1 success)
        assert mock_producer.send_and_wait.call_count == 2


@pytest.mark.asyncio
async def test_kafka_producer_max_retries_exceeded():
    """Test producer when max retries are exceeded."""
    from aiokafka.errors import KafkaError

    with patch("recommendations.kafka.producer.AIOKafkaProducer") as mock_producer_class:
        mock_producer = AsyncMock()
        mock_producer_class.return_value = mock_producer

        # All calls fail
        mock_producer.send_and_wait.side_effect = KafkaError("Connection failed")

        producer = RecommendationResultProducer(
            bootstrap_servers="localhost:9092",
            topic="test-topic",
            client_id="test-client",
            retry_backoff=0.01,
            max_retries=2,
        )

        await producer.start()

        message = RecommendationResultMessage(
            event_id=uuid4(),
            trace_id=str(uuid4()),
            status="success",
            field_id="test-field",
            target_season="spring",
            target_year=2025,
            request_id="req-1",
            duration_ms=150.5,
            source="test",
        )

        # Should raise after max retries
        with pytest.raises(KafkaError):
            await producer.publish_result(message)

        # Verify send was called max_retries times
        assert mock_producer.send_and_wait.call_count == 2
