"""Public interface for the rule engine module."""

from . import models, service

RuleEngine = service.RuleEngine
RulesRepository = service.RulesRepository
evaluate_history = service.evaluate_history
default_rule_engine = service.default_rule_engine

__all__ = [
    "RuleEngine",
    "RulesRepository",
    "evaluate_history",
    "default_rule_engine",
    "models",
]

