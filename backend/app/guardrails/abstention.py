"""Calibrated domain classification, prompt injection guardrails, and evidence-based abstention.

Facade preserving backward compat - logic split into:
- `domain.py`: prototypes + `check_query_domain()`
- `injection.py`: `PROMPT_INJECTION_PATTERNS` + `check_injection()`
- `evidence.py`: `evaluate_evidence()` + `RELEVANCE_THRESHOLD`
"""
from backend.app.guardrails.domain import (
    IN_DOMAIN_PROTOTYPES, OUT_OF_DOMAIN_PROTOTYPES,
    _get_prototype_vectors, clear_prototype_cache, check_query_domain,
)
from backend.app.guardrails.injection import PROMPT_INJECTION_PATTERNS, check_injection
from backend.app.guardrails.evidence import RELEVANCE_THRESHOLD, evaluate_evidence

__all__ = [
    "IN_DOMAIN_PROTOTYPES", "OUT_OF_DOMAIN_PROTOTYPES",
    "PROMPT_INJECTION_PATTERNS", "RELEVANCE_THRESHOLD",
    "_get_prototype_vectors", "clear_prototype_cache",
    "check_query_domain", "check_injection", "evaluate_evidence",
]
