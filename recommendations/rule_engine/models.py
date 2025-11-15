"""Data structures for the recommendation rule engine.

The engine operates on a CNF/DNF hybrid where each rule definition is
represented as a disjunction of conjunctions (DNF). Each clause is composed of
basic predicates (`RuleCondition`) such as crop/family membership, sequence
requirements or minimal gap (перерыв) constraints. This file intentionally uses
small dataclasses that are easy to serialize into fixtures/tests.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Iterable, Literal, Sequence


SeasonLiteral = Literal["spring", "summer", "autumn", "winter"]


@dataclass(frozen=True, slots=True)
class HistoryEvent:
    """Normalized entry of a crop that previously grew on the field."""

    crop_id: int
    crop_name: str | None
    botanical_family: str | None
    year: int
    season: SeasonLiteral
    notes: str | None = None


SequenceTokenKind = Literal["crop", "family", "fallow"]


@dataclass(frozen=True, slots=True)
class SequenceToken:
    """Atomic part of a sequence condition.

    Examples:
        SequenceToken(kind="crop", value="19")  -> requires crop_id 19
        SequenceToken(kind="family", value="fabaceae")
        SequenceToken(kind="crop", value="1", negated=True)  -> `!C`
        SequenceToken(kind="fallow", value=1) -> requires >=1 сезон перерыва
    """

    kind: SequenceTokenKind
    value: str | int | None = None
    negated: bool = False


ConditionKind = Literal["match", "sequence", "gap"]


@dataclass(frozen=True, slots=True)
class RuleCondition:
    """Leaf predicate of a rule clause.

    Attributes:
        kind: Predicate type (match/sequence/gap).
        subject: String identifier (`crop:19`, `family:fabaceae`).
        negated: Marker for NOT conditions (e.g. `!C`).
        window: Optional size of the lookback window (number of history events).
        min_gap_years: Required перерыв in years since `subject` appeared.
        sequence: Ordered tokens that must match the latest history tail.
    """

    kind: ConditionKind
    subject: str | None = None
    negated: bool = False
    window: int | None = None
    min_gap_years: int | None = None
    sequence: tuple[SequenceToken, ...] | None = None


@dataclass(frozen=True, slots=True)
class RuleClause:
    """Conjunction of conditions (all must be satisfied)."""

    conditions: tuple[RuleCondition, ...]


@dataclass(frozen=True, slots=True)
class RuleExpression:
    """Disjunction of clauses. Any matching clause satisfies the expression."""

    clauses: tuple[RuleClause, ...]

    def is_match(self, history: Sequence[HistoryEvent], *, now_year: int) -> bool:
        return any(
            _clause_matches(clause, history, now_year=now_year)
            for clause in self.clauses
        )


def _clause_matches(clause: RuleClause, history: Sequence[HistoryEvent], *, now_year: int) -> bool:
    return all(
        _condition_matches(condition, history, now_year=now_year)
        for condition in clause.conditions
    )


def _condition_matches(condition: RuleCondition, history: Sequence[HistoryEvent], *, now_year: int) -> bool:
    if condition.kind == "sequence":
        if not condition.sequence:
            return False
        return _sequence_matches(condition.sequence, history)

    if condition.kind == "gap":
        if not condition.subject or condition.min_gap_years is None:
            return False
        last_year = _last_occurrence_year(condition.subject, history)
        if last_year is None:
            return not condition.negated
        gap = now_year - last_year
        result = gap >= condition.min_gap_years
        return not result if condition.negated else result

    # Default: match condition
    if not condition.subject:
        return False
    window = condition.window or len(history)
    matched = any(
        _subject_matches(condition.subject, event)
        for event in history[:window]
    )
    return not matched if condition.negated else matched


def _subject_matches(subject: str, event: HistoryEvent) -> bool:
    prefix, _, value = subject.partition(":")
    if prefix == "crop":
        try:
            return event.crop_id == int(value)
        except ValueError:
            return False
    if prefix == "family":
        return event.botanical_family == value
    return False


def _sequence_matches(tokens: Sequence[SequenceToken], history: Sequence[HistoryEvent]) -> bool:
    if not tokens:
        return False
    if len(history) < len(tokens):
        return False
    window_size = len(tokens)
    for offset in range(0, len(history) - window_size + 1):
        slice_events = history[offset : offset + window_size]
        if _sequence_slice_matches(tokens, slice_events):
            return True
    return False


def _sequence_slice_matches(tokens: Sequence[SequenceToken], events: Sequence[HistoryEvent]) -> bool:
    for token, event in zip(tokens, events):
        if token.kind == "fallow":
            # fallow token means the event must be absent (notes/None), we treat
            # it as placeholder so skip but keep negation semantics.
            is_fallow = event.crop_id == 0 or (event.crop_name or "").lower() == "fallow"
            if token.negated:
                if is_fallow:
                    return False
            else:
                if not is_fallow:
                    return False
            continue

        if token.kind == "crop":
            expected = int(token.value) if token.value is not None else None
            matches = expected is not None and event.crop_id == expected
        elif token.kind == "family":
            matches = event.botanical_family == token.value
        else:
            matches = False

        if token.negated:
            matches = not matches
        if not matches:
            return False
    return True


def _last_occurrence_year(subject: str, history: Sequence[HistoryEvent]) -> int | None:
    prefix, _, value = subject.partition(":")
    for event in history:
        if prefix == "crop":
            try:
                value_int = int(value)
            except ValueError:
                continue
            if event.crop_id == value_int:
                return event.year
        elif prefix == "family" and event.botanical_family == value:
            return event.year
    return None


@dataclass(frozen=True, slots=True)
class RuleDefinition:
    """Expression, weight and metadata for a crop candidate."""

    rule_id: str
    target_crop_id: int
    expression: RuleExpression
    weight: float
    description: str


@dataclass(frozen=True, slots=True)
class RuleMatchExplanation:
    rule_id: str
    description: str
    weight: float


@dataclass(frozen=True, slots=True)
class CandidateRecommendation:
    crop_id: int
    crop_name: str
    botanical_family: str
    base_score: float
    reasons: tuple[RuleMatchExplanation, ...] = field(default_factory=tuple)
    penalties: tuple[str, ...] = field(default_factory=tuple)
    generated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(slots=True)
class CandidateRecommendations:
    items: list[CandidateRecommendation]

    def top(self, limit: int) -> list[CandidateRecommendation]:
        return self.items[:limit]


__all__ = [
    "CandidateRecommendation",
    "CandidateRecommendations",
    "HistoryEvent",
    "RuleClause",
    "RuleCondition",
    "RuleDefinition",
    "RuleExpression",
    "RuleMatchExplanation",
    "SequenceToken",
]
