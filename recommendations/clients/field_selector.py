"""HTTP client for fetching field context (history, soil, climate)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from .. import schemas

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class FieldContext:
    field_id: str
    history: list[schemas.FieldHistoryEntry]
    soil_profile: schemas.SoilProfile | None
    climate_profile: schemas.ClimateProfile | None


class FieldSelectorError(RuntimeError):
    """Base error for interactions with the field selector service."""


class FieldSelectorUnavailable(FieldSelectorError):
    """Raised when the field selector service is temporarily unavailable."""


class FieldSelectorUnauthorized(FieldSelectorError):
    """Raised when the upstream service rejects the provided credentials."""


class FieldHistoryNotFound(FieldSelectorError):
    """Raised when no history exists for the requested field."""


class FieldSelectorClient:
    """Minimal async HTTP client for the field selector domain service."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout: float = 3.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._transport = transport

    async def fetch_field_context(
        self,
        field_id: str,
        *,
        auth_header: str | None = None,
    ) -> FieldContext:
        """Fetch history plus optional soil/climate profiles for a field."""

        url = f"{self._base_url}/fields/{field_id}/history"
        params = {"include": "soil,climate"}
        headers = {"Accept": "application/json"}
        if auth_header:
            headers["Authorization"] = auth_header

        try:
            async with httpx.AsyncClient(timeout=self._timeout, transport=self._transport) as client:
                response = await client.get(url, params=params, headers=headers)
        except httpx.HTTPError as exc:  # pragma: no cover - network safety
            logger.warning("Field selector is unavailable: %s", exc)
            raise FieldSelectorUnavailable("Field selector service is unavailable") from exc

        if response.status_code == 404:
            raise FieldHistoryNotFound(f"Field {field_id} history was not found")
        if response.status_code in (401, 403):
            raise FieldSelectorUnauthorized("Field selector rejected the provided credentials")
        if response.status_code >= 500:
            raise FieldSelectorUnavailable("Field selector returned a server error")
        if response.status_code >= 400:
            raise FieldSelectorError(
                f"Field selector responded with {response.status_code}: {response.text[:200]}"
            )

        payload = response.json()
        history_payload = payload.get("history") or []
        history = [schemas.FieldHistoryEntry.model_validate(item) for item in history_payload]
        soil_payload = payload.get("soil_profile") or None
        soil_profile = (
            schemas.SoilProfile.model_validate(soil_payload)
            if soil_payload
            else None
        )
        climate_payload = payload.get("climate_profile") or None
        climate_profile = (
            schemas.ClimateProfile.model_validate(climate_payload)
            if climate_payload
            else None
        )

        return FieldContext(
            field_id=str(payload.get("field_id") or field_id),
            history=history,
            soil_profile=soil_profile,
            climate_profile=climate_profile,
        )
