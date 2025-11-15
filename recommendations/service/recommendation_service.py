"""Service layer that orchestrates recommendations, history and filters."""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from typing import Sequence
from uuid import uuid4

from .. import schemas
from ..clients.field_selector import (
    FieldHistoryNotFound,
    FieldSelectorClient,
    FieldSelectorError,
    FieldSelectorUnavailable,
    FieldSelectorUnauthorized,
)
from ..observability import observe_recommendation_evaluation
from ..rule_engine import models
from ..rule_engine.service import RuleEngine, default_rule_engine

logger = logging.getLogger(__name__)

RISK_ORDER = {"low": 0, "medium": 1, "high": 2}

FAMILY_CLIMATE_RULES: dict[str, dict[str, float | str]] = {
    "solanaceae": {"min_avg_temp": 12.0, "max_frost_risk": "medium", "min_precip_mm": 350},
    "cucurbitaceae": {"min_avg_temp": 14.0, "max_frost_risk": "medium", "min_precip_mm": 300},
    "brassicaceae": {"min_avg_temp": 8.0, "max_frost_risk": "high"},
    "fabaceae": {"min_avg_temp": 8.0, "max_frost_risk": "medium"},
    "poaceae": {"min_avg_temp": 5.0, "max_frost_risk": "high"},
    "asteraceae": {"min_avg_temp": 10.0, "max_frost_risk": "medium"},
    "apiaceae": {"min_avg_temp": 9.0, "max_frost_risk": "medium"},
    "amaranthaceae": {"min_avg_temp": 8.0, "max_frost_risk": "high"},
}


@dataclass(slots=True)
class ResolvedQueryContext:
    history: list[schemas.FieldHistoryEntry]
    soil_profile: schemas.SoilProfile | None
    climate_profile: schemas.ClimateProfile | None


class RecommendationServiceError(RuntimeError):
    """Domain level error produced by the recommendation service."""


class FieldHistoryUnavailableError(RecommendationServiceError):
    """Raised when neither payload nor field selector can provide history."""


class FieldAccessDeniedError(RecommendationServiceError):
    """Raised when user lacks access to the requested field."""


class NoRecommendationsError(RecommendationServiceError):
    """Raised when engine and filters cannot produce any candidates."""


class RecommendationService:
    def __init__(
        self,
        *,
        rule_engine: RuleEngine,
        field_selector_client: FieldSelectorClient | None = None,
    ) -> None:
        self._rule_engine = rule_engine
        self._field_selector = field_selector_client

    async def build_response(
        self,
        payload: schemas.RecommendationQueryPayload,
        *,
        auth_header: str | None,
    ) -> schemas.RecommendationQueryResponse:
        start = time.perf_counter()
        outcome = "success"
        try:
            catalog = self._rule_engine.get_catalog()
            context = await self._resolve_context(payload, auth_header=auth_header)
            candidates = self._rule_engine.evaluate_history(
                context.history,
                payload.target_season,
                target_year=payload.target_year,
                limit=payload.limit,
                preferred_crops=payload.preferred_crops or [],
                constraints=payload.constraints,
            )

            recommendations = self._render_recommendations(
                candidates.items,
                catalog=catalog,
                soil_profile=context.soil_profile,
                climate_profile=context.climate_profile,
                constraints=payload.constraints,
            )
            if not recommendations:
                outcome = "empty"
                raise NoRecommendationsError("Не удалось подобрать культуры по заданным ограничениям.")

            filters_applied = self._build_filters(payload, context)
            return schemas.RecommendationQueryResponse(
                field_id=payload.field_id,
                target_season=payload.target_season,
                target_year=payload.target_year,
                generated_at=datetime.now(UTC),
                request_id=str(uuid4()),
                data_version=catalog.version,
                recommendations=recommendations,
                filters_applied=filters_applied,
            )
        except RecommendationServiceError:
            outcome = "error" if outcome != "empty" else outcome
            raise
        except Exception:
            outcome = "error"
            raise
        finally:
            observe_recommendation_evaluation(outcome, time.perf_counter() - start)

    def get_catalog(self) -> schemas.RulesCatalogResponse:
        return self._rule_engine.get_catalog()

    async def _resolve_context(
        self,
        payload: schemas.RecommendationQueryPayload,
        *,
        auth_header: str | None,
    ) -> ResolvedQueryContext:
        history: list[schemas.FieldHistoryEntry] = list(payload.history)
        soil_profile = payload.soil_profile
        climate_profile = payload.climate_profile

        if self._field_selector:
            try:
                context = await self._field_selector.fetch_field_context(
                    payload.field_id,
                    auth_header=auth_header,
                )
            except FieldSelectorUnauthorized as exc:
                raise FieldAccessDeniedError("Нет доступа к истории выбранного поля") from exc
            except FieldHistoryNotFound as exc:
                raise FieldHistoryUnavailableError("История поля не найдена в field selector") from exc
            except FieldSelectorUnavailable as exc:  # pragma: no cover - network errors
                logger.warning("Field selector temporarily unavailable: %s", exc)
            except FieldSelectorError as exc:
                logger.warning("Field selector returned an error: %s", exc)
            else:
                if context.history:
                    history = context.history
                if context.soil_profile:
                    soil_profile = context.soil_profile if soil_profile is None else soil_profile
                if context.climate_profile:
                    climate_profile = context.climate_profile if climate_profile is None else climate_profile

        if not history:
            raise FieldHistoryUnavailableError("История поля недоступна, повторите запрос позже.")

        return ResolvedQueryContext(
            history=history,
            soil_profile=soil_profile,
            climate_profile=climate_profile,
        )

    def _render_recommendations(
        self,
        candidates: Sequence[models.CandidateRecommendation],
        *,
        catalog: schemas.RulesCatalogResponse,
        soil_profile: schemas.SoilProfile | None,
        climate_profile: schemas.ClimateProfile | None,
        constraints: schemas.QueryConstraints | None,
    ) -> list[schemas.RecommendationItem]:
        crop_index = {crop.crop_id: crop for crop in catalog.crops}
        items: list[schemas.RecommendationItem] = []
        for candidate in candidates:
            crop = crop_index.get(candidate.crop_id)
            warnings = list(candidate.penalties)
            required_actions: list[str] = []
            soil_match = None

            if soil_profile and crop and crop.soil_requirements:
                soil_match = _compare_soil(soil_profile, crop.soil_requirements)
                if soil_match.score < 0.5:
                    warnings.append(
                        "Параметры почвы не соответствуют требованиям культуры"
                    )
                    required_actions.append(
                        "Скорректировать агрохимические показатели перед посевом"
                    )

            if constraints and constraints.require_organic_matter:
                level = constraints.require_organic_matter
                warnings.append(f"Требуется уровень органики: {level}")
                required_actions.append(f"Внести органику до уровня '{level}'")

            climate_penalty, climate_warnings, climate_actions = _evaluate_climate(
                climate_profile,
                crop.botanical_family if crop else candidate.botanical_family,
            )
            warnings.extend(climate_warnings)
            required_actions.extend(climate_actions)

            adjusted_score = max(0.0, min(candidate.base_score - climate_penalty, 1.0))
            if climate_penalty >= 0.3 and adjusted_score < 0.3:
                continue

            reasons = _build_reasons(candidate)
            items.append(
                schemas.RecommendationItem(
                    crop_id=candidate.crop_id,
                    crop_name=candidate.crop_name,
                    botanical_family=candidate.botanical_family,
                    score=round(adjusted_score, 2),
                    priority=_priority_for_score(adjusted_score),
                    reasons=reasons,
                    soil_match=soil_match,
                    warnings=warnings,
                    required_actions=required_actions,
                )
            )
        return items

    def _build_filters(
        self,
        payload: schemas.RecommendationQueryPayload,
        context: ResolvedQueryContext,
    ) -> list[str]:
        filters = [f"limit={payload.limit}"]
        if payload.constraints:
            constraints = payload.constraints
            if constraints.avoid_botanical_families:
                filters.append(
                    "avoid=" + ",".join(constraints.avoid_botanical_families)
                )
            if constraints.exclude_crop_ids:
                filters.append(
                    "exclude_ids=" + ",".join(str(cid) for cid in constraints.exclude_crop_ids)
                )
            if constraints.require_organic_matter:
                filters.append(f"organic={constraints.require_organic_matter}")
            if constraints.prefer_cover_crops:
                filters.append("prefer_cover_crops=true")

        if context.soil_profile:
            filters.append("soil_profile=true")
        if context.climate_profile:
            climate = context.climate_profile
            if climate.agro_zone:
                filters.append(f"agro_zone={climate.agro_zone}")
            if climate.frost_risk:
                filters.append(f"frost_risk={climate.frost_risk}")
            if climate.drought_risk:
                filters.append(f"drought_risk={climate.drought_risk}")
        return filters


def _priority_for_score(score: float) -> schemas.RecommendationPriority:
    if score >= 0.75:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def _compare_soil(
    profile: schemas.SoilProfile,
    requirement: schemas.SoilRequirement,
) -> schemas.SoilMatch:
    score = 1.0
    notes: list[str] = []

    if requirement.ph_range and profile.ph is not None:
        min_ph = requirement.ph_range.min
        max_ph = requirement.ph_range.max
        optimal = requirement.ph_range.optimal
        if (min_ph and profile.ph < min_ph) or (max_ph and profile.ph > max_ph):
            notes.append(
                f"pH {profile.ph} выходит за допустимый диапазон {min_ph}-{max_ph}"
            )
            score -= 0.35
        elif optimal:
            delta = abs(profile.ph - optimal)
            score -= min(delta * 0.05, 0.2)
    elif requirement.ph_range:
        notes.append("Не указано pH поля, рекомендуется провести агрохимический анализ")
        score -= 0.1

    if requirement.organic_matter and profile.organic_matter:
        if requirement.organic_matter != profile.organic_matter:
            notes.append(
                f"Требуемая органика: {requirement.organic_matter}, текущая: {profile.organic_matter}"
            )
            score -= 0.2
    elif requirement.organic_matter:
        notes.append("Органическое вещество не указано")
        score -= 0.05

    if requirement.drainage and profile.drainage:
        if requirement.drainage != profile.drainage:
            notes.append(
                f"Нужен дренаж '{requirement.drainage}', сейчас '{profile.drainage}'"
            )
            score -= 0.2

    if requirement.soil_type and profile.soil_type:
        overlap = set(requirement.soil_type).intersection(profile.soil_type)
        if not overlap:
            notes.append(
                "Нет пересечения типов почв ("
                + ", ".join(profile.soil_type)
                + ") с требуемыми ("
                + ", ".join(requirement.soil_type)
                + ")"
            )
            score -= 0.25

    return schemas.SoilMatch(score=max(0.0, round(score, 2)), notes=notes)


def _evaluate_climate(
    profile: schemas.ClimateProfile | None,
    botanical_family: str | None,
) -> tuple[float, list[str], list[str]]:
    if not profile or not botanical_family:
        return 0.0, [], []

    rules = FAMILY_CLIMATE_RULES.get(botanical_family.lower())
    if not rules:
        return 0.0, [], []

    penalty = 0.0
    warnings: list[str] = []
    actions: list[str] = []

    min_avg_temp = rules.get("min_avg_temp")
    if isinstance(min_avg_temp, (int, float)) and profile.avg_temperature_c is not None:
        if profile.avg_temperature_c < float(min_avg_temp):
            deficit = float(min_avg_temp) - profile.avg_temperature_c
            penalty += min(0.25, 0.05 * deficit)
            warnings.append(
                f"Средняя температура {profile.avg_temperature_c}°C ниже требуемых {min_avg_temp}°C"
            )
            actions.append("Перенести посев на более тёплый период или выбрать холодостойкие сорта")

    max_frost_risk = rules.get("max_frost_risk")
    if isinstance(max_frost_risk, str) and profile.frost_risk:
        if RISK_ORDER.get(profile.frost_risk, 0) > RISK_ORDER.get(str(max_frost_risk), 0):
            penalty += 0.2
            warnings.append("Высокий риск заморозков для выбранной культуры")
            actions.append("Запланировать укрытие/страховку от заморозков")

    min_precip_mm = rules.get("min_precip_mm")
    if isinstance(min_precip_mm, (int, float)) and profile.annual_precipitation_mm is not None:
        if profile.annual_precipitation_mm < float(min_precip_mm):
            penalty += 0.15
            warnings.append(
                "Недостаточная сумма осадков для стабильной урожайности"
            )
            actions.append("Рассмотреть орошение или выбрать засухоустойчивую культуру")

    if profile.drought_risk and RISK_ORDER.get(profile.drought_risk, 0) > 1:
        penalty += 0.1
        warnings.append("Высокий риск засухи в регионе")
        actions.append("Запланировать влагосберегающие агроприёмы")

    return min(penalty, 0.6), warnings, actions


def _build_reasons(candidate: models.CandidateRecommendation) -> list[schemas.RecommendationReason]:
    reasons: list[schemas.RecommendationReason] = []
    for reason in candidate.reasons:
        impact: schemas.ImpactType = "positive" if reason.weight >= 0 else "negative"
        reasons.append(
            schemas.RecommendationReason(
                rule_id=reason.rule_id,
                title="Правило севооборота",
                impact=impact,
                detail=reason.description,
            )
        )
    for penalty in candidate.penalties:
        reasons.append(
            schemas.RecommendationReason(
                rule_id=f"penalty:{candidate.crop_id}:{abs(hash(penalty)) % 10000}",
                title="Ограничение",
                impact="warning",
                detail=penalty,
            )
        )
    return reasons


@lru_cache(maxsize=1)
def get_recommendation_service() -> RecommendationService:
    rule_engine = default_rule_engine()
    field_selector_client = _build_field_selector_client()
    return RecommendationService(rule_engine=rule_engine, field_selector_client=field_selector_client)


def _build_field_selector_client() -> FieldSelectorClient | None:
    base_url = os.getenv("FIELD_SELECTOR_BASE_URL", "").strip()
    if not base_url:
        return None
    timeout_raw = os.getenv("FIELD_SELECTOR_TIMEOUT", "3.0")
    try:
        timeout = float(timeout_raw)
    except ValueError:
        timeout = 3.0
    return FieldSelectorClient(base_url=base_url, timeout=timeout)
