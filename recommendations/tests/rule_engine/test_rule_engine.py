"""Comprehensive unit tests for rule engine logical operators and edge cases."""

from __future__ import annotations

import pytest

from recommendations.rule_engine import models


class TestRuleConditionMatch:
    """Test basic match conditions."""

    def test_match_crop_by_id(self):
        """Test matching a specific crop by ID."""
        condition = models.RuleCondition(kind="match", subject="crop:19")
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=1, crop_name="Пшеница", botanical_family="poaceae", year=2023, season="spring"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_match_crop_not_found(self):
        """Test match condition when crop is not in history."""
        condition = models.RuleCondition(kind="match", subject="crop:99")
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_match_family(self):
        """Test matching by botanical family."""
        condition = models.RuleCondition(kind="match", subject="family:fabaceae")
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=1, crop_name="Пшеница", botanical_family="poaceae", year=2023, season="spring"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_match_family_not_found(self):
        """Test match condition when family is not in history."""
        condition = models.RuleCondition(kind="match", subject="family:solanaceae")
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_match_with_window(self):
        """Test match condition with limited window."""
        condition = models.RuleCondition(kind="match", subject="crop:1", window=1)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=1, crop_name="Пшеница", botanical_family="poaceae", year=2023, season="spring"),
        ]
        # Window=1 means only check the first event
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_match_negated(self):
        """Test negated match condition."""
        condition = models.RuleCondition(kind="match", subject="crop:19", negated=True)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_match_negated_not_found(self):
        """Test negated match when crop is not found (should be True)."""
        condition = models.RuleCondition(kind="match", subject="crop:99", negated=True)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_match_empty_history(self):
        """Test match condition with empty history."""
        condition = models.RuleCondition(kind="match", subject="crop:19")
        history = []
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_match_invalid_subject(self):
        """Test match condition with invalid subject format."""
        condition = models.RuleCondition(kind="match", subject="invalid")
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_match_no_subject(self):
        """Test match condition without subject."""
        condition = models.RuleCondition(kind="match", subject=None)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False


class TestRuleConditionGap:
    """Test gap conditions (rotation interval)."""

    def test_gap_sufficient(self):
        """Test gap condition when gap is sufficient."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=2)
        history = [
            models.HistoryEvent(crop_id=1, crop_name="Пшеница", botanical_family="poaceae", year=2024, season="spring"),
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2022, season="autumn"),
        ]
        # now_year=2025, last occurrence=2022, gap=3 >= 2
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_gap_insufficient(self):
        """Test gap condition when gap is insufficient."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=3)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2023, season="autumn"),
        ]
        # now_year=2025, last occurrence=2023, gap=2 < 3
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_gap_exact(self):
        """Test gap condition when gap exactly matches requirement."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=2)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2023, season="autumn"),
        ]
        # now_year=2025, last occurrence=2023, gap=2 == 2
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_gap_crop_never_grown(self):
        """Test gap condition when crop was never grown (should be True)."""
        condition = models.RuleCondition(kind="gap", subject="crop:99", min_gap_years=2)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2023, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_gap_negated_sufficient(self):
        """Test negated gap condition when gap is sufficient (should be False)."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=2, negated=True)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2022, season="autumn"),
        ]
        # now_year=2025, last occurrence=2022, gap=3 >= 2, negated -> False
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_gap_negated_insufficient(self):
        """Test negated gap condition when gap is insufficient (should be True)."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=3, negated=True)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        # now_year=2025, last occurrence=2024, gap=1 < 3, negated -> True
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_gap_family(self):
        """Test gap condition for botanical family."""
        condition = models.RuleCondition(kind="gap", subject="family:fabaceae", min_gap_years=2)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2022, season="autumn"),
        ]
        # now_year=2025, last occurrence=2022, gap=3 >= 2
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_gap_no_subject(self):
        """Test gap condition without subject."""
        condition = models.RuleCondition(kind="gap", subject=None, min_gap_years=2)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2023, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_gap_no_min_gap_years(self):
        """Test gap condition without min_gap_years."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=None)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2023, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_gap_empty_history(self):
        """Test gap condition with empty history."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=2)
        history = []
        assert models._condition_matches(condition, history, now_year=2025) is True


class TestRuleConditionSequence:
    """Test sequence conditions."""

    def test_sequence_exact_match(self):
        """Test exact sequence match."""
        tokens = (
            models.SequenceToken(kind="crop", value=19),
            models.SequenceToken(kind="crop", value=37),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_sequence_mismatch(self):
        """Test sequence when crops don't match."""
        tokens = (
            models.SequenceToken(kind="crop", value=19),
            models.SequenceToken(kind="crop", value=1),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_sequence_family_match(self):
        """Test sequence matching by family."""
        tokens = (
            models.SequenceToken(kind="family", value="fabaceae"),
            models.SequenceToken(kind="family", value="asteraceae"),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_sequence_negated_crop(self):
        """Test sequence with negated crop token."""
        tokens = (
            models.SequenceToken(kind="crop", value=19, negated=True),
            models.SequenceToken(kind="crop", value=37),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=1, crop_name="Пшеница", botanical_family="poaceae", year=2024, season="spring"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
        ]
        # First event is NOT crop 19 (it's 1), second is 37 -> match
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_sequence_negated_crop_fails(self):
        """Test sequence with negated crop token that fails."""
        tokens = (
            models.SequenceToken(kind="crop", value=19, negated=True),
            models.SequenceToken(kind="crop", value=37),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
        ]
        # First event IS crop 19, but token is negated -> fail
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_sequence_fallow(self):
        """Test sequence with fallow token."""
        tokens = (
            models.SequenceToken(kind="fallow", value=1),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=0, crop_name="fallow", botanical_family=None, year=2024, season="spring"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_sequence_fallow_negated(self):
        """Test sequence with negated fallow token."""
        tokens = (
            models.SequenceToken(kind="fallow", value=1, negated=True),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        # Event is not fallow, negated fallow token -> match
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_sequence_too_short_history(self):
        """Test sequence when history is shorter than sequence."""
        tokens = (
            models.SequenceToken(kind="crop", value=19),
            models.SequenceToken(kind="crop", value=37),
            models.SequenceToken(kind="crop", value=1),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_sequence_empty_tokens(self):
        """Test sequence with empty tokens."""
        condition = models.RuleCondition(kind="sequence", sequence=())
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_sequence_none_tokens(self):
        """Test sequence with None tokens."""
        condition = models.RuleCondition(kind="sequence", sequence=None)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_sequence_sliding_window(self):
        """Test sequence matching with sliding window."""
        tokens = (
            models.SequenceToken(kind="crop", value=37),
            models.SequenceToken(kind="crop", value=1),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
            models.HistoryEvent(crop_id=37, crop_name="Подсолнечник", botanical_family="asteraceae", year=2023, season="summer"),
            models.HistoryEvent(crop_id=1, crop_name="Пшеница", botanical_family="poaceae", year=2022, season="spring"),
        ]
        # Sequence [37, 1] matches at offset 1
        assert models._condition_matches(condition, history, now_year=2025) is True


class TestRuleClauseAndExpression:
    """Test clause (AND) and expression (OR) logic."""

    def test_clause_all_conditions_true(self):
        """Test clause when all conditions are true (AND)."""
        clause = models.RuleClause(
            conditions=(
                models.RuleCondition(kind="match", subject="crop:19"),
                models.RuleCondition(kind="match", subject="family:fabaceae"),
            )
        )
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._clause_matches(clause, history, now_year=2025) is True

    def test_clause_one_condition_false(self):
        """Test clause when one condition is false (AND fails)."""
        clause = models.RuleClause(
            conditions=(
                models.RuleCondition(kind="match", subject="crop:19"),
                models.RuleCondition(kind="match", subject="family:poaceae"),
            )
        )
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._clause_matches(clause, history, now_year=2025) is False

    def test_expression_first_clause_matches(self):
        """Test expression when first clause matches (OR)."""
        expression = models.RuleExpression(
            clauses=(
                models.RuleClause(
                    conditions=(models.RuleCondition(kind="match", subject="crop:19"),)
                ),
                models.RuleClause(
                    conditions=(models.RuleCondition(kind="match", subject="crop:99"),)
                ),
            )
        )
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert expression.is_match(history, now_year=2025) is True

    def test_expression_second_clause_matches(self):
        """Test expression when second clause matches (OR)."""
        expression = models.RuleExpression(
            clauses=(
                models.RuleClause(
                    conditions=(models.RuleCondition(kind="match", subject="crop:99"),)
                ),
                models.RuleClause(
                    conditions=(models.RuleCondition(kind="match", subject="crop:19"),)
                ),
            )
        )
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert expression.is_match(history, now_year=2025) is True

    def test_expression_no_clauses_match(self):
        """Test expression when no clauses match (OR fails)."""
        expression = models.RuleExpression(
            clauses=(
                models.RuleClause(
                    conditions=(models.RuleCondition(kind="match", subject="crop:99"),)
                ),
                models.RuleClause(
                    conditions=(models.RuleCondition(kind="match", subject="crop:88"),)
                ),
            )
        )
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert expression.is_match(history, now_year=2025) is False

    def test_complex_expression(self):
        """Test complex expression with multiple clauses and conditions."""
        expression = models.RuleExpression(
            clauses=(
                # Clause 1: (crop:19 AND family:fabaceae)
                models.RuleClause(
                    conditions=(
                        models.RuleCondition(kind="match", subject="crop:19"),
                        models.RuleCondition(kind="match", subject="family:fabaceae"),
                    )
                ),
                # Clause 2: (crop:37 AND gap >= 2 years)
                models.RuleClause(
                    conditions=(
                        models.RuleCondition(kind="match", subject="crop:37"),
                        models.RuleCondition(kind="gap", subject="crop:37", min_gap_years=2),
                    )
                ),
            )
        )
        # History has crop 19 with family fabaceae -> Clause 1 should match
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert expression.is_match(history, now_year=2025) is True


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_history_all_conditions(self):
        """Test various conditions with empty history."""
        match_cond = models.RuleCondition(kind="match", subject="crop:19")
        gap_cond = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=2)
        seq_cond = models.RuleCondition(kind="sequence", sequence=(models.SequenceToken(kind="crop", value=19),))

        empty_history = []

        assert models._condition_matches(match_cond, empty_history, now_year=2025) is False
        assert models._condition_matches(gap_cond, empty_history, now_year=2025) is True  # Never grown -> gap satisfied
        assert models._condition_matches(seq_cond, empty_history, now_year=2025) is False

    def test_year_boundary_gap(self):
        """Test gap calculation at year boundaries."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=1)

        # Last grown in 2024, now 2025 -> gap=1 (exactly at boundary)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is True

        # Last grown in 2025, now 2025 -> gap=0 (insufficient)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2025, season="spring"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_none_botanical_family(self):
        """Test matching when botanical_family is None."""
        condition = models.RuleCondition(kind="match", subject="family:unknown")
        history = [
            models.HistoryEvent(crop_id=0, crop_name="Unknown", botanical_family=None, year=2024, season="spring"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_sequence_token_none_value(self):
        """Test sequence token with None value."""
        tokens = (
            models.SequenceToken(kind="crop", value=None),
        )
        condition = models.RuleCondition(kind="sequence", sequence=tokens)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        assert models._condition_matches(condition, history, now_year=2025) is False

    def test_large_history(self):
        """Test performance with large history."""
        history = [
            models.HistoryEvent(crop_id=i % 10, crop_name=f"Crop{i}", botanical_family="test", year=2024 - i, season="spring")
            for i in range(100)
        ]
        condition = models.RuleCondition(kind="match", subject="crop:5")
        # Should still match (crop 5 appears multiple times)
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_window_larger_than_history(self):
        """Test window parameter larger than history length."""
        condition = models.RuleCondition(kind="match", subject="crop:19", window=10)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2024, season="autumn"),
        ]
        # Window is clamped to history length
        assert models._condition_matches(condition, history, now_year=2025) is True

    def test_zero_gap_years(self):
        """Test gap with min_gap_years=0."""
        condition = models.RuleCondition(kind="gap", subject="crop:19", min_gap_years=0)
        history = [
            models.HistoryEvent(crop_id=19, crop_name="Горох", botanical_family="fabaceae", year=2025, season="spring"),
        ]
        # now_year=2025, last=2025, gap=0 >= 0
        assert models._condition_matches(condition, history, now_year=2025) is True
