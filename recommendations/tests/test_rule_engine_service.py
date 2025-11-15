from __future__ import annotations

from pathlib import Path

from recommendations import schemas
from recommendations.rule_engine import models, service

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "rule_engine"


def _build_engine(tmp_path: Path | None = None) -> service.RuleEngine:
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
    repository = service.RulesRepository(dataset_path=dataset, expr_dir=rules, ttl_seconds=1)
    return service.RuleEngine(repository)


def test_rule_engine_sequence_and_gap(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    history = [
        schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
        schemas.FieldHistoryEntry(year=2023, season="summer", crop_id=37, crop_name="Подсолнечник"),
        schemas.FieldHistoryEntry(year=2022, season="spring", crop_id=1, crop_name="Пшеница"),
    ]

    result = engine.evaluate_history(
        history,
        target_season="spring",
        target_year=2025,
        limit=3,
    )

    assert isinstance(result, models.CandidateRecommendations)
    wheat = next(item for item in result.items if item.crop_id == 1)
    sunflower = next(item for item in result.items if item.crop_id == 37)
    assert wheat.base_score > sunflower.base_score
    assert any(reason.rule_id == "fixture_wheat_after_pea" for reason in wheat.reasons)
    assert sunflower.base_score < 0.5


def test_repository_invalidates_when_dataset_changes(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    repository = engine._repository  # type: ignore[attr-defined]

    first = repository.load()
    dataset_path = repository._dataset_path  # type: ignore[attr-defined]
    dataset_path.write_text(dataset_path.read_text(encoding="utf-8"), encoding="utf-8")
    second = repository.load()
    assert first.fingerprint != second.fingerprint


def test_negated_sequence_condition(tmp_path: Path) -> None:
    engine = _build_engine(tmp_path)
    history = [
        schemas.FieldHistoryEntry(year=2024, season="autumn", crop_id=19, crop_name="Горох"),
        schemas.FieldHistoryEntry(year=2023, season="summer", crop_id=37, crop_name="Подсолнечник"),
    ]

    result = engine.evaluate_history(
        history,
        target_season="spring",
        target_year=2025,
        limit=3,
    )

    pea = next(item for item in result.items if item.crop_id == 19)
    assert any(reason.rule_id == "fixture_pea_not_after_poaceae" for reason in pea.reasons)
