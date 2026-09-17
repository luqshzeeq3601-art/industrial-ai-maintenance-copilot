"""Evaluation tests for abstention guardrails."""
import pytest
from backend.app.guardrails.abstention import check_query_domain, evaluate_evidence

def test_out_of_domain_queries():
    out_of_domain_samples = [
        "What is the weather in London today?",
        "Who won the soccer world cup sports championship?",
        "Tell me a joke about robots",
        "What is the stock price of Tesla?"
    ]
    for q in out_of_domain_samples:
        is_in_domain, refusal = check_query_domain(q)
        assert not is_in_domain, f"Query '{q}' should have been rejected by guardrail"
        assert "Out of Scope Request" in refusal

def test_in_domain_queries():
    in_domain_samples = [
        "How to replace spindle bearings on ApexMill-500?",
        "Check maintenance logs for machine EQ-1004",
        "What does fault code H-104 mean?",
        "Hydraulic pump discharge pressure drop troubleshooting"
    ]
    for q in in_domain_samples:
        is_in_domain, refusal = check_query_domain(q)
        assert is_in_domain, f"Query '{q}' should be accepted as valid maintenance domain"
        assert refusal == ""

def test_empty_evidence_abstention():
    is_valid, msg = evaluate_evidence([])
    assert not is_valid
    assert "Insufficient Evidence" in msg
