"""
SQLAlchemy ORM models for the Recommendations service.

This module defines database models for:
- Crop information and botanical families
- Crop rotation rules and predecessor relationships
- Soil requirements and nutrient impact
- Field history tracking
"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import (
    String,
    Integer,
    Text,
    Numeric,
    DateTime,
    Date,
    Index,
    UniqueConstraint,
    CheckConstraint,
    ForeignKey,
    Enum as SQLEnum,
    func,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncAttrs
import enum


class Base(AsyncAttrs, DeclarativeBase):
    """Base class for all ORM models."""
    pass


# Enums for typed columns
class RelationshipType(str, enum.Enum):
    """Type of predecessor relationship."""
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    BAD = "bad"


class PredecessorRating(str, enum.Enum):
    """Rating for good predecessors."""
    EXCELLENT = "excellent"
    GOOD = "good"


class PredecessorType(str, enum.Enum):
    """Type of predecessor reference."""
    CROP = "crop"
    FAMILY = "family"


class DataConfidence(str, enum.Enum):
    """Level of data confidence."""
    HIGH = "высокая"
    MEDIUM = "средняя"
    LOW = "низкая"
    ABSENT = "отсутствует"


class OrganicMatterLevel(str, enum.Enum):
    """Organic matter requirement level."""
    LOW = "низкая"
    MEDIUM = "средняя"
    HIGH = "высокая"


class DrainageLevel(str, enum.Enum):
    """Drainage requirement level."""
    POOR = "плохой"
    MEDIUM = "средний"
    GOOD = "хороший"


class NutrientImpact(str, enum.Enum):
    """Impact on soil nutrients."""
    STRONG_DEPLETION = "сильное_истощение"
    DEPLETION = "истощение"
    NEUTRAL = "нейтральное"
    ENRICHMENT = "обогащение"
    STRONG_ENRICHMENT = "сильное_обогащение"


class Source(Base):
    """Reference source for agronomic data."""
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authors: Mapped[Optional[str]] = mapped_column(String(500))
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(1000))
    isbn: Mapped[Optional[str]] = mapped_column(String(50))
    doi: Mapped[Optional[str]] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"Source(source_id={self.source_id!r}, title={self.title!r}, year={self.year})"


class BotanicalFamily(Base):
    """Botanical family information."""
    __tablename__ = "botanical_families"

    id: Mapped[int] = mapped_column(primary_key=True)
    family_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name_ru: Mapped[str] = mapped_column(String(200), nullable=False)
    name_latin: Mapped[str] = mapped_column(String(200), nullable=False)
    common_pests: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    common_diseases: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    crops: Mapped[List["Crop"]] = relationship(back_populates="botanical_family_rel")

    def __repr__(self) -> str:
        return f"BotanicalFamily(family_key={self.family_key!r}, name_ru={self.name_ru!r})"


class Crop(Base):
    """Crop information."""
    __tablename__ = "crops"
    __table_args__ = (
        Index("ix_crops_crop_id", "crop_id"),
        Index("ix_crops_botanical_family", "botanical_family_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    crop_name: Mapped[str] = mapped_column(String(200), nullable=False)
    crop_latin: Mapped[Optional[str]] = mapped_column(String(200))
    botanical_family_key: Mapped[str] = mapped_column(
        ForeignKey("botanical_families.family_key"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    botanical_family_rel: Mapped["BotanicalFamily"] = relationship(back_populates="crops")
    rotation_rules: Mapped[Optional["CropRotationRule"]] = relationship(
        back_populates="crop", uselist=False, cascade="all, delete-orphan"
    )
    soil_requirements: Mapped[Optional["SoilRequirement"]] = relationship(
        back_populates="crop", uselist=False, cascade="all, delete-orphan"
    )
    nutrient_impact: Mapped[Optional["NutrientImpactData"]] = relationship(
        back_populates="crop", uselist=False, cascade="all, delete-orphan"
    )
    predecessors: Mapped[List["CropPredecessor"]] = relationship(
        back_populates="crop", cascade="all, delete-orphan", foreign_keys="CropPredecessor.crop_id"
    )
    field_histories: Mapped[List["FieldHistory"]] = relationship(
        back_populates="crop", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"Crop(crop_id={self.crop_id}, crop_name={self.crop_name!r})"


class CropRotationRule(Base):
    """Crop rotation rules."""
    __tablename__ = "crop_rotation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(
        ForeignKey("crops.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    return_interval_min: Mapped[int] = mapped_column(Integer, nullable=False)
    return_interval_recommended: Mapped[int] = mapped_column(Integer, nullable=False)
    incompatible_families: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    data_confidence: Mapped[DataConfidence] = mapped_column(
        SQLEnum(DataConfidence, name="data_confidence_enum"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    crop: Mapped["Crop"] = relationship(back_populates="rotation_rules")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "return_interval_min > 0",
            name="check_return_interval_min_positive"
        ),
        CheckConstraint(
            "return_interval_recommended >= return_interval_min",
            name="check_return_interval_recommended_gte_min"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"CropRotationRule(crop_id={self.crop_id}, "
            f"interval={self.return_interval_min}-{self.return_interval_recommended}y)"
        )


class SoilRequirement(Base):
    """Soil requirements for crops."""
    __tablename__ = "soil_requirements"

    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(
        ForeignKey("crops.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    ph_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1))
    ph_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1))
    ph_optimal: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1))
    soil_types: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    organic_matter: Mapped[Optional[OrganicMatterLevel]] = mapped_column(
        SQLEnum(OrganicMatterLevel, name="organic_matter_level_enum")
    )
    drainage: Mapped[Optional[DrainageLevel]] = mapped_column(
        SQLEnum(DrainageLevel, name="drainage_level_enum")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    crop: Mapped["Crop"] = relationship(back_populates="soil_requirements")

    # Constraints
    __table_args__ = (
        CheckConstraint("ph_min >= 0 AND ph_min <= 14", name="check_ph_min_range"),
        CheckConstraint("ph_max >= 0 AND ph_max <= 14", name="check_ph_max_range"),
        CheckConstraint("ph_optimal >= 0 AND ph_optimal <= 14", name="check_ph_optimal_range"),
        CheckConstraint(
            "ph_min IS NULL OR ph_max IS NULL OR ph_min <= ph_max",
            name="check_ph_min_lte_max"
        ),
    )

    def __repr__(self) -> str:
        return f"SoilRequirement(crop_id={self.crop_id}, pH={self.ph_min}-{self.ph_max})"


class NutrientImpactData(Base):
    """Impact of crop on soil nutrients."""
    __tablename__ = "nutrient_impact"

    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(
        ForeignKey("crops.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    nitrogen: Mapped[Optional[NutrientImpact]] = mapped_column(
        SQLEnum(NutrientImpact, name="nutrient_impact_enum")
    )
    phosphorus: Mapped[Optional[NutrientImpact]] = mapped_column(
        SQLEnum(NutrientImpact, name="nutrient_impact_enum")
    )
    potassium: Mapped[Optional[NutrientImpact]] = mapped_column(
        SQLEnum(NutrientImpact, name="nutrient_impact_enum")
    )
    organic_matter: Mapped[Optional[NutrientImpact]] = mapped_column(
        SQLEnum(NutrientImpact, name="nutrient_impact_enum")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    crop: Mapped["Crop"] = relationship(back_populates="nutrient_impact")

    def __repr__(self) -> str:
        return f"NutrientImpactData(crop_id={self.crop_id}, N={self.nitrogen})"


class CropPredecessor(Base):
    """Crop predecessor relationships."""
    __tablename__ = "crop_predecessors"
    __table_args__ = (
        Index("ix_crop_predecessors_crop_id", "crop_id"),
        Index("ix_crop_predecessors_type", "relationship_type"),
        UniqueConstraint(
            "crop_id", "predecessor_id", "predecessor_type",
            name="uq_crop_predecessor"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(
        ForeignKey("crops.id", ondelete="CASCADE"), nullable=False
    )
    predecessor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    predecessor_type: Mapped[PredecessorType] = mapped_column(
        SQLEnum(PredecessorType, name="predecessor_type_enum"), nullable=False
    )
    relationship_type: Mapped[RelationshipType] = mapped_column(
        SQLEnum(RelationshipType, name="relationship_type_enum"), nullable=False
    )
    rating: Mapped[Optional[PredecessorRating]] = mapped_column(
        SQLEnum(PredecessorRating, name="predecessor_rating_enum")
    )
    reason: Mapped[Optional[str]] = mapped_column(Text)
    conditions: Mapped[Optional[str]] = mapped_column(Text)
    sources: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    crop: Mapped["Crop"] = relationship(back_populates="predecessors")

    def __repr__(self) -> str:
        return (
            f"CropPredecessor(crop_id={self.crop_id}, "
            f"predecessor={self.predecessor_id}, type={self.relationship_type})"
        )


class FieldHistory(Base):
    """Historical crop planting data for fields."""
    __tablename__ = "field_history"
    __table_args__ = (
        Index("ix_field_history_field_id", "field_id"),
        Index("ix_field_history_crop_id", "crop_id"),
        Index("ix_field_history_planting_date", "planting_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    crop_id: Mapped[int] = mapped_column(
        ForeignKey("crops.id", ondelete="RESTRICT"), nullable=False
    )
    planting_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    harvest_date: Mapped[Optional[datetime]] = mapped_column(Date)
    yield_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    yield_unit: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    crop: Mapped["Crop"] = relationship(back_populates="field_histories")

    # Constraints
    __table_args__ = (
        Index("ix_field_history_field_id", "field_id"),
        Index("ix_field_history_crop_id", "crop_id"),
        Index("ix_field_history_planting_date", "planting_date"),
        CheckConstraint(
            "harvest_date IS NULL OR harvest_date >= planting_date",
            name="check_harvest_after_planting"
        ),
        CheckConstraint("yield_amount IS NULL OR yield_amount >= 0", name="check_yield_positive"),
    )

    def __repr__(self) -> str:
        return (
            f"FieldHistory(field_id={self.field_id!r}, crop_id={self.crop_id}, "
            f"planting_date={self.planting_date})"
        )
