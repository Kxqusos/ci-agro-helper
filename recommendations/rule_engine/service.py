"""Rule engine service for agronomic recommendations."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

from .. import schemas
from . import models

logger = logging.getLogger(__name__)


SEASON_ORDER = {"spring": 0, "summer": 1, "autumn": 2, "winter": 3}


@dataclass(slots=True)
class CacheEntry:
    catalog: schemas.RulesCatalogResponse
    rule_definitions: tuple[models.RuleDefinition, ...]
    loaded_at: float
    fingerprint: str


class RulesRepository:
    """Loads agronomic rules and keeps them cached with TTL and fingerprinting."""

    def __init__(self, dataset_path: Path, expr_dir: Path, ttl_seconds: int = 120) -> None:
        self._dataset_path = dataset_path
        self._expr_dir = expr_dir
        self._ttl_seconds = ttl_seconds
        self._cache: CacheEntry | None = None

    def load(self) -> CacheEntry:
        fingerprint = self._fingerprint()
        now = time.monotonic()
        if self._cache and now - self._cache.loaded_at < self._ttl_seconds:
            if self._cache.fingerprint == fingerprint:
                return self._cache
        catalog = self._load_catalog()
        definitions = tuple(self._load_rule_definitions())
        self._cache = CacheEntry(
            catalog=catalog,
            rule_definitions=definitions,
            loaded_at=now,
            fingerprint=fingerprint,
        )
        return self._cache

    def invalidate(self) -> None:
        self._cache = None

    def _fingerprint(self) -> str:
        dataset_mtime = self._dataset_path.stat().st_mtime_ns if self._dataset_path.exists() else 0
        expr_times: list[str] = []
        if self._expr_dir.exists():
            for file in sorted(self._expr_dir.glob("*.expr")):
                expr_times.append(f"{file.name}:{file.stat().st_mtime_ns}")
        return f"{dataset_mtime}|{'|'.join(expr_times)}"

    def _load_catalog(self) -> schemas.RulesCatalogResponse:
        with self._dataset_path.open("r", encoding="utf-8") as fp:
            payload = json.load(fp)
        return _build_catalog(payload)

    def _load_rule_definitions(self) -> Iterable[models.RuleDefinition]:
        if not self._expr_dir.exists():
            return []
        definitions: list[models.RuleDefinition] = []
        for expr_file in sorted(self._expr_dir.glob("*.expr")):
            try:
                with expr_file.open("r", encoding="utf-8") as fp:
                    raw = json.load(fp)
            except json.JSONDecodeError as exc:
                logger.warning("Cannot parse rule expression %s: %s", expr_file, exc)
                continue
            definition = _parse_rule_definition(raw, expr_file.name)
            if definition:
                definitions.append(definition)
        return definitions


class RuleEngine:
    def __init__(self, repository: RulesRepository) -> None:
        self._repository = repository

    def get_catalog(self) -> schemas.RulesCatalogResponse:
        return self._repository.load().catalog

    def evaluate_history(
        self,
        history: Sequence[schemas.FieldHistoryEntry],
        target_season: schemas.Season,
        *,
        target_year: int,
        limit: int = 5,
        preferred_crops: Sequence[int] | None = None,
        constraints: schemas.QueryConstraints | None = None,
    ) -> models.CandidateRecommendations:
        cache = self._repository.load()
        catalog = cache.catalog
        history_events = _normalize_history(history, catalog)
        preferred_set = set(preferred_crops or [])
        items: list[models.CandidateRecommendation] = []

        for crop in catalog.crops:
            if constraints:
                if crop.botanical_family in constraints.avoid_botanical_families:
                    continue
                if crop.crop_id in constraints.exclude_crop_ids:
                    continue

            score = 0.5
            reasons: list[models.RuleMatchExplanation] = []
            penalties: list[str] = []

            if crop.rotation_interval_years:
                min_year = crop.rotation_interval_years.min
                if min_year:
                    last_year = _last_year_for_crop(history_events, crop.crop_id)
                    if last_year is not None:
                        gap = target_year - last_year
                        if gap < min_year:
                            score -= 0.25
                            penalties.append(
                                f"Нужен перерыв {min_year} лет перед культурой {crop.crop_name}"
                            )

            last_event = history_events[0] if history_events else None
            if last_event:
                for negative in crop.bad_predecessors:
                    if _reference_matches(negative.crop_reference, last_event):
                        score -= 0.3
                        penalties.append(negative.reason or "Несовместимый предшественник")

                for positive in crop.good_predecessors:
                    if _reference_matches(positive.crop_reference, last_event):
                        delta = 0.18 if positive.rating == "excellent" else 0.1
                        score += delta
                        reasons.append(
                            models.RuleMatchExplanation(
                                rule_id=f"good_pred:{crop.crop_id}",
                                description=positive.reason or "Хороший предшественник",
                                weight=delta,
                            )
                        )

            for definition in cache.rule_definitions:
                if definition.target_crop_id != crop.crop_id:
                    continue
                if definition.expression.is_match(history_events, now_year=target_year):
                    score += definition.weight
                    reasons.append(
                        models.RuleMatchExplanation(
                            rule_id=definition.rule_id,
                            description=definition.description,
                            weight=definition.weight,
                        )
                    )

            if crop.incompatible_families and last_event and last_event.botanical_family in crop.incompatible_families:
                score -= 0.2
                penalties.append("Конфликт ботанических семейств")

            if crop.crop_id in preferred_set:
                score += 0.08
                reasons.append(
                    models.RuleMatchExplanation(
                        rule_id=f"preferred:{crop.crop_id}",
                        description="Пользователь указал культуру как предпочтительную",
                        weight=0.08,
                    )
                )

            items.append(
                models.CandidateRecommendation(
                    crop_id=crop.crop_id,
                    crop_name=crop.crop_name,
                    botanical_family=crop.botanical_family,
                    base_score=max(0.0, min(round(score, 4), 1.0)),
                    reasons=tuple(reasons),
                    penalties=tuple(penalties),
                )
            )

        items.sort(key=lambda item: item.base_score, reverse=True)
        return models.CandidateRecommendations(items=items[:limit])


def default_rule_engine() -> RuleEngine:
    return _rule_engine_singleton()


def evaluate_history(
    field_history: Sequence[schemas.FieldHistoryEntry],
    target_season: schemas.Season,
    *,
    target_year: int,
    limit: int = 5,
    preferred_crops: Sequence[int] | None = None,
    constraints: schemas.QueryConstraints | None = None,
) -> models.CandidateRecommendations:
    engine = default_rule_engine()
    return engine.evaluate_history(
        field_history,
        target_season,
        target_year=target_year,
        limit=limit,
        preferred_crops=preferred_crops,
        constraints=constraints,
    )


@lru_cache(maxsize=1)
def _rule_engine_singleton() -> RuleEngine:
    base_path = Path(__file__).resolve().parents[1]
    dataset = base_path / "data" / "crop_rotation_rules.json"
    expr_dir = Path(__file__).resolve().parent / "rules"
    repository = RulesRepository(dataset_path=dataset, expr_dir=expr_dir)
    return RuleEngine(repository)


def _build_catalog(payload: dict) -> schemas.RulesCatalogResponse:
    updated_value = payload.get("updated")
    updated_date = None
    if updated_value:
        try:
            updated_date = datetime.strptime(updated_value, "%Y-%m-%d").date()
        except Exception:  # pragma: no cover - defensive
            logger.warning("Cannot parse updated date '%s'", updated_value)

    sources = [
        schemas.RuleSource(
            id=source["id"],
            title=source["title"],
            authors=source.get("authors"),
            year=source.get("year"),
            url=source.get("url"),
            isbn=source.get("isbn"),
            doi=source.get("doi"),
        )
        for source in payload.get("sources", [])
    ]

    families = [
        schemas.BotanicalFamily(
            key=family_key,
            name_ru=family_data.get("name_ru", ""),
            name_latin=family_data.get("name_latin", ""),
            common_pests=family_data.get("common_pests", []) or [],
            common_diseases=family_data.get("common_diseases", []) or [],
        )
        for family_key, family_data in payload.get("botanical_families", {}).items()
    ]

    crops: list[schemas.CropRuleSummary] = []
    for crop in payload.get("crops", []):
        rotation_rules: dict = crop.get("rotation_rules") or {}
        soil = rotation_rules.get("soil_requirements") or {}
        ph_range = soil.get("ph_range") or {}
        soil_requirement = schemas.SoilRequirement(
            ph_range=schemas.SoilPhRange(**ph_range) if ph_range else None,
            soil_type=soil.get("soil_type", []) or [],
            organic_matter=soil.get("organic_matter"),
            drainage=soil.get("drainage"),
        )

        crops.append(
            schemas.CropRuleSummary(
                crop_id=crop["crop_id"],
                crop_name=crop.get("crop_name", f"crop:{crop['crop_id']}") ,
                botanical_family=crop.get("botanical_family", "unknown"),
                rotation_interval_years=schemas.RotationInterval(
                    **(rotation_rules.get("return_interval_years") or {})
                )
                if rotation_rules.get("return_interval_years")
                else None,
                good_predecessors=[
                    schemas.PositivePredecessor(
                        crop_reference=str(item.get("crop_id", "unknown")),
                        rating=item.get("rating", "good"),
                        reason=item.get("reason"),
                    )
                    for item in rotation_rules.get("good_predecessors", []) or []
                ],
                acceptable_predecessors=[
                    schemas.ConditionalPredecessor(
                        crop_reference=str(item.get("crop_id", "unknown")),
                        conditions=item.get("conditions"),
                    )
                    for item in rotation_rules.get("acceptable_predecessors", []) or []
                ],
                bad_predecessors=[
                    schemas.NegativePredecessor(
                        crop_reference=str(item.get("crop_id", "unknown")),
                        reason=item.get("reason"),
                    )
                    for item in rotation_rules.get("bad_predecessors", []) or []
                ],
                incompatible_families=rotation_rules.get("incompatible_families", []) or [],
                soil_requirements=soil_requirement if any(soil_requirement.model_dump().values()) else None,
            )
        )

    return schemas.RulesCatalogResponse(
        version=payload.get("version", "0.0.0"),
        updated=updated_date,
        sources=sources,
        botanical_families=families,
        crops=crops,
    )


def _parse_rule_definition(payload: dict, filename: str) -> models.RuleDefinition | None:
    required = (payload.get("rule_id"), payload.get("target_crop_id"), payload.get("dnf"))
    if any(value is None for value in required):
        logger.warning("Rule definition %s is missing required fields", filename)
        return None
    weight = float(payload.get("weight", 0.05))
    description = payload.get("description") or "Пользовательское правило"
    clauses: list[models.RuleClause] = []
    for clause_payload in payload["dnf"]:
        conditions: list[models.RuleCondition] = []
        for condition_payload in clause_payload:
            conditions.append(_parse_condition(condition_payload))
        clauses.append(models.RuleClause(tuple(conditions)))
    expression = models.RuleExpression(tuple(clauses))
    return models.RuleDefinition(
        rule_id=str(payload["rule_id"]),
        target_crop_id=int(payload["target_crop_id"]),
        expression=expression,
        weight=weight,
        description=description,
    )


def _parse_condition(payload: dict) -> models.RuleCondition:
    kind = payload.get("kind", "match")
    if kind == "sequence":
        tokens_raw = payload.get("tokens", [])
        tokens = tuple(_parse_sequence_token(token) for token in tokens_raw)
        return models.RuleCondition(kind="sequence", sequence=tokens)
    if kind == "gap":
        return models.RuleCondition(
            kind="gap",
            subject=str(payload.get("subject")),
            min_gap_years=int(payload.get("min_gap_years", 1)),
            negated=bool(payload.get("negated", False)),
        )
    return models.RuleCondition(
        kind="match",
        subject=str(payload.get("subject")),
        window=int(payload.get("window")) if payload.get("window") else None,
        negated=bool(payload.get("negated", False)),
    )


def _parse_sequence_token(raw: str | dict) -> models.SequenceToken:
    if isinstance(raw, dict):
        return models.SequenceToken(
            kind=str(raw.get("kind", "crop")),
            value=raw.get("value"),
            negated=bool(raw.get("negated", False)),
        )
    token_str = str(raw)
    negated = token_str.startswith("!")
    if negated:
        token_str = token_str[1:]
    kind, _, value = token_str.partition(":")
    parsed_value: str | int | None = value or None
    if kind == "crop" and parsed_value is not None:
        parsed_value = int(parsed_value)
    elif kind == "fallow" and parsed_value is not None:
        parsed_value = int(parsed_value)
    return models.SequenceToken(kind=kind, value=parsed_value, negated=negated)


def _normalize_history(
    history: Sequence[schemas.FieldHistoryEntry],
    catalog: schemas.RulesCatalogResponse,
) -> list[models.HistoryEvent]:
    crop_index = {crop.crop_id: crop for crop in catalog.crops}
    sorted_entries = sorted(
        history,
        key=lambda item: (item.year, SEASON_ORDER.get(item.season, 0)),
        reverse=True,
    )
    events: list[models.HistoryEvent] = []
    for entry in sorted_entries:
        crop = crop_index.get(entry.crop_id)
        events.append(
            models.HistoryEvent(
                crop_id=entry.crop_id,
                crop_name=entry.crop_name or (crop.crop_name if crop else None),
                botanical_family=crop.botanical_family if crop else None,
                year=entry.year,
                season=entry.season,
                notes=entry.notes,
            )
        )
    return events


def _reference_matches(reference: str, event: models.HistoryEvent) -> bool:
    if reference.startswith("family:"):
        return event.botanical_family == reference.split(":", 1)[1]
    try:
        return event.crop_id == int(reference)
    except ValueError:
        return False


def _last_year_for_crop(history: Sequence[models.HistoryEvent], crop_id: int) -> int | None:
    for event in history:
        if event.crop_id == crop_id:
            return event.year
    return None


__all__ = [
    "RuleEngine",
    "RulesRepository",
    "evaluate_history",
    "default_rule_engine",
]
