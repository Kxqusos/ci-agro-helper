from __future__ import annotations

import pytest
from pydantic import ValidationError

from recommendations import schemas


def test_soil_profile_deduplicates_types():
    profile = schemas.SoilProfile(
        ph=6.4,
        soil_type=["Чернозем", " чернозем ", "Суглинок"],
        organic_matter="средняя",
    )

    assert profile.soil_type == ["Чернозем", "Суглинок"]


def test_soil_profile_rejects_empty_entries():
    with pytest.raises(ValidationError):
        schemas.SoilProfile(soil_type=["", "Чернозем"])


def test_recommendation_payload_rejects_duplicate_history():
    history = [
        schemas.FieldHistoryEntry(year=2024, season="spring", crop_id=1, crop_name="Пшеница"),
        schemas.FieldHistoryEntry(year=2024, season="spring", crop_id=2, crop_name="Кукуруза"),
    ]
    with pytest.raises(ValidationError):
        schemas.RecommendationQueryPayload(
            field_id="fld-dup",
            target_season="summer",
            target_year=2025,
            history=history,
            limit=3,
        )


def test_soil_requirement_deduplicate():
    requirement = schemas.SoilRequirement(soil_type=["суглинок", "Суглинок", "торф"])
    assert requirement.soil_type == ["суглинок", "торф"]
