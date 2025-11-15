from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Season = Literal["spring", "summer", "autumn", "winter"]
OrganicMatterLevel = Literal["низкая", "средняя", "высокая"]
DrainageLevel = Literal["плохой", "средний", "хороший"]
RiskLevel = Literal["low", "medium", "high"]
RecommendationPriority = Literal["high", "medium", "low"]
ImpactType = Literal["positive", "negative", "warning"]
PositiveRating = Literal["excellent", "good"]


def _normalize_string_list(values: list[str], field_name: str) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in values:
        value = item.strip()
        if not value:
            raise ValueError(f"{field_name} не может содержать пустые значения")
        key = value.lower()
        if key not in seen:
            seen.add(key)
            cleaned.append(value)
    return cleaned


class SoilPhRange(BaseModel):
    min: float | None = Field(default=None, ge=0, le=14)
    max: float | None = Field(default=None, ge=0, le=14)
    optimal: float | None = Field(default=None, ge=0, le=14)

    @model_validator(mode="after")
    def validate_order(self) -> "SoilPhRange":
        if self.min is not None and self.max is not None and self.min > self.max:
            msg = "ph_range.min must be <= ph_range.max"
            raise ValueError(msg)
        return self


class SoilProfile(BaseModel):
    ph: float | None = Field(default=None, ge=0, le=14)
    soil_type: list[str] = Field(default_factory=list, min_length=0)
    organic_matter: OrganicMatterLevel | None = None
    drainage: DrainageLevel | None = None

    @model_validator(mode="after")
    def deduplicate_soil_types(self) -> "SoilProfile":
        if self.soil_type:
            self.soil_type = _normalize_string_list(self.soil_type, "soil_type[]")
        return self


class ClimateProfile(BaseModel):
    agro_zone: str | None = None
    frost_risk: RiskLevel | None = Field(default=None)
    drought_risk: RiskLevel | None = Field(default=None)
    avg_temperature_c: float | None = Field(default=None, ge=-60, le=60)
    annual_precipitation_mm: int | None = Field(default=None, ge=0, le=2000)


class SoilRequirement(BaseModel):
    ph_range: SoilPhRange | None = None
    soil_type: list[str] = Field(default_factory=list)
    organic_matter: OrganicMatterLevel | None = None
    drainage: DrainageLevel | None = None

    @model_validator(mode="after")
    def deduplicate_requirement_soil_types(self) -> "SoilRequirement":
        if self.soil_type:
            self.soil_type = _normalize_string_list(self.soil_type, "soil_requirements.soil_type[]")
        return self


class FieldHistoryEntry(BaseModel):
    year: int = Field(..., ge=1950, le=2100)
    season: Season
    crop_id: int = Field(..., ge=1)
    crop_name: str | None = None
    notes: str | None = None


class QueryConstraints(BaseModel):
    avoid_botanical_families: list[str] = Field(default_factory=list)
    exclude_crop_ids: list[int] = Field(default_factory=list)
    require_organic_matter: OrganicMatterLevel | None = None
    prefer_cover_crops: bool = False


class RecommendationQueryPayload(BaseModel):
    field_id: str = Field(..., min_length=1)
    target_season: Season
    target_year: int = Field(..., ge=2024, le=2100)
    history: list[FieldHistoryEntry] = Field(..., min_length=1)
    soil_profile: SoilProfile | None = None
    climate_profile: ClimateProfile | None = None
    preferred_crops: list[int] | None = Field(default=None, min_length=1)
    constraints: QueryConstraints | None = None
    limit: int = Field(default=5, ge=1, le=20)

    @field_validator("preferred_crops")
    @classmethod
    def deduplicate_preferred(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        seen: set[int] = set()
        deduped: list[int] = []
        for crop_id in value:
            if crop_id not in seen:
                seen.add(crop_id)
                deduped.append(crop_id)
        return deduped

    @model_validator(mode="after")
    def validate_history_records(self) -> "RecommendationQueryPayload":
        if self.history:
            seen: set[tuple[int, Season]] = set()
            for entry in self.history:
                key = (entry.year, entry.season)
                if key in seen:
                    raise ValueError("history содержит дубли по сочетанию year+season")
                seen.add(key)
        return self


class RecommendationReason(BaseModel):
    rule_id: str
    title: str
    impact: ImpactType
    detail: str


class SoilMatch(BaseModel):
    score: float = Field(..., ge=0, le=1)
    notes: list[str] = Field(default_factory=list)


class RecommendationItem(BaseModel):
    crop_id: int
    crop_name: str
    botanical_family: str
    score: float = Field(..., ge=0, le=1)
    priority: RecommendationPriority
    reasons: list[RecommendationReason] = Field(default_factory=list)
    soil_match: SoilMatch | None = None
    warnings: list[str] = Field(default_factory=list)
    required_actions: list[str] = Field(default_factory=list)


class RecommendationQueryResponse(BaseModel):
    field_id: str
    target_season: Season
    target_year: int
    generated_at: datetime
    request_id: str
    data_version: str
    recommendations: list[RecommendationItem]
    filters_applied: list[str] = Field(default_factory=list)


class RuleSource(BaseModel):
    id: str
    title: str
    authors: str | None = None
    year: int | None = None
    url: str | None = None
    isbn: str | None = None
    doi: str | None = None


class BotanicalFamily(BaseModel):
    key: str
    name_ru: str
    name_latin: str
    common_pests: list[str] = Field(default_factory=list)
    common_diseases: list[str] = Field(default_factory=list)


class RotationInterval(BaseModel):
    min: int | None = Field(default=None, ge=0)
    recommended: int | None = Field(default=None, ge=0)


class PositivePredecessor(BaseModel):
    crop_reference: str
    rating: PositiveRating
    reason: str | None = None


class ConditionalPredecessor(BaseModel):
    crop_reference: str
    conditions: str | None = None


class NegativePredecessor(BaseModel):
    crop_reference: str
    reason: str | None = None


class CropRuleSummary(BaseModel):
    crop_id: int
    crop_name: str
    botanical_family: str
    rotation_interval_years: RotationInterval | None = None
    good_predecessors: list[PositivePredecessor] = Field(default_factory=list)
    acceptable_predecessors: list[ConditionalPredecessor] = Field(default_factory=list)
    bad_predecessors: list[NegativePredecessor] = Field(default_factory=list)
    incompatible_families: list[str] = Field(default_factory=list)
    soil_requirements: SoilRequirement | None = None


class RulesCatalogResponse(BaseModel):
    version: str
    updated: date | None = None
    sources: list[RuleSource] = Field(default_factory=list)
    botanical_families: list[BotanicalFamily] = Field(default_factory=list)
    crops: list[CropRuleSummary] = Field(default_factory=list)
