from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from .. import schemas as domain

ResultStatus = Literal["success", "error"]


def _now() -> datetime:
    return datetime.now(UTC)


class RecommendationRequestMessage(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    trace_id: str | None = None
    requested_at: datetime = Field(default_factory=_now)
    payload: domain.RecommendationQueryPayload
    reply_topic: str | None = None
    auth_header: str | None = None
    source: str | None = None


class RecommendationResultMessage(BaseModel):
    event_id: UUID
    trace_id: str | None = None
    processed_at: datetime = Field(default_factory=_now)
    status: ResultStatus
    field_id: str
    target_season: domain.Season
    target_year: int
    request_id: str
    duration_ms: float | None = None
    response: domain.RecommendationQueryResponse | None = None
    error: str | None = None
    error_code: str | None = None
    source: str | None = None
