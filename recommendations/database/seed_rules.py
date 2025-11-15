#!/usr/bin/env python3
"""
Utility script to seed the Recommendations database with agronomic rules.

The script reads structured data from recommendations/data/crop_rotation_rules.json,
performs integrity checks, and upserts the information into Postgres using SQLAlchemy.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from database.models import (
    BotanicalFamily,
    Crop,
    CropPredecessor,
    CropRotationRule,
    DataConfidence,
    DrainageLevel,
    NutrientImpact,
    NutrientImpactData,
    OrganicMatterLevel,
    PredecessorRating,
    PredecessorType,
    RelationshipType,
    SoilRequirement,
    Source,
)

logger = logging.getLogger("seed_rules")

DEFAULT_DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "crop_rotation_rules.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed the recommendations database with crop rotation rules."
    )
    parser.add_argument(
        "--data-file",
        type=Path,
        default=DEFAULT_DATA_FILE,
        help=f"Path to crop_rotation_rules.json (default: {DEFAULT_DATA_FILE})",
    )
    parser.add_argument(
        "--database-url",
        help="Override database URL (defaults to RECOMMENDATIONS_DATABASE_URL or DATABASE_URL).",
    )
    parser.add_argument(
        "--crop-id",
        action="append",
        type=int,
        dest="crop_ids",
        help="Seed only the specified crop_id (can be passed multiple times).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run validation only without touching the database.",
    )
    parser.add_argument(
        "--echo-sql",
        action="store_true",
        help="Enable SQLAlchemy engine echo for debugging SQL.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        help="Increase log verbosity (-v for INFO, -vv for DEBUG).",
    )
    return parser.parse_args()


def configure_logging(verbosity: int) -> None:
    if verbosity >= 2:
        level = logging.DEBUG
    elif verbosity == 1:
        level = logging.INFO
    else:
        level = logging.WARNING
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s")


def load_dataset(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def select_crops(all_crops: Sequence[Dict[str, Any]], crop_ids: Optional[Sequence[int]]) -> List[Dict[str, Any]]:
    if not crop_ids:
        return list(all_crops)

    id_set = set(crop_ids)
    selected = [crop for crop in all_crops if crop["crop_id"] in id_set]
    missing = id_set - {c["crop_id"] for c in selected}
    if missing:
        raise ValueError(f"Crops with ids {sorted(missing)} are not defined in the dataset.")
    return selected


def validate_dataset(
    dataset: Dict[str, Any],
    crops: Sequence[Dict[str, Any]],
) -> None:
    sources = dataset.get("sources") or []
    botanical_families: Dict[str, Dict[str, Any]] = dataset.get("botanical_families") or {}

    if not sources:
        raise ValueError("Dataset must include at least one source entry.")
    if not botanical_families:
        raise ValueError("Dataset must include botanical_families.")

    source_ids: Set[str] = set()
    for src in sources:
        src_id = src.get("id")
        if not src_id:
            raise ValueError("Each source must contain an 'id'.")
        if src_id in source_ids:
            raise ValueError(f"Duplicate source id detected: {src_id}")
        source_ids.add(src_id)

    seen_crop_ids: Set[int] = set()
    all_crop_ids = {crop["crop_id"] for crop in dataset.get("crops", [])}

    for crop in crops:
        crop_id = crop.get("crop_id")
        if crop_id in seen_crop_ids:
            raise ValueError(f"Duplicate crop_id detected in selection: {crop_id}")
        seen_crop_ids.add(crop_id)

        family_key = crop.get("botanical_family")
        if family_key not in botanical_families:
            raise ValueError(f"Botanical family '{family_key}' required by crop {crop_id} is missing.")

        rotation = crop.get("rotation_rules") or {}
        interval = rotation.get("return_interval_years") or {}
        min_years = interval.get("min")
        recommended_years = interval.get("recommended")
        if min_years is None or recommended_years is None:
            raise ValueError(f"Crop {crop_id} has incomplete return_interval_years.")
        if min_years <= 0:
            raise ValueError(f"Crop {crop_id} has non-positive minimum return interval.")
        if recommended_years < min_years:
            raise ValueError(f"Crop {crop_id} has recommended interval < min interval.")

        data_confidence = rotation.get("data_confidence")
        if data_confidence is None:
            raise ValueError(f"Crop {crop_id} is missing data_confidence.")
        try:
            DataConfidence(data_confidence)
        except ValueError as exc:
            raise ValueError(f"Crop {crop_id} has invalid data_confidence '{data_confidence}'.") from exc

        for fam in rotation.get("incompatible_families", []):
            if fam not in botanical_families:
                raise ValueError(f"Crop {crop_id} references unknown incompatible family '{fam}'.")

        soil = rotation.get("soil_requirements") or {}
        ph_range = soil.get("ph_range") or {}
        ph_min = ph_range.get("min")
        ph_max = ph_range.get("max")
        ph_optimal = ph_range.get("optimal")
        for label, value in (("min", ph_min), ("max", ph_max), ("optimal", ph_optimal)):
            if value is not None and not isinstance(value, (int, float)):
                raise ValueError(f"Crop {crop_id} has non-numeric pH {label}.")
        if ph_min is not None and ph_max is not None and ph_min > ph_max:
            raise ValueError(f"Crop {crop_id} has pH min greater than max.")
        if soil.get("organic_matter") is not None:
            try:
                OrganicMatterLevel(soil["organic_matter"])
            except ValueError as exc:
                raise ValueError(
                    f"Crop {crop_id} has invalid organic_matter '{soil['organic_matter']}'."
                ) from exc
        if soil.get("drainage") is not None:
            try:
                DrainageLevel(soil["drainage"])
            except ValueError as exc:
                raise ValueError(f"Crop {crop_id} has invalid drainage '{soil['drainage']}'.") from exc

        nutrient = rotation.get("nutrient_impact") or {}
        for axis, value in nutrient.items():
            if value is None:
                continue
            try:
                NutrientImpact(value)
            except ValueError as exc:
                raise ValueError(f"Crop {crop_id} has invalid nutrient impact '{value}' for {axis}.") from exc

        for bucket_name in ("good_predecessors", "acceptable_predecessors", "bad_predecessors"):
            for predecessor in rotation.get(bucket_name, []):
                ref = predecessor.get("crop_id")
                if ref is None:
                    raise ValueError(f"Crop {crop_id} has predecessor without crop_id in {bucket_name}.")
                if isinstance(ref, str) and ref.startswith("family:"):
                    fam_key = ref.split(":", 1)[1]
                    if fam_key not in botanical_families:
                        raise ValueError(
                            f"Crop {crop_id} references unknown predecessor family '{fam_key}'."
                        )
                elif isinstance(ref, (int, float)):
                    if int(ref) not in all_crop_ids:
                        logger.debug(
                            "Crop %s references predecessor crop_id %s not present in dataset.", crop_id, ref
                        )
                elif isinstance(ref, str) and ref.isdigit():
                    if int(ref) not in all_crop_ids:
                        logger.debug(
                            "Crop %s references predecessor crop_id %s not present in dataset.", crop_id, ref
                        )

                for source_id in predecessor.get("sources", []):
                    if source_id not in source_ids:
                        raise ValueError(
                            f"Crop {crop_id} predecessor references unknown source '{source_id}'."
                        )


def decimal_or_none(value: Optional[float]) -> Optional[Decimal]:
    if value is None:
        return None
    return Decimal(str(value))


def to_organic(value: Optional[str]) -> Optional[OrganicMatterLevel]:
    if value is None:
        return None
    return OrganicMatterLevel(value)


def to_drainage(value: Optional[str]) -> Optional[DrainageLevel]:
    if value is None:
        return None
    return DrainageLevel(value)


def to_nutrient(value: Optional[str]) -> Optional[NutrientImpact]:
    if value is None:
        return None
    return NutrientImpact(value)


def to_data_confidence(value: str) -> DataConfidence:
    return DataConfidence(value)


def parse_predecessor_ref(value: Any) -> Tuple[PredecessorType, str]:
    if isinstance(value, str) and value.startswith("family:"):
        return PredecessorType.FAMILY, value.split(":", 1)[1]
    if isinstance(value, (int, float)):
        return PredecessorType.CROP, str(int(value))
    return PredecessorType.CROP, str(value)


async def upsert_sources(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(Source).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Source.source_id],
        set_={
            "title": stmt.excluded.title,
            "authors": stmt.excluded.authors,
            "year": stmt.excluded.year,
            "url": stmt.excluded.url,
            "isbn": stmt.excluded.isbn,
            "doi": stmt.excluded.doi,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def upsert_families(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(BotanicalFamily).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[BotanicalFamily.family_key],
        set_={
            "name_ru": stmt.excluded.name_ru,
            "name_latin": stmt.excluded.name_latin,
            "common_pests": stmt.excluded.common_pests,
            "common_diseases": stmt.excluded.common_diseases,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def upsert_crops(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(Crop).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Crop.crop_id],
        set_={
            "crop_name": stmt.excluded.crop_name,
            "crop_latin": stmt.excluded.crop_latin,
            "botanical_family_key": stmt.excluded.botanical_family_key,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def upsert_rotation_rules(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(CropRotationRule).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[CropRotationRule.crop_id],
        set_={
            "return_interval_min": stmt.excluded.return_interval_min,
            "return_interval_recommended": stmt.excluded.return_interval_recommended,
            "incompatible_families": stmt.excluded.incompatible_families,
            "notes": stmt.excluded.notes,
            "data_confidence": stmt.excluded.data_confidence,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def upsert_soil_requirements(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(SoilRequirement).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[SoilRequirement.crop_id],
        set_={
            "ph_min": stmt.excluded.ph_min,
            "ph_max": stmt.excluded.ph_max,
            "ph_optimal": stmt.excluded.ph_optimal,
            "soil_types": stmt.excluded.soil_types,
            "organic_matter": stmt.excluded.organic_matter,
            "drainage": stmt.excluded.drainage,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def upsert_nutrient_impact(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(NutrientImpactData).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[NutrientImpactData.crop_id],
        set_={
            "nitrogen": stmt.excluded.nitrogen,
            "phosphorus": stmt.excluded.phosphorus,
            "potassium": stmt.excluded.potassium,
            "organic_matter": stmt.excluded.organic_matter,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def upsert_predecessors(session, payload: Sequence[Dict[str, Any]]) -> int:
    if not payload:
        return 0
    stmt = insert(CropPredecessor).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[
            CropPredecessor.crop_id,
            CropPredecessor.predecessor_id,
            CropPredecessor.predecessor_type,
        ],
        set_={
            "relationship_type": stmt.excluded.relationship_type,
            "rating": stmt.excluded.rating,
            "reason": stmt.excluded.reason,
            "conditions": stmt.excluded.conditions,
            "sources": stmt.excluded.sources,
        },
    )
    await session.execute(stmt)
    return len(payload)


async def fetch_crop_db_ids(session, crop_ids: Sequence[int]) -> Dict[int, int]:
    result = await session.execute(select(Crop.crop_id, Crop.id).where(Crop.crop_id.in_(crop_ids)))
    mapping = dict(result.all())
    missing = set(crop_ids) - set(mapping.keys())
    if missing:
        raise RuntimeError(f"Failed to load primary keys for crops: {sorted(missing)}")
    return mapping


def build_families_payload(families: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "family_key": key,
            "name_ru": value.get("name_ru"),
            "name_latin": value.get("name_latin"),
            "common_pests": value.get("common_pests") or [],
            "common_diseases": value.get("common_diseases") or [],
        }
        for key, value in families.items()
    ]


def build_crops_payload(crops: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "crop_id": crop["crop_id"],
            "crop_name": crop["crop_name"],
            "crop_latin": crop.get("crop_latin"),
            "botanical_family_key": crop["botanical_family"],
        }
        for crop in crops
    ]


def build_rotation_payload(
    crops: Sequence[Dict[str, Any]],
    db_ids: Dict[int, int],
) -> List[Dict[str, Any]]:
    rows = []
    for crop in crops:
        rules = crop["rotation_rules"]
        interval = rules["return_interval_years"]
        rows.append(
            {
                "crop_id": db_ids[crop["crop_id"]],
                "return_interval_min": interval["min"],
                "return_interval_recommended": interval["recommended"],
                "incompatible_families": rules.get("incompatible_families") or [],
                "notes": rules.get("notes"),
                "data_confidence": to_data_confidence(rules["data_confidence"]),
            }
        )
    return rows


def build_soil_payload(
    crops: Sequence[Dict[str, Any]],
    db_ids: Dict[int, int],
) -> List[Dict[str, Any]]:
    rows = []
    for crop in crops:
        soil = crop["rotation_rules"].get("soil_requirements")
        if not soil:
            continue
        ph_range = soil.get("ph_range") or {}
        rows.append(
            {
                "crop_id": db_ids[crop["crop_id"]],
                "ph_min": decimal_or_none(ph_range.get("min")),
                "ph_max": decimal_or_none(ph_range.get("max")),
                "ph_optimal": decimal_or_none(ph_range.get("optimal")),
                "soil_types": soil.get("soil_type") or [],
                "organic_matter": to_organic(soil.get("organic_matter")),
                "drainage": to_drainage(soil.get("drainage")),
            }
        )
    return rows


def build_nutrient_payload(
    crops: Sequence[Dict[str, Any]],
    db_ids: Dict[int, int],
) -> List[Dict[str, Any]]:
    rows = []
    for crop in crops:
        nutrient = crop["rotation_rules"].get("nutrient_impact")
        if not nutrient:
            continue
        rows.append(
            {
                "crop_id": db_ids[crop["crop_id"]],
                "nitrogen": to_nutrient(nutrient.get("nitrogen")),
                "phosphorus": to_nutrient(nutrient.get("phosphorus")),
                "potassium": to_nutrient(nutrient.get("potassium")),
                "organic_matter": to_nutrient(nutrient.get("organic_matter")),
            }
        )
    return rows


def build_predecessor_payload(
    crops: Sequence[Dict[str, Any]],
    db_ids: Dict[int, int],
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    bucket_mapping = {
        "good_predecessors": RelationshipType.GOOD,
        "acceptable_predecessors": RelationshipType.ACCEPTABLE,
        "bad_predecessors": RelationshipType.BAD,
    }

    for crop in crops:
        rules = crop["rotation_rules"]
        crop_pk = db_ids[crop["crop_id"]]
        for bucket, rel_type in bucket_mapping.items():
            for predecessor in rules.get(bucket, []):
                pred_type, pred_id = parse_predecessor_ref(predecessor["crop_id"])
                rating = predecessor.get("rating")
                rows.append(
                    {
                        "crop_id": crop_pk,
                        "predecessor_id": pred_id,
                        "predecessor_type": pred_type,
                        "relationship_type": rel_type,
                        "rating": PredecessorRating(rating) if rating else None,
                        "reason": predecessor.get("reason"),
                        "conditions": predecessor.get("conditions"),
                        "sources": predecessor.get("sources") or None,
                    }
                )
    return rows


def build_sources_payload(sources: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "source_id": src["id"],
            "title": src.get("title"),
            "authors": src.get("authors"),
            "year": src.get("year"),
            "url": src.get("url"),
            "isbn": src.get("isbn"),
            "doi": src.get("doi"),
        }
        for src in sources
    ]


async def seed_dataset(
    session,
    dataset: Dict[str, Any],
    crops: Sequence[Dict[str, Any]],
) -> Dict[str, int]:
    stats: Dict[str, int] = {}

    stats["sources"] = await upsert_sources(session, build_sources_payload(dataset["sources"]))
    stats["families"] = await upsert_families(session, build_families_payload(dataset["botanical_families"]))
    stats["crops"] = await upsert_crops(session, build_crops_payload(crops))

    crop_ids = [crop["crop_id"] for crop in crops]
    crop_pk_map = await fetch_crop_db_ids(session, crop_ids)

    stats["rotation_rules"] = await upsert_rotation_rules(
        session, build_rotation_payload(crops, crop_pk_map)
    )
    stats["soil_requirements"] = await upsert_soil_requirements(
        session, build_soil_payload(crops, crop_pk_map)
    )
    stats["nutrient_impact"] = await upsert_nutrient_impact(
        session, build_nutrient_payload(crops, crop_pk_map)
    )
    stats["predecessors"] = await upsert_predecessors(
        session, build_predecessor_payload(crops, crop_pk_map)
    )
    return stats


async def run_seed(args: argparse.Namespace) -> None:
    data = load_dataset(args.data_file)
    crops = select_crops(data.get("crops", []), args.crop_ids)
    if not crops:
        raise ValueError("No crops selected for seeding.")

    validate_dataset(data, crops)
    logger.info("Validated %s crops from %s", len(crops), args.data_file)

    if args.dry_run:
        logger.info("Dry-run complete; exiting without touching the database.")
        return

    database_url = args.database_url or os.getenv("RECOMMENDATIONS_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError(
            "Database URL is not set. Provide --database-url or set RECOMMENDATIONS_DATABASE_URL/DATABASE_URL."
        )

    engine = create_async_engine(database_url, echo=args.echo_sql)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with session_factory() as session:
            async with session.begin():
                stats = await seed_dataset(session, data, crops)
        logger.info(
            "Seed complete: %s",
            ", ".join(f"{table}={count}" for table, count in stats.items()),
        )
    finally:
        await engine.dispose()


def main() -> None:
    args = parse_args()
    configure_logging(args.verbose)
    try:
        asyncio.run(run_seed(args))
    except KeyboardInterrupt:
        logger.error("Interrupted by user.")
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Seeding failed: %s", exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
