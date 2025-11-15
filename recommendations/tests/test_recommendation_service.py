from __future__ import annotations

from pathlib import Path

import pytest

from recommendations import schemas
from recommendations.clients.field_selector import (
    FieldContext,
    FieldHistoryNotFound,
    FieldSelectorUnauthorized,
)
from recommendations.rule_engine import service as engine_service
from recommendations.service import (
    FieldAccessDeniedError,
    FieldHistoryUnavailableError,
    RecommendationService,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "rule_engine"


def _build_engine(tmp_path: Path | None = None) -> engine_service.RuleEngine:
    dataset = FIXTURES / "dataset.json"
    rules = FIXTURES / "rules"
    if tmp_path is not None:
        dataset_copy = tmp_path / "dataset.json"
        dataset_copy.write_text(dataset.read_text(encoding="utf-8"), encoding="utf-8")
        dataset = dataset_copy
        rules_copy = tmp_path / "rules"
        rules_copy.mkdir()
        for file in rules.glob("*.expr"):
            (rules_copy / file.name).write_text(file.read_text(encoding="utf-8"), encoding="utf-8")
        rules = rules_copy
    repository = engine_service.RulesRepository(dataset_path=dataset, expr_dir=rules, ttl_seconds=1)
    return engine_service.RuleEngine(repository)


class FakeFieldSelectorClient:
    def __init__(self, *, context: FieldContext | None = None, error: Exception | None = None) -> None:
        self._context = context
        self._error = error
        self.calls: list[tuple[str, str | None]] = []

    async def fetch_field_context(self, field_id: str, *, auth_header: str | None = None) -> FieldContext:
        self.calls.append((field_id, auth_header))
        if self._error:
            raise self._error
        assert self._context is not None
        return self._context


@pytest.mark.asyncio
async def test_service_uses_field_selector_context(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    remote_history = [
        schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
        schemas.FieldHistoryEntry(year=2023, season="summer", crop_id=37, crop_name="Подсолнечник"),
        schemas.FieldHistoryEntry(year=2022, season="spring", crop_id=1, crop_name="Пшеница"),
    ]
    remote_soil = schemas.SoilProfile(ph=6.2, soil_type=["чернозем"], organic_matter="средняя", drainage="хороший")
    context = FieldContext(
        field_id="fld-1",
        history=remote_history,
        soil_profile=remote_soil,
        climate_profile=None,
    )
    fake_client = FakeFieldSelectorClient(context=context)
    service = RecommendationService(rule_engine=engine, field_selector_client=fake_client)
    payload = schemas.RecommendationQueryPayload(
        field_id="fld-1",
        target_season="spring",
        target_year=2025,
        history=remote_history[:1],
        soil_profile=None,
        climate_profile=None,
        limit=3,
    )

    response = await service.build_response(payload, auth_header="Bearer token")

    assert fake_client.calls == [("fld-1", "Bearer token")]
    assert response.recommendations
    assert "soil_profile=true" in response.filters_applied


@pytest.mark.asyncio
async def test_climate_penalty_adds_warnings(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    service = RecommendationService(rule_engine=engine, field_selector_client=None)
    payload = schemas.RecommendationQueryPayload(
        field_id="fld-risk",
        target_season="spring",
        target_year=2025,
        history=[
            schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
            schemas.FieldHistoryEntry(year=2023, season="summer", crop_id=37, crop_name="Подсолнечник"),
        ],
        soil_profile=schemas.SoilProfile(ph=6.5, soil_type=["чернозем"], organic_matter="средняя", drainage="хороший"),
        climate_profile=schemas.ClimateProfile(
            avg_temperature_c=-5.0,
            frost_risk="high",
            drought_risk="high",
            annual_precipitation_mm=50,
        ),
        limit=3,
    )

    response = await service.build_response(payload, auth_header="Bearer token")

    assert any("frost_risk=high" in flt for flt in response.filters_applied)
    assert response.recommendations
    assert any(
        any(
            "температур" in warning.lower() or "засух" in warning.lower()
            for warning in item.warnings
        )
        for item in response.recommendations
    )


@pytest.mark.asyncio
async def test_field_selector_not_found_raises_error(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    fake_client = FakeFieldSelectorClient(error=FieldHistoryNotFound("missing"))
    service = RecommendationService(rule_engine=engine, field_selector_client=fake_client)
    payload = schemas.RecommendationQueryPayload(
        field_id="fld-unknown",
        target_season="spring",
        target_year=2025,
        history=[
            schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
        ],
        soil_profile=None,
        climate_profile=None,
        limit=3,
    )

    with pytest.raises(FieldHistoryUnavailableError):
        await service.build_response(payload, auth_header="Bearer token")


@pytest.mark.asyncio
async def test_field_selector_unauthorized_maps_to_access_denied(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    fake_client = FakeFieldSelectorClient(error=FieldSelectorUnauthorized("forbidden"))
    service = RecommendationService(rule_engine=engine, field_selector_client=fake_client)
    payload = schemas.RecommendationQueryPayload(
        field_id="fld-locked",
        target_season="spring",
        target_year=2025,
        history=[
            schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
        ],
        soil_profile=None,
        climate_profile=None,
        limit=3,
    )

    with pytest.raises(FieldAccessDeniedError):
        await service.build_response(payload, auth_header="Bearer token")
